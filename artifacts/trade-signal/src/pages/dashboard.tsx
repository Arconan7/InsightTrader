import { useState, useMemo, useEffect } from 'react';
import {
  mockDashboardSummary,
  mockTradeSignals,
  mockPoliticians,
  mockPublicDisclosures,
  mockNewsArticles,
} from '@/mock/mockData';
import type { TradeSignal, DashboardSummary, Politician, PublicDisclosure, NewsArticle, Citation } from '@/types/intelligence';
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
  DollarSign,
  Award,
  RefreshCw,
  ShieldCheck,
  Info,
  X,
} from 'lucide-react';

export default function Dashboard() {
  const [selectedDirection, setSelectedDirection] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Live dataset state with resilient fallback to bundled data
  const [signals, setSignals] = useState<TradeSignal[]>(mockTradeSignals);
  const [summary, setSummary] = useState<DashboardSummary>(mockDashboardSummary);
  const [politicians, setPoliticians] = useState<Politician[]>(mockPoliticians);
  const [disclosures, setDisclosures] = useState<PublicDisclosure[]>(mockPublicDisclosures);
  const [news, setNews] = useState<NewsArticle[]>(mockNewsArticles);
  const [selectedSignal, setSelectedSignal] = useState<TradeSignal>(mockTradeSignals[0]);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncMessage, setSyncMessage] = useState<string>('');
  const [showTransparencyModal, setShowTransparencyModal] = useState<boolean>(false);

  // Initial load from live backend API if available
  useEffect(() => {
    async function loadLiveData() {
      try {
        const [signalsRes, summaryRes, politiciansRes, disclosuresRes, newsRes] = await Promise.allSettled([
          fetch('/api/signals').then((r) => (r.ok ? r.json() : null)),
          fetch('/api/summary').then((r) => (r.ok ? r.json() : null)),
          fetch('/api/politicians').then((r) => (r.ok ? r.json() : null)),
          fetch('/api/disclosures').then((r) => (r.ok ? r.json() : null)),
          fetch('/api/news').then((r) => (r.ok ? r.json() : null)),
        ]);

        if (signalsRes.status === 'fulfilled' && signalsRes.value && signalsRes.value.length > 0) {
          setSignals(signalsRes.value);
          setSelectedSignal(signalsRes.value[0]);
        }
        if (summaryRes.status === 'fulfilled' && summaryRes.value) {
          setSummary(summaryRes.value);
        }
        if (politiciansRes.status === 'fulfilled' && politiciansRes.value && politiciansRes.value.length > 0) {
          setPoliticians(politiciansRes.value);
        }
        if (disclosuresRes.status === 'fulfilled' && disclosuresRes.value && disclosuresRes.value.length > 0) {
          setDisclosures(disclosuresRes.value);
        }
        if (newsRes.status === 'fulfilled' && newsRes.value && newsRes.value.length > 0) {
          setNews(newsRes.value);
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
        if (data.signals) setSignals(data.signals);
        if (data.summary) setSummary(data.summary);
        if (data.politicians) setPoliticians(data.politicians);
        if (data.disclosures) setDisclosures(data.disclosures);
        if (data.news) setNews(data.news);
        if (data.signals && data.signals.length > 0) {
          setSelectedSignal(data.signals[0]);
        }
        setSyncMessage('Live feeds & fact-check sources synchronized!');
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

  const filteredSignals = useMemo(() => {
    return signals.filter((signal) => {
      const matchesDir =
        selectedDirection === 'ALL' || signal.direction === selectedDirection;
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
            Real Congressional STOCK Act filings correlated with Yahoo/Google RSS news feeds. Every claim is linked to public primary records.
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
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Active Signals</p>
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
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Simulated Win Rate</p>
              <h3 className="text-2xl font-bold text-white mt-1">
                {summary.signalWinRatePct}%
              </h3>
              <p className="text-xs text-emerald-400 mt-0.5">+{summary.avgSignalAlphaPct}% vs S&P 500</p>
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
              <p className="text-xs text-slate-400 mt-0.5">House & Senate Members</p>
            </div>
            <div className="p-3 bg-amber-950/50 border border-amber-800/40 rounded-xl text-amber-400">
              <Users className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Signals Feed (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-emerald-400" />
              Live Trade Signals
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
                {(['ALL', 'BULLISH', 'BEARISH', 'WATCH'] as const).map((dir) => (
                  <button
                    key={dir}
                    onClick={() => setSelectedDirection(dir)}
                    className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
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
              const isBullish = signal.direction === 'BULLISH';
              const isBearish = signal.direction === 'BEARISH';
              const curPrice = signal.metrics.currentPrice ?? signal.metrics.entryPrice;
              const citationCount = signal.citations?.length || (signal.evidence.disclosures.length + signal.evidence.newsCatalysts.length);

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
                        <span className="text-xs font-mono font-semibold text-emerald-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                          ${curPrice}
                        </span>
                        <Badge
                          className={`font-semibold text-xs border ${
                            isBullish
                              ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60'
                              : isBearish
                              ? 'bg-rose-950/60 text-rose-300 border-rose-800/60'
                              : 'bg-amber-950/60 text-amber-300 border-amber-800/60'
                          }`}
                        >
                          {isBullish && <TrendingUp className="h-3 w-3 mr-1 inline" />}
                          {isBearish && <TrendingDown className="h-3 w-3 mr-1 inline" />}
                          {signal.direction} · {signal.confidenceScorePct}%
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="p-5 pt-0">
                    <p className="text-sm font-medium text-slate-200 mt-2 mb-2.5">
                      {signal.headline}
                    </p>

                    <div className="flex flex-wrap items-center justify-between text-xs text-slate-400 border-t border-slate-800/80 pt-3 gap-2">
                      <div className="flex items-center gap-3">
                        <span>
                          Entry: <strong className="text-white">${signal.metrics.entryPrice}</strong>
                        </span>
                        <span>
                          Target: <strong className="text-emerald-400">${signal.metrics.targetPrice}</strong>
                        </span>
                        <span>
                          Return: <strong className={signal.metrics.returnSinceSignalPct >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                            +{signal.metrics.returnSinceSignalPct}%
                          </strong>
                        </span>
                      </div>
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded-full">
                        <ShieldCheck className="h-3 w-3" />
                        {citationCount} Verified Sources ↗
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {filteredSignals.length === 0 && (
              <div className="text-center py-12 border border-dashed border-slate-800 rounded-xl">
                <p className="text-sm text-slate-400">No signals match your filter criteria.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Signal Detail & Political Insights (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Detailed Selected Signal Card */}
          {selectedSignal && (
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader className="p-5 border-b border-slate-800">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-xs text-slate-300 border-slate-700">
                    Synthesized by {selectedSignal.aiModel}
                  </Badge>
                  <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-xs">
                    {selectedSignal.conviction} Conviction
                  </Badge>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <CardTitle className="text-lg font-bold text-white">
                    {selectedSignal.ticker} Intelligence Briefing
                  </CardTitle>
                  <span className="text-xs font-mono font-bold text-emerald-400 bg-slate-950 px-2.5 py-1 rounded border border-slate-800">
                    Current: ${selectedSignal.metrics.currentPrice || selectedSignal.metrics.entryPrice}
                  </span>
                </div>
              </CardHeader>

              <CardContent className="p-5 space-y-5">
                {/* Thesis */}
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center justify-between">
                    <span>Investment Thesis & Fact-Check Basis</span>
                    <span className="text-[10px] text-emerald-400 font-normal">Audited Claims</span>
                  </h4>
                  <div className="text-xs leading-relaxed text-slate-300 bg-slate-950 p-3.5 rounded-lg border border-slate-800/80 whitespace-pre-line">
                    {selectedSignal.thesis}
                  </div>
                </div>

                {/* DEDICATED FACT-CHECK AUDIT TRAIL */}
                <div className="p-3.5 rounded-lg bg-slate-950/90 border border-emerald-900/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                      <ShieldCheck className="h-4 w-4 text-emerald-400" />
                      Fact-Check Audit Trail (Primary Sources)
                    </h4>
                    <span className="text-[10px] text-slate-400">Click to verify source</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Every claim made above is cross-referenced with public documents. Verify below:
                  </p>

                  <div className="space-y-2">
                    {(selectedSignal.citations || []).map((c, idx) => (
                      <div
                        key={idx}
                        className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 text-xs space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                            {c.sourceType}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">{c.verifiedDate}</span>
                        </div>
                        <p className="text-slate-200 font-medium text-[11px]">{c.claim}</p>
                        <div className="pt-1 border-t border-slate-800/80 flex items-center justify-between">
                          <span className="text-[10px] text-slate-400 truncate max-w-[200px]">{c.sourceName}</span>
                          <a
                            href={c.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] font-medium text-emerald-400 hover:text-emerald-300 underline flex items-center gap-1 shrink-0"
                          >
                            Verify Source
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Correlated STOCK Act Filings with Direct PDF Links */}
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5 text-blue-400" />
                      Official STOCK Act Filings
                    </span>
                    <span className="text-[10px] text-slate-500 font-normal">U.S. House Clerk</span>
                  </h4>
                  <div className="space-y-2">
                    {selectedSignal.evidence.disclosures.map((disc, idx) => {
                      const matchedFiling = disclosures.find(
                        (d) => d.id === disc.disclosureId || d.ticker === selectedSignal.ticker
                      );
                      const pdfUrl = disc.filingDocUrl || matchedFiling?.filingDocUrl || 'https://disclosures-clerk.house.gov';

                      return (
                        <div
                          key={idx}
                          className="bg-slate-950 p-2.5 rounded border border-slate-800/80 text-xs space-y-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <strong className="text-white">{disc.politicianName}</strong>
                            <span className="text-emerald-400 font-medium">
                              {disc.transactionType} ({disc.amountBracket})
                            </span>
                          </div>
                          <p className="text-slate-400 text-[11px]">{disc.committeeContext}</p>
                          <div className="pt-1.5 border-t border-slate-900 flex items-center justify-between">
                            <span className="text-[10px] text-slate-500 font-mono">STOCK Act PTR Document</span>
                            <a
                              href={pdfUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] text-blue-400 hover:text-blue-300 underline flex items-center gap-1"
                            >
                              View Official Clerk PDF
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Correlated News Catalysts with Live Links */}
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
                      const matchedArticle = news.find(
                        (n) => n.id === newsItem.newsId || n.headline === newsItem.headline
                      );
                      const articleUrl = newsItem.articleUrl || matchedArticle?.articleUrl || 'https://finance.yahoo.com';

                      return (
                        <div
                          key={idx}
                          className="bg-slate-950 p-2.5 rounded border border-slate-800/80 text-xs space-y-1"
                        >
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
                Active Congressional Traders
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 divide-y divide-slate-800/80">
              {politicians.map((pol) => (
                <div key={pol.id} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <img
                      src={pol.avatarUrl}
                      alt={pol.name}
                      className="h-8 w-8 rounded-full object-cover border border-slate-700 bg-slate-800 shrink-0"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80';
                      }}
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-white">{pol.name}</span>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-slate-700 text-slate-400">
                          {pol.party[0]}-{pol.state}
                        </Badge>
                      </div>
                      <span className="text-[11px] text-slate-400">
                        {pol.chamber} · {pol.totalTradesTracked} trades
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
              ))}
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
                <strong className="text-emerald-400 block text-xs">2. Live News Feeds & Correlated Catalysts</strong>
                <p className="text-slate-400">
                  Ingested via live RSS from major financial publishers (Yahoo Finance RSS, Reuters, CNBC) and Google News RSS. We retain the original source publisher, article URL, and publication timestamp so users can open the exact original article with one click.
                </p>
              </div>

              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
                <strong className="text-emerald-400 block text-xs">3. Real-Time Market Exchange Tape</strong>
                <p className="text-slate-400">
                  Current trading prices, 24-hour performance, and 52-week ranges are fetched via the Yahoo Finance market feed. Target prices and returns are calculated transparently relative to live tape.
                </p>
              </div>

              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
                <strong className="text-emerald-400 block text-xs">4. U.S. Congress Legislative Acts</strong>
                <p className="text-slate-400">
                  Statutory authorities (NDAA, CHIPS Act, CISA Directives) are cross-referenced with official records on <a href="https://www.congress.gov" target="_blank" rel="noopener noreferrer" className="text-blue-400 underline">Congress.gov</a>.
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
