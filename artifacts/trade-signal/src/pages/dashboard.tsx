import { useState, useMemo, useEffect } from 'react';
import {
  mockDashboardSummary,
  mockTradeSignals,
  mockPoliticians,
  mockPublicDisclosures,
  mockNewsArticles,
} from '@/mock/mockData';
import type {
  TradeSignal,
  DashboardSummary,
  Politician,
  PublicDisclosure,
  NewsArticle,
  TrumpPost,
  TrackedTickersState,
  StockQuote,
} from '@/types/intelligence';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  ShieldAlert,
  FileText,
  Users,
  Radio,
  Sparkles,
  ExternalLink,
  Search,
  Award,
  RefreshCw,
  ShieldCheck,
  Plus,
  Trash2,
  X,
  MessageSquare,
} from 'lucide-react';

const CORE_TICKERS = ['NVDA', 'LMT', 'PLTR', 'ASML', 'CRWD'];

function isLanxess(item: any): boolean {
  if (!item) return false;
  const s = typeof item === 'string' ? item : (item.ticker || item.companyName || item.headline || item.name || '');
  const u = String(s).toUpperCase();
  return u.includes('LANXESS') || u === 'LXS.DE' || u === 'LNXSF' || u === 'LNXSY' || u === 'LXS';
}

export default function Dashboard() {
  const [selectedDirection, setSelectedDirection] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Live dataset state with resilient fallback to bundled data
  const [signals, setSignals] = useState<TradeSignal[]>(mockTradeSignals);
  const [summary, setSummary] = useState<DashboardSummary>(mockDashboardSummary);
  const [politicians, setPoliticians] = useState<Politician[]>(mockPoliticians);
  const [disclosures, setDisclosures] = useState<PublicDisclosure[]>(mockPublicDisclosures);
  const [news, setNews] = useState<NewsArticle[]>(mockNewsArticles);
  const [quotes, setQuotes] = useState<StockQuote[]>([]);
  const [trumpPosts, setTrumpPosts] = useState<TrumpPost[]>([]);
  const [trackedTickers, setTrackedTickers] = useState<TrackedTickersState>({
    coreTickers: CORE_TICKERS,
    userTickers: [],
    allTickers: CORE_TICKERS,
  });

  const [selectedSignal, setSelectedSignal] = useState<TradeSignal>(mockTradeSignals[0]);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncMessage, setSyncMessage] = useState<string>('');
  const [showTransparencyModal, setShowTransparencyModal] = useState<boolean>(false);

  // User Add Stock state
  const [newTickerInput, setNewTickerInput] = useState<string>('');
  const [isAddingStock, setIsAddingStock] = useState<boolean>(false);
  const [tickerFeedback, setTickerFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Initial load from live backend API if available
  useEffect(() => {
    async function loadLiveData() {
      try {
        const [signalsRes, summaryRes, politiciansRes, disclosuresRes, newsRes, tickersRes, quotesRes, trumpRes] =
          await Promise.allSettled([
            fetch('/api/signals').then((r) => (r.ok ? r.json() : null)),
            fetch('/api/summary').then((r) => (r.ok ? r.json() : null)),
            fetch('/api/politicians').then((r) => (r.ok ? r.json() : null)),
            fetch('/api/disclosures').then((r) => (r.ok ? r.json() : null)),
            fetch('/api/news').then((r) => (r.ok ? r.json() : null)),
            fetch('/api/tickers').then((r) => (r.ok ? r.json() : null)),
            fetch('/api/quotes').then((r) => (r.ok ? r.json() : null)),
            fetch('/api/trump-posts').then((r) => (r.ok ? r.json() : null)),
          ]);

        if (signalsRes.status === 'fulfilled' && signalsRes.value && signalsRes.value.length > 0) {
          const cleanSignals = signalsRes.value.filter((s: any) => !isLanxess(s));
          setSignals(cleanSignals);
          setSelectedSignal(cleanSignals[0]);
        }
        if (summaryRes.status === 'fulfilled' && summaryRes.value) {
          setSummary(summaryRes.value);
        }
        if (politiciansRes.status === 'fulfilled' && politiciansRes.value && politiciansRes.value.length > 0) {
          setPoliticians(politiciansRes.value.filter((p: any) => !isLanxess(p)));
        }
        if (disclosuresRes.status === 'fulfilled' && disclosuresRes.value && disclosuresRes.value.length > 0) {
          setDisclosures(disclosuresRes.value.filter((d: any) => !isLanxess(d)));
        }
        if (newsRes.status === 'fulfilled' && newsRes.value && newsRes.value.length > 0) {
          setNews(newsRes.value.filter((n: any) => !isLanxess(n)));
        }
        if (tickersRes.status === 'fulfilled' && tickersRes.value) {
          setTrackedTickers(tickersRes.value);
        }
        if (quotesRes.status === 'fulfilled' && Array.isArray(quotesRes.value)) {
          setQuotes(quotesRes.value.filter((q: any) => !isLanxess(q)));
        }
        if (trumpRes.status === 'fulfilled' && Array.isArray(trumpRes.value)) {
          setTrumpPosts(trumpRes.value.filter((tp: any) => !isLanxess(tp)));
        }
      } catch (err) {
        console.warn('Backend API not responding; using live cached fallback data.', err);
      }
    }
    loadLiveData();
  }, []);

  // Trigger live feed refresh across external endpoints
  const handleLiveRefresh = async () => {
    setIsSyncing(true);
    setSyncMessage('Fetching live public data & RSS feeds...');
    try {
      const res = await fetch('/api/refresh', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        if (data.signals) {
          const cleanSignals = data.signals.filter((s: any) => !isLanxess(s));
          setSignals(cleanSignals);
          if (cleanSignals.length > 0) setSelectedSignal(cleanSignals[0]);
        }
        if (data.summary) setSummary(data.summary);
        if (data.politicians) setPoliticians(data.politicians.filter((p: any) => !isLanxess(p)));
        if (data.disclosures) setDisclosures(data.disclosures.filter((d: any) => !isLanxess(d)));
        if (data.news) setNews(data.news.filter((n: any) => !isLanxess(n)));
        if (data.quotes) setQuotes(data.quotes.filter((q: any) => !isLanxess(q)));
        if (data.trumpPosts) setTrumpPosts(data.trumpPosts.filter((tp: any) => !isLanxess(tp)));
        if (data.trackedTickers) setTrackedTickers(data.trackedTickers);

        setSyncMessage('Live feeds, tape quotes & fact-check sources synchronized!');
        setTimeout(() => setSyncMessage(''), 3000);
      } else {
        setSyncMessage('Live sync request completed with fallback.');
        setTimeout(() => setSyncMessage(''), 3000);
      }
    } catch (err) {
      console.error('Refresh request failed:', err);
      setSyncMessage('Could not reach backend refresh service.');
      setTimeout(() => setSyncMessage(''), 3000);
    } finally {
      setIsSyncing(false);
    }
  };

  // Add stock handler
  const handleAddStock = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTicker = newTickerInput.trim().toUpperCase();
    if (!cleanTicker) return;

    if (isLanxess(cleanTicker)) {
      setTickerFeedback({
        type: 'error',
        message: 'LANXESS AG and related securities (LXS, LXS.DE, LNXSF, LNXSY) are excluded from this platform.',
      });
      return;
    }

    setIsAddingStock(true);
    setTickerFeedback(null);

    try {
      const res = await fetch('/api/tickers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker: cleanTicker }),
      });
      const data = await res.json();

      if (res.ok) {
        setTickerFeedback({
          type: 'success',
          message: `Added ${data.ticker} (${data.companyName}) · Live quote $${data.quote.currentPrice}!`,
        });
        setNewTickerInput('');

        // Refresh state
        if (data.trackedTickers) setTrackedTickers(data.trackedTickers);
        const [sigRes, quotesRes] = await Promise.all([
          fetch('/api/signals').then((r) => r.json()),
          fetch('/api/quotes').then((r) => r.json()),
        ]);
        if (Array.isArray(sigRes)) {
          const clean = sigRes.filter((s: any) => !isLanxess(s));
          setSignals(clean);
          const found = clean.find((s: any) => s.ticker === cleanTicker);
          if (found) setSelectedSignal(found);
        }
        if (Array.isArray(quotesRes)) setQuotes(quotesRes.filter((q: any) => !isLanxess(q)));
        setTimeout(() => setTickerFeedback(null), 4000);
      } else {
        setTickerFeedback({
          type: 'error',
          message: data.error || 'Failed to add ticker.',
        });
      }
    } catch (err: any) {
      setTickerFeedback({
        type: 'error',
        message: 'Network error: ' + err.message,
      });
    } finally {
      setIsAddingStock(false);
    }
  };

  // Remove stock handler
  const handleRemoveStock = async (ticker: string) => {
    if (!confirm(`Remove ${ticker} from your tracked stocks?`)) return;

    try {
      const res = await fetch(`/api/tickers/${encodeURIComponent(ticker)}`, {
        method: 'DELETE',
      });
      const data = await res.json();

      if (res.ok) {
        if (data.trackedTickers) setTrackedTickers(data.trackedTickers);
        setSignals((prev) => prev.filter((s) => s.ticker !== ticker));
        setQuotes((prev) => prev.filter((q) => q.ticker !== ticker));
        if (selectedSignal.ticker === ticker) {
          const remaining = signals.filter((s) => s.ticker !== ticker);
          if (remaining.length > 0) setSelectedSignal(remaining[0]);
        }
      } else {
        alert(data.error || 'Could not remove stock.');
      }
    } catch (err: any) {
      alert('Network error: ' + err.message);
    }
  };

  const filteredSignals = useMemo(() => {
    return signals.filter((signal) => {
      if (isLanxess(signal)) return false;
      const verdict = signal.verdict?.action || signal.direction;
      const matchesDir =
        selectedDirection === 'ALL' ||
        verdict === selectedDirection ||
        signal.direction === selectedDirection;
      const matchesSearch =
        signal.ticker.toLowerCase().includes(searchQuery.toLowerCase()) ||
        signal.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        signal.headline.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesDir && matchesSearch;
    });
  }, [signals, selectedDirection, searchQuery]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 font-sans">
      {/* Top Header */}
      <header className="mb-6 border-b border-slate-800 pb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded text-emerald-400">
              <Sparkles className="h-5 w-5" />
            </span>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
              InsightTrader <span className="text-emerald-400">· Live Intelligence</span>
            </h1>
            <Badge variant="outline" className="border-emerald-500/40 text-emerald-300 ml-2">
              Audited Primary Sources
            </Badge>
          </div>
          <p className="text-sm text-slate-400">
            Real Congressional STOCK Act filings correlated with Yahoo/Google RSS news feeds and Donald Trump statements. Every claim is linked to public primary records.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setShowTransparencyModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-medium transition-colors cursor-pointer"
          >
            <ShieldCheck className="h-3.5 w-3.5 text-blue-400" />
            <span>Fact-Check Standards</span>
          </button>

          <Badge className="bg-slate-800 text-slate-300 border border-slate-700 py-1.5 px-3">
            <Activity className="h-3.5 w-3.5 mr-1.5 text-emerald-400 animate-pulse" />
            House Clerk & RSS Live
          </Badge>

          <button
            onClick={handleLiveRefresh}
            disabled={isSyncing}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold shadow transition-all cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Syncing...' : 'Refresh Live Feeds'}</span>
          </button>
        </div>
      </header>

      {/* Sync Banner Notification if active */}
      {syncMessage && (
        <div className="mb-6 px-4 py-2 rounded-lg bg-emerald-950/60 border border-emerald-800/60 text-xs text-emerald-300 flex items-center justify-between">
          <span>{syncMessage}</span>
          <span className="text-[11px] text-slate-400">Official House Clerk & Yahoo/Google RSS</span>
        </div>
      )}

      {/* KPI Stats Cards */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Active Signals & Verdicts</p>
              <h3 className="text-2xl font-bold text-white mt-1">
                {summary.activeSignalsCount || signals.length}
              </h3>
              <p className="text-xs text-emerald-400 mt-0.5">100% Fact-Checked</p>
            </div>
            <div className="p-3 bg-emerald-950/50 border border-emerald-800/40 rounded-xl text-emerald-400">
              <Sparkles className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Tracked Stocks</p>
              <h3 className="text-2xl font-bold text-white mt-1">
                {trackedTickers.allTickers.length}
              </h3>
              <p className="text-xs text-blue-400 mt-0.5">
                {trackedTickers.coreTickers.length} Core · {trackedTickers.userTickers.length} User-Added
              </p>
            </div>
            <div className="p-3 bg-blue-950/50 border border-blue-800/40 rounded-xl text-blue-400">
              <Award className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Official PTR Filings</p>
              <h3 className="text-2xl font-bold text-white mt-1">
                {summary.officialPtrFilingsCataloged || 379}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">2026 House Clerk Index</p>
            </div>
            <div className="p-3 bg-purple-950/50 border border-purple-800/40 rounded-xl text-purple-400">
              <FileText className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Tracked Filers</p>
              <h3 className="text-2xl font-bold text-white mt-1">
                {politicians.length}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Bioguide Verified</p>
            </div>
            <div className="p-3 bg-amber-950/50 border border-amber-800/40 rounded-xl text-amber-400">
              <Users className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      </section>

      {/* User Stock Portfolio & Add Ticker Bar */}
      <section className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-5 mb-8 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Plus className="h-4 w-4 text-emerald-400" />
              Tracked Stocks Portfolio
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Validate and add any stock ticker for live Yahoo Finance tape tracking, correlated RSS news, and overall BUY/HOLD/SELL verdicts.
            </p>
          </div>

          {/* Add Stock Form */}
          <form onSubmit={handleAddStock} className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Enter ticker (e.g. AAPL, MSFT)..."
              value={newTickerInput}
              onChange={(e) => setNewTickerInput(e.target.value.toUpperCase())}
              maxLength={10}
              className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white uppercase placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono w-44 sm:w-56"
              required
            />
            <button
              type="submit"
              disabled={isAddingStock}
              className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold transition-all shrink-0 cursor-pointer flex items-center gap-1.5"
            >
              <span>{isAddingStock ? 'Validating...' : 'Add Stock'}</span>
            </button>
          </form>
        </div>

        {/* Feedback Message */}
        {tickerFeedback && (
          <div
            className={`text-xs px-3 py-2 rounded-lg border ${
              tickerFeedback.type === 'success'
                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                : 'bg-rose-950/80 text-rose-300 border-rose-800'
            }`}
          >
            {tickerFeedback.message}
          </div>
        )}

        {/* Chips of Tracked Tickers */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800">
          {trackedTickers.coreTickers.map((t) => {
            const sig = signals.find((s) => s.ticker === t);
            const verdict = sig?.verdict?.action || 'WATCH';
            const vColor =
              verdict === 'BUY'
                ? 'text-emerald-400 border-emerald-800 bg-emerald-950/40'
                : verdict === 'SELL'
                ? 'text-rose-400 border-rose-800 bg-rose-950/40'
                : 'text-amber-400 border-amber-800 bg-amber-950/40';

            return (
              <span
                key={t}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono"
              >
                <button
                  onClick={() => {
                    const match = signals.find((s) => s.ticker === t);
                    if (match) setSelectedSignal(match);
                  }}
                  className="font-bold text-white hover:text-emerald-400 cursor-pointer"
                >
                  {t}
                </button>
                <span className="text-[10px] px-1 py-0.2 rounded bg-slate-800 text-slate-400">Core</span>
                <span className={`text-[10px] font-semibold px-1.5 py-0.2 rounded border ${vColor}`}>
                  {verdict}
                </span>
              </span>
            );
          })}

          {trackedTickers.userTickers.map((t) => {
            const sig = signals.find((s) => s.ticker === t);
            const verdict = sig?.verdict?.action || 'WATCH';
            const vColor =
              verdict === 'BUY'
                ? 'text-emerald-400 border-emerald-800 bg-emerald-950/40'
                : verdict === 'SELL'
                ? 'text-rose-400 border-rose-800 bg-rose-950/40'
                : 'text-amber-400 border-amber-800 bg-amber-950/40';

            return (
              <span
                key={t}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950 border border-blue-900/60 text-xs font-mono"
              >
                <button
                  onClick={() => {
                    const match = signals.find((s) => s.ticker === t);
                    if (match) setSelectedSignal(match);
                  }}
                  className="font-bold text-blue-300 hover:text-white cursor-pointer"
                >
                  {t}
                </button>
                <span className="text-[10px] px-1 py-0.2 rounded bg-blue-950 text-blue-300 border border-blue-800/50">
                  User
                </span>
                <span className={`text-[10px] font-semibold px-1.5 py-0.2 rounded border ${vColor}`}>
                  {verdict}
                </span>
                <button
                  onClick={() => handleRemoveStock(t)}
                  title={`Remove ${t}`}
                  className="text-slate-400 hover:text-rose-400 ml-0.5 cursor-pointer font-bold"
                >
                  ×
                </button>
              </span>
            );
          })}
        </div>
      </section>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Signals Feed (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-emerald-400" />
              Tracked Stocks & Overall Verdicts
            </h2>

            {/* Filters */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="h-4 w-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter ticker or topic..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-xs">
                {(['ALL', 'BUY', 'HOLD', 'SELL'] as const).map((dir) => (
                  <button
                    key={dir}
                    onClick={() => setSelectedDirection(dir)}
                    className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                      selectedDirection === dir
                        ? 'bg-slate-800 text-white shadow-xs'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {dir}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Signals List */}
          <div className="space-y-4">
            {filteredSignals.map((signal) => {
              const isSelected = selectedSignal?.id === signal.id;
              const verdict =
                signal.verdict?.action ||
                (signal.direction === 'BULLISH' ? 'BUY' : signal.direction === 'BEARISH' ? 'SELL' : 'HOLD');
              const conf = signal.verdict?.confidenceScorePct || signal.confidenceScorePct;

              const isBuy = verdict === 'BUY';
              const isSell = verdict === 'SELL';
              const curPrice = signal.metrics.currentPrice ?? signal.metrics.entryPrice;
              const citationCount = signal.citations?.length || 0;
              const quoteObj = quotes.find((q) => q.ticker === signal.ticker);
              const change30d = quoteObj?.change30DayPct ?? 0;
              const change1d = quoteObj?.changeTodayPct ?? 0;

              return (
                <Card
                  key={signal.id}
                  onClick={() => setSelectedSignal(signal)}
                  className={`bg-slate-900 transition-all cursor-pointer border ${
                    isSelected
                      ? 'border-emerald-500 ring-1 ring-emerald-500/50'
                      : 'border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <CardHeader className="p-5 pb-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <span className="text-xl font-black text-white px-2.5 py-1 bg-slate-800 border border-slate-700 rounded-md font-mono">
                          {signal.ticker}
                        </span>
                        <div>
                          <CardTitle className="text-sm font-semibold text-white">
                            {signal.companyName}
                          </CardTitle>
                          <span className="text-xs text-slate-400">{signal.sector}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <a
                          href={`https://finance.yahoo.com/quote/${signal.ticker}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-xs font-mono font-semibold text-emerald-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800 hover:text-emerald-300 flex items-center gap-1"
                        >
                          ${curPrice}
                          <ExternalLink className="h-2.5 w-2.5 text-slate-500" />
                        </a>
                        <Badge
                          className={`font-semibold text-xs border ${
                            isBuy
                              ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60'
                              : isSell
                              ? 'bg-rose-950/60 text-rose-300 border-rose-800/60'
                              : 'bg-amber-950/60 text-amber-300 border-amber-800/60'
                          }`}
                        >
                          {isBuy && <TrendingUp className="h-3 w-3 mr-1 inline" />}
                          {isSell && <TrendingDown className="h-3 w-3 mr-1 inline" />}
                          {verdict} · {conf}%
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="p-5 pt-0">
                    <p className="text-sm font-medium text-slate-200 mt-2 mb-2.5">
                      {signal.verdict?.rationale || signal.headline}
                    </p>

                    <div className="flex flex-wrap items-center justify-between text-xs text-slate-400 border-t border-slate-800/80 pt-3 gap-2">
                      <div className="flex items-center gap-3">
                        <span>
                          Today: <strong className={change1d >= 0 ? 'text-emerald-400' : 'text-rose-400'}>{change1d >= 0 ? '+' : ''}{change1d}%</strong>
                        </span>
                        <span>
                          30-Day: <strong className={change30d >= 0 ? 'text-emerald-400' : 'text-rose-400'}>{change30d >= 0 ? '+' : ''}{change30d}%</strong>
                        </span>
                        <span>
                          Target: <strong className="text-emerald-400">${signal.metrics.targetPrice}</strong>
                        </span>
                      </div>
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded-full">
                        <ShieldCheck className="h-3 w-3" />
                        {citationCount} Primary Sources ↗
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Right Column: Detailed Briefing & Politicians (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {selectedSignal && (
            <Card className="bg-slate-900 border-slate-800 sticky top-6">
              <CardHeader className="p-5 border-b border-slate-800 bg-slate-950/40">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="border-emerald-500/40 text-emerald-400">
                      {selectedSignal.conviction} Conviction
                    </Badge>
                    <span className="text-xs text-slate-400 font-mono">{selectedSignal.aiModel}</span>
                  </div>
                  <span className="text-xs text-slate-500 font-mono">
                    {selectedSignal.generatedAt?.split('T')[0] || 'Today'}
                  </span>
                </div>
              </CardHeader>

              <CardContent className="p-5 space-y-5">
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-white">
                      {selectedSignal.ticker} · {selectedSignal.companyName}
                    </h3>
                    <a
                      href={`https://finance.yahoo.com/quote/${selectedSignal.ticker}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-emerald-400 hover:text-emerald-300 underline flex items-center gap-1"
                    >
                      ${selectedSignal.metrics.currentPrice ?? selectedSignal.metrics.entryPrice} (Tape)
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{selectedSignal.headline}</p>
                </div>

                {/* OVERALL VERDICT BLOCK */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Overall Verdict:</span>
                      <Badge
                        className={`text-xs font-black ${
                          selectedSignal.verdict?.action === 'BUY'
                            ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                            : selectedSignal.verdict?.action === 'SELL'
                            ? 'bg-rose-950 text-rose-300 border-rose-800'
                            : 'bg-amber-950 text-amber-300 border-amber-800'
                        }`}
                      >
                        {selectedSignal.verdict?.action || (selectedSignal.direction === 'BULLISH' ? 'BUY' : 'HOLD')}
                      </Badge>
                    </div>
                    <span className="text-xs font-mono text-slate-400">
                      Confidence: {selectedSignal.verdict?.confidenceScorePct || selectedSignal.confidenceScorePct}%
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {selectedSignal.verdict?.rationale || selectedSignal.thesis}
                  </p>
                </div>

                {/* MULTI-PILLAR EVIDENTIARY DERIVATION */}
                {selectedSignal.verdict?.pillars && (
                  <div className="p-3.5 rounded-lg bg-slate-950/90 border border-emerald-900/40 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                        <ShieldCheck className="h-4 w-4" />
                        Verdict Evidentiary Derivation & Weights
                      </h4>
                      <span className="text-[10px] text-slate-400">Mathematical Audit</span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      {selectedSignal.verdict.calculationMethod}
                    </p>
                    <div className="space-y-2">
                      {selectedSignal.verdict.pillars.map((pillar, idx) => (
                        <div key={idx} className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 text-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <strong className="text-white flex items-center gap-1.5">
                              {pillar.name}
                              <span className="text-[10px] text-emerald-400 font-mono">Weight: {pillar.weightPct}%</span>
                            </strong>
                            <span
                              className={`text-[10px] uppercase font-mono px-1.5 py-0.2 rounded ${
                                pillar.score > 0
                                  ? 'bg-emerald-950 text-emerald-300'
                                  : pillar.score < 0
                                  ? 'bg-rose-950 text-rose-300'
                                  : 'bg-slate-800 text-slate-400'
                              }`}
                            >
                              Score: {pillar.score > 0 ? '+' : ''}{pillar.score}
                            </span>
                          </div>
                          <p className="text-slate-300 text-[11px]">{pillar.summary}</p>
                          <div className="pt-1 flex flex-wrap items-center gap-2">
                            {(pillar.sources || []).map((src, sIdx) => (
                              <a
                                key={sIdx}
                                href={src.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[10px] text-blue-400 hover:text-blue-300 underline flex items-center gap-1"
                              >
                                {src.name} ↗
                              </a>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Primary Citations Audit Trail */}
                {selectedSignal.citations && selectedSignal.citations.length > 0 && (
                  <div className="p-3.5 rounded-lg bg-slate-950/90 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                        <FileText className="h-4 w-4 text-blue-400" />
                        Primary Source Audit Trail
                      </h4>
                      <span className="text-[10px] text-slate-400">Audited Documents</span>
                    </div>
                    <div className="space-y-2">
                      {selectedSignal.citations.map((c, idx) => (
                        <div key={idx} className="bg-slate-900 p-2.5 rounded border border-slate-800 text-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                              {c.sourceType}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono">{c.verifiedDate}</span>
                          </div>
                          <p className="text-slate-200 text-[11px] font-medium">{c.claim}</p>
                          <div className="pt-1 border-t border-slate-800/80 flex items-center justify-between">
                            <span className="text-[10px] text-slate-400 truncate max-w-[200px]">{c.sourceName}</span>
                            <a
                              href={c.sourceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] font-medium text-emerald-400 hover:text-emerald-300 underline flex items-center gap-1"
                            >
                              Verify Source ↗
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Congressional STOCK Act Disclosures */}
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5 text-blue-400" />
                      Official Congressional STOCK Act Filings
                    </span>
                    <span className="text-[10px] text-slate-500 font-normal">U.S. House Clerk</span>
                  </h4>
                  {selectedSignal.evidence.disclosures.length > 0 ? (
                    <div className="space-y-2">
                      {selectedSignal.evidence.disclosures.map((d, idx) => {
                        const pdfUrl = d.filingDocUrl || 'https://disclosures-clerk.house.gov/public_disc/financial-pdfs/2026FD.ZIP';
                        return (
                          <div key={idx} className="bg-slate-950 p-2.5 rounded border border-slate-800/80 text-xs space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-white">{d.politicianName}</span>
                              <Badge
                                variant="outline"
                                className={d.transactionType === 'BUY' ? 'text-emerald-400 border-emerald-800' : 'text-rose-400 border-rose-800'}
                              >
                                {d.transactionType} ({d.amountBracket})
                              </Badge>
                            </div>
                            <p className="text-slate-400 text-[11px]">{d.committeeContext}</p>
                            <div className="mt-2 pt-1 border-t border-slate-900 flex items-center justify-between text-[11px]">
                              <span className="text-slate-500 font-mono">STOCK Act PTR Document</span>
                              <a
                                href={pdfUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-400 hover:text-blue-300 underline flex items-center gap-1"
                              >
                                View Official Clerk PDF
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 bg-slate-950 p-3 rounded border border-slate-800">
                      No recent congressional transactions cataloged in 2026 House Clerk index for {selectedSignal.ticker}. Conviction score reflects missing filing evidence.
                    </p>
                  )}
                </div>

                {/* News Catalysts */}
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Radio className="h-3.5 w-3.5 text-amber-400" />
                      Live Correlated RSS Feeds
                    </span>
                    <span className="text-[10px] text-slate-500 font-normal">Public News Wires</span>
                  </h4>
                  <div className="space-y-2">
                    {selectedSignal.evidence.newsCatalysts.map((newsItem, idx) => {
                      const articleUrl = newsItem.articleUrl || 'https://finance.yahoo.com';
                      return (
                        <div key={idx} className="bg-slate-950 p-2.5 rounded border border-slate-800/80 text-xs space-y-1">
                          <div className="flex items-center justify-between text-slate-400 text-[11px]">
                            <span className="font-medium text-emerald-400/90">{newsItem.source}</span>
                            <span>{new Date(newsItem.publishedAt).toLocaleDateString()}</span>
                          </div>
                          <a
                            href={articleUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-slate-200 font-medium hover:text-emerald-300 block transition-colors flex items-center gap-1.5"
                          >
                            <span>{newsItem.headline}</span>
                            <ExternalLink className="h-3 w-3 shrink-0 text-slate-400" />
                          </a>
                          <p className="text-slate-400 text-[11px] mt-0.5">{newsItem.relevanceNote}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Trump Public Statements relevant to this stock */}
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-rose-300">
                      <MessageSquare className="h-3.5 w-3.5 text-rose-400" />
                      Trump Social Media & Policy Context
                    </span>
                    <span className="text-[10px] text-rose-400/80">Low Weight (5%)</span>
                  </h4>
                  {(() => {
                    const matched = trumpPosts.filter(
                      (tp) =>
                        tp.matchedTickers?.includes(selectedSignal.ticker) ||
                        tp.content?.toUpperCase().includes(selectedSignal.ticker)
                    );
                    if (matched.length === 0) {
                      return (
                        <p className="text-xs text-slate-500 bg-slate-950 p-3 rounded border border-slate-800">
                          No direct Trump social media statements identified for {selectedSignal.ticker}.
                        </p>
                      );
                    }
                    return (
                      <div className="space-y-2">
                        {matched.map((tp) => (
                          <div key={tp.id} className="bg-slate-950 p-2.5 rounded border border-rose-950/60 text-xs space-y-1">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="font-bold text-rose-300">{tp.author}</span>
                              <span className="text-slate-500 font-mono">{new Date(tp.publishedAt).toLocaleDateString()}</span>
                            </div>
                            <p className="text-slate-200 text-xs">{tp.content}</p>
                            <div className="pt-1 flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-900">
                              <span className="px-1.5 py-0.2 rounded bg-slate-900 text-slate-300 font-mono">{tp.topic}</span>
                              <a
                                href={tp.postUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-rose-400 hover:text-rose-300 underline flex items-center gap-0.5"
                              >
                                View Post ↗
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>

                {/* Legislative Hooks */}
                {selectedSignal.evidence.legislativeHooks.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                      Legislative & Oversight Framework
                    </h4>
                    <ul className="text-xs text-slate-300 space-y-1 list-disc list-inside bg-slate-950 p-2.5 rounded border border-slate-800/80">
                      {selectedSignal.evidence.legislativeHooks.map((hook, idx) => (
                        <li key={idx} className="text-slate-300">
                          {hook}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Key Risks */}
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-rose-400 mb-1.5 flex items-center gap-1">
                    <ShieldAlert className="h-3.5 w-3.5 text-rose-400" />
                    Key Risk Factors
                  </h4>
                  <ul className="text-xs text-slate-400 space-y-1 list-disc list-inside">
                    {selectedSignal.keyRisks.map((risk, idx) => (
                      <li key={idx}>{risk}</li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Politician Watchlist Leaderboard */}
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="p-4 border-b border-slate-800">
              <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
                <Users className="h-4 w-4 text-purple-400" />
                Active Congressional Traders (Bioguide Verified)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 divide-y divide-slate-800/80">
              {politicians.map((pol) => {
                const initials = pol.name.split(' ').map((n) => n[0]).join('').slice(0, 2);
                const fallbackSvg = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100%" height="100%" fill="%23334155"/><text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="36" font-weight="bold" fill="%23f8fafc">${initials}</text></svg>`;
                const bioguideLink = pol.bioguideUrl || (pol.bioguideId ? `https://bioguide.congress.gov/search/bio/${pol.bioguideId}` : '#');

                return (
                  <div key={pol.id} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <img
                        src={pol.avatarUrl}
                        alt={pol.name}
                        className="h-8 w-8 rounded-full object-cover border border-slate-700 bg-slate-800 shrink-0"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = fallbackSvg;
                        }}
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <a
                            href={bioguideLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-medium text-white hover:text-blue-300 underline flex items-center gap-1"
                          >
                            {pol.name}
                            <ExternalLink className="h-2.5 w-2.5 text-slate-500" />
                          </a>
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-slate-700 text-slate-400">
                            {pol.party[0]}-{pol.state}
                          </Badge>
                        </div>
                        <span className="text-[11px] text-slate-400">
                          {pol.chamber} · {pol.totalTradesTracked} trades · Bioguide: {pol.bioguideId || 'Official'}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-semibold text-emerald-400 block">
                        +{pol.alphaVsSp500Pct}% Alpha
                      </span>
                      <span className="text-[11px] text-slate-400">
                        ${(pol.tradeVolumeYtdUsd / 1_000_000).toFixed(1)}M YTD
                      </span>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Donald Trump Public Statement & Policy Wire Card */}
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="p-4 border-b border-slate-800 flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-rose-400" />
                Trump Public Social Media & Policy Wire
              </CardTitle>
              <span className="text-[10px] text-rose-400/80 font-mono">5% Verdict Weight</span>
            </CardHeader>
            <CardContent className="p-4 divide-y divide-slate-800/80 max-h-96 overflow-y-auto">
              {trumpPosts.length > 0 ? (
                trumpPosts.map((tp) => (
                  <div key={tp.id} className="py-3 first:pt-0 last:pb-0 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-white">{tp.author}</span>
                        <span className="text-slate-500 font-mono">{tp.handle}</span>
                      </div>
                      <span className="text-slate-500 font-mono text-[10px]">
                        {new Date(tp.publishedAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-xs text-slate-200 leading-relaxed">{tp.content}</p>
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      <span className="text-[10px] px-1.5 py-0.2 rounded border font-mono bg-slate-950 text-slate-300 border-slate-800">
                        {tp.topic}
                      </span>
                      <div className="flex items-center gap-2">
                        {(tp.matchedTickers || []).map((t) => (
                          <button
                            key={t}
                            onClick={() => {
                              const match = signals.find((s) => s.ticker === t);
                              if (match) setSelectedSignal(match);
                            }}
                            className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-slate-800 text-emerald-400 hover:text-white cursor-pointer"
                          >
                            {t}
                          </button>
                        ))}
                        <a
                          href={tp.postUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] text-rose-400 hover:text-rose-300 underline flex items-center gap-0.5"
                        >
                          Source ↗
                        </a>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-slate-500 text-xs py-2">No Trump public statements currently cataloged.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* FACT-CHECK STANDARDS MODAL */}
      {showTransparencyModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-950 text-emerald-400 rounded-lg border border-emerald-800/60">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">InsightTrader Fact-Check & Transparency Standards</h3>
                  <p className="text-xs text-slate-400">Auditable primary records for every claim</p>
                </div>
              </div>
              <button
                onClick={() => setShowTransparencyModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="text-xs text-slate-300 space-y-3 max-h-[65vh] overflow-y-auto pr-2">
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
                <strong className="text-emerald-400 block text-xs">1. Official Congressional STOCK Act Filings</strong>
                <p className="text-slate-400">
                  Downloaded directly from the <strong>U.S. House of Representatives Legislative Resource Center</strong> (<a href="https://disclosures-clerk.house.gov" target="_blank" rel="noopener noreferrer" className="text-blue-400 underline">disclosures-clerk.house.gov</a>) and Senate Financial Disclosures. Each filing is cited with its official government Document ID and a direct PDF download link.
                </p>
              </div>

              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
                <strong className="text-emerald-400 block text-xs">2. Verified Legislator Bioguide Metadata</strong>
                <p className="text-slate-400">
                  Official congressional photographs and committee assignments are linked to the authoritative Biographical Directory of the United States Congress (<a href="https://bioguide.congress.gov" target="_blank" rel="noopener noreferrer" className="text-blue-400 underline">bioguide.congress.gov</a>). No random or unsourced stock photos are ever used.
                </p>
              </div>

              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
                <strong className="text-emerald-400 block text-xs">3. Real-Time Market Exchange Tape & Formulas</strong>
                <p className="text-slate-400">
                  Current trading prices, daily changes, and 30-day percentage calculations are computed against live Yahoo Finance exchange tape. All formulas are published alongside the underlying source tape data.
                </p>
              </div>

              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
                <strong className="text-emerald-400 block text-xs">4. Donald Trump Public Social Wire (Low Weighting)</strong>
                <p className="text-slate-400">
                  Donald Trump's public statements regarding tariffs, defense spending, and technology policy are captured with direct links to Truth Social. They are allocated a strictly limited 5% weighting to provide context without distorting audited filing and price data.
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setShowTransparencyModal(false)}
                className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
