import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load the fictitious dataset
const fixturePath = path.resolve(__dirname, 'fixtures/trade-signals-dataset.json');
let dataset;
try {
  dataset = JSON.parse(fs.readFileSync(fixturePath, 'utf-8'));
} catch (err) {
  console.error('Warning: Could not read fixtures/trade-signals-dataset.json:', err.message);
  dataset = { summary: {}, signals: [], disclosures: [], politicians: [], news: [] };
}

const PORT = Number(process.env.PORT) || 3000;
const HOST = '0.0.0.0';


// Helper to send JSON responses
function sendJson(res, statusCode, data) {
  const jsonStr = JSON.stringify(data, null, 2);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  });
  res.end(jsonStr);
}

// Generate the standalone web dashboard HTML
function getDashboardHtml() {
  return `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>InsightTrader · Trade Signal</title>
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
  <header class="border-b border-slate-800 bg-slate-950/80 backdrop-blur sticky top-0 z-50 px-4 lg:px-8 py-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
    <div class="flex items-center gap-3">
      <div class="h-9 w-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 3 7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/><path d="m13 13 6 6"/></svg>
      </div>
      <div>
        <div class="flex items-center gap-2">
          <span class="font-bold text-lg text-white tracking-tight">InsightTrader</span>
          <span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-800/60">Node.js Engine</span>
        </div>
        <p class="text-xs text-slate-400">Political Trade Intelligence & Nemotron-Synthesized Signals</p>
      </div>
    </div>

    <div class="flex items-center gap-2 sm:gap-4 text-xs">
      <div class="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-slate-300">
        <span class="relative flex h-2 w-2">
          <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <span>Node Server Listening on :${PORT}</span>
      </div>
      <a href="/api/signals" target="_blank" class="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 transition-colors flex items-center gap-1.5">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
        REST API
      </a>
    </div>
  </header>

  <!-- Main Container -->
  <main class="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">

    <!-- KPI Metric Cards -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4" id="kpi-grid">
      <div class="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
        <div>
          <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Signals</p>
          <h4 class="text-2xl font-bold text-white mt-1" id="kpi-active">${dataset.summary.activeSignalsCount || 7}</h4>
          <span class="text-[11px] text-emerald-400 font-medium">High Conviction</span>
        </div>
        <div class="p-3 bg-emerald-950/40 border border-emerald-800/40 rounded-xl text-emerald-400">
          <svg class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
        </div>
      </div>

      <div class="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
        <div>
          <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Simulated Win Rate</p>
          <h4 class="text-2xl font-bold text-white mt-1">${dataset.summary.signalWinRatePct || 77.4}%</h4>
          <span class="text-[11px] text-emerald-400 font-medium">+${dataset.summary.avgSignalAlphaPct || 11.3}% vs S&P 500</span>
        </div>
        <div class="p-3 bg-blue-950/40 border border-blue-800/40 rounded-xl text-blue-400">
          <svg class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/></svg>
        </div>
      </div>

      <div class="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
        <div>
          <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Volume Tracked YTD</p>
          <h4 class="text-2xl font-bold text-white mt-1">$${((dataset.summary.totalTrackedVolumeYtdUsd || 55880000) / 1000000).toFixed(1)}M</h4>
          <span class="text-[11px] text-slate-400">${dataset.disclosures.length} STOCK Act Filings</span>
        </div>
        <div class="p-3 bg-purple-950/40 border border-purple-800/40 rounded-xl text-purple-400">
          <svg class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
        </div>
      </div>

      <div class="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
        <div>
          <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Tracked Members</p>
          <h4 class="text-2xl font-bold text-white mt-1">${dataset.politicians.length || 8}</h4>
          <span class="text-[11px] text-slate-400">House & Senate Committees</span>
        </div>
        <div class="p-3 bg-amber-950/40 border border-amber-800/40 rounded-xl text-amber-400">
          <svg class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/></svg>
        </div>
      </div>
    </div>

    <!-- Main Workspace Grid -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">

      <!-- Left Column: Signal Stream (7 cols) -->
      <section class="lg:col-span-7 space-y-4">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 class="text-base font-bold text-white flex items-center gap-2">
            <svg class="h-5 w-5 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
            Synthesized Trade Signals
          </h2>

          <div class="flex items-center gap-2">
            <input type="text" id="search-input" placeholder="Search ticker or thesis..." class="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500">
            <select id="direction-filter" class="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-emerald-500">
              <option value="ALL">All Directions</option>
              <option value="BULLISH">Bullish</option>
              <option value="BEARISH">Bearish</option>
              <option value="WATCH">Watch</option>
            </select>
          </div>
        </div>

        <!-- Signal Card Stream -->
        <div id="signals-container" class="space-y-3.5">
          <!-- Dynamically injected via JavaScript below -->
        </div>
      </section>

      <!-- Right Column: Selected Briefing & Congressional Activity (5 cols) -->
      <section class="lg:col-span-5 space-y-5">

        <!-- Selected Briefing Card -->
        <div class="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden" id="briefing-card">
          <div class="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
            <div class="flex items-center gap-2">
              <span class="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" id="briefing-conviction">High Conviction</span>
              <span class="text-[11px] text-slate-400" id="briefing-model">Nemotron-4-340B</span>
            </div>
            <span class="text-xs font-mono text-slate-400" id="briefing-date"></span>
          </div>

          <div class="p-5 space-y-4">
            <div>
              <h3 class="text-base font-bold text-white" id="briefing-title">Select a signal</h3>
              <p class="text-xs text-slate-400 mt-1" id="briefing-headline"></p>
            </div>

            <!-- Thesis -->
            <div>
              <h4 class="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">AI Investment Thesis</h4>
              <p class="text-xs leading-relaxed text-slate-300 bg-slate-950 p-3 rounded-lg border border-slate-800/80" id="briefing-thesis"></p>
            </div>

            <!-- Disclosures Cited -->
            <div>
              <h4 class="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1.5">
                <svg class="h-3.5 w-3.5 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
                Correlated STOCK Act Trades
              </h4>
              <div id="briefing-disclosures" class="space-y-2"></div>
            </div>

            <!-- News Catalyst -->
            <div>
              <h4 class="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1.5">
                <svg class="h-3.5 w-3.5 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9"/><path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5"/><circle cx="12" cy="12" r="2"/><path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5"/><path d="M19.1 4.9C23 8.8 23 15.1 19.1 19"/></svg>
                Correlated News Catalysts
              </h4>
              <div id="briefing-news" class="space-y-2"></div>
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

        <!-- Congressional Trader Leaderboard -->
        <div class="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden">
          <div class="p-3.5 border-b border-slate-800 bg-slate-950/40 flex items-center justify-between">
            <h3 class="text-xs font-bold text-white flex items-center gap-2">
              <svg class="h-4 w-4 text-purple-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
              Tracked Members of Congress
            </h3>
            <span class="text-[11px] text-slate-400">YTD Performance</span>
          </div>

          <div class="divide-y divide-slate-800/80 p-3" id="politicians-list">
            <!-- Dynamically populated -->
          </div>
        </div>

      </section>
    </div>
  </main>

  <!-- Client-side script to render dataset and wire interactions -->
  <script>
    const dataset = ${JSON.stringify(dataset)};
    let activeSignalId = dataset.signals[0]?.id;

    function renderSignals() {
      const container = document.getElementById('signals-container');
      const searchQuery = document.getElementById('search-input').value.toLowerCase();
      const directionFilter = document.getElementById('direction-filter').value;

      const filtered = dataset.signals.filter(s => {
        const matchesDir = directionFilter === 'ALL' || s.direction === directionFilter;
        const matchesSearch = s.ticker.toLowerCase().includes(searchQuery) ||
                              s.companyName.toLowerCase().includes(searchQuery) ||
                              s.headline.toLowerCase().includes(searchQuery);
        return matchesDir && matchesSearch;
      });

      if (filtered.length === 0) {
        container.innerHTML = '<div class="p-8 text-center text-slate-500 border border-dashed border-slate-800 rounded-xl">No signals match filter.</div>';
        return;
      }

      container.innerHTML = filtered.map(s => {
        const isSelected = s.id === activeSignalId;
        const isBullish = s.direction === 'BULLISH';
        const isBearish = s.direction === 'BEARISH';
        const badgeColor = isBullish ? 'bg-emerald-950 text-emerald-300 border-emerald-800' :
                           isBearish ? 'bg-rose-950 text-rose-300 border-rose-800' :
                           'bg-amber-950 text-amber-300 border-amber-800';

        return \`
          <div onclick="selectSignal('\${s.id}')" class="p-4 rounded-xl border transition-all cursor-pointer \${isSelected ? 'bg-slate-900 border-emerald-500 ring-1 ring-emerald-500/40' : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'}">
            <div class="flex items-center justify-between mb-2">
              <div class="flex items-center gap-2.5">
                <span class="font-black text-sm text-white px-2 py-0.5 bg-slate-800 rounded border border-slate-700">\${s.ticker}</span>
                <div>
                  <h4 class="text-xs font-bold text-white">\${s.companyName}</h4>
                  <span class="text-[11px] text-slate-400">\${s.sector}</span>
                </div>
              </div>
              <span class="text-[11px] font-semibold px-2 py-0.5 rounded border \${badgeColor}">
                \${s.direction} · \${s.confidenceScorePct}%
              </span>
            </div>
            <p class="text-xs text-slate-200 font-medium mb-3">\${s.headline}</p>
            <div class="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/80">
              <div class="flex items-center gap-3">
                <span>Entry: <strong class="text-white">$\${s.metrics.entryPrice}</strong></span>
                <span>Target: <strong class="text-emerald-400">$\${s.metrics.targetPrice}</strong></span>
                <span>Return: <strong class="\${s.metrics.returnSinceSignalPct >= 0 ? 'text-emerald-400' : 'text-rose-400'}">+\${s.metrics.returnSinceSignalPct}%</strong></span>
              </div>
              <span class="font-mono text-slate-500">\${s.generatedAt.split('T')[0]}</span>
            </div>
          </div>
        \`;
      }).join('');
    }

    function selectSignal(id) {
      activeSignalId = id;
      renderSignals();
      renderBriefing();
    }

    function renderBriefing() {
      const s = dataset.signals.find(sig => sig.id === activeSignalId) || dataset.signals[0];
      if (!s) return;

      document.getElementById('briefing-conviction').innerText = s.conviction + ' Conviction';
      document.getElementById('briefing-model').innerText = s.aiModel;
      document.getElementById('briefing-date').innerText = s.generatedAt.split('T')[0];
      document.getElementById('briefing-title').innerText = s.ticker + ' · ' + s.companyName;
      document.getElementById('briefing-headline').innerText = s.headline;
      document.getElementById('briefing-thesis').innerText = s.thesis;

      // Render Disclosures
      const discContainer = document.getElementById('briefing-disclosures');
      discContainer.innerHTML = s.evidence.disclosures.map(d => \`
        <div class="bg-slate-950 p-2.5 rounded border border-slate-800 text-xs">
          <div class="flex items-center justify-between">
            <strong class="text-white">\${d.politicianName}</strong>
            <span class="text-emerald-400 font-semibold">\${d.transactionType} (\${d.amountBracket})</span>
          </div>
          <p class="text-slate-400 text-[11px] mt-1">\${d.committeeContext}</p>
        </div>
      \`).join('');

      // Render News
      const newsContainer = document.getElementById('briefing-news');
      newsContainer.innerHTML = s.evidence.newsCatalysts.map(n => \`
        <div class="bg-slate-950 p-2.5 rounded border border-slate-800 text-xs">
          <div class="flex items-center justify-between text-slate-400 text-[11px]">
            <span>\${n.source}</span>
            <span>\${n.publishedAt ? n.publishedAt.split('T')[0] : ''}</span>
          </div>
          <p class="text-slate-200 font-medium mt-0.5">\${n.headline}</p>
          <p class="text-slate-400 text-[11px] mt-0.5">\${n.relevanceNote}</p>
        </div>
      \`).join('');

      // Render Risks
      const risksContainer = document.getElementById('briefing-risks');
      risksContainer.innerHTML = s.keyRisks.map(r => \`<li>\${r}</li>\`).join('');
    }

    function renderPoliticians() {
      const container = document.getElementById('politicians-list');
      container.innerHTML = dataset.politicians.slice(0, 6).map(p => \`
        <div class="py-2 flex items-center justify-between">
          <div>
            <div class="flex items-center gap-1.5">
              <span class="text-xs font-semibold text-white">\${p.name}</span>
              <span class="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 font-mono">\${p.party[0]}-\${p.state}</span>
            </div>
            <p class="text-[11px] text-slate-400">\${p.chamber} · \${p.totalTradesTracked} trades</p>
          </div>
          <div class="text-right">
            <span class="text-xs font-semibold text-emerald-400 block">+\${p.alphaVsSp500Pct}% Alpha</span>
            <span class="text-[11px] text-slate-400">$\${(p.tradeVolumeYtdUsd / 1000000).toFixed(1)}M YTD</span>
          </div>
        </div>
      \`).join('');
    }

    document.getElementById('search-input').addEventListener('input', renderSignals);
    document.getElementById('direction-filter').addEventListener('change', renderSignals);

    renderSignals();
    renderBriefing();
    renderPoliticians();
  </script>
</body>
</html>`;
}

