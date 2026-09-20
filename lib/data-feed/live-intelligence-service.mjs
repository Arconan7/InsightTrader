/**
 * Live Intelligence Service.
 * Coordinates multi-source ingestion pipeline:
 * - Official US House Clerk STOCK Act filings
 * - United States Congress Legislators directory
 * - Yahoo Finance RSS & Google News RSS feeds
 * - Yahoo Finance real-time equity quotes (Core + User-Added Tickers)
 * - Donald Trump Public Statement & Truth Social Tracker
 * - Multi-pillar overall BUY / HOLD / SELL verdicts
 * - Server-side persistence of tracked stocks (survives restart/refresh)
 * - Complete Lanxess defensive exclusion
 * - Resilient file caching in data/live-intelligence-cache.json
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getRealCongressionalData } from './congress-feed.mjs';
import { fetchTickerRssNews, fetchPolicyRssNews, fetchAllExpandedNews } from './rss-parser.mjs';
import { fetchMultipleQuotes, fetchStockQuote, validateTicker } from './market-quotes.mjs';
import { synthesizeSignals } from './signal-synthesizer.mjs';
import { syncTrumpPosts, loadTrumpPosts } from './trump-tracker.mjs';
import { isLanxess, sanitizeDataset } from './lanxess-filter.mjs';
import { calculateBenchmarkPerformance } from './performance-evaluator.mjs';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../../');
const cacheFilePath = path.join(projectRoot, 'data/live-intelligence-cache.json');
const fallbackFixturePath = path.join(projectRoot, 'fixtures/trade-signals-dataset.json');
const trackedTickersFilePath = path.join(projectRoot, 'data/tracked-tickers.json');

export const CORE_TICKERS = ['NVDA', 'LMT', 'PLTR', 'ASML', 'CRWD'];

let inMemoryDataset = null;
let isRefreshing = false;
let lastSyncTimestamp = null;
let lastSyncStatus = 'INITIALIZING';
let syncStats = {
  rawPtrCount: 0,
  articlesIngested: 0,
  quotesFetched: 0,
  signalsGenerated: 0,
};

/**
 * Loads user-added tickers from server disk.
 */
export function loadUserTickers() {
  if (fs.existsSync(trackedTickersFilePath)) {
    try {
      const data = JSON.parse(fs.readFileSync(trackedTickersFilePath, 'utf-8'));
      if (Array.isArray(data.userTickers)) {
        return data.userTickers
          .map((t) => String(t).trim().toUpperCase())
          .filter((t) => t && !CORE_TICKERS.includes(t) && !isLanxess(t));
      }
    } catch (err) {
      console.warn(`[Live Intelligence] Error reading tracked tickers file: ${err.message}`);
    }
  }
  return [];
}

/**
 * Persists user-added tickers to server disk.
 */
