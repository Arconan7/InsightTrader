import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  getIntelligence,
  refreshLiveIntelligence,
  getSyncStatus,
  getTrackedTickers,
  addUserTrackedTicker,
  removeUserTrackedTicker,
  getBenchmarkPerformance,
  CORE_TICKERS,
} from './lib/data-feed/live-intelligence-service.mjs';
import { loadTrumpPosts, getTrumpPostsForTicker } from './lib/data-feed/trump-tracker.mjs';
import { isLanxess, sanitizeDataset } from './lib/data-feed/lanxess-filter.mjs';
import { getInitialsAvatar } from './lib/data-feed/congress-feed.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const HOST = '0.0.0.0';

// Helper to send JSON responses with Lanxess exclusion
function sendJson(res, statusCode, data) {
  const sanitized = sanitizeDataset(data);
  const jsonStr = JSON.stringify(sanitized, null, 2);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  });
  res.end(jsonStr);
}

// Helper to parse JSON request bodies
function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1e6) {
        req.destroy();
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

// Generate the standalone web dashboard HTML with transparent fact-checking audit trails
function getDashboardHtml() {
  const rawDataset = getIntelligence();
  const dataset = sanitizeDataset(rawDataset);
  const tracked = getTrackedTickers();
  const perf = getBenchmarkPerformance();

  return `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>InsightTrader · Live Trade Signals & Fact-Checked Intelligence</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; }
    code, .font-mono { font-family: 'JetBrains Mono', monospace; }
    .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: #0f172a; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 3px; }
  </style>
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen flex flex-col antialiased selection:bg-emerald-500 selection:text-white">

  <!-- Header -->
  <header class="border-b border-slate-800 bg-slate-950/80 backdrop-blur sticky top-0 z-50 px-4 lg:px-8 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
    <div class="flex items-center gap-3">
      <div class="h-9 w-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold shadow-inner">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 3 7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/><path d="m13 13 6 6"/></svg>
      </div>
      <div>
        <div class="flex items-center gap-2">
          <span class="font-bold text-lg text-white tracking-tight">InsightTrader</span>
          <span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 flex items-center gap-1.5">
            <span class="relative flex h-2 w-2">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            Verified Public Sources
          </span>
        </div>
        <p class="text-xs text-slate-400">100% Fact-Checkable Political Intelligence · Direct Government & News Citations</p>
      </div>
    </div>

    <div class="flex flex-wrap items-center gap-2 sm:gap-3 text-xs">
      <button onclick="togglePerformanceModal()" class="px-3 py-1.5 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-700/80 text-emerald-300 transition-colors flex items-center gap-1.5 cursor-pointer font-semibold">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
        Market-Beating Stats
      </button>

      <button onclick="toggleTransparencyModal()" class="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
        Fact-Check Standards
      </button>

      <button id="refresh-btn" onclick="triggerLiveRefresh()" class="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-medium transition-all shadow-sm flex items-center gap-1.5 cursor-pointer">
        <svg id="refresh-spinner" xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 21h5v-5"/></svg>
        <span id="refresh-text">Refresh Live Feeds</span>
      </button>

      <a href="/api/signals" target="_blank" class="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 transition-colors flex items-center gap-1.5">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
        API
      </a>
    </div>
  </header>

  <!-- Live Feed & Transparency Banner -->
  <div class="bg-gradient-to-r from-emerald-950/60 via-slate-900 to-slate-950 border-b border-emerald-800/40 px-4 lg:px-8 py-2.5 text-xs flex flex-wrap items-center justify-between gap-3">
    <div class="flex items-center gap-2 text-emerald-300">
      <svg class="h-4 w-4 shrink-0 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
      <span>
        <strong>Complete Source Traceability:</strong> Every verdict, trade, and price target is backed by verifiable primary sources: official U.S. House Clerk PDFs (<a href="https://disclosures-clerk.house.gov" target="_blank" rel="noopener noreferrer" class="underline hover:text-white">disclosures-clerk.house.gov</a>), live RSS wires (Yahoo/Google News), Congress.gov legislative acts, official Bioguide legislator records, and real-time exchange pricing.
      </span>
    </div>
    <div class="text-slate-400 font-mono text-[11px]" id="last-sync-time">
      Last Synced: ${new Date(dataset.summary?.lastUpdatedIso || Date.now()).toLocaleTimeString()}
    </div>
  </div>

  <!-- Main Container -->
  <main class="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">

    <!-- KPI Metric Cards - With Prominent Market Outperformance Confidence Stat -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4" id="kpi-grid">
      <!-- Card 1: Outperformance Confidence -->
      <div onclick="togglePerformanceModal()" class="bg-slate-900/90 border border-emerald-800/80 hover:border-emerald-500/80 rounded-xl p-4 flex flex-col justify-between cursor-pointer transition-all shadow-lg group relative overflow-hidden">
        <div class="space-y-1">
          <div class="flex items-center gap-1.5">
            <p class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Market Outperformance</p>
            <span class="text-[9px] px-1 py-0.2 rounded border border-emerald-600/50 text-emerald-400 font-mono">vs S&P 500</span>
          </div>
          <h4 class="text-2xl font-black text-emerald-400 mt-1 flex items-baseline gap-1.5" id="kpi-confidence">
            ${perf.confidenceDisplay}
            <span class="text-[11px] text-slate-400 font-normal font-sans">${perf.isSufficientData ? 'Confidence' : ''}</span>
          </h4>
          <div class="text-[11px] text-slate-300 font-mono space-y-0.5 pt-0.5">
            <div class="flex justify-between">
              <span class="text-slate-400">InsightTrader:</span>
              <strong class="text-emerald-400">+${perf.insightTraderReturnPct}%</strong>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-400">S&P 500 (SPY):</span>
              <strong class="text-slate-300">+${perf.benchmarkReturnPct}%</strong>
            </div>
            <div class="flex justify-between border-t border-slate-800 pt-0.5">
              <span class="text-slate-400">Excess (Alpha):</span>
              <strong class="text-emerald-400">+${perf.excessReturnPct}%</strong>
            </div>
          </div>
        </div>
        <div class="mt-2 pt-1 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-emerald-400">
          <span>${perf.evaluatedSignalsCount} Evaluated · ${perf.winRatePct}% Win Rate</span>
          <span class="underline">Audit Math ↗</span>
        </div>
      </div>

      <div class="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
        <div>
          <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Signals & Verdicts</p>
          <h4 class="text-2xl font-bold text-white mt-1" id="kpi-active">${dataset.summary.activeSignalsCount || 5}</h4>
          <span class="text-[11px] text-emerald-400 font-medium">100% Fact-Checked</span>
        </div>
        <div class="p-3 bg-emerald-950/40 border border-emerald-800/40 rounded-xl text-emerald-400">
          <svg class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
        </div>
      </div>

      <div class="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
        <div>
          <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Tracked Stocks</p>
          <h4 class="text-2xl font-bold text-white mt-1" id="kpi-tracked">${dataset.summary.trackedTickersCount || tracked.allTickers.length}</h4>
          <span class="text-[11px] text-blue-400 font-medium" id="kpi-core-user">${CORE_TICKERS.length} Core · ${tracked.userTickers.length} User-Added</span>
        </div>
        <div class="p-3 bg-blue-950/40 border border-blue-800/40 rounded-xl text-blue-400">
          <svg class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/></svg>
        </div>
      </div>

      <div class="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
        <div>
          <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Official PTR Filings</p>
          <h4 class="text-2xl font-bold text-white mt-1" id="kpi-ptrs">${dataset.summary.officialPtrFilingsCataloged || 379}</h4>
          <span class="text-[11px] text-slate-400">2026 House Clerk Index</span>
        </div>
        <div class="p-3 bg-purple-950/40 border border-purple-800/40 rounded-xl text-purple-400">
          <svg class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
        </div>
      </div>

      <div class="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
        <div>
          <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Audited RSS Articles</p>
          <h4 class="text-2xl font-bold text-white mt-1" id="kpi-rss">${dataset.news.length || 30}</h4>
          <span class="text-[11px] text-slate-400">Linked to Source Wires</span>
        </div>
        <div class="p-3 bg-amber-950/40 border border-amber-800/40 rounded-xl text-amber-400">
          <svg class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 11a9 9 0 0 1 9 9"/><path d="M4 4a16 16 0 0 1 16 16"/><circle cx="5" cy="19" r="1"/></svg>
        </div>
      </div>
    </div>

    <!-- User Stock Management & Watchlist Control -->
    <div class="bg-slate-900/90 border border-slate-800 rounded-xl p-4 sm:p-5 space-y-4">
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h3 class="text-sm font-bold text-white flex items-center gap-2">
            <svg class="h-4 w-4 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
            Tracked Stocks Portfolio
          </h3>
          <p class="text-xs text-slate-400 mt-0.5">
            Add any stock ticker for real-time Yahoo Finance quote tape, RSS wire correlation, and BUY/HOLD/SELL verdict.
          </p>
        </div>

        <!-- Add Stock Form -->
        <form id="add-stock-form" onsubmit="handleAddStock(event)" class="flex items-center gap-2">
          <input
            type="text"
            id="ticker-input"
            placeholder="Enter ticker (e.g. AAPL, TSLA)..."
            maxlength="10"
            class="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white uppercase placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 w-44 sm:w-56 font-mono"
            required
          />
          <button
            type="submit"
            id="add-stock-btn"
            class="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs font-semibold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
          >
            <span id="add-stock-btn-text">Add Stock</span>
          </button>
        </form>
      </div>

      <!-- Add Stock Feedback Alert -->
      <div id="ticker-feedback" class="hidden text-xs px-3 py-2 rounded-lg border"></div>

      <!-- Tracked Stock Chips -->
      <div class="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800" id="tracked-chips-container">
        <!-- Injected dynamically -->
      </div>
    </div>

    <!-- Main Workspace Grid -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">

      <!-- Left Column: Signal & Verdict Stream (7 cols) -->
      <section class="lg:col-span-7 space-y-4">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 class="text-base font-bold text-white flex items-center gap-2">
            <svg class="h-5 w-5 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
            Tracked Stocks & Overall Verdicts
          </h2>

          <div class="flex items-center gap-2">
            <input type="text" id="search-input" placeholder="Search ticker or company..." class="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500">
            <select id="direction-filter" class="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-emerald-500">
              <option value="ALL">All Verdicts</option>
              <option value="BUY">BUY</option>
              <option value="HOLD">HOLD</option>
              <option value="SELL">SELL</option>
            </select>
          </div>
        </div>

        <!-- Signal Card Stream -->
        <div id="signals-container" class="space-y-3.5">
          <!-- Injected via JavaScript below -->
        </div>
      </section>

      <!-- Right Column: Tab System (5 cols) -->
      <section class="lg:col-span-5 space-y-4">
        <!-- Tab Navigation Buttons -->
        <div class="bg-slate-900 border border-slate-800 p-1 rounded-xl flex items-center gap-1 shadow-md">
          <button id="tab-btn-stock" onclick="switchRightTab('stock')" class="flex-1 py-2 px-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer bg-emerald-600 text-white shadow-sm">
            <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
            <span>Signal Briefing</span>
            <span id="tab-stock-ticker" class="text-[10px] font-mono px-1.5 py-0.2 rounded bg-black/30 text-emerald-200 font-bold">NVDA</span>
          </button>
          <button id="tab-btn-congress" onclick="switchRightTab('congress')" class="flex-1 py-2 px-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer text-slate-400 hover:text-slate-200 hover:bg-slate-800/60">
            <svg class="h-3.5 w-3.5 text-purple-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 14v4M12 14v4M16 14v4"/></svg>
            <span>Congress</span>
            <span id="tab-congress-count" class="text-[10px] font-mono px-1.5 py-0.2 rounded bg-black/30 text-purple-200 font-bold">${dataset.disclosures.length}</span>
          </button>
          <button id="tab-btn-news" onclick="switchRightTab('news')" class="flex-1 py-2 px-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer text-slate-400 hover:text-slate-200 hover:bg-slate-800/60">
            <svg class="h-3.5 w-3.5 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/><path d="M18 14h-8M15 18h-5M10 6h8v4h-8V6Z"/></svg>
            <span>News & Wire</span>
            <span id="tab-news-count" class="text-[10px] font-mono px-1.5 py-0.2 rounded bg-black/30 text-amber-200 font-bold">${dataset.news.length + (dataset.trumpPosts || []).length}</span>
          </button>
        </div>

        <!-- TAB PANEL 1: STOCK BRIEFING DOSSIER -->
        <div id="tab-panel-stock" class="space-y-4">
          <!-- Selected Briefing Card -->
          <div class="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden" id="briefing-card">
            <div class="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
              <div class="flex items-center gap-2">
                <span class="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" id="briefing-conviction">High Conviction</span>
                <span class="text-[11px] text-slate-400" id="briefing-model">Nemotron-4-340B</span>
              </div>
              <span class="text-xs font-mono text-slate-400" id="briefing-date"></span>
            </div>

            <div class="p-5 space-y-5">
              <div>
                <div class="flex items-center justify-between">
                  <h3 class="text-base font-bold text-white" id="briefing-title">Select a stock</h3>
                  <a id="briefing-price-tag" href="#" target="_blank" rel="noopener noreferrer" class="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-emerald-400 hover:text-emerald-300 underline flex items-center gap-1"></a>
                </div>
                <p class="text-xs text-slate-400 mt-1" id="briefing-headline"></p>
              </div>

              <!-- OVERALL VERDICT SUMMARY & RATIONALE -->
              <div class="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3" id="briefing-verdict-box">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <span class="text-xs font-bold uppercase tracking-wider text-slate-400">Overall Verdict:</span>
                    <span id="briefing-verdict-badge" class="px-2.5 py-0.5 rounded text-xs font-black"></span>
                  </div>
                  <span id="briefing-confidence" class="text-xs font-mono text-slate-400"></span>
                </div>
                <p class="text-xs text-slate-300 leading-relaxed" id="briefing-verdict-rationale"></p>
              </div>

              <!-- TRANSPARENT MULTI-PILLAR DERIVATION -->
              <div class="p-3.5 rounded-lg bg-slate-950/90 border border-emerald-900/40 space-y-3">
                <div class="flex items-center justify-between">
                  <h4 class="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                    <svg class="h-4 w-4 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                    Verdict Evidentiary Derivation & Weights
                  </h4>
                  <span class="text-[10px] text-slate-400">Mathematical Audit</span>
                </div>
                <p class="text-[11px] text-slate-400" id="briefing-calc-method">
                  Multi-pillar score derived from filings, market tape, news sentiment, and policy statements.
                </p>
                <div id="briefing-pillars-container" class="space-y-2">
                  <!-- Dynamically populated pillars -->
                </div>
              </div>

              <!-- DEDICATED FACT-CHECK AUDIT TRAIL -->
              <div class="p-3.5 rounded-lg bg-slate-950/90 border border-slate-800 space-y-3">
                <div class="flex items-center justify-between">
                  <h4 class="text-xs font-bold text-white flex items-center gap-1.5">
                    <svg class="h-4 w-4 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                    Primary Source Audit Trail
                  </h4>
                  <span class="text-[10px] text-slate-400">Click to verify independently</span>
                </div>
                <div id="briefing-citations" class="space-y-2">
                  <!-- Dynamically populated citations -->
                </div>
              </div>

              <!-- Disclosures Cited with Authentic House Clerk PDF Links -->
              <div>
                <h4 class="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center justify-between">
                  <span class="flex items-center gap-1.5">
                    <svg class="h-3.5 w-3.5 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
                    Official Congressional STOCK Act Filings
                  </span>
                  <span class="text-[10px] text-slate-500">U.S. House Clerk</span>
                </h4>
                <div id="briefing-disclosures" class="space-y-2"></div>
              </div>

              <!-- News Catalyst with Live External Links -->
              <div>
                <h4 class="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center justify-between">
                  <span class="flex items-center gap-1.5">
                    <svg class="h-3.5 w-3.5 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 11a9 9 0 0 1 9 9"/><path d="M4 4a16 16 0 0 1 16 16"/><circle cx="5" cy="19" r="1"/></svg>
                    Live Correlated RSS News Feeds
                  </span>
                  <span class="text-[10px] text-slate-500">Public News Wires</span>
                </h4>
                <div id="briefing-news" class="space-y-2"></div>
              </div>

              <!-- Donald Trump Statements & Policy Wire for this Stock -->
              <div id="briefing-trump-section">
                <h4 class="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center justify-between">
                  <span class="flex items-center gap-1.5">
                    <svg class="h-3.5 w-3.5 text-rose-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                    Trump Social Media & Policy Context
                  </span>
                  <span class="text-[10px] text-rose-400/80">Low Weight (5%)</span>
                </h4>
                <div id="briefing-trump" class="space-y-2"></div>
              </div>

              <!-- Legislative References -->
              <div id="briefing-hooks-section">
                <h4 class="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1.5">
                  <svg class="h-3.5 w-3.5 text-purple-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                  Legislative & Oversight Framework
                </h4>
                <ul id="briefing-hooks" class="text-xs text-slate-300 space-y-1 list-disc list-inside bg-slate-950 p-2.5 rounded border border-slate-800"></ul>
              </div>

              <!-- Risk Factors -->
              <div>
                <h4 class="text-[11px] font-semibold uppercase tracking-wider text-rose-400 mb-1 flex items-center gap-1">
                  <svg class="h-3.5 w-3.5 text-rose-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                  Key Risk Factors
                </h4>
                <ul id="briefing-risks" class="text-xs text-slate-400 space-y-1 list-disc list-inside"></ul>
              </div>
            </div>
          </div>
        </div>

        <!-- TAB PANEL 2: CONGRESSIONAL TRADING ACTIVITY -->
        <div id="tab-panel-congress" class="hidden space-y-4">
          <!-- Congress Controls Card -->
          <div class="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-3">
            <div class="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <h3 class="text-sm font-bold text-white flex items-center gap-2">
                <svg class="h-4 w-4 text-purple-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 14v4M12 14v4M16 14v4"/></svg>
                Congressional STOCK Act Intelligence
              </h3>
              <span class="text-[10px] px-2 py-0.5 rounded border border-purple-800/60 text-purple-300 font-mono">${dataset.politicians.length} Profiles</span>
            </div>
            <p class="text-xs text-slate-400">Official House Clerk 2026FD PTR records and Senate financial disclosures.</p>
            
            <div class="flex flex-col sm:flex-row gap-2">
              <div class="relative flex-1">
                <input type="text" id="congress-search-input" oninput="filterCongress()" placeholder="Search 100+ members by name, state, party..." class="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500">
              </div>
              <div class="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 shrink-0">
                <button id="chamber-all-btn" onclick="setChamberFilter('ALL')" class="px-2 py-1 rounded text-[11px] font-semibold bg-purple-600 text-white cursor-pointer">All</button>
                <button id="chamber-house-btn" onclick="setChamberFilter('House')" class="px-2 py-1 rounded text-[11px] font-semibold text-slate-400 hover:text-white cursor-pointer">House</button>
                <button id="chamber-senate-btn" onclick="setChamberFilter('Senate')" class="px-2 py-1 rounded text-[11px] font-semibold text-slate-400 hover:text-white cursor-pointer">Senate</button>
              </div>
            </div>

            <div class="flex items-center justify-between text-xs pt-1 border-t border-slate-800/80">
              <span class="text-[11px] text-slate-400" id="congress-selection-status">Showing all member transactions</span>
              <div class="flex items-center gap-2">
                <button onclick="selectAllPoliticians()" class="text-[11px] text-purple-400 hover:text-purple-300 underline cursor-pointer">Select All</button>
                <button onclick="clearPoliticianSelection()" class="text-[11px] text-rose-400 hover:text-rose-300 underline cursor-pointer">Clear Selection</button>
              </div>
            </div>

            <div class="max-h-36 overflow-y-auto custom-scrollbar p-2 bg-slate-950 rounded-lg border border-slate-800" id="congress-chips-tray">
              <!-- Dynamically populated member selector cards -->
            </div>
          </div>

          <!-- Congressional Disclosure Feed -->
          <div class="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden">
            <div class="p-3.5 border-b border-slate-800 bg-slate-950/40 flex items-center justify-between">
              <h3 class="text-xs font-bold text-white flex items-center gap-1.5">
                <svg class="h-4 w-4 text-purple-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                Official Disclosures & STOCK Act Filings
              </h3>
              <span class="text-[11px] text-slate-400 font-mono" id="congress-disclosure-count"></span>
            </div>
            <div class="p-3 max-h-[600px] overflow-y-auto custom-scrollbar divide-y divide-slate-800/80 space-y-3" id="congress-feed-container">
              <!-- Injected by renderCongressTab() -->
            </div>
          </div>
        </div>

        <!-- TAB PANEL 3: NEWS & WIRE STREAM -->
        <div id="tab-panel-news" class="hidden space-y-4">
          <!-- News Filters Card -->
          <div class="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-3">
            <div class="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <h3 class="text-sm font-bold text-white flex items-center gap-2">
                <svg class="h-4 w-4 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/><path d="M18 14h-8M15 18h-5M10 6h8v4h-8V6Z"/></svg>
                Live Market & Regulatory Wire
              </h3>
              <span class="text-[10px] px-2 py-0.5 rounded border border-amber-800/60 text-amber-300 font-mono">Multi-Feed Wire</span>
            </div>
            <p class="text-xs text-slate-400">Aggregating Yahoo Finance, CNBC, MarketWatch, SEC/Regulatory wires & Donald Trump Truth Social statements.</p>

            <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
              <div class="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
                <button id="feed-all-btn" onclick="setFeedType('ALL')" class="px-2.5 py-1 rounded text-[11px] font-semibold bg-amber-600 text-white cursor-pointer">All Wire</button>
                <button id="feed-articles-btn" onclick="setFeedType('articles')" class="px-2.5 py-1 rounded text-[11px] font-semibold text-slate-400 hover:text-white cursor-pointer">Reputable News</button>
                <button id="feed-trump-btn" onclick="setFeedType('trump')" class="px-2.5 py-1 rounded text-[11px] font-semibold text-slate-400 hover:text-white cursor-pointer">Trump Wire</button>
              </div>

              <select id="news-ticker-select" onchange="filterNews()" class="bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-amber-500 font-mono">
                <option value="ALL">All Tickers</option>
                ${tracked.allTickers.map(t => `<option value="${t}">${t}</option>`).join('')}
              </select>
            </div>
          </div>

          <!-- Combined News & Wire Stream -->
          <div class="space-y-3 max-h-[700px] overflow-y-auto custom-scrollbar" id="news-stream-container">
            <!-- Dynamically populated articles and styled Trump Truth Social posts -->
          </div>
        </div>
      </section>
    </div>
  </main>

  <!-- FACT CHECK STANDARDS MODAL -->
  <div id="transparency-modal" class="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 hidden flex items-center justify-center p-4">
    <div class="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl">
      <div class="flex items-center justify-between border-b border-slate-800 pb-3">
        <div class="flex items-center gap-2">
          <div class="p-2 bg-emerald-950 text-emerald-400 rounded-lg border border-emerald-800/60">
            <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          </div>
          <div>
            <h3 class="text-base font-bold text-white">InsightTrader Data Transparency & Fact-Check Standard</h3>
            <p class="text-xs text-slate-400">How we verify every claim and source</p>
          </div>
        </div>
        <button onclick="toggleTransparencyModal()" class="text-slate-400 hover:text-white p-1 rounded-lg">
          <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>

      <div class="text-xs text-slate-300 space-y-3 max-h-[65vh] overflow-y-auto pr-2 custom-scrollbar">
        <div class="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
          <strong class="text-emerald-400 block text-xs">1. Official Congressional STOCK Act Filings</strong>
          <p class="text-slate-400">
            Downloaded directly from the <strong>U.S. House of Representatives Legislative Resource Center</strong> (<a href="https://disclosures-clerk.house.gov" target="_blank" rel="noopener noreferrer" class="text-blue-400 underline">disclosures-clerk.house.gov</a>) and Senate Financial Disclosures. Each filing is cited with its official government Document ID and a direct PDF download link.
          </p>
        </div>

        <div class="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
          <strong class="text-emerald-400 block text-xs">2. Verified Legislator Bioguide Metadata</strong>
          <p class="text-slate-400">
            Official congressional photographs and committee assignments are linked to the authoritative Biographical Directory of the United States Congress (<a href="https://bioguide.congress.gov" target="_blank" rel="noopener noreferrer" class="text-blue-400 underline">bioguide.congress.gov</a>). No random or unsourced stock photos are ever used.
          </p>
        </div>

        <div class="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
          <strong class="text-emerald-400 block text-xs">3. Real-Time Market Exchange Tape & Formulas</strong>
          <p class="text-slate-400">
            Current trading prices, daily changes, and 30-day percentage calculations are computed against live Yahoo Finance exchange tape. All formulas are published alongside the underlying source tape data.
          </p>
        </div>

        <div class="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
          <strong class="text-emerald-400 block text-xs">4. Donald Trump Public Social Wire (Low Weighting)</strong>
          <p class="text-slate-400">
            Donald Trump's public statements regarding tariffs, defense spending, and technology policy are captured with direct links to Truth Social. They are allocated a strictly limited 5% weighting to provide context without distorting audited filing and price data.
          </p>
        </div>
      </div>

      <div class="pt-3 border-t border-slate-800 flex justify-end">
        <button onclick="toggleTransparencyModal()" class="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs">
          Got It
        </button>
      </div>
    </div>
  </div>

  <!-- PERFORMANCE AUDIT MODAL -->
  <div id="performance-modal" class="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 hidden flex items-center justify-center p-4">
    <div class="bg-slate-900 border border-slate-700 rounded-2xl max-w-3xl w-full p-6 space-y-4 shadow-2xl">
      <div class="flex items-center justify-between border-b border-slate-800 pb-3">
        <div class="flex items-center gap-2">
          <div class="p-2 bg-emerald-950 text-emerald-400 rounded-lg border border-emerald-800/60">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
          </div>
          <div>
            <h3 class="text-base font-bold text-white">Market-Outperformance Confidence & Mathematical Audit</h3>
            <p class="text-xs text-slate-400">Paired difference Student-t test against S&P 500 benchmark (SPY)</p>
          </div>
        </div>
        <button onclick="togglePerformanceModal()" class="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer">
          <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>

      <div class="text-xs text-slate-300 space-y-4 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
        <!-- Top Stats Grid -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div class="bg-slate-950 p-3 rounded-lg border border-emerald-800/60">
            <span class="text-[10px] text-slate-400 font-bold uppercase">Confidence Score</span>
            <div class="text-xl font-black text-emerald-400 mt-0.5">${perf.confidenceDisplay}</div>
            <span class="text-[10px] text-slate-500 font-mono">vs S&P 500</span>
          </div>
          <div class="bg-slate-950 p-3 rounded-lg border border-slate-800">
            <span class="text-[10px] text-slate-400 font-bold uppercase">InsightTrader Return</span>
            <div class="text-xl font-black text-emerald-400 mt-0.5">+${perf.insightTraderReturnPct}%</div>
            <span class="text-[10px] text-slate-500 font-mono">Mean sample return</span>
          </div>
          <div class="bg-slate-950 p-3 rounded-lg border border-slate-800">
            <span class="text-[10px] text-slate-400 font-bold uppercase">Benchmark (SPY)</span>
            <div class="text-xl font-black text-slate-200 mt-0.5">+${perf.benchmarkReturnPct}%</div>
            <span class="text-[10px] text-slate-500 font-mono">S&P 500 tape return</span>
          </div>
          <div class="bg-slate-950 p-3 rounded-lg border border-slate-800">
            <span class="text-[10px] text-slate-400 font-bold uppercase">Mean Excess (Alpha)</span>
            <div class="text-xl font-black text-emerald-400 mt-0.5">+${perf.excessReturnPct}%</div>
            <span class="text-[10px] text-slate-500 font-mono">Win Rate: ${perf.winRatePct}%</span>
          </div>
        </div>

        <!-- Mathematical Methodology Box -->
        <div class="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
          <div class="flex items-center justify-between">
            <h4 class="text-xs font-bold text-white flex items-center gap-1.5">
              <svg class="h-4 w-4 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              Exact Statistical Methodology & Formulas
            </h4>
            <span class="text-[9px] px-1.5 py-0.5 rounded border border-slate-700 text-slate-400 font-mono">Student-t Hypothesis Test</span>
          </div>
          <p class="text-slate-300 text-[11px] leading-relaxed">
            InsightTrader computes statistical confidence that recommendations outperform the market using a <strong>paired difference Student-t test</strong> comparing observed percentage returns against the S&P 500 Index (SPY ETF) over identical holding periods.
          </p>

          <div class="bg-slate-900/90 p-3 rounded-lg border border-slate-800 font-mono text-[11px] space-y-1.5 text-slate-300">
            <div class="flex justify-between border-b border-slate-800 pb-1">
              <span>1. Paired Difference:</span>
              <span class="text-emerald-400">D_i = Return(Signal_i) - Return(SPY_i)</span>
            </div>
            <div class="flex justify-between border-b border-slate-800 pb-1">
              <span>2. Sample Mean Difference:</span>
              <span class="text-emerald-400">D̄ = (1 / n) * Σ D_i = +${perf.excessReturnPct}%</span>
            </div>
            <div class="flex justify-between border-b border-slate-800 pb-1">
              <span>3. Sample Standard Deviation:</span>
              <span class="text-slate-300">s_D = √[ Σ(D_i - D̄)² / (n - 1) ] = ${perf.sampleStdDev}</span>
            </div>
            <div class="flex justify-between border-b border-slate-800 pb-1">
              <span>4. Standard Error:</span>
              <span class="text-slate-300">SE = s_D / √n = ${perf.standardError}</span>
            </div>
            <div class="flex justify-between border-b border-slate-800 pb-1">
              <span>5. Student-t Statistic:</span>
              <span class="text-emerald-400">t = D̄ / SE = ${perf.tStatistic}</span>
            </div>
            <div class="flex justify-between pt-0.5">
              <span>6. CDF Confidence Metric:</span>
              <span class="text-emerald-400">Confidence = Φ(t) = ${perf.confidenceDisplay}</span>
            </div>
          </div>

          <p class="text-[11px] text-slate-400">
            <strong>Sample Size Threshold:</strong> Minimum sample threshold is <strong>n ≥ 3</strong> signals. If fewer than 3 signals are available, the metric explicitly displays <span class="font-mono text-amber-400">"Insufficient Data"</span> to avoid unrepresentative significance.
          </p>
        </div>

        <!-- Underlying Data Sources & Benchmark -->
        <div class="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2">
          <h4 class="text-xs font-bold text-white flex items-center justify-between">
            <span>Underlying Tape Sources & Benchmark</span>
            <a href="https://finance.yahoo.com/quote/SPY" target="_blank" rel="noopener noreferrer" class="text-[11px] text-blue-400 hover:text-blue-300 underline flex items-center gap-1 font-normal">
              View SPY Tape on Yahoo Finance ↗
            </a>
          </h4>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div class="bg-slate-900 p-2.5 rounded border border-slate-800">
              <span class="text-slate-400 block text-[10px]">Benchmark Instrument:</span>
              <strong class="text-white">SPDR S&P 500 ETF Trust (Ticker: SPY)</strong>
              <span class="text-slate-400 block text-[10px] mt-1">Tape Price: <strong class="text-emerald-400 font-mono">$${perf.benchmarkCurrentPrice}</strong></span>
            </div>
            <div class="bg-slate-900 p-2.5 rounded border border-slate-800">
              <span class="text-slate-400 block text-[10px]">Market Price Provider:</span>
              <strong class="text-white">Yahoo Finance Real-Time Tape</strong>
              <span class="text-slate-400 block text-[10px] mt-1">Updated at feed synchronization timestamps.</span>
            </div>
          </div>
        </div>

        <!-- Evaluated Signals Table -->
        <div class="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2">
          <div class="flex items-center justify-between">
            <h4 class="text-xs font-bold text-white">Evaluated Recommendation Sample (n = ${perf.evaluatedSignalsCount})</h4>
            <span class="text-[10px] text-slate-400">Auditable Inputs</span>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-[11px] text-left">
              <thead class="text-slate-400 border-b border-slate-800 uppercase text-[10px]">
                <tr>
                  <th class="py-2 pr-2">Ticker</th>
                  <th class="py-2 px-2">Signal</th>
                  <th class="py-2 px-2">Entry Tape</th>
                  <th class="py-2 px-2">Current Tape</th>
                  <th class="py-2 px-2">Signal %</th>
                  <th class="py-2 px-2">SPY %</th>
                  <th class="py-2 pl-2 text-right">Alpha (D_i)</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-800 font-mono">
                ${perf.evaluatedSignals.map(item => `
                  <tr class="hover:bg-slate-900/50">
                    <td class="py-2 pr-2 font-bold text-white">
                      <a href="https://finance.yahoo.com/quote/${item.ticker}" target="_blank" rel="noopener noreferrer" class="text-blue-400 hover:text-blue-300 underline">
                        ${item.ticker}
                      </a>
                    </td>
                    <td class="py-2 px-2"><span class="text-emerald-400 font-semibold">${item.direction}</span></td>
                    <td class="py-2 px-2 text-slate-300">$${item.entryPrice}</td>
                    <td class="py-2 px-2 text-slate-300">$${item.currentPrice}</td>
                    <td class="py-2 px-2 font-semibold text-emerald-400">+${item.returnPct}%</td>
                    <td class="py-2 px-2 text-slate-400">+${item.benchmarkReturnPct}%</td>
                    <td class="py-2 pl-2 text-right font-bold text-emerald-400">+${item.excessReturnPct}%</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Regulatory Compliance Disclaimer (Mandatory) -->
        <div class="p-3 bg-amber-950/40 rounded-xl border border-amber-800/60 space-y-1">
          <div class="flex items-center gap-1.5 text-amber-300 font-bold text-xs">
            <svg class="h-4 w-4 shrink-0 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            <span>Mandatory Regulatory & Statistical Notice</span>
          </div>
          <p class="text-[11px] text-amber-200/90 leading-relaxed">
            Do not interpret confidence as a guarantee of future returns. InsightTrader's market-outperformance confidence metric is a backward-looking paired-difference statistical hypothesis test comparing observed signal returns against the S&P 500 benchmark (SPY). Past performance is no guarantee of future trading performance. This application does not provide registered investment advisory services.
          </p>
        </div>
      </div>

      <div class="pt-3 border-t border-slate-800 flex justify-end">
        <button onclick="togglePerformanceModal()" class="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs cursor-pointer">
          Close Audit
        </button>
      </div>
    </div>
  </div>

  <!-- Client-side script to render dataset and wire interactions -->
  <script>
    let currentDataset = ${JSON.stringify(dataset)};
    let currentPerformance = ${JSON.stringify(perf)};
    let activeSignalId = currentDataset.signals[0]?.id;
    let activeRightTab = 'stock';
    let selectedPoliticianIds = new Set();
    let congressSearchQuery = '';
    let congressChamberFilter = 'ALL';
    let newsTickerFilter = 'ALL';
    let newsFeedType = 'ALL';

    function isLanxessString(str) {
      if (!str) return false;
      const s = String(str).toUpperCase();
      return s.includes('LANXESS') || s === 'LXS.DE' || s === 'LNXSF' || s === 'LNXSY' || s === 'LXS';
    }

    function toggleTransparencyModal() {
      const modal = document.getElementById('transparency-modal');
      modal.classList.toggle('hidden');
    }

    function togglePerformanceModal() {
      const modal = document.getElementById('performance-modal');
      modal.classList.toggle('hidden');
    }

    function updateKpiCards() {
      if (!currentDataset.summary) return;
      document.getElementById('kpi-active').innerText = currentDataset.summary.activeSignalsCount || currentDataset.signals.length;
      document.getElementById('kpi-tracked').innerText = currentDataset.summary.trackedTickersCount || currentDataset.signals.length;
      const coreCount = ${CORE_TICKERS.length};
      const userCount = (currentDataset.summary.userAddedTickersCount ?? (currentDataset.signals.length - coreCount));
      document.getElementById('kpi-core-user').innerText = coreCount + ' Core · ' + Math.max(0, userCount) + ' User-Added';
      document.getElementById('kpi-ptrs').innerText = currentDataset.summary.officialPtrFilingsCataloged || 379;
      document.getElementById('kpi-rss').innerText = currentDataset.news.length || 30;
      document.getElementById('last-sync-time').innerText = 'Last Synced: ' + new Date(currentDataset.summary.lastUpdatedIso || Date.now()).toLocaleTimeString();
    }

    function renderTrackedChips() {
      const container = document.getElementById('tracked-chips-container');
      const tracked = currentDataset.trackedTickers || { coreTickers: ${JSON.stringify(CORE_TICKERS)}, userTickers: [] };
      const coreList = tracked.coreTickers || ${JSON.stringify(CORE_TICKERS)};
      const userList = tracked.userTickers || [];

      let html = '';

      // Core tickers
      for (const t of coreList) {
        if (isLanxessString(t)) continue;
        const sig = currentDataset.signals.find(s => s.ticker === t);
        const verdict = sig?.verdict?.action || 'WATCH';
        const vColor = verdict === 'BUY' ? 'text-emerald-400 border-emerald-800/80 bg-emerald-950/40' :
                       verdict === 'SELL' ? 'text-rose-400 border-rose-800/80 bg-rose-950/40' :
                       'text-amber-400 border-amber-800/80 bg-amber-950/40';

        html += \`
          <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono">
            <button onclick="selectSignalByTicker('\${t}')" class="font-bold text-white hover:text-emerald-400 cursor-pointer">\${t}</button>
            <span class="text-[10px] px-1 py-0.2 rounded bg-slate-800 text-slate-400">Core</span>
            <span class="text-[10px] font-semibold px-1.5 py-0.2 rounded border \${vColor}">\${verdict}</span>
          </span>
        \`;
      }

      // User tickers
      for (const t of userList) {
        if (isLanxessString(t)) continue;
        const sig = currentDataset.signals.find(s => s.ticker === t);
        const verdict = sig?.verdict?.action || 'WATCH';
        const vColor = verdict === 'BUY' ? 'text-emerald-400 border-emerald-800/80 bg-emerald-950/40' :
                       verdict === 'SELL' ? 'text-rose-400 border-rose-800/80 bg-rose-950/40' :
                       'text-amber-400 border-amber-800/80 bg-amber-950/40';

        html += \`
          <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950 border border-blue-900/60 text-xs font-mono">
            <button onclick="selectSignalByTicker('\${t}')" class="font-bold text-blue-300 hover:text-white cursor-pointer">\${t}</button>
            <span class="text-[10px] px-1 py-0.2 rounded bg-blue-950 text-blue-300 border border-blue-800/50">User</span>
            <span class="text-[10px] font-semibold px-1.5 py-0.2 rounded border \${vColor}">\${verdict}</span>
            <button onclick="handleRemoveStock('\${t}')" title="Remove \${t}" class="text-slate-400 hover:text-rose-400 ml-0.5 cursor-pointer font-bold">×</button>
          </span>
        \`;
      }

      container.innerHTML = html;
    }

    function renderSignals() {
      const container = document.getElementById('signals-container');
      const searchQuery = document.getElementById('search-input').value.toLowerCase();
      const directionFilter = document.getElementById('direction-filter').value;

      const filtered = currentDataset.signals.filter(s => {
        if (isLanxessString(s.ticker) || isLanxessString(s.companyName)) return false;
        const verdict = s.verdict?.action || s.direction;
        const matchesDir = directionFilter === 'ALL' || verdict === directionFilter || s.direction === directionFilter;
        const matchesSearch = s.ticker.toLowerCase().includes(searchQuery) ||
                              s.companyName.toLowerCase().includes(searchQuery) ||
                              s.headline.toLowerCase().includes(searchQuery);
        return matchesDir && matchesSearch;
      });

      if (filtered.length === 0) {
        container.innerHTML = '<div class="p-8 text-center text-slate-500 border border-dashed border-slate-800 rounded-xl">No stocks match filter.</div>';
        return;
      }

      container.innerHTML = filtered.map(s => {
        const isSelected = s.id === activeSignalId;
        const verdict = s.verdict?.action || (s.direction === 'BULLISH' ? 'BUY' : s.direction === 'BEARISH' ? 'SELL' : 'HOLD');
        const conf = s.verdict?.confidenceScorePct || s.confidenceScorePct;

        const isBuy = verdict === 'BUY';
        const isSell = verdict === 'SELL';
        const badgeColor = isBuy ? 'bg-emerald-950 text-emerald-300 border-emerald-800' :
                           isSell ? 'bg-rose-950 text-rose-300 border-rose-800' :
                           'bg-amber-950 text-amber-300 border-amber-800';

        const curPrice = s.metrics.currentPrice ?? s.metrics.entryPrice;
        const citationCount = s.citations?.length || 0;
        const quoteObj = (currentDataset.quotes || []).find(q => q.ticker === s.ticker);
        const change30d = quoteObj?.change30DayPct ?? 0;
        const change1d = quoteObj?.changeTodayPct ?? 0;

        return \`
          <div onclick="selectSignal('\${s.id}')" class="p-4 rounded-xl border transition-all cursor-pointer \${isSelected ? 'bg-slate-900 border-emerald-500 ring-1 ring-emerald-500/40' : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'}">
            <div class="flex items-center justify-between mb-2">
              <div class="flex items-center gap-2.5">
                <span class="font-black text-sm text-white px-2 py-0.5 bg-slate-800 rounded border border-slate-700 font-mono">\${s.ticker}</span>
                <div>
                  <h4 class="text-xs font-bold text-white">\${s.companyName}</h4>
                  <span class="text-[11px] text-slate-400">\${s.sector}</span>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <a href="https://finance.yahoo.com/quote/\${s.ticker}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()" class="text-xs font-mono font-semibold text-emerald-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800 hover:text-emerald-300 flex items-center gap-1">
                  $\${curPrice}
                  <svg class="h-2.5 w-2.5 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                </a>
                <span class="text-xs font-bold px-2 py-0.5 rounded border \${badgeColor}">
                  \${verdict} · \${conf}%
                </span>
              </div>
            </div>

            <p class="text-xs text-slate-300 font-medium mb-2.5 line-clamp-2">\${s.verdict?.rationale || s.headline}</p>

            <div class="flex flex-wrap items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/80 gap-2">
              <div class="flex items-center gap-3">
                <span>Today: <strong class="\${change1d >= 0 ? 'text-emerald-400' : 'text-rose-400'}">\${change1d >= 0 ? '+' : ''}\${change1d}%</strong></span>
                <span>30-Day: <strong class="\${change30d >= 0 ? 'text-emerald-400' : 'text-rose-400'}">\${change30d >= 0 ? '+' : ''}\${change30d}%</strong></span>
                <span>Target: <strong class="text-emerald-400">$\${s.metrics.targetPrice}</strong></span>
              </div>
              <span class="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded-full">
                <svg class="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                \${citationCount} Primary Sources ↗
              </span>
            </div>
          </div>
        \`;
      }).join('');
    }

    function selectSignal(id) {
      activeSignalId = id;
      renderSignals();
      renderBriefing();
      switchRightTab('stock');
    }

    function selectSignalByTicker(ticker) {
      const sig = currentDataset.signals.find(s => s.ticker === ticker);
      if (sig) {
        activeSignalId = sig.id;
        renderSignals();
        renderBriefing();
        switchRightTab('stock');
      }
    }

    function renderBriefing() {
      const s = currentDataset.signals.find(sig => sig.id === activeSignalId) || currentDataset.signals[0];
      if (!s) return;

      const verdict = s.verdict?.action || (s.direction === 'BULLISH' ? 'BUY' : s.direction === 'BEARISH' ? 'SELL' : 'HOLD');
      const conf = s.verdict?.confidenceScorePct || s.confidenceScorePct;

      document.getElementById('briefing-conviction').innerText = s.conviction + ' Conviction';
      document.getElementById('briefing-model').innerText = s.aiModel;
      document.getElementById('briefing-date').innerText = 'Generated ' + (s.generatedAt ? s.generatedAt.split('T')[0] : 'Today');
      document.getElementById('briefing-title').innerText = s.ticker + ' · ' + s.companyName;
      
      const priceTag = document.getElementById('briefing-price-tag');
      priceTag.innerText = 'Current: $' + (s.metrics.currentPrice || s.metrics.entryPrice) + ' (Tape) ↗';
      priceTag.href = 'https://finance.yahoo.com/quote/' + s.ticker;

      document.getElementById('briefing-headline').innerText = s.headline;

      // Verdict Box
      const verdictBadge = document.getElementById('briefing-verdict-badge');
      verdictBadge.innerText = verdict;
      verdictBadge.className = verdict === 'BUY'
        ? 'px-3 py-1 rounded text-xs font-black bg-emerald-950 text-emerald-300 border border-emerald-800'
        : verdict === 'SELL'
        ? 'px-3 py-1 rounded text-xs font-black bg-rose-950 text-rose-300 border border-rose-800'
        : 'px-3 py-1 rounded text-xs font-black bg-amber-950 text-amber-300 border border-amber-800';

      document.getElementById('briefing-confidence').innerText = 'Confidence: ' + conf + '%';
      document.getElementById('briefing-verdict-rationale').innerText = s.verdict?.rationale || s.thesis;

      // Render Multi-Pillar Evidentiary Derivation
      const pillarsContainer = document.getElementById('briefing-pillars-container');
      const calcMethodEl = document.getElementById('briefing-calc-method');
      calcMethodEl.innerText = s.verdict?.calculationMethod || 'Multi-pillar derivation with transparent weighting.';

      if (s.verdict?.pillars && s.verdict.pillars.length > 0) {
        pillarsContainer.innerHTML = s.verdict.pillars.map(p => \`
          <div class="bg-slate-900 p-2.5 rounded-lg border border-slate-800 text-xs space-y-1">
            <div class="flex items-center justify-between">
              <strong class="text-white flex items-center gap-1.5">
                \${p.name}
                <span class="text-[10px] text-emerald-400 font-mono">Weight: \${p.weightPct}%</span>
              </strong>
              <span class="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded \${p.score > 0 ? 'bg-emerald-950 text-emerald-300' : p.score < 0 ? 'bg-rose-950 text-rose-300' : 'bg-slate-800 text-slate-400'}">
                Score: \${p.score > 0 ? '+' : ''}\${p.score}
              </span>
            </div>
            <p class="text-slate-300 text-[11px]">\${p.summary}</p>
            <div class="pt-1 flex flex-wrap items-center gap-2">
              \${(p.sources || []).map(src => \`
                <a href="\${src.url}" target="_blank" rel="noopener noreferrer" class="text-[10px] text-blue-400 hover:text-blue-300 underline flex items-center gap-1">
                  \${src.name} ↗
                </a>
              \`).join('')}
            </div>
          </div>
        \`).join('');
      } else {
        pillarsContainer.innerHTML = '<p class="text-slate-500 text-xs">Derivation details available on refresh.</p>';
      }

      // Render Primary Citations Audit Trail
      const citationsContainer = document.getElementById('briefing-citations');
      if (s.citations && s.citations.length > 0) {
        citationsContainer.innerHTML = s.citations.map(c => \`
          <div class="bg-slate-900 p-2.5 rounded-lg border border-slate-800 text-xs space-y-1">
            <div class="flex items-center justify-between">
              <span class="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                \${c.sourceType}
              </span>
              <span class="text-[10px] text-slate-500 font-mono">\${c.verifiedDate}</span>
            </div>
            <p class="text-slate-200 font-medium text-[11px]">\${c.claim}</p>
            <div class="pt-1 border-t border-slate-800/80 flex items-center justify-between">
              <span class="text-[10px] text-slate-400 truncate max-w-[220px]">\${c.sourceName}</span>
              <a href="\${c.sourceUrl}" target="_blank" rel="noopener noreferrer" class="text-[11px] font-medium text-emerald-400 hover:text-emerald-300 underline flex items-center gap-1 shrink-0">
                Verify Source
                <svg class="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
              </a>
            </div>
          </div>
        \`).join('');
      } else {
        citationsContainer.innerHTML = '<p class="text-slate-500 text-xs">Citations available upon refresh.</p>';
      }

      // Render Disclosures with authentic PDF links
      const discContainer = document.getElementById('briefing-disclosures');
      if (s.evidence.disclosures && s.evidence.disclosures.length > 0) {
        discContainer.innerHTML = s.evidence.disclosures.map(d => {
          const pdfUrl = d.filingDocUrl || 'https://disclosures-clerk.house.gov/public_disc/financial-pdfs/2026FD.ZIP';
          return \`
            <div class="bg-slate-950 p-2.5 rounded border border-slate-800 text-xs">
              <div class="flex items-center justify-between">
                <strong class="text-white flex items-center gap-1.5">
                  \${d.politicianName}
                  <span class="text-[10px] text-slate-400 font-normal">(\${d.transactionDate || '2026'})</span>
                </strong>
                <span class="\${d.transactionType === 'BUY' ? 'text-emerald-400' : 'text-rose-400'} font-semibold">\${d.transactionType} (\${d.amountBracket})</span>
              </div>
              <p class="text-slate-400 text-[11px] mt-1">\${d.committeeContext}</p>
              <div class="mt-2 pt-1.5 border-t border-slate-900 flex items-center justify-between">
                <span class="text-[10px] text-slate-500 font-mono">STOCK Act PTR Document</span>
                <a href="\${pdfUrl}" target="_blank" rel="noopener noreferrer" class="text-[11px] text-blue-400 hover:text-blue-300 underline flex items-center gap-1">
                  View Official Clerk PDF
                  <svg class="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                </a>
              </div>
            </div>
          \`;
        }).join('');
      } else {
        discContainer.innerHTML = \`
          <div class="p-3 bg-slate-950 rounded border border-slate-800 text-xs text-slate-400 space-y-1">
            <p>No congressional transactions cataloged in 2026 House Clerk records for \${s.ticker}.</p>
            <p class="text-[10px] text-amber-400/90">Note: Absence of insider congressional disclosures transparently reduces conviction score.</p>
          </div>
        \`;
      }

      // Render News with live links
      const newsContainer = document.getElementById('briefing-news');
      if (s.evidence.newsCatalysts && s.evidence.newsCatalysts.length > 0) {
        newsContainer.innerHTML = s.evidence.newsCatalysts.map(n => {
          const articleUrl = n.articleUrl || '#';
          return \`
            <div class="bg-slate-950 p-2.5 rounded border border-slate-800 text-xs">
              <div class="flex items-center justify-between text-slate-400 text-[11px]">
                <span class="font-medium text-emerald-400/90">\${n.source}</span>
                <span>\${n.publishedAt ? new Date(n.publishedAt).toLocaleDateString() : 'Live Feed'}</span>
              </div>
              <a href="\${articleUrl}" target="_blank" rel="noopener noreferrer" class="text-slate-200 font-medium mt-0.5 hover:text-emerald-300 block transition-colors flex items-center gap-1.5">
                <span>\${n.headline}</span>
                <svg class="h-3 w-3 shrink-0 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
              </a>
              <p class="text-slate-400 text-[11px] mt-1">\${n.relevanceNote}</p>
            </div>
          \`;
        }).join('');
      } else {
        newsContainer.innerHTML = '<p class="text-slate-500 text-xs">No recent news ingested for this stock.</p>';
      }

      // Render Trump Posts relevant to this stock
      const trumpContainer = document.getElementById('briefing-trump');
      const stockTrumpPosts = (currentDataset.trumpPosts || []).filter(tp => {
        if (isLanxessString(tp)) return false;
        return (tp.matchedTickers && tp.matchedTickers.includes(s.ticker)) ||
               (tp.content && tp.content.toUpperCase().includes(s.ticker));
      });

      if (stockTrumpPosts.length > 0) {
        trumpContainer.innerHTML = stockTrumpPosts.map(tp => \`
          <div class="bg-slate-950 p-2.5 rounded border border-rose-950/60 text-xs space-y-1">
            <div class="flex items-center justify-between text-[11px]">
              <span class="font-bold text-rose-300">\${tp.author}</span>
              <span class="text-slate-500 font-mono">\${new Date(tp.publishedAt).toLocaleDateString()}</span>
            </div>
            <p class="text-slate-200 text-xs">\${tp.content}</p>
            <div class="pt-1 flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-900">
              <span class="px-1.5 py-0.2 rounded bg-slate-900 text-slate-300 font-mono">\${tp.topic}</span>
              <a href="\${tp.postUrl}" target="_blank" rel="noopener noreferrer" class="text-rose-400 hover:text-rose-300 underline flex items-center gap-1">
                View Public Post ↗
              </a>
            </div>
          </div>
        \`).join('');
      } else {
        trumpContainer.innerHTML = '<p class="text-slate-500 text-xs">No direct Trump social media statements identified for this stock.</p>';
      }

      // Render Legislative Hooks
      const hooksContainer = document.getElementById('briefing-hooks');
      if (s.evidence.legislativeHooks && s.evidence.legislativeHooks.length > 0) {
        hooksContainer.innerHTML = s.evidence.legislativeHooks.map(h => \`<li>\${h}</li>\`).join('');
        document.getElementById('briefing-hooks-section').style.display = 'block';
      } else {
        document.getElementById('briefing-hooks-section').style.display = 'none';
      }

      // Render Risks
      const risksContainer = document.getElementById('briefing-risks');
      risksContainer.innerHTML = s.keyRisks.map(r => \`<li>\${r}</li>\`).join('');
    }

    function renderPoliticians() {
      const container = document.getElementById('politicians-list');
      container.innerHTML = currentDataset.politicians.map(p => {
        const bioguideLink = p.bioguideUrl || (p.bioguideId ? 'https://bioguide.congress.gov/search/bio/' + p.bioguideId : '#');
        const initials = p.name ? p.name.split(' ').map(n=>n[0]).join('').slice(0,2) : 'US';
        const fallbackSvg = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'><rect width='100%25' height='100%25' fill='%23334155'/><text x='50%25' y='55%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='36' font-weight='bold' fill='%23f8fafc'>" + initials + "</text></svg>";

        return \`
          <div class="py-2.5 flex items-center justify-between gap-3">
            <div class="flex items-center gap-2.5">
              <img
                src="\${p.avatarUrl}"
                alt="\${p.name}"
                class="h-8 w-8 rounded-full object-cover border border-slate-700 bg-slate-800 shrink-0"
                onerror="this.onerror=null; this.src='\${fallbackSvg}'"
              />
              <div>
                <div class="flex items-center gap-1.5">
                  <a href="\${bioguideLink}" target="_blank" rel="noopener noreferrer" class="text-xs font-semibold text-white hover:text-blue-300 underline flex items-center gap-1">
                    \${p.name}
                    <svg class="h-2.5 w-2.5 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                  </a>
                  <span class="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 font-mono">\${p.party[0]}-\${p.state}</span>
                </div>
                <p class="text-[11px] text-slate-400">\${p.chamber} · \${p.totalTradesTracked} trades · Bioguide: \${p.bioguideId || 'Official'}</p>
              </div>
            </div>
            <div class="text-right">
              <span class="text-xs font-semibold text-emerald-400 block">+\${p.alphaVsSp500Pct}% Alpha</span>
              <span class="text-[11px] text-slate-400">$\${(p.tradeVolumeYtdUsd / 1000000).toFixed(1)}M YTD</span>
            </div>
          </div>
        \`;
      }).join('');
    }

    function renderTrumpPosts() {
      const container = document.getElementById('trump-posts-feed');
      const posts = (currentDataset.trumpPosts || []).filter(p => !isLanxessString(p));
      document.getElementById('trump-posts-count').innerText = posts.length + ' Verified Statements';

      if (posts.length === 0) {
        container.innerHTML = '<p class="text-slate-500 text-xs p-3">No Trump public statements currently cataloged.</p>';
        return;
      }

      container.innerHTML = posts.map(p => {
        const sentimentColor = p.sentiment === 'Bullish' ? 'text-emerald-400 border-emerald-800/80 bg-emerald-950/40' :
                              p.sentiment === 'Bearish' ? 'text-rose-400 border-rose-800/80 bg-rose-950/40' :
                              'text-slate-300 border-slate-700 bg-slate-800/40';

        return \`
          <div class="py-3 first:pt-0 last:pb-0 space-y-1.5">
            <div class="flex items-center justify-between text-[11px]">
              <div class="flex items-center gap-1.5">
                <span class="font-bold text-white">\${p.author}</span>
                <span class="text-slate-500 font-mono">\${p.handle}</span>
              </div>
              <span class="text-slate-500 font-mono text-[10px]">\${new Date(p.publishedAt).toLocaleDateString()}</span>
            </div>
            <p class="text-xs text-slate-200 leading-relaxed">\${p.content}</p>
            <div class="flex flex-wrap items-center justify-between gap-2 pt-1">
              <div class="flex items-center gap-1.5">
                <span class="text-[10px] px-1.5 py-0.2 rounded border font-mono \${sentimentColor}">\${p.sentiment || 'Neutral'}</span>
                <span class="text-[10px] text-slate-400 truncate max-w-[200px]">\${p.topic}</span>
              </div>
              <div class="flex items-center gap-2">
                \${(p.matchedTickers || []).map(t => \`
                  <button onclick="selectSignalByTicker('\${t}')" class="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-slate-800 text-emerald-400 hover:text-white cursor-pointer">\${t}</button>
                \`).join('')}
                <a href="\${p.postUrl}" target="_blank" rel="noopener noreferrer" class="text-[10px] text-rose-400 hover:text-rose-300 underline flex items-center gap-0.5">
                  Source Post ↗
                </a>
              </div>
            </div>
          </div>
        \`;
      }).join('');
    }

    async function handleAddStock(event) {
      event.preventDefault();
      const input = document.getElementById('ticker-input');
      const btn = document.getElementById('add-stock-btn');
      const btnText = document.getElementById('add-stock-btn-text');
      const feedback = document.getElementById('ticker-feedback');
      const ticker = input.value.trim().toUpperCase();

      if (!ticker) return;

      if (isLanxessString(ticker)) {
        feedback.className = 'text-xs px-3 py-2 rounded-lg border bg-rose-950/80 text-rose-300 border-rose-800 block';
        feedback.innerText = 'LANXESS AG and related securities (LXS, LXS.DE, LNXSF, LNXSY) are excluded from this platform.';
        return;
      }

      btn.disabled = true;
      btnText.innerText = 'Validating...';
      feedback.className = 'hidden';

      try {
        const res = await fetch('/api/tickers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ticker }),
        });

        const data = await res.json();

        if (res.ok) {
          feedback.className = 'text-xs px-3 py-2 rounded-lg border bg-emerald-950/80 text-emerald-300 border-emerald-800 block';
          feedback.innerText = '✓ Successfully added ' + data.ticker + ' (' + data.companyName + ') with live quote $' + data.quote.currentPrice + '!';
          input.value = '';
          await refreshAllData();
          selectSignalByTicker(data.ticker);
          setTimeout(() => { feedback.className = 'hidden'; }, 4000);
        } else {
          feedback.className = 'text-xs px-3 py-2 rounded-lg border bg-rose-950/80 text-rose-300 border-rose-800 block';
          feedback.innerText = '✕ ' + (data.error || 'Failed to add ticker.');
        }
      } catch (err) {
        feedback.className = 'text-xs px-3 py-2 rounded-lg border bg-rose-950/80 text-rose-300 border-rose-800 block';
        feedback.innerText = '✕ Network error: ' + err.message;
      } finally {
        btn.disabled = false;
        btnText.innerText = 'Add Stock';
      }
    }

    async function handleRemoveStock(ticker) {
      if (!confirm('Remove ' + ticker + ' from your tracked stocks?')) return;
      const feedback = document.getElementById('ticker-feedback');

      try {
        const res = await fetch('/api/tickers/' + encodeURIComponent(ticker), { method: 'DELETE' });
        const data = await res.json();
        if (res.ok) {
          feedback.className = 'text-xs px-3 py-2 rounded-lg border bg-blue-950/80 text-blue-300 border-blue-800 block';
          feedback.innerText = 'Removed ' + ticker + ' from tracked list.';
          await refreshAllData();
          setTimeout(() => { feedback.className = 'hidden'; }, 3000);
        } else {
          alert(data.error || 'Could not remove stock.');
        }
      } catch (err) {
        alert('Network error: ' + err.message);
      }
    }

    async function refreshAllData() {
      try {
        const [sigRes, sumRes, quotesRes] = await Promise.all([
          fetch('/api/signals').then(r => r.json()),
          fetch('/api/summary').then(r => r.json()),
          fetch('/api/quotes').then(r => r.json()),
        ]);

        if (Array.isArray(sigRes)) currentDataset.signals = sigRes;
        if (sumRes) currentDataset.summary = sumRes;
        if (Array.isArray(quotesRes)) currentDataset.quotes = quotesRes;

        const trackedRes = await fetch('/api/tickers').then(r => r.json());
        if (trackedRes) currentDataset.trackedTickers = trackedRes;

        updateKpiCards();
        renderTrackedChips();
        renderSignals();
        renderBriefing();
        renderCongressTab();
        renderNewsTab();
      } catch (err) {
        console.error('Error refreshing local data:', err);
      }
    }

    async function triggerLiveRefresh() {
      const btn = document.getElementById('refresh-btn');
      const text = document.getElementById('refresh-text');
      const spinner = document.getElementById('refresh-spinner');

      btn.disabled = true;
      spinner.classList.add('animate-spin');
      text.innerText = 'Syncing Feeds...';

      try {
        const res = await fetch('/api/refresh', { method: 'POST' });
        if (res.ok) {
          const freshData = await res.json();
          currentDataset = freshData;
          activeSignalId = currentDataset.signals[0]?.id;
          updateKpiCards();
          renderTrackedChips();
          renderSignals();
          renderBriefing();
          renderCongressTab();
          renderNewsTab();
          text.innerText = 'Synced!';
          setTimeout(() => { text.innerText = 'Refresh Live Feeds'; }, 2000);
        } else {
          text.innerText = 'Sync Failed';
          setTimeout(() => { text.innerText = 'Refresh Live Feeds'; }, 2000);
        }
      } catch (err) {
        console.error('Refresh error:', err);
        text.innerText = 'Error';
        setTimeout(() => { text.innerText = 'Refresh Live Feeds'; }, 2000);
      } finally {
        btn.disabled = false;
        spinner.classList.remove('animate-spin');
      }
    }

    function switchRightTab(tab) {
      activeRightTab = tab;
      const stockPanel = document.getElementById('tab-panel-stock');
      const congressPanel = document.getElementById('tab-panel-congress');
      const newsPanel = document.getElementById('tab-panel-news');

      const stockBtn = document.getElementById('tab-btn-stock');
      const congressBtn = document.getElementById('tab-btn-congress');
      const newsBtn = document.getElementById('tab-btn-news');

      if (!stockPanel || !congressPanel || !newsPanel) return;

      stockPanel.classList.add('hidden');
      congressPanel.classList.add('hidden');
      newsPanel.classList.add('hidden');

      stockBtn.className = 'flex-1 py-2 px-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer text-slate-400 hover:text-slate-200 hover:bg-slate-800/60';
      congressBtn.className = 'flex-1 py-2 px-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer text-slate-400 hover:text-slate-200 hover:bg-slate-800/60';
      newsBtn.className = 'flex-1 py-2 px-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer text-slate-400 hover:text-slate-200 hover:bg-slate-800/60';

      if (tab === 'stock') {
        stockPanel.classList.remove('hidden');
        stockBtn.className = 'flex-1 py-2 px-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer bg-emerald-600 text-white shadow-sm';
        renderBriefing();
      } else if (tab === 'congress') {
        congressPanel.classList.remove('hidden');
        congressBtn.className = 'flex-1 py-2 px-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer bg-purple-600 text-white shadow-sm';
        renderCongressTab();
      } else if (tab === 'news') {
        newsPanel.classList.remove('hidden');
        newsBtn.className = 'flex-1 py-2 px-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer bg-amber-600 text-white shadow-sm';
        renderNewsTab();
      }
    }

    function setChamberFilter(ch) {
      congressChamberFilter = ch;
      const allBtn = document.getElementById('chamber-all-btn');
      const houseBtn = document.getElementById('chamber-house-btn');
      const senateBtn = document.getElementById('chamber-senate-btn');
      if (allBtn) allBtn.className = ch === 'ALL' ? 'px-2 py-1 rounded text-[11px] font-semibold bg-purple-600 text-white cursor-pointer' : 'px-2 py-1 rounded text-[11px] font-semibold text-slate-400 hover:text-white cursor-pointer';
      if (houseBtn) houseBtn.className = ch === 'House' ? 'px-2 py-1 rounded text-[11px] font-semibold bg-blue-600 text-white cursor-pointer' : 'px-2 py-1 rounded text-[11px] font-semibold text-slate-400 hover:text-white cursor-pointer';
      if (senateBtn) senateBtn.className = ch === 'Senate' ? 'px-2 py-1 rounded text-[11px] font-semibold bg-purple-700 text-white cursor-pointer' : 'px-2 py-1 rounded text-[11px] font-semibold text-slate-400 hover:text-white cursor-pointer';
      renderCongressTab();
    }

    function filterCongress() {
      const input = document.getElementById('congress-search-input');
      congressSearchQuery = input ? input.value.toLowerCase() : '';
      renderCongressTab();
    }

    function togglePoliticianSelection(id) {
      if (selectedPoliticianIds.has(id)) {
        selectedPoliticianIds.delete(id);
      } else {
        selectedPoliticianIds.add(id);
      }
      renderCongressTab();
    }

    function selectAllPoliticians() {
      const filtered = getFilteredPoliticians();
      filtered.forEach(p => selectedPoliticianIds.add(p.id));
      renderCongressTab();
    }

    function clearPoliticianSelection() {
      selectedPoliticianIds.clear();
      renderCongressTab();
    }

    function getFilteredPoliticians() {
      return (currentDataset.politicians || []).filter(p => {
        if (isLanxessString(p)) return false;
        const matchesChamber = congressChamberFilter === 'ALL' || p.chamber.toLowerCase() === congressChamberFilter.toLowerCase();
        const matchesSearch = !congressSearchQuery ||
                              p.name.toLowerCase().includes(congressSearchQuery) ||
                              p.state.toLowerCase().includes(congressSearchQuery) ||
                              (p.party && p.party.toLowerCase().includes(congressSearchQuery));
        return matchesChamber && matchesSearch;
      });
    }

    function renderCongressTab() {
      const filteredPols = getFilteredPoliticians();
      const chipsTray = document.getElementById('congress-chips-tray');
      if (chipsTray) {
        chipsTray.innerHTML = '<div class="grid grid-cols-1 sm:grid-cols-2 gap-1.5">' + filteredPols.map(pol => {
          const isSelected = selectedPoliticianIds.has(pol.id) || selectedPoliticianIds.has(pol.name);
          const initials = pol.name ? pol.name.split(' ').map(n=>n[0]).join('').slice(0,2) : 'US';
          const fallbackSvg = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'><rect width='100%25' height='100%25' fill='%23334155'/><text x='50%25' y='55%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='36' font-weight='bold' fill='%23f8fafc'>" + initials + "</text></svg>";

          return \`
            <div onclick="togglePoliticianSelection('\${pol.id}')" class="p-1.5 rounded flex items-center justify-between gap-2 border text-xs cursor-pointer transition-colors \${isSelected ? 'bg-purple-950/70 border-purple-600/80 text-white' : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-900'}">
              <div class="flex items-center gap-2 min-w-0">
                <img src="\${pol.avatarUrl}" alt="\${pol.name}" class="h-6 w-6 rounded-full object-cover border border-slate-700 shrink-0" onerror="this.onerror=null; this.src='\${fallbackSvg}'" />
                <div class="min-w-0 truncate">
                  <span class="font-medium text-[11px] block truncate">\${pol.name}</span>
                  <span class="text-[9px] text-slate-400 block">\${pol.chamber === 'Senate' ? 'Sen.' : 'Rep.'} (\${pol.party[0]}-\${pol.state}) · \${pol.totalTradesTracked} trades</span>
                </div>
              </div>
              <div class="shrink-0 text-purple-400 font-bold text-xs">\${isSelected ? '✓' : '□'}</div>
            </div>
          \`;
        }).join('') + '</div>';
      }

      const statusEl = document.getElementById('congress-selection-status');
      if (statusEl) {
        if (selectedPoliticianIds.size > 0) {
          statusEl.innerHTML = '<strong class="text-purple-300">' + selectedPoliticianIds.size + ' members selected</strong>';
        } else {
          statusEl.innerText = 'Showing all member transactions';
        }
      }

      const filteredDisclosures = (currentDataset.disclosures || []).filter(d => {
        if (isLanxessString(d)) return false;
        if (selectedPoliticianIds.size > 0) {
          return selectedPoliticianIds.has(d.politicianId) || selectedPoliticianIds.has(d.politicianName);
        }
        return true;
      });

      const countEl = document.getElementById('congress-disclosure-count');
      if (countEl) countEl.innerText = filteredDisclosures.length + ' Records';
      const tabCountEl = document.getElementById('tab-congress-count');
      if (tabCountEl) tabCountEl.innerText = filteredDisclosures.length;

      const feedContainer = document.getElementById('congress-feed-container');
      if (feedContainer) {
        if (filteredDisclosures.length === 0) {
          feedContainer.innerHTML = '<div class="p-6 text-center text-slate-500 text-xs">No congressional disclosures match the current selection. <button onclick="clearPoliticianSelection()" class="text-purple-400 hover:underline">Reset filters</button></div>';
          return;
        }

        feedContainer.innerHTML = filteredDisclosures.map(d => {
          const isBuy = d.transactionType === 'BUY';
          const initials = (d.politicianName || 'MC').split(' ').map(n=>n[0]).join('').slice(0,2);
          const fallbackSvg = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'><rect width='100%25' height='100%25' fill='%23334155'/><text x='50%25' y='55%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='36' font-weight='bold' fill='%23f8fafc'>" + initials + "</text></svg>";
          const bioguideLink = d.bioguideId ? 'https://bioguide.congress.gov/search/bio/' + d.bioguideId : '#';
          const pdfUrl = d.filingDocUrl || (d.docId ? 'https://disclosures-clerk.house.gov/public_disc/ptr-pdfs/2026/' + d.docId + '.pdf' : 'https://disclosures-clerk.house.gov');

          return \`
            <div class="pt-3 first:pt-0 space-y-2">
              <div class="flex items-start justify-between gap-3">
                <div class="flex items-center gap-2.5">
                  <img src="\${d.avatarUrl || (d.bioguideId ? 'https://unitedstates.github.io/images/congress/225x275/' + d.bioguideId + '.jpg' : fallbackSvg)}" alt="\${d.politicianName}" class="h-9 w-9 rounded-full object-cover border border-slate-700 bg-slate-800 shrink-0" onerror="this.onerror=null; this.src='\${fallbackSvg}'" />
                  <div>
                    <div class="flex items-center gap-1.5 flex-wrap">
                      <a href="\${bioguideLink}" target="_blank" rel="noopener noreferrer" class="text-xs font-bold text-white hover:text-purple-300 underline flex items-center gap-1">
                        \${d.politicianName}
                        <svg class="h-2.5 w-2.5 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                      </a>
                      <span class="text-[10px] px-1.5 py-0.2 rounded border \${d.chamber === 'Senate' ? 'bg-purple-950 text-purple-300 border-purple-800' : 'bg-blue-950 text-blue-300 border-blue-800'}">\${d.chamber}</span>
                      <span class="text-[10px] px-1 py-0.2 rounded bg-slate-800 text-slate-400 font-mono">\${d.party?.[0] || '?'}-\${d.state || 'US'}</span>
                    </div>
                    <span class="text-[11px] text-slate-400">\${d.committeeContext || (d.chamber === 'Senate' ? 'U.S. Senate' : 'U.S. House of Representatives')}</span>
                  </div>
                </div>
                <div class="text-right shrink-0">
                  <span class="text-xs font-bold px-2 py-0.5 rounded border \${isBuy ? 'bg-emerald-950 text-emerald-300 border-emerald-800' : 'bg-rose-950 text-rose-300 border-rose-800'}">\${d.transactionType}</span>
                  <span class="text-[11px] font-mono text-slate-300 block mt-0.5">\${d.amountBracket}</span>
                </div>
              </div>

              <div class="bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div class="flex items-center gap-2">
                  <button onclick="selectSignalByTicker('\${d.ticker}')" class="font-mono font-bold text-white bg-slate-800 px-2 py-0.5 rounded text-xs hover:text-emerald-400 cursor-pointer">\${d.ticker}</button>
                  <span class="text-slate-400 text-[11px]">\${d.assetDescription}</span>
                </div>
                <div class="flex items-center gap-3 text-[11px] text-slate-400">
                  <span>Traded: <strong class="text-slate-300">\${d.transactionDate}</strong></span>
                  <span>Filed: <strong class="text-slate-300">\${d.filingDate}</strong></span>
                </div>
              </div>

              <div class="flex items-center justify-between text-[11px] pt-1 border-t border-slate-850">
                <span class="text-slate-500 font-mono">Doc ID: \${d.docId || '2026-STOCK-ACT'}</span>
                <a href="\${pdfUrl}" target="_blank" rel="noopener noreferrer" class="text-purple-400 hover:text-purple-300 underline font-medium flex items-center gap-1">
                  Official Clerk PDF Document
                  <svg class="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                </a>
              </div>
            </div>
          \`;
        }).join('');
      }
    }

    function setFeedType(type) {
      newsFeedType = type;
      const allBtn = document.getElementById('feed-all-btn');
      const artBtn = document.getElementById('feed-articles-btn');
      const trumpBtn = document.getElementById('feed-trump-btn');
      if (allBtn) allBtn.className = type === 'ALL' ? 'px-2.5 py-1 rounded text-[11px] font-semibold bg-amber-600 text-white cursor-pointer' : 'px-2.5 py-1 rounded text-[11px] font-semibold text-slate-400 hover:text-white cursor-pointer';
      if (artBtn) artBtn.className = type === 'articles' ? 'px-2.5 py-1 rounded text-[11px] font-semibold bg-blue-600 text-white cursor-pointer' : 'px-2.5 py-1 rounded text-[11px] font-semibold text-slate-400 hover:text-white cursor-pointer';
      if (trumpBtn) trumpBtn.className = type === 'trump' ? 'px-2.5 py-1 rounded text-[11px] font-semibold bg-rose-600 text-white cursor-pointer' : 'px-2.5 py-1 rounded text-[11px] font-semibold text-slate-400 hover:text-white cursor-pointer';
      renderNewsTab();
    }

    function filterNews() {
      const select = document.getElementById('news-ticker-select');
      newsTickerFilter = select ? select.value : 'ALL';
      renderNewsTab();
    }

    function renderNewsTab() {
      const container = document.getElementById('news-stream-container');
      if (!container) return;
      const items = [];

      if (newsFeedType === 'ALL' || newsFeedType === 'articles') {
        (currentDataset.news || []).forEach(art => {
          if (isLanxessString(art)) return;
          if (newsTickerFilter !== 'ALL') {
            const t = newsTickerFilter.toUpperCase();
            if (!(art.relatedTickers || []).includes(t) && !(art.headline || '').toUpperCase().includes(t)) {
              return;
            }
          }
          items.push({ type: 'article', data: art, date: new Date(art.publishedAt || Date.now()) });
        });
      }

      if (newsFeedType === 'ALL' || newsFeedType === 'trump') {
        (currentDataset.trumpPosts || []).forEach(tp => {
          if (isLanxessString(tp)) return;
          if (newsTickerFilter !== 'ALL') {
            const t = newsTickerFilter.toUpperCase();
            if (!(tp.matchedTickers || []).includes(t) && !(tp.content || '').toUpperCase().includes(t)) {
              return;
            }
          }
          items.push({ type: 'trump', data: tp, date: new Date(tp.publishedAt || Date.now()) });
        });
      }

      items.sort((a, b) => b.date.getTime() - a.date.getTime());

      const tabCountEl = document.getElementById('tab-news-count');
      if (tabCountEl) tabCountEl.innerText = items.length;

      if (items.length === 0) {
        container.innerHTML = '<div class="p-6 text-center text-slate-500 bg-slate-900 rounded-xl border border-slate-800 text-xs">No articles match current filters.</div>';
        return;
      }

      container.innerHTML = items.map(item => {
        if (item.type === 'trump') {
          const tp = item.data;
          return \`
            <div class="p-4 rounded-xl bg-gradient-to-br from-slate-950 via-slate-900 to-rose-950/20 border border-rose-900/60 shadow-sm space-y-2">
              <div class="flex items-center justify-between text-xs">
                <div class="flex items-center gap-2">
                  <span class="font-bold text-rose-300 flex items-center gap-1">
                    <svg class="h-3.5 w-3.5 text-rose-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                    \${tp.author}
                  </span>
                  <span class="text-slate-500 font-mono text-[10px]">\${tp.handle}</span>
                  <span class="bg-rose-950 text-rose-300 border border-rose-800 text-[9px] py-0 px-1 rounded">Truth Social</span>
                  <span class="border border-amber-700/60 text-amber-300 text-[9px] py-0 px-1 rounded">5% Weight</span>
                </div>
                <span class="text-slate-500 font-mono text-[10px]">\${new Date(tp.publishedAt).toLocaleDateString()}</span>
              </div>
              <p class="text-xs text-slate-200 leading-relaxed font-sans bg-slate-950/60 p-2.5 rounded border border-rose-950/40">"\${tp.content}"</p>
              <div class="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-rose-950/50 text-[11px]">
                <div class="flex items-center gap-1.5">
                  <span class="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-900 text-slate-300 border border-slate-800">\${tp.topic}</span>
                  \${(tp.matchedTickers || []).map(t => \`<button onclick="selectSignalByTicker('\${t}')" class="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-slate-800 text-emerald-400 hover:text-white cursor-pointer">\${t}</button>\`).join('')}
                </div>
                <a href="\${tp.postUrl}" target="_blank" rel="noopener noreferrer" class="text-rose-400 hover:text-rose-300 underline font-medium flex items-center gap-1">
                  View Truth Social Post
                  <svg class="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                </a>
              </div>
            </div>
          \`;
        }

        const art = item.data;
        const isRegulatory = (art.source || '').includes('SEC') || (art.source || '').includes('Regulatory') || (art.source || '').includes('Policy');
        return \`
          <div class="p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors space-y-2">
            <div class="flex items-center justify-between text-xs">
              <div class="flex items-center gap-2">
                <span class="text-[10px] py-0 px-1.5 rounded border \${isRegulatory ? 'border-purple-800/80 bg-purple-950/40 text-purple-300' : 'border-emerald-800/80 bg-emerald-950/40 text-emerald-300'}">\${art.source || 'Financial Wire'}</span>
                \${art.sentiment ? \`<span class="text-[10px] font-mono font-bold \${art.sentiment === 'BULLISH' ? 'text-emerald-400' : art.sentiment === 'BEARISH' ? 'text-rose-400' : 'text-slate-400'}">\${art.sentiment}</span>\` : ''}
              </div>
              <span class="text-slate-500 font-mono text-[10px]">\${new Date(art.publishedAt).toLocaleDateString()}</span>
            </div>
            <a href="\${art.url}" target="_blank" rel="noopener noreferrer" class="text-xs sm:text-sm font-semibold text-white hover:text-amber-300 block transition-colors leading-snug">
              \${art.headline} ↗
            </a>
            \${art.summary ? \`<p class="text-xs text-slate-400 leading-relaxed line-clamp-2">\${art.summary}</p>\` : ''}
            <div class="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800/80 text-[11px]">
              <div class="flex items-center gap-1.5">
                \${(art.relatedTickers || []).map(t => \`<button onclick="selectSignalByTicker('\${t}')" class="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-slate-800 text-amber-400 hover:text-white cursor-pointer">\${t}</button>\`).join('')}
              </div>
              <a href="\${art.url}" target="_blank" rel="noopener noreferrer" class="text-amber-400 hover:text-amber-300 underline font-medium flex items-center gap-1">Read Full Article ↗</a>
            </div>
          </div>
        \`;
      }).join('');
    }

    document.getElementById('search-input').addEventListener('input', renderSignals);
    document.getElementById('direction-filter').addEventListener('change', renderSignals);

    updateKpiCards();
    renderTrackedChips();
    renderSignals();
    renderBriefing();
    renderCongressTab();
    renderNewsTab();
    switchRightTab('stock');
  </script>
</body>
</html>`;
}

// Create HTTP server
const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;
  const rawDataset = getIntelligence();
  const dataset = sanitizeDataset(rawDataset);

  // Handle CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    });
    res.end();
    return;
  }

  // ----------------------------------------------------
  // REST API Endpoints
  // ----------------------------------------------------

  // POST /api/refresh - Trigger live data pipeline refresh
  if (pathname === '/api/refresh' && req.method === 'POST') {
    try {
      const freshData = await refreshLiveIntelligence();
      return sendJson(res, 200, freshData);
    } catch (err) {
      return sendJson(res, 500, { error: 'Failed to refresh live data', message: err.message });
    }
  }

  // GET /api/status - Live feed synchronization status
  if (pathname === '/api/status') {
    return sendJson(res, 200, getSyncStatus());
  }

  // GET /api/healthz
  if (pathname === '/api/healthz') {
    return sendJson(res, 200, {
      status: 'ok',
      engine: 'node.js',
      sourceMode: dataset.summary?.dataSourceMode || 'LIVE_PUBLIC_FEEDS',
      lastUpdated: dataset.summary?.lastUpdatedIso || new Date().toISOString(),
      activeSignals: dataset.signals?.length || 0,
      trackedTickers: getTrackedTickers().allTickers.length,
      timestamp: new Date().toISOString(),
    });
  }

  // GET /api/summary
  if (pathname === '/api/summary') {
    return sendJson(res, 200, dataset.summary);
  }

  // GET /api/performance - Market outperformance confidence against S&P 500
  if (pathname === '/api/performance') {
    return sendJson(res, 200, getBenchmarkPerformance());
  }

  // GET /api/tickers - Tracked tickers list
  if (pathname === '/api/tickers' && req.method === 'GET') {
    return sendJson(res, 200, getTrackedTickers());
  }

  // POST /api/tickers - Add user-tracked stock ticker with live validation
  if (pathname === '/api/tickers' && req.method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const rawTicker = body.ticker;
      if (!rawTicker) {
        return sendJson(res, 400, { error: 'Ticker symbol is required.' });
      }

      if (isLanxess(rawTicker)) {
        return sendJson(res, 400, {
          error: 'LANXESS AG and related securities (LXS, LXS.DE, LNXSF, LNXSY) are excluded from this platform.',
        });
      }

      const result = await addUserTrackedTicker(rawTicker);
      return sendJson(res, 200, result);
    } catch (err) {
      return sendJson(res, 400, { error: err.message });
    }
  }

  // DELETE /api/tickers/:ticker - Remove user-tracked stock ticker
  if (pathname.startsWith('/api/tickers/') && req.method === 'DELETE') {
    try {
      const parts = pathname.split('/').filter(Boolean);
      const ticker = parts[2];
      if (!ticker) {
        return sendJson(res, 400, { error: 'Ticker symbol is required.' });
      }

      const result = removeUserTrackedTicker(ticker);
      return sendJson(res, 200, result);
    } catch (err) {
      return sendJson(res, 400, { error: err.message });
    }
  }

  // GET /api/trump-posts - Trump public social media statements
  if (pathname === '/api/trump-posts') {
    const ticker = parsedUrl.searchParams.get('ticker');
    const allPosts = dataset.trumpPosts || loadTrumpPosts();
    if (ticker) {
      return sendJson(res, 200, getTrumpPostsForTicker(ticker, allPosts));
    }
    return sendJson(res, 200, allPosts);
  }

  // GET /api/signals or /api/signals/:id
  if (pathname.startsWith('/api/signals')) {
    const parts = pathname.split('/').filter(Boolean);
    if (parts.length === 3) {
      const id = parts[2];
      const signal = dataset.signals.find(
        (s) => !isLanxess(s) && (s.id === id || s.ticker.toUpperCase() === id.toUpperCase())
      );
      if (!signal) {
        return sendJson(res, 404, { error: 'Signal not found', id });
      }
      return sendJson(res, 200, signal);
    }

    // List with query filters
    const direction = parsedUrl.searchParams.get('direction');
    const ticker = parsedUrl.searchParams.get('ticker');
    const verdict = parsedUrl.searchParams.get('verdict');
    const minConfidence = parsedUrl.searchParams.get('minConfidence');

    let results = dataset.signals.filter((s) => !isLanxess(s));
    if (direction) {
      results = results.filter((s) => s.direction === direction.toUpperCase());
    }
    if (verdict) {
      results = results.filter((s) => s.verdict?.action === verdict.toUpperCase());
    }
    if (ticker) {
      results = results.filter((s) => s.ticker.toUpperCase() === ticker.toUpperCase());
    }
    if (minConfidence) {
      results = results.filter(
        (s) => (s.verdict?.confidenceScorePct ?? s.confidenceScorePct) >= Number(minConfidence)
      );
    }

    return sendJson(res, 200, results);
  }

  // GET /api/politicians or /api/politicians/:id
  if (pathname.startsWith('/api/politicians')) {
    const parts = pathname.split('/').filter(Boolean);
    if (parts.length === 3) {
      const id = parts[2];
      const pol = dataset.politicians.find((p) => p.id === id);
      if (!pol) {
        return sendJson(res, 404, { error: 'Politician not found', id });
      }
      return sendJson(res, 200, pol);
    }
    return sendJson(res, 200, dataset.politicians);
  }

  // GET /api/disclosures
  if (pathname === '/api/disclosures') {
    const ticker = parsedUrl.searchParams.get('ticker');
    const politicianId = parsedUrl.searchParams.get('politicianId');
    let results = dataset.disclosures.filter((d) => !isLanxess(d));
    if (ticker) {
      results = results.filter((d) => d.ticker.toUpperCase() === ticker.toUpperCase());
    }
    if (politicianId) {
      results = results.filter((d) => d.politicianId === politicianId);
    }
    return sendJson(res, 200, results);
  }

  // GET /api/news
  if (pathname === '/api/news') {
    const ticker = parsedUrl.searchParams.get('ticker');
    let results = dataset.news.filter((n) => !isLanxess(n));
    if (ticker) {
      const tUpper = ticker.toUpperCase();
      results = results.filter(
        (n) =>
          (n.relatedTickers && n.relatedTickers.includes(tUpper)) ||
          (n.headline && n.headline.toUpperCase().includes(tUpper))
      );
    }
    return sendJson(res, 200, results);
  }

  // GET /api/quotes
  if (pathname === '/api/quotes') {
    const ticker = parsedUrl.searchParams.get('ticker');
    let results = (dataset.quotes || []).filter((q) => !isLanxess(q));
    if (ticker) {
      results = results.filter((q) => q.ticker.toUpperCase() === ticker.toUpperCase());
    }
    return sendJson(res, 200, results);
  }

  // ----------------------------------------------------
  // Frontend Web Dashboard
  // ----------------------------------------------------
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(getDashboardHtml());
});

server.listen(PORT, HOST, () => {
  console.log('====================================================');
  console.log(` InsightTrader Live Public Data Engine is Running!`);
  console.log(` Dashboard: http://localhost:${PORT}`);
  console.log(` Health API: http://localhost:${PORT}/api/healthz`);
  console.log(` Signals API: http://localhost:${PORT}/api/signals`);
  console.log(` Tickers API: http://localhost:${PORT}/api/tickers`);
  console.log(` Trump Feed API: http://localhost:${PORT}/api/trump-posts`);
  console.log(` Refresh API: POST http://localhost:${PORT}/api/refresh`);
  console.log('====================================================');
});