// Create HTTP server
const server = http.createServer((req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;

  // Handle CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    });
    res.end();
    return;
  }

  // ----------------------------------------------------
  // REST API Endpoints
  // ----------------------------------------------------

  // GET /api/healthz
  if (pathname === '/api/healthz') {
    return sendJson(res, 200, {
      status: 'ok',
      engine: 'node.js',
      timestamp: new Date().toISOString(),
    });
  }

  // GET /api/summary
  if (pathname === '/api/summary') {
    return sendJson(res, 200, dataset.summary);
  }

  // GET /api/signals or /api/signals/:id
  if (pathname.startsWith('/api/signals')) {
    const parts = pathname.split('/').filter(Boolean);
    if (parts.length === 3) {
      const id = parts[2];
      const signal = dataset.signals.find((s) => s.id === id || s.ticker.toUpperCase() === id.toUpperCase());
      if (!signal) {
        return sendJson(res, 404, { error: 'Signal not found', id });
      }
      return sendJson(res, 200, signal);
    }

    // List with query filters
    const direction = parsedUrl.searchParams.get('direction');
    const ticker = parsedUrl.searchParams.get('ticker');
    const minConfidence = parsedUrl.searchParams.get('minConfidence');

    let results = dataset.signals;
    if (direction) {
      results = results.filter((s) => s.direction === direction.toUpperCase());
    }
    if (ticker) {
      results = results.filter((s) => s.ticker.toUpperCase() === ticker.toUpperCase());
    }
    if (minConfidence) {
      results = results.filter((s) => s.confidenceScorePct >= Number(minConfidence));
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
    let results = dataset.disclosures;
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
    return sendJson(res, 200, dataset.news);
  }

  // ----------------------------------------------------
  // Frontend Web Dashboard
  // ----------------------------------------------------
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(getDashboardHtml());
});

server.listen(PORT, HOST, () => {
  console.log('====================================================');
  console.log(` InsightTrader Node.js Server is Running!`);
  console.log(` Dashboard: http://localhost:${PORT}`);
  console.log(` Health API: http://localhost:${PORT}/api/healthz`);
  console.log(` Signals API: http://localhost:${PORT}/api/signals`);
  console.log(` Summary API: http://localhost:${PORT}/api/summary`);
  console.log('====================================================');
});
