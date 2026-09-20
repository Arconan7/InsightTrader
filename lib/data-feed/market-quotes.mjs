/**
 * Live market quotes & historical prices using Yahoo Finance Chart API.
 * Provides transparent source tracking, calculation audits, and strict ticker validation.
 */

import { isLanxess } from './lanxess-filter.mjs';

/**
 * Fetches real-time stock quote and 1-month historical candles for a ticker.
 */
export async function fetchStockQuote(ticker, timeoutMs = 8000) {
  const cleanTicker = (ticker || '').trim().toUpperCase();

  if (!cleanTicker) {
    return {
      isValid: false,
      ticker: '',
      priceUnavailable: true,
      error: 'Empty ticker symbol provided',
    };
  }

  if (isLanxess(cleanTicker)) {
    return {
      isValid: false,
      ticker: cleanTicker,
      priceUnavailable: true,
      error: 'LANXESS AG and related securities are excluded from this platform.',
    };
  }

  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(cleanTicker)}?interval=1d&range=1mo`;
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) InsightTrader/1.0',
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText || 'Ticker not found'}`);
    }

    const data = await res.json();
    const result = data.chart?.result?.[0];
    if (!result || !result.meta) {
      throw new Error('No chart result or meta returned for ticker');
    }

    const meta = result.meta;
    const companyName = meta.shortName || meta.longName || cleanTicker;

    if (isLanxess(companyName)) {
      return {
        isValid: false,
        ticker: cleanTicker,
        priceUnavailable: true,
        error: 'LANXESS AG and related securities are excluded from this platform.',
      };
    }

    const currentPrice = meta.regularMarketPrice ?? meta.chartPreviousClose;
    if (typeof currentPrice !== 'number' || Number.isNaN(currentPrice)) {
      throw new Error('No valid market price found for ticker');
    }

    const prevClose = meta.chartPreviousClose ?? currentPrice;
    const changeTodayPct = prevClose > 0 ? +(((currentPrice - prevClose) / prevClose) * 100).toFixed(2) : 0;

    // Build historical points
    const timestamps = result.timestamp || [];
    const quotes = result.indicators?.quote?.[0] || {};
    const opens = quotes.open || [];
    const highs = quotes.high || [];
    const lows = quotes.low || [];
    const closes = quotes.close || [];
    const volumes = quotes.volume || [];

    const priceHistory = [];
    for (let i = 0; i < timestamps.length; i++) {
      if (closes[i] !== null && closes[i] !== undefined) {
        priceHistory.push({
          date: new Date(timestamps[i] * 1000).toISOString().split('T')[0],
          open: +(opens[i] ?? closes[i]).toFixed(2),
          high: +(highs[i] ?? closes[i]).toFixed(2),
          low: +(lows[i] ?? closes[i]).toFixed(2),
          close: +closes[i].toFixed(2),
          volume: volumes[i] ?? 0,
        });
      }
    }

    const firstClose = priceHistory[0]?.close ?? currentPrice;
    const change30DayPct = firstClose > 0 ? +(((currentPrice - firstClose) / firstClose) * 100).toFixed(2) : 0;

    return {
      isValid: true,
      ticker: cleanTicker,
      companyName,
      currentPrice: +currentPrice.toFixed(2),
      prevClose: +prevClose.toFixed(2),
      changeTodayPct,
      change30DayPct,
      currency: meta.currency || 'USD',
      fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh ? +meta.fiftyTwoWeekHigh.toFixed(2) : null,
      fiftyTwoWeekLow: meta.fiftyTwoWeekLow ? +meta.fiftyTwoWeekLow.toFixed(2) : null,
      marketCap: meta.marketCap ? `$${(meta.marketCap / 1e9).toFixed(1)}B` : 'N/A',
      sector: meta.instrumentType || 'Equity',
      priceHistory,
      source: 'Yahoo Finance Real-Time Market Tape',
      sourceUrl: `https://finance.yahoo.com/quote/${cleanTicker}`,
      calculationMethod: 'Tape quote: regularMarketPrice. Change today: ((price - prevClose)/prevClose)*100. Change 30d: ((price - 30dClose)/30dClose)*100.',
      verifiedAt: new Date().toISOString(),
    };
  } catch (err) {
    console.warn(`[Market Quotes] Error fetching quote for ${cleanTicker}: ${err.message}`);
    return {
      isValid: false,
      ticker: cleanTicker,
      companyName: cleanTicker,
      priceUnavailable: true,
      error: err.message,
      source: 'Yahoo Finance Real-Time Market Tape (Unavailable)',
      sourceUrl: `https://finance.yahoo.com/quote/${cleanTicker}`,
      priceHistory: [],
    };
  }
}

/**
 * Validates a user ticker symbol against Yahoo Finance.
 * Sanitizes input, rejects LANXESS, duplicates, or non-existent symbols.
 */
export async function validateTicker(ticker, existingTickers = []) {
  if (!ticker || typeof ticker !== 'string') {
    return { valid: false, error: 'Ticker symbol is required.' };
  }

  const cleanTicker = ticker.trim().toUpperCase();

  // Basic format check: uppercase letters, numbers, dot, or hyphen (1 to 10 chars)
  if (!/^[A-Z0-9.-]{1,10}$/.test(cleanTicker)) {
    return {
      valid: false,
      error: 'Invalid ticker format. Please enter a valid stock symbol (e.g. AAPL, MSFT, SPY).',
    };
  }

  // Lanxess exclusion check
  if (isLanxess(cleanTicker)) {
    return {
      valid: false,
      error: 'LANXESS AG and related securities (LXS, LXS.DE, LNXSF, LNXSY) are excluded from this platform.',
    };
  }

  // Duplicate check
  const upperExisting = existingTickers.map((t) => String(t).toUpperCase());
  if (upperExisting.includes(cleanTicker)) {
    return {
      valid: false,
      error: `Ticker ${cleanTicker} is already in your tracked stocks list.`,
    };
  }

  // Validate ticker against live Yahoo Finance feed
  const quote = await fetchStockQuote(cleanTicker);
  if (!quote.isValid || quote.priceUnavailable) {
    return {
      valid: false,
      error: `Could not verify ticker "${cleanTicker}" on Yahoo Finance: ${quote.error || 'Symbol not found'}`,
    };
  }

  if (isLanxess(quote.companyName)) {
    return {
      valid: false,
      error: 'LANXESS AG and related securities are excluded from this platform.',
    };
  }

  return {
    valid: true,
    ticker: cleanTicker,
    companyName: quote.companyName,
    currentPrice: quote.currentPrice,
    quote,
  };
}

/**
 * Batch fetches quotes for multiple tickers.
 */
export async function fetchMultipleQuotes(tickers) {
  const filtered = tickers.filter((t) => !isLanxess(t));
  const results = await Promise.allSettled(filtered.map((t) => fetchStockQuote(t)));
  const quotes = {};
  results.forEach((r, idx) => {
    const t = filtered[idx].toUpperCase();
    if (r.status === 'fulfilled' && r.value) {
      quotes[t] = r.value;
    }
  });
  return quotes;
}