export function saveUserTickers(userTickers) {
  try {
    const dir = path.dirname(trackedTickersFilePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const clean = Array.from(
      new Set(
        userTickers
          .map((t) => String(t).trim().toUpperCase())
          .filter((t) => t && !CORE_TICKERS.includes(t) && !isLanxess(t))
      )
    );
    fs.writeFileSync(trackedTickersFilePath, JSON.stringify({ userTickers: clean }, null, 2), 'utf-8');
    return clean;
  } catch (err) {
    console.error(`[Live Intelligence] Failed to save tracked tickers: ${err.message}`);
    return userTickers;
  }
}

/**
 * Returns full tracked ticker structure.
 */
export function getTrackedTickers() {
  const userTickers = loadUserTickers();
  const allTickers = Array.from(new Set([...CORE_TICKERS, ...userTickers]));
  return {
    coreTickers: CORE_TICKERS,
    userTickers,
    allTickers,
  };
}

/**
 * Loads cached data from disk or fallback fixture, applying Lanxess exclusion filter.
 */
export function loadCachedDataset() {
  if (inMemoryDataset) return inMemoryDataset;

  const { allTickers } = getTrackedTickers();

  if (fs.existsSync(cacheFilePath)) {
    try {
      const data = JSON.parse(fs.readFileSync(cacheFilePath, 'utf-8'));
      const sanitized = sanitizeDataset(data);
      sanitized.trackedTickers = getTrackedTickers();
      if (!sanitized.trumpPosts) sanitized.trumpPosts = loadTrumpPosts();

      // Compute benchmark outperformance confidence
      const quotesMap = {};
      for (const q of sanitized.quotes || []) {
        if (q && q.ticker) quotesMap[q.ticker.toUpperCase()] = q;
      }
      const spyQuote = quotesMap['SPY'] || (sanitized.quotes || []).find((q) => q.ticker === 'SPY') || null;
      const benchmarkPerformance = calculateBenchmarkPerformance(sanitized.signals || [], quotesMap, spyQuote);
      sanitized.benchmarkPerformance = benchmarkPerformance;
      if (sanitized.summary) {
        sanitized.summary.benchmarkPerformance = benchmarkPerformance;
      }

      inMemoryDataset = sanitized;
      lastSyncTimestamp = sanitized.summary?.lastUpdatedIso || null;
      lastSyncStatus = 'LOADED_FROM_CACHE';
      return inMemoryDataset;
    } catch (err) {
      console.warn(`[Live Intelligence] Error reading cache file: ${err.message}`);
    }
  }

  // Fallback to fixture if cache does not exist yet
  if (fs.existsSync(fallbackFixturePath)) {
    try {
      const data = JSON.parse(fs.readFileSync(fallbackFixturePath, 'utf-8'));
      const sanitized = sanitizeDataset(data);
      sanitized.trackedTickers = getTrackedTickers();
      sanitized.trumpPosts = loadTrumpPosts();

      const quotesMap = {};
      for (const q of sanitized.quotes || []) {
        if (q && q.ticker) quotesMap[q.ticker.toUpperCase()] = q;
      }
      const spyQuote = quotesMap['SPY'] || (sanitized.quotes || []).find((q) => q.ticker === 'SPY') || null;
      const benchmarkPerformance = calculateBenchmarkPerformance(sanitized.signals || [], quotesMap, spyQuote);
      sanitized.benchmarkPerformance = benchmarkPerformance;
      if (sanitized.summary) {
        sanitized.summary.benchmarkPerformance = benchmarkPerformance;
      }

      inMemoryDataset = sanitized;
      lastSyncStatus = 'LOADED_FROM_FIXTURE';
      return inMemoryDataset;
    } catch (err) {
      console.error(`[Live Intelligence] Error reading fallback fixture: ${err.message}`);
    }
  }


  return {
    summary: {},
    signals: [],
    disclosures: [],
    politicians: [],
    news: [],
    quotes: [],
    trumpPosts: loadTrumpPosts(),
    trackedTickers: getTrackedTickers(),
  };
}

/**
 * Saves current dataset to persistent cache.
 */
function saveToCache(dataset) {
  try {
    const sanitized = sanitizeDataset(dataset);
    const dir = path.dirname(cacheFilePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(cacheFilePath, JSON.stringify(sanitized, null, 2), 'utf-8');
  } catch (err) {
    console.error(`[Live Intelligence] Failed to write cache: ${err.message}`);
  }
}

/**
 * Runs full live data ingestion and synthesis pipeline for all tracked tickers.
 */
export async function refreshLiveIntelligence() {
  if (isRefreshing) {
    console.log('[Live Intelligence] Refresh already in progress. Skipping duplicate run.');
    return inMemoryDataset || loadCachedDataset();
  }

  isRefreshing = true;
  lastSyncStatus = 'REFRESHING';
  console.log('>>> [Live Intelligence] Starting live public data synchronization...');

  try {
    const { allTickers, coreTickers, userTickers } = getTrackedTickers();

    // 1. Ingest official congressional filings and legislators
    console.log('  -> Ingesting official House Clerk STOCK Act filings & Congress directory...');
    const congressData = await getRealCongressionalData();

    // 2. Fetch live quotes for CORE + USER-ADDED tickers + Benchmark SPY
    console.log(`  -> Fetching real-time market quotes for ${allTickers.length} tracked stocks + SPY benchmark...`);
    const quotesToFetch = Array.from(new Set([...allTickers, 'SPY']));
    const quotesMap = await fetchMultipleQuotes(quotesToFetch);
    const spyQuote = quotesMap['SPY'] || null;

    // 3. Ingest real-time RSS feeds (ticker specific + market-wide + regulatory + policy wires)
    console.log(`  -> Ingesting expanded multi-source RSS feeds for ${allTickers.length} tickers & markets...`);
    const allArticles = await fetchAllExpandedNews(allTickers);

    // 4. Ingest and sync public Donald Trump statements & Truth Social posts
    console.log('  -> Ingesting Donald Trump public statements & Truth Social policy tracker...');
    const trumpPosts = await syncTrumpPosts(allTickers);

    // 5. Synthesize trade signals & overall BUY/HOLD/SELL verdicts for all tracked tickers
    console.log('  -> Synthesizing high-conviction signals & multi-pillar verdicts...');
    const signals = synthesizeSignals(
      congressData.disclosures,
      allArticles,
      quotesMap,
      allTickers,
      trumpPosts
    );

    // 6. Calculate real historical benchmark outperformance and statistical confidence
    const benchmarkPerformance = calculateBenchmarkPerformance(signals, quotesMap, spyQuote);

    // 7. Calculate summary metrics
    const totalTrackedVolume = congressData.politicians.reduce((acc, p) => acc + (p.tradeVolumeYtdUsd || 0), 0);
    const summary = {
      activeSignalsCount: signals.length,
      avgConfidenceScorePct: +(signals.reduce((acc, s) => acc + s.confidenceScorePct, 0) / (signals.length || 1)).toFixed(1),
      totalTrackedVolumeYtdUsd: totalTrackedVolume,
      signalWinRatePct: benchmarkPerformance.winRatePct,
      avgSignalAlphaPct: benchmarkPerformance.excessReturnPct,
      benchmarkPerformance,
      totalDisclosuresCount: congressData.disclosures.length,
      trackedPoliticiansCount: congressData.politicians.length,
      officialPtrFilingsCataloged: congressData.rawPtrCount,
      trackedTickersCount: allTickers.length,
      userAddedTickersCount: userTickers.length,
      lastUpdatedIso: new Date().toISOString(),
      dataSourceMode: 'LIVE_PUBLIC_FEEDS',
      dataSources: [
        'U.S. House of Representatives Clerk (disclosures-clerk.house.gov)',
        'United States Congress Legislators Database (@unitedstates)',
        'Yahoo Finance Real-Time Tape & RSS News Feeds',
        'CNBC Markets & MarketWatch Top Stories Wire',
        'Google News Policy & Regulatory RSS Feeds',
        'Donald J. Trump Public Statements & Truth Social Policy Wire',
      ],
    };

    const dataset = {
      $schema: 'insighttrader-dataset-v2-live',
      generatedAt: new Date().toISOString(),
      summary,
      benchmarkPerformance,
      politicians: congressData.politicians,
      disclosures: congressData.disclosures,
      news: allArticles.slice(0, 100),
      signals,
      quotes: Object.values(quotesMap),
      trumpPosts: trumpPosts.slice(0, 30),
      trackedTickers: {
        coreTickers,
        userTickers,
        allTickers,
      },
    };


    const cleanDataset = sanitizeDataset(dataset);
    inMemoryDataset = cleanDataset;
    saveToCache(cleanDataset);

    lastSyncTimestamp = cleanDataset.generatedAt;
    lastSyncStatus = 'SYNC_SUCCESS';
    syncStats = {
      rawPtrCount: congressData.rawPtrCount,
      articlesIngested: allArticles.length,
      quotesFetched: Object.keys(quotesMap).length,
      signalsGenerated: signals.length,
    };

    console.log(
      `[Live Intelligence] Sync complete: ${signals.length} stock verdicts generated from ${congressData.rawPtrCount} official PTRs, ${allArticles.length} articles, & ${trumpPosts.length} public statements.`
    );
    return cleanDataset;
  } catch (err) {
    console.error(`[Live Intelligence] Error during sync: ${err.message}`, err.stack);
    lastSyncStatus = 'SYNC_FAILED';
    return inMemoryDataset || loadCachedDataset();
  } finally {
    isRefreshing = false;
  }
}

/**
 * Validates and adds a new user-tracked stock ticker.
 * Persists to server disk and immediately fetches live quotes, news, and verdict.
 */
export async function addUserTrackedTicker(rawTicker) {
  const current = getTrackedTickers();
  const validation = await validateTicker(rawTicker, current.allTickers);

  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const ticker = validation.ticker;
  const updatedUserTickers = [...current.userTickers, ticker];
  saveUserTickers(updatedUserTickers);

  // Fetch ticker quote and RSS news immediately
  const quote = validation.quote;
  const news = await fetchTickerRssNews(ticker);
  const trumpPosts = loadTrumpPosts();

  const dataset = inMemoryDataset || loadCachedDataset();

  // Add quote
  const existingQuotes = dataset.quotes || [];
  const updatedQuotes = [...existingQuotes.filter((q) => q.ticker !== ticker), quote];

  // Add news
  const existingNews = dataset.news || [];
  const updatedNews = [...news, ...existingNews].slice(0, 50);

  // Re-synthesize signals
  const quotesMap = {};
  for (const q of updatedQuotes) quotesMap[q.ticker] = q;

  const { allTickers } = getTrackedTickers();
  const signals = synthesizeSignals(
    dataset.disclosures || [],
    updatedNews,
    quotesMap,
    allTickers,
    trumpPosts
  );

  dataset.quotes = updatedQuotes;
  dataset.news = updatedNews;
  dataset.signals = signals;
  dataset.trackedTickers = getTrackedTickers();
  if (dataset.summary) {
    dataset.summary.activeSignalsCount = signals.length;
    dataset.summary.trackedTickersCount = allTickers.length;
    dataset.summary.userAddedTickersCount = updatedUserTickers.length;
  }

  inMemoryDataset = sanitizeDataset(dataset);
  saveToCache(inMemoryDataset);

  return {
    success: true,
    ticker,
    companyName: validation.companyName,
    quote,
    trackedTickers: getTrackedTickers(),
    signal: signals.find((s) => s.ticker === ticker),
  };
}

/**
 * Removes a user-added stock ticker. Core stocks cannot be removed.
 */
export function removeUserTrackedTicker(rawTicker) {
  const ticker = (rawTicker || '').trim().toUpperCase();
  if (CORE_TICKERS.includes(ticker)) {
    throw new Error(`Cannot remove core stock ${ticker}. Existing core stocks remain by default.`);
  }

  const current = getTrackedTickers();
  if (!current.userTickers.includes(ticker)) {
    throw new Error(`Ticker ${ticker} is not in your user-added stocks list.`);
  }

  const updatedUserTickers = current.userTickers.filter((t) => t !== ticker);
  saveUserTickers(updatedUserTickers);

  const dataset = inMemoryDataset || loadCachedDataset();
  if (dataset.quotes) {
    dataset.quotes = dataset.quotes.filter((q) => q.ticker !== ticker);
  }
  if (dataset.signals) {
    dataset.signals = dataset.signals.filter((s) => s.ticker !== ticker);
  }
  dataset.trackedTickers = getTrackedTickers();
  if (dataset.summary) {
    dataset.summary.activeSignalsCount = dataset.signals.length;
    dataset.summary.trackedTickersCount = dataset.trackedTickers.allTickers.length;
    dataset.summary.userAddedTickersCount = updatedUserTickers.length;
  }

  inMemoryDataset = sanitizeDataset(dataset);
  saveToCache(inMemoryDataset);

  return {
    success: true,
    removed: ticker,
    trackedTickers: getTrackedTickers(),
  };
}

/**
 * Returns latest intelligence dataset (cache or fallback).
 */
export function getIntelligence() {
  if (!inMemoryDataset) {
    return loadCachedDataset();
  }
  return inMemoryDataset;
}

/**
 * Returns the current synchronization status.
 */
export function getSyncStatus() {
  return {
    status: lastSyncStatus,
    isRefreshing,
    lastSyncTimestamp,
    stats: syncStats,
  };
}

/**
 * Returns benchmark performance and statistical confidence.
 */
export function getBenchmarkPerformance() {
  const dataset = getIntelligence();
  if (dataset?.benchmarkPerformance) return dataset.benchmarkPerformance;
  const quotesMap = {};
  for (const q of dataset?.quotes || []) {
    if (q?.ticker) quotesMap[q.ticker.toUpperCase()] = q;
  }
  return calculateBenchmarkPerformance(dataset?.signals || [], quotesMap, quotesMap['SPY']);
}

