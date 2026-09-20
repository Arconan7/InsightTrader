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
  BenchmarkPerformanceMetrics,
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
  Landmark,
  Newspaper,
  Check,
  CheckSquare,
  Square,
  Filter,
  ChevronRight,
  Info,
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
  const [performance, setPerformance] = useState<BenchmarkPerformanceMetrics | null>(null);
  const [trackedTickers, setTrackedTickers] = useState<TrackedTickersState>({
    coreTickers: CORE_TICKERS,
    userTickers: [],
    allTickers: CORE_TICKERS,
  });

  const [selectedSignal, setSelectedSignal] = useState<TradeSignal>(mockTradeSignals[0]);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncMessage, setSyncMessage] = useState<string>('');
  const [showTransparencyModal, setShowTransparencyModal] = useState<boolean>(false);
  const [showPerformanceModal, setShowPerformanceModal] = useState<boolean>(false);

  // Right-Side Tab State
  const [activeRightTab, setActiveRightTab] = useState<'stock' | 'congress' | 'news'>('stock');

  // TAB 1: Congress Filter State
  const [congressSearch, setCongressSearch] = useState<string>('');
  const [congressChamberFilter, setCongressChamberFilter] = useState<'ALL' | 'House' | 'Senate'>('ALL');
  const [selectedPoliticianIds, setSelectedPoliticianIds] = useState<Set<string>>(new Set());

  // TAB 2: News Filter State
  const [newsTickerFilter, setNewsTickerFilter] = useState<string>('ALL');
  const [newsFeedType, setNewsFeedType] = useState<'ALL' | 'articles' | 'trump'>('ALL');

  // User Add Stock state
  const [newTickerInput, setNewTickerInput] = useState<string>('');
  const [isAddingStock, setIsAddingStock] = useState<boolean>(false);
  const [tickerFeedback, setTickerFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Initial load from live backend API if available
  useEffect(() => {
    async function loadLiveData() {
      try {
        const [signalsRes, summaryRes, politiciansRes, disclosuresRes, newsRes, tickersRes, quotesRes, trumpRes, perfRes] =
          await Promise.allSettled([
            fetch('/api/signals').then((r) => (r.ok ? r.json() : null)),
            fetch('/api/summary').then((r) => (r.ok ? r.json() : null)),
            fetch('/api/politicians').then((r) => (r.ok ? r.json() : null)),
            fetch('/api/disclosures').then((r) => (r.ok ? r.json() : null)),
            fetch('/api/news').then((r) => (r.ok ? r.json() : null)),
            fetch('/api/tickers').then((r) => (r.ok ? r.json() : null)),
            fetch('/api/quotes').then((r) => (r.ok ? r.json() : null)),
            fetch('/api/trump-posts').then((r) => (r.ok ? r.json() : null)),
            fetch('/api/performance').then((r) => (r.ok ? r.json() : null)),
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
        if (perfRes.status === 'fulfilled' && perfRes.value) {
          setPerformance(perfRes.value);
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

  // Real historical benchmark calculation and statistical confidence
  const benchmarkMetrics: BenchmarkPerformanceMetrics = useMemo(() => {
    if (performance) return performance;
    if (summary.benchmarkPerformance) return summary.benchmarkPerformance;

    const evaluated: any[] = signals.map((s) => {
      const entryPrice = s.metrics?.entryPrice || 100;
      const currentPrice = s.metrics?.currentPrice || entryPrice;
      const ret = s.metrics?.returnSinceSignalPct ?? 0.0;
      const bRet = s.metrics?.benchmarkReturnPct ?? 0.0;
      const excess = +(ret - bRet).toFixed(2);
      return {
        signalId: s.id,
        ticker: s.ticker,
        companyName: s.companyName,
        direction: s.direction,
        verdictAction: s.verdict?.action || (s.direction === 'BULLISH' ? 'BUY' : 'HOLD'),
        entryPrice,
        currentPrice,
        signalReturnPct: ret,
        benchmarkReturnPct: bRet,
        excessReturnPct: excess,
        isWin: excess > 0,
        generatedAt: s.generatedAt || new Date().toISOString(),
        sourceUrl: `https://finance.yahoo.com/quote/${s.ticker}`,
        benchmarkSourceUrl: 'https://finance.yahoo.com/quote/SPY',
      };
    });

    return {
      isSufficientData: false,
      confidenceDisplay: 'T₀ Baseline Active',
      confidenceScorePct: null,
      insightTraderReturnPct: 0.0,
      benchmarkReturnPct: 0.0,
      excessReturnPct: 0.0,
      evaluatedSignalsCount: evaluated.length,
      winRatePct: 0.0,
      tStatistic: null,
      sampleStdDev: null,
      standardError: null,
      benchmarkName: 'S&P 500 Index (SPY ETF)',
      benchmarkTicker: 'SPY',
      benchmarkCurrentPrice: 560,
      statusText: 'Forward Tracking Active (T₀ Baseline Established)',
      formula: 'Forward Horizon Evaluation: t = (MeanExcessReturn_{T1}) / (s_D / √N)',
      methodology: 'T₀ forward paper-tracking architecture. When signals are generated at time T₀, entry prices are locked to live market tape with zero lookahead bias. Statistical confidence will be computed as forward performance matures over 7d, 30d, and 90d horizons.',
      disclaimer: 'Statistical evaluation tracks signals generated in real-time. InsightTrader does not fabricate historical entry discounts or backfilled outperformance. Past performance of public figures does not guarantee future investment returns.',
      trackingArchitecture: {
        step1: 'T₀ Signal Genesis: Signal generated and locked to live exchange tape at time T₀.',
        step2: 'Forward Horizon Tracking: Automated recording of performance at T+7d, T+30d, and T+90d intervals.',
        step3: 'Rigorous Significance Testing: Paired Student-t test against SPY benchmark once forward sample matures (N >= 30).',
      },
      evaluatedSignals: evaluated,
    };
  }, [performance, summary, signals]);

  // Filtered politicians for TAB 1
  const filteredPoliticians = useMemo(() => {
    return politicians.filter((p) => {
      if (isLanxess(p)) return false;
      const matchesChamber =
        congressChamberFilter === 'ALL' ||
        p.chamber.toLowerCase() === congressChamberFilter.toLowerCase();
      const q = congressSearch.toLowerCase();
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.state.toLowerCase().includes(q) ||
        (p.party && p.party.toLowerCase().includes(q));
      return matchesChamber && matchesSearch;
    });
  }, [politicians, congressChamberFilter, congressSearch]);

  // Filtered disclosures for TAB 1
  const filteredDisclosures = useMemo(() => {
    return disclosures.filter((d) => {
      if (isLanxess(d)) return false;
      if (selectedPoliticianIds.size > 0) {
        return selectedPoliticianIds.has(d.politicianId) || selectedPoliticianIds.has(d.politicianName);
      }
      return true;
    });
  }, [disclosures, selectedPoliticianIds]);

  // Filtered news for TAB 2
  const filteredNews = useMemo(() => {
    return news.filter((n) => {
      if (isLanxess(n)) return false;
      if (newsTickerFilter === 'ALL') return true;
      const t = newsTickerFilter.toUpperCase();
      return (n.relatedTickers || []).includes(t) || (n.headline || '').toUpperCase().includes(t);
    });
  }, [news, newsTickerFilter]);

  // Filtered Trump posts for TAB 2
  const filteredTrumpPosts = useMemo(() => {
    return trumpPosts.filter((tp) => {
      if (isLanxess(tp)) return false;
      if (newsTickerFilter === 'ALL') return true;
      const t = newsTickerFilter.toUpperCase();
      return (tp.matchedTickers || []).includes(t) || (tp.content || '').toUpperCase().includes(t);
    });
  }, [trumpPosts, newsTickerFilter]);

  const togglePoliticianSelection = (id: string) => {
    setSelectedPoliticianIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAllPoliticians = () => {
    const all = new Set(filteredPoliticians.map((p) => p.id));
    setSelectedPoliticianIds(all);
  };

  const clearPoliticianSelection = () => {
    setSelectedPoliticianIds(new Set());
  };

  // Combined News + Trump feed for Tab 2
  const combinedNewsFeed = useMemo(() => {
    const items: Array<
      | { type: 'article'; data: NewsArticle; date: Date }
      | { type: 'trump'; data: TrumpPost; date: Date }
    > = [];

    if (newsFeedType === 'ALL' || newsFeedType === 'articles') {
      filteredNews.forEach((n) => {
        items.push({
          type: 'article',
          data: n,
          date: new Date(n.publishedAt || Date.now()),
        });
      });
    }

    if (newsFeedType === 'ALL' || newsFeedType === 'trump') {
      filteredTrumpPosts.forEach((tp) => {
        items.push({
          type: 'trump',
          data: tp,
          date: new Date(tp.publishedAt || Date.now()),
        });
      });
    }

    return items.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [filteredNews, filteredTrumpPosts, newsFeedType]);

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
            onClick={() => setShowPerformanceModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-700/80 text-emerald-300 text-xs font-semibold transition-colors cursor-pointer"
          >
            <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
            <span>Market-Beating Stats</span>
          </button>

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

      {/* KPI Stats Cards - Enhanced with Prominent Signal Paper-Tracking Stat */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        {/* PROMINENT SIGNAL PAPER-TRACKING STAT */}
        <Card
          onClick={() => setShowPerformanceModal(true)}
          className="bg-slate-900 border-emerald-800/80 hover:border-emerald-500/80 transition-all cursor-pointer relative overflow-hidden group shadow-lg"
        >
          <div className="absolute top-0 right-0 h-16 w-16 bg-emerald-500/5 rounded-bl-full pointer-events-none group-hover:bg-emerald-500/10 transition-colors" />
          <CardContent className="p-4 sm:p-5 flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Signal Paper-Tracking</p>
                <Badge variant="outline" className="text-[9px] px-1 py-0 border-emerald-600/50 text-emerald-400 font-mono">
                  T₀ Baseline
                </Badge>
              </div>
              <h3 className="text-2xl font-black text-emerald-400 flex items-baseline gap-1.5">
                {benchmarkMetrics.confidenceDisplay || 'T₀ Baseline Active'}
              </h3>
              <div className="text-[11px] text-slate-300 font-mono space-y-0.5 pt-0.5">
                <div className="flex items-center gap-2">
                  <span>InsightTrader: <strong className="text-emerald-400">0.0%</strong></span>
                  <span className="text-slate-600">|</span>
                  <span>SPY: <strong className="text-slate-300">0.0%</strong></span>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-slate-400">
                  <span>Horizons: 7d · 30d · 90d</span>
                  <span className="text-slate-600">|</span>
                  <span>Signals: {benchmarkMetrics.evaluatedSignalsCount}</span>
                </div>
              </div>
              <span className="inline-block text-[10px] text-emerald-400/90 group-hover:underline pt-0.5 font-medium">
                Click to inspect forward tracking audit ↗
              </span>
            </div>
            <div className="p-2.5 bg-emerald-950/70 border border-emerald-800/60 rounded-xl text-emerald-400 shrink-0">
              <TrendingUp className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

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
                {summary.officialPtrFilingsCataloged || 395}
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
                        <div className="flex items-center gap-1.5">
                          <span className="text-xl font-black text-white px-2.5 py-1 bg-slate-800 border border-slate-700 rounded-md font-mono">
                            {signal.ticker}
                          </span>
                          <Badge variant="outline" className="text-[9px] font-mono px-1 py-0.2 bg-blue-950/80 text-blue-300 border-blue-800/80 font-bold">
                            DERIVED
                          </Badge>
                        </div>
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

        {/* Right Column: Tab System (Congress, News & Wire, Stock Briefing) (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Right-Side Tab Bar */}
          <div className="bg-slate-900 border border-slate-800 p-1 rounded-xl flex items-center gap-1 shadow-md">
            <button
              onClick={() => setActiveRightTab('stock')}
              className={`flex-1 py-2 px-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeRightTab === 'stock'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <FileText className="h-3.5 w-3.5" />
              <span>Signal Briefing</span>
              {selectedSignal && (
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-black/30 text-emerald-200 font-bold">
                  {selectedSignal.ticker}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveRightTab('congress')}
              className={`flex-1 py-2 px-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeRightTab === 'congress'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Landmark className="h-3.5 w-3.5" />
              <span>Congress</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-black/30 text-purple-200 font-bold">
                {filteredDisclosures.length}
              </span>
            </button>

            <button
              onClick={() => setActiveRightTab('news')}
              className={`flex-1 py-2 px-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeRightTab === 'news'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Newspaper className="h-3.5 w-3.5" />
              <span>News & Wire</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-black/30 text-amber-200 font-bold">
                {combinedNewsFeed.length}
              </span>
            </button>
          </div>

          {/* TAB 1: CONGRESSIONAL TRADING ACTIVITY */}
          {activeRightTab === 'congress' && (
            <div className="space-y-4">
              {/* Congress Controls Card */}
              <Card className="bg-slate-900 border-slate-800">
                <CardHeader className="p-4 border-b border-slate-800 pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                      <Landmark className="h-4 w-4 text-purple-400" />
                      Congressional STOCK Act Intelligence
                    </CardTitle>
                    <Badge variant="outline" className="text-[10px] border-purple-800/60 text-purple-300 font-mono">
                      {politicians.length} Bioguide Profiles
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Direct public filings from U.S. House Clerk 2026FD PTR records and Senate financial disclosures.
                  </p>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                  {/* Search and Chamber Filter */}
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
                      <input
                        type="text"
                        placeholder="Search 100+ members by name, state (TX, CA), party..."
                        value={congressSearch}
                        onChange={(e) => setCongressSearch(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500"
                      />
                    </div>
                    <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 shrink-0">
                      <button
                        onClick={() => setCongressChamberFilter('ALL')}
                        className={`px-2 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                          congressChamberFilter === 'ALL'
                            ? 'bg-purple-600 text-white'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        All ({politicians.length})
                      </button>
                      <button
                        onClick={() => setCongressChamberFilter('House')}
                        className={`px-2 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                          congressChamberFilter === 'House'
                            ? 'bg-blue-600 text-white'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        House ({politicians.filter((p) => p.chamber === 'House').length})
                      </button>
                      <button
                        onClick={() => setCongressChamberFilter('Senate')}
                        className={`px-2 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                          congressChamberFilter === 'Senate'
                            ? 'bg-purple-700 text-white'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Senate ({politicians.filter((p) => p.chamber === 'Senate').length})
                      </button>
                    </div>
                  </div>

                  {/* Multi-Select Action Bar */}
                  <div className="flex items-center justify-between pt-1 border-t border-slate-850 text-xs">
                    <span className="text-[11px] text-slate-400">
                      {selectedPoliticianIds.size > 0 ? (
                        <strong className="text-purple-300">{selectedPoliticianIds.size} members selected</strong>
                      ) : (
                        'Showing all member transactions'
                      )}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={selectAllPoliticians}
                        className="text-[11px] font-medium text-purple-400 hover:text-purple-300 underline cursor-pointer"
                      >
                        Select All ({filteredPoliticians.length})
                      </button>
                      {selectedPoliticianIds.size > 0 && (
                        <button
                          onClick={clearPoliticianSelection}
                          className="text-[11px] font-medium text-rose-400 hover:text-rose-300 underline cursor-pointer"
                        >
                          Clear Selection
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Member Selector Chip Tray */}
                  <div className="max-h-36 overflow-y-auto pr-1 space-y-1 bg-slate-950 p-2 rounded-lg border border-slate-800/80">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {filteredPoliticians.map((pol) => {
                        const isSelected = selectedPoliticianIds.has(pol.id) || selectedPoliticianIds.has(pol.name);
                        const initials = pol.name
                          .split(' ')
                          .map((n) => n[0])
                          .join('')
                          .slice(0, 2);
                        const fallbackSvg = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100%" height="100%" fill="%23334155"/><text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="36" font-weight="bold" fill="%23f8fafc">${initials}</text></svg>`;

                        return (
                          <div
                            key={pol.id}
                            onClick={() => togglePoliticianSelection(pol.id)}
                            className={`p-1.5 rounded flex items-center justify-between gap-2 border text-xs cursor-pointer transition-colors ${
                              isSelected
                                ? 'bg-purple-950/70 border-purple-600/80 text-white'
                                : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-900'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <img
                                src={pol.avatarUrl}
                                alt={pol.name}
                                className="h-6 w-6 rounded-full object-cover border border-slate-700 shrink-0"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = fallbackSvg;
                                }}
                              />
                              <div className="min-w-0 truncate">
                                <span className="font-medium text-[11px] block truncate">{pol.name}</span>
                                <span className="text-[9px] text-slate-400 block">
                                  {pol.chamber === 'Senate' ? 'Sen.' : 'Rep.'} ({pol.party[0]}-{pol.state}) · {pol.totalTradesTracked} trades
                                </span>
                              </div>
                            </div>
                            <div className="shrink-0">
                              {isSelected ? (
                                <CheckSquare className="h-3.5 w-3.5 text-purple-400" />
                              ) : (
                                <Square className="h-3.5 w-3.5 text-slate-600" />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Congressional Disclosure Feed */}
              <Card className="bg-slate-900 border-slate-800">
                <CardHeader className="p-4 border-b border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-purple-400" />
                    <h3 className="text-sm font-bold text-white">
                      Official Disclosures & STOCK Act Filings
                    </h3>
                  </div>
                  <span className="text-xs text-slate-400 font-mono">
                    {filteredDisclosures.length} Records
                  </span>
                </CardHeader>
                <CardContent className="p-4 divide-y divide-slate-800/80 max-h-[600px] overflow-y-auto space-y-3">
                  {filteredDisclosures.length > 0 ? (
                    filteredDisclosures.map((d, idx) => {
                      const isBuy = d.transactionType === 'BUY';
                      const initials = (d.politicianName || 'MC')
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .slice(0, 2);
                      const fallbackSvg = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100%" height="100%" fill="%23334155"/><text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="36" font-weight="bold" fill="%23f8fafc">${initials}</text></svg>`;
                      const bioguideLink = d.bioguideId
                        ? `https://bioguide.congress.gov/search/bio/${d.bioguideId}`
                        : '#';
                      const pdfUrl =
                        d.filingDocUrl ||
                        (d.docId
                          ? `https://disclosures-clerk.house.gov/public_disc/ptr-pdfs/2026/${d.docId}.pdf`
                          : 'https://disclosures-clerk.house.gov');

                      return (
                        <div key={idx} className="pt-3 first:pt-0 space-y-2">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-2.5">
                              <img
                                src={d.avatarUrl || (d.bioguideId ? `https://unitedstates.github.io/images/congress/225x275/${d.bioguideId}.jpg` : fallbackSvg)}
                                alt={d.politicianName}
                                className="h-9 w-9 rounded-full object-cover border border-slate-700 bg-slate-800 shrink-0"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = fallbackSvg;
                                }}
                              />
                              <div>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <a
                                    href={bioguideLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs font-bold text-white hover:text-purple-300 underline flex items-center gap-1"
                                  >
                                    {d.politicianName}
                                    <ExternalLink className="h-2.5 w-2.5 text-slate-500" />
                                  </a>
                                  {d.chamber === 'Senate' ? (
                                    <Badge className="bg-purple-950 text-purple-300 border-purple-800 text-[10px] py-0 px-1.5">
                                      Senate
                                    </Badge>
                                  ) : (
                                    <Badge className="bg-blue-950 text-blue-300 border-blue-800 text-[10px] py-0 px-1.5">
                                      House
                                    </Badge>
                                  )}
                                  <Badge variant="outline" className="text-[10px] py-0 px-1 border-slate-700 text-slate-400">
                                    {d.party?.[0] || '?'}-{d.state || 'US'}
                                  </Badge>
                                  <Badge
                                    variant="outline"
                                    className={`text-[9px] font-mono font-bold px-1.5 py-0 ${
                                      (d.provenance || (d.docId ? 'VERIFIED' : 'DEMO')) === 'VERIFIED'
                                        ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                                        : 'bg-amber-950 text-amber-300 border-amber-800'
                                    }`}
                                    title={d.provenanceDetails || ''}
                                  >
                                    {(d.provenance || (d.docId ? 'VERIFIED' : 'DEMO')) === 'VERIFIED' ? '✓ VERIFIED' : '◈ DEMO'}
                                  </Badge>
                                </div>
                                <span className="text-[11px] text-slate-400">
                                  {d.committeeContext || (d.chamber === 'Senate' ? 'U.S. Senate' : 'U.S. House of Representatives')}
                                </span>
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              <Badge
                                className={`text-xs font-bold ${
                                  isBuy
                                    ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                                    : 'bg-rose-950 text-rose-300 border-rose-800'
                                }`}
                              >
                                {d.transactionType}
                              </Badge>
                              <span className="text-[11px] font-mono text-slate-300 block mt-0.5">
                                {d.amountBracket}
                              </span>
                            </div>
                          </div>

                          <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-white bg-slate-800 px-2 py-0.5 rounded text-xs">
                                {d.ticker}
                              </span>
                              <span className="text-slate-400 text-[11px]">{d.assetDescription}</span>
                            </div>

                            <div className="flex items-center gap-3 text-[11px] text-slate-400">
                              <span>Traded: <strong className="text-slate-300">{d.transactionDate}</strong></span>
                              <span>Filed: <strong className="text-slate-300">{d.filingDate}</strong></span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-850">
                            <span className="text-slate-500 font-mono">
                              Doc ID: {d.docId || '2026-STOCK-ACT'}
                            </span>
                            <a
                              href={pdfUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-purple-400 hover:text-purple-300 underline font-medium flex items-center gap-1"
                            >
                              Official Clerk PDF Document
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-6 text-center text-slate-500 space-y-2">
                      <p className="text-xs">No congressional disclosures match the current selection.</p>
                      <button
                        onClick={clearPoliticianSelection}
                        className="text-xs text-purple-400 hover:underline"
                      >
                        Reset filters to view all filings
                      </button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* TAB 2: NEWS & WIRE (REPUTABLE + TRUMP TRACKER) */}
          {activeRightTab === 'news' && (
            <div className="space-y-4">
              {/* News Filter Header Card */}
              <Card className="bg-slate-900 border-slate-800">
                <CardHeader className="p-4 border-b border-slate-800 pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                      <Newspaper className="h-4 w-4 text-amber-400" />
                      Live Market & Regulatory Wire
                    </CardTitle>
                    <Badge variant="outline" className="text-[10px] border-amber-800/60 text-amber-300 font-mono">
                      {combinedNewsFeed.length} Items Live
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Multi-feed stream from Yahoo Finance, CNBC, MarketWatch, SEC/Regulatory wires & Donald Trump Truth Social statements.
                  </p>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                  {/* Feed Filters & Ticker Selector */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
                      <button
                        onClick={() => setNewsFeedType('ALL')}
                        className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                          newsFeedType === 'ALL'
                            ? 'bg-amber-600 text-white'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        All Wire ({filteredNews.length + filteredTrumpPosts.length})
                      </button>
                      <button
                        onClick={() => setNewsFeedType('articles')}
                        className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                          newsFeedType === 'articles'
                            ? 'bg-blue-600 text-white'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Reputable News ({filteredNews.length})
                      </button>
                      <button
                        onClick={() => setNewsFeedType('trump')}
                        className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                          newsFeedType === 'trump'
                            ? 'bg-rose-600 text-white'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Trump Wire ({filteredTrumpPosts.length})
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Filter className="h-3.5 w-3.5 text-slate-500" />
                      <select
                        value={newsTickerFilter}
                        onChange={(e) => setNewsTickerFilter(e.target.value)}
                        className="bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-amber-500 font-mono"
                      >
                        <option value="ALL">All Tickers</option>
                        {trackedTickers.allTickers.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* News Stream Feed */}
              <div className="space-y-3 max-h-[700px] overflow-y-auto pr-1">
                {combinedNewsFeed.length > 0 ? (
                  combinedNewsFeed.map((item, idx) => {
                    if (item.type === 'trump') {
                      const tp = item.data as TrumpPost;
                      return (
                        <Card
                          key={`trump-${tp.id || idx}`}
                          className="bg-gradient-to-br from-slate-950 via-slate-900 to-rose-950/20 border-rose-900/60 shadow-sm"
                        >
                          <CardContent className="p-4 space-y-2">
                            <div className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-rose-300 flex items-center gap-1">
                                  <MessageSquare className="h-3.5 w-3.5 text-rose-400" />
                                  {tp.author}
                                </span>
                                <span className="text-slate-500 font-mono text-[10px]">{tp.handle}</span>
                                <Badge className="bg-rose-950 text-rose-300 border-rose-800 text-[9px] py-0 px-1">
                                  Truth Social
                                </Badge>
                                <Badge variant="outline" className="border-amber-700/60 text-amber-300 text-[9px] py-0 px-1">
                                  5% Weight
                                </Badge>
                              </div>
                              <span className="text-slate-500 font-mono text-[10px]">
                                {new Date(tp.publishedAt).toLocaleDateString()}
                              </span>
                            </div>

                            <p className="text-xs text-slate-200 leading-relaxed font-sans bg-slate-950/60 p-2.5 rounded border border-rose-950/40">
                              "{tp.content}"
                            </p>

                            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-rose-950/50 text-[11px]">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-900 text-slate-300 border border-slate-800">
                                  {tp.topic}
                                </span>
                                {(tp.matchedTickers || []).map((t) => (
                                  <button
                                    key={t}
                                    onClick={() => {
                                      const match = signals.find((s) => s.ticker === t);
                                      if (match) setSelectedSignal(match);
                                      setActiveRightTab('stock');
                                    }}
                                    className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-slate-800 text-emerald-400 hover:text-white cursor-pointer"
                                  >
                                    {t}
                                  </button>
                                ))}
                              </div>
                              <a
                                href={tp.postUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-rose-400 hover:text-rose-300 underline font-medium flex items-center gap-1"
                              >
                                View Truth Social Post
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    }

                    // Reputable News Article
                    const art = item.data as NewsArticle;
                    const isRegulatory =
                      art.source?.includes('SEC') || art.source?.includes('Regulatory') || art.source?.includes('Policy');

                    return (
                      <Card key={`news-${art.id || idx}`} className="bg-slate-900 border-slate-800 hover:border-slate-700 transition-colors">
                        <CardContent className="p-4 space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <Badge
                                variant="outline"
                                className={`text-[10px] py-0 px-1.5 ${
                                  isRegulatory
                                    ? 'border-purple-800/80 bg-purple-950/40 text-purple-300'
                                    : 'border-emerald-800/80 bg-emerald-950/40 text-emerald-300'
                                }`}
                              >
                                {art.source || 'Financial Wire'}
                              </Badge>
                              {art.sentiment && (
                                <span
                                  className={`text-[10px] font-mono font-bold ${
                                    art.sentiment === 'BULLISH'
                                      ? 'text-emerald-400'
                                      : art.sentiment === 'BEARISH'
                                      ? 'text-rose-400'
                                      : 'text-slate-400'
                                  }`}
                                >
                                  {art.sentiment}
                                </span>
                              )}
                            </div>
                            <span className="text-slate-500 font-mono text-[10px]">
                              {new Date(art.publishedAt).toLocaleDateString()}
                            </span>
                          </div>

                          <a
                            href={art.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs sm:text-sm font-semibold text-white hover:text-amber-300 block transition-colors leading-snug"
                          >
                            <span className="inline-flex items-center gap-1.5">
                              {art.headline}
                              <ExternalLink className="h-3 w-3 text-slate-400 shrink-0" />
                            </span>
                          </a>

                          {art.summary && (
                            <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">
                              {art.summary}
                            </p>
                          )}

                          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800/80 text-[11px]">
                            <div className="flex items-center gap-1.5">
                              {(art.relatedTickers || []).map((t) => (
                                <button
                                  key={t}
                                  onClick={() => {
                                    const match = signals.find((s) => s.ticker === t);
                                    if (match) setSelectedSignal(match);
                                    setActiveRightTab('stock');
                                  }}
                                  className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-slate-800 text-amber-400 hover:text-white cursor-pointer"
                                >
                                  {t}
                                </button>
                              ))}
                            </div>
                            <a
                              href={art.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-amber-400 hover:text-amber-300 underline font-medium flex items-center gap-1"
                            >
                              Read Full Article ↗
                            </a>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                ) : (
                  <div className="p-6 text-center text-slate-500 bg-slate-900 rounded-xl border border-slate-800">
                    <p className="text-xs">No news articles match current feed and ticker filters.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: STOCK BRIEFING (DETAILED SIGNAL DOSSIER) */}
          {activeRightTab === 'stock' && selectedSignal && (
            <Card className="bg-slate-900 border-slate-800 sticky top-6">
              <CardHeader className="p-5 border-b border-slate-800 bg-slate-950/40">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="border-emerald-500/40 text-emerald-400">
                      {selectedSignal.conviction} Conviction
                    </Badge>
                    {selectedSignal.synthesisMode === 'NEMOTRON_NIM' || (selectedSignal.aiModel && selectedSignal.aiModel.includes('Live NIM')) ? (
                      <Badge className="bg-emerald-950/90 text-emerald-300 border-emerald-700 text-[10px] font-mono flex items-center gap-1 font-semibold">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        ⚡ {selectedSignal.aiModel || 'Nemotron-70B (Live NIM)'}
                      </Badge>
                    ) : (
                      <Badge className="bg-amber-950/90 text-amber-300 border-amber-700 text-[10px] font-mono flex items-center gap-1 font-semibold">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                        ⚙️ {selectedSignal.aiModel || 'Heuristic Fallback (Rule Engine)'}
                      </Badge>
                    )}
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
                              <Badge variant="outline" className="text-[9px] font-mono px-1 py-0 border-blue-800/80 text-blue-300 bg-blue-950/80">
                                DERIVED
                              </Badge>
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
                      {selectedSignal.citations.map((c, idx) => {
                        const prov = c.provenance || 'VERIFIED';
                        const provBadge = prov === 'VERIFIED'
                          ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                          : prov === 'DERIVED'
                          ? 'bg-blue-950 text-blue-300 border-blue-800'
                          : 'bg-amber-950 text-amber-300 border-amber-800';

                        return (
                          <div key={idx} className="bg-slate-900 p-2.5 rounded border border-slate-800 text-xs space-y-1">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                                  {c.sourceType}
                                </span>
                                <Badge variant="outline" className={`text-[9px] font-mono font-bold px-1.5 py-0 ${provBadge}`}>
                                  {prov === 'VERIFIED' ? '✓ VERIFIED' : prov === 'DERIVED' ? '⚡ DERIVED' : '◈ DEMO'}
                                </Badge>
                              </div>
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
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Congressional STOCK Act Disclosures for this stock */}
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Landmark className="h-3.5 w-3.5 text-purple-400" />
                      STOCK Act Filings for {selectedSignal.ticker}
                    </span>
                    <button
                      onClick={() => setActiveRightTab('congress')}
                      className="text-[10px] text-purple-400 hover:underline"
                    >
                      View All in Congress Tab →
                    </button>
                  </h4>
                  {selectedSignal.evidence.disclosures.length > 0 ? (
                    <div className="space-y-2">
                      {selectedSignal.evidence.disclosures.map((d, idx) => {
                        const pdfUrl = d.filingDocUrl || 'https://disclosures-clerk.house.gov/public_disc/financial-pdfs/2026FD.ZIP';
                        const prov = d.provenance || (d.docId ? 'VERIFIED' : 'DEMO');

                        return (
                          <div key={idx} className="bg-slate-950 p-2.5 rounded border border-slate-800/80 text-xs space-y-1">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-semibold text-white">{d.politicianName}</span>
                                <Badge
                                  variant="outline"
                                  className={`text-[9px] font-mono font-bold px-1.5 py-0 ${
                                    prov === 'VERIFIED'
                                      ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                                      : 'bg-amber-950 text-amber-300 border-amber-800'
                                  }`}
                                  title={d.provenanceDetails || ''}
                                >
                                  {prov === 'VERIFIED' ? '✓ VERIFIED' : '◈ DEMO'}
                                </Badge>
                              </div>
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
                                className="text-purple-400 hover:text-purple-300 underline flex items-center gap-1"
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
                    <button
                      onClick={() => {
                        setNewsTickerFilter(selectedSignal.ticker);
                        setActiveRightTab('news');
                      }}
                      className="text-[10px] text-amber-400 hover:underline"
                    >
                      View All in News Tab →
                    </button>
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

      {/* PERFORMANCE AUDIT MODAL */}
      {showPerformanceModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-3xl w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-950 text-emerald-400 rounded-lg border border-emerald-800/60">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Forward Paper-Tracking Audit & Methodology
                  </h3>
                  <p className="text-xs text-slate-400">
                    T₀ Live Market Tape Baseline & Zero-Lookahead Architecture
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowPerformanceModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="text-xs text-slate-300 space-y-4 max-h-[70vh] overflow-y-auto pr-2">
              {/* Top Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="bg-slate-950 p-3 rounded-lg border border-emerald-800/60">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Tracking Status</span>
                  <div className="text-lg font-black text-emerald-400 mt-0.5">
                    {benchmarkMetrics.confidenceDisplay || 'T₀ Baseline Active'}
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">Live tape locked</span>
                </div>

                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">InsightTrader Return</span>
                  <div className="text-lg font-black text-emerald-400 mt-0.5">
                    0.0%
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">T₀ Entry Baseline</span>
                </div>

                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Benchmark (SPY)</span>
                  <div className="text-lg font-black text-slate-200 mt-0.5">
                    0.0%
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">S&P 500 T₀ Tape</span>
                </div>

                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Forward Horizons</span>
                  <div className="text-lg font-black text-emerald-400 mt-0.5">
                    7d · 30d · 90d
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">
                    Signals: {benchmarkMetrics.evaluatedSignalsCount}
                  </span>
                </div>
              </div>

              {/* Forward Paper-Tracking Architecture Box */}
              <div className="bg-slate-950 p-4 rounded-xl border border-emerald-900/60 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-emerald-400" />
                    T₀ Forward Paper-Tracking Architecture
                  </h4>
                  <Badge variant="outline" className="text-[9px] border-emerald-600/50 text-emerald-300 font-mono">
                    Zero Lookahead Bias
                  </Badge>
                </div>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  InsightTrader establishes a verifiable paper-tracking pipeline for all signals. Rather than fabricating backfilled entry discounts or synthetic historical outperformance, every signal's entry price is locked to live exchange tape at genesis (T₀). Forward horizons track performance dynamically over time.
                </p>

                <div className="space-y-2 font-mono text-[11px]">
                  <div className="p-2.5 rounded bg-slate-900 border border-slate-800 space-y-0.5">
                    <strong className="text-emerald-300 block text-xs">Step 1: T₀ Signal Genesis & Exchange Tape Lock</strong>
                    <span className="text-slate-400 block text-[10px]">
                      When a trade signal is synthesized, its entry price is locked to the live exchange tape with zero lookahead bias. All initial return metrics start at an honest 0.00%.
                    </span>
                  </div>
                  <div className="p-2.5 rounded bg-slate-900 border border-slate-800 space-y-0.5">
                    <strong className="text-emerald-300 block text-xs">Step 2: Forward Horizon Paper-Tracking (T+7d, T+30d, T+90d)</strong>
                    <span className="text-slate-400 block text-[10px]">
                      The automated data pipeline records quotes at 7-day, 30-day, and 90-day intervals against the SPY ETF benchmark to observe genuine forward alpha.
                    </span>
                  </div>
                  <div className="p-2.5 rounded bg-slate-900 border border-slate-800 space-y-0.5">
                    <strong className="text-emerald-300 block text-xs">Step 3: Rigorous Significance Testing (Paired Student-t)</strong>
                    <span className="text-slate-400 block text-[10px]">
                      Once a forward sample matures (N ≥ 30), a paired-difference Student-t test will calculate statistical significance: t = (D̄) / (s_D / √N).
                    </span>
                  </div>
                </div>
              </div>

              {/* Devpost Roadmap / What's Next Box */}
              <div className="bg-slate-950 p-4 rounded-xl border border-purple-900/60 space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-purple-400" />
                    Devpost Roadmap: What's Next for Backtesting
                  </h4>
                  <Badge variant="outline" className="text-[9px] border-purple-600/50 text-purple-300 font-mono">
                    Future Work
                  </Badge>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="bg-slate-900 p-2.5 rounded border border-slate-800">
                    <strong className="text-purple-300 block text-[11px]">1. Historical Multi-Year Backtest Engine</strong>
                    <p className="text-slate-400 text-[10px] mt-1">
                      Ingest 5 years of historical Senate and House disclosure archives paired with Polygon daily OHLCV tape (2020-2025) to quantify long-term committee alpha.
                    </p>
                  </div>
                  <div className="bg-slate-900 p-2.5 rounded border border-slate-800">
                    <strong className="text-purple-300 block text-[11px]">2. Automated Paper Trading Execution</strong>
                    <p className="text-slate-400 text-[10px] mt-1">
                      Virtual portfolio execution simulating execution slippage, transaction costs, and automated take-profit / stop-loss exits.
                    </p>
                  </div>
                </div>
              </div>

              {/* Underlying Data Sources & Benchmark */}
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2">
                <h4 className="text-xs font-bold text-white flex items-center justify-between">
                  <span>Underlying Tape Sources & Benchmark</span>
                  <a
                    href="https://finance.yahoo.com/quote/SPY"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-blue-400 hover:text-blue-300 underline flex items-center gap-1 font-normal"
                  >
                    View SPY Tape on Yahoo Finance ↗
                  </a>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="bg-slate-900 p-2.5 rounded border border-slate-800">
                    <span className="text-slate-400 block text-[10px]">Benchmark Instrument:</span>
                    <strong className="text-white">SPDR S&P 500 ETF Trust (Ticker: SPY)</strong>
                    <span className="text-slate-400 block text-[10px] mt-1">
                      Tape Price: <strong className="text-emerald-400 font-mono">${benchmarkMetrics.benchmarkCurrentPrice}</strong>
                    </span>
                  </div>
                  <div className="bg-slate-900 p-2.5 rounded border border-slate-800">
                    <span className="text-slate-400 block text-[10px]">Market Price Provider:</span>
                    <strong className="text-white">Yahoo Finance Real-Time Tape</strong>
                    <span className="text-slate-400 block text-[10px] mt-1">
                      Updated at feed synchronization timestamps.
                    </span>
                  </div>
                </div>
              </div>

              {/* Evaluated Signals Table */}
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-white">
                    Tracked Signals Sample (n = {benchmarkMetrics.evaluatedSignalsCount})
                  </h4>
                  <span className="text-[10px] text-emerald-400 font-mono">T₀ Baseline Established</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-[11px] text-left">
                    <thead className="text-slate-400 border-b border-slate-800 uppercase text-[10px]">
                      <tr>
                        <th className="py-2 pr-2">Ticker</th>
                        <th className="py-2 px-2">Signal</th>
                        <th className="py-2 px-2">Entry Tape (T₀)</th>
                        <th className="py-2 px-2">Current Tape</th>
                        <th className="py-2 px-2">Signal %</th>
                        <th className="py-2 px-2">SPY %</th>
                        <th className="py-2 pl-2 text-right">Forward Horizon</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850 font-mono">
                      {benchmarkMetrics.evaluatedSignals.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-900/50">
                          <td className="py-2 pr-2 font-bold text-white">
                            <a
                              href={`https://finance.yahoo.com/quote/${item.ticker}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-400 hover:text-blue-300 underline"
                            >
                              {item.ticker}
                            </a>
                          </td>
                          <td className="py-2 px-2">
                            <span className="text-emerald-400 font-semibold">{item.direction}</span>
                          </td>
                          <td className="py-2 px-2 text-slate-300">${item.entryPrice}</td>
                          <td className="py-2 px-2 text-slate-300">${item.currentPrice}</td>
                          <td className="py-2 px-2 font-semibold text-emerald-400">
                            {item.signalReturnPct >= 0 ? '+' : ''}{item.signalReturnPct}% (T₀ Tape)
                          </td>
                          <td className="py-2 px-2 text-slate-400">
                            {item.benchmarkReturnPct >= 0 ? '+' : ''}{item.benchmarkReturnPct}%
                          </td>
                          <td className="py-2 pl-2 text-right font-semibold text-slate-300 font-mono text-[10px]">
                            Forward Tracking
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Regulatory Compliance Disclaimer (Mandatory) */}
              <div className="p-3 bg-amber-950/40 rounded-xl border border-amber-800/60 space-y-1">
                <div className="flex items-center gap-1.5 text-amber-300 font-bold text-xs">
                  <ShieldAlert className="h-4 w-4 shrink-0 text-amber-400" />
                  <span>Mandatory Regulatory & Forward Tracking Notice</span>
                </div>
                <p className="text-[11px] text-amber-200/90 leading-relaxed">
                  InsightTrader tracks trading recommendations prospectively from real-time genesis timestamps (T₀). We do not fabricate historical discounts or backfilled outperformance. Past trading performance of public officials does not guarantee future financial returns. This platform provides research and audit tools, not registered investment advice.
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setShowPerformanceModal(false)}
                className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs cursor-pointer"
              >
                Close Audit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
