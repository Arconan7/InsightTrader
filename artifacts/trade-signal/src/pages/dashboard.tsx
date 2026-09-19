import { useState, useMemo } from 'react';
import {
  mockDashboardSummary,
  mockTradeSignals,
  mockPoliticians,
  mockPublicDisclosures,
  mockNewsArticles,
} from '@/mock/mockData';
import type { SignalDirection, TradeSignal } from '@/types/intelligence';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
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
  CheckCircle2,
  DollarSign,
  Award,
} from 'lucide-react';

export default function Dashboard() {
  const [selectedDirection, setSelectedDirection] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedSignal, setSelectedSignal] = useState<TradeSignal>(mockTradeSignals[0]);

  const filteredSignals = useMemo(() => {
    return mockTradeSignals.filter((signal) => {
      const matchesDir =
        selectedDirection === 'ALL' || signal.direction === selectedDirection;
      const matchesSearch =
        signal.ticker.toLowerCase().includes(searchQuery.toLowerCase()) ||
        signal.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        signal.headline.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesDir && matchesSearch;
    });
  }, [selectedDirection, searchQuery]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 font-sans">
      {/* Top Header */}
      <header className="mb-8 border-b border-slate-800 pb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded text-emerald-400">
              <Sparkles className="h-5 w-5" />
            </span>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
              InsightTrader <span className="text-emerald-400">· Trade Signal</span>
            </h1>
            <Badge variant="outline" className="border-emerald-500/40 text-emerald-300 ml-2">
              Nemotron Intelligence v2.6
            </Badge>
          </div>
          <p className="text-sm text-slate-400">
            Congressional STOCK Act filings correlated with policy RSS news feeds and synthesized by Nemotron AI.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Badge className="bg-slate-800 text-slate-300 border border-slate-700 py-1.5 px-3">
            <Activity className="h-3.5 w-3.5 mr-1.5 text-emerald-400 animate-pulse" />
            Live Market Feed Active
          </Badge>
        </div>
      </header>

      {/* KPI Stats Cards */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Active Signals</p>
              <h3 className="text-2xl font-bold text-white mt-1">
                {mockDashboardSummary.activeSignalsCount}
              </h3>
              <p className="text-xs text-emerald-400 mt-0.5">High & Med Conviction</p>
            </div>
            <div className="p-3 bg-emerald-950/50 border border-emerald-800/40 rounded-xl text-emerald-400">
              <Sparkles className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Historical Win Rate</p>
              <h3 className="text-2xl font-bold text-white mt-1">
                {mockDashboardSummary.signalWinRatePct}%
              </h3>
              <p className="text-xs text-emerald-400 mt-0.5">+{mockDashboardSummary.avgSignalAlphaPct}% vs S&P 500</p>
            </div>
            <div className="p-3 bg-blue-950/50 border border-blue-800/40 rounded-xl text-blue-400">
              <Award className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Tracked Volume YTD</p>
              <h3 className="text-2xl font-bold text-white mt-1">
                ${(mockDashboardSummary.totalTrackedVolumeYtdUsd / 1_000_000).toFixed(1)}M
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">{mockDashboardSummary.totalDisclosuresCount} filings cataloged</p>
            </div>
            <div className="p-3 bg-amber-950/50 border border-amber-800/40 rounded-xl text-amber-400">
              <DollarSign className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Tracked Filers</p>
              <h3 className="text-2xl font-bold text-white mt-1">
                {mockDashboardSummary.trackedPoliticiansCount}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">House & Senate Members</p>
            </div>
            <div className="p-3 bg-purple-950/50 border border-purple-800/40 rounded-xl text-purple-400">
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
              AI Trade Signals
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
              const isSelected = selectedSignal.id === signal.id;
              const isBullish = signal.direction === 'BULLISH';
              const isBearish = signal.direction === 'BEARISH';

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
                        <span className="text-xl font-black text-white px-2.5 py-1 bg-slate-800 border border-slate-700 rounded-md">
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
                    <p className="text-sm font-medium text-slate-200 mt-2 mb-3">
                      {signal.headline}
                    </p>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 border-t border-slate-800/80 pt-3">
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
                      <span className="ml-auto text-slate-500 font-mono">
                        {new Date(signal.generatedAt).toLocaleDateString()}
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
              <CardTitle className="text-lg font-bold text-white mt-2">
                {selectedSignal.ticker} Intelligence Briefing
              </CardTitle>
            </CardHeader>

            <CardContent className="p-5 space-y-4">
              {/* Thesis */}
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Investment Thesis
                </h4>
                <p className="text-xs leading-relaxed text-slate-300 bg-slate-950 p-3 rounded-lg border border-slate-800/80">
                  {selectedSignal.thesis}
                </p>
              </div>

              {/* Correlated STOCK Act Filings */}
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-blue-400" />
                  Correlated Disclosures
                </h4>
                <div className="space-y-2">
                  {selectedSignal.evidence.disclosures.map((disc, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-950 p-2.5 rounded border border-slate-800/80 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <strong className="text-white">{disc.politicianName}</strong>
                        <span className="text-emerald-400 font-medium">
                          {disc.transactionType} ({disc.amountBracket})
                        </span>
                      </div>
                      <p className="text-slate-400 text-[11px]">{disc.committeeContext}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Correlated News Catalysts */}
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                  <Radio className="h-3.5 w-3.5 text-amber-400" />
                  Policy Catalysts
                </h4>
                <div className="space-y-2">
                  {selectedSignal.evidence.newsCatalysts.map((news, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-950 p-2.5 rounded border border-slate-800/80 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between text-slate-400 text-[11px]">
                        <span>{news.source}</span>
                        <span>{new Date(news.publishedAt).toLocaleDateString()}</span>
                      </div>
                      <p className="text-slate-200 font-medium">{news.headline}</p>
                      <p className="text-slate-400 text-[11px]">{news.relevanceNote}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Legislative Hooks */}
              {selectedSignal.evidence.legislativeHooks.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    Legislative References
                  </h4>
                  <ul className="text-xs text-slate-300 space-y-1 list-disc list-inside">
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

          {/* Politician Watchlist Leaderboard */}
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="p-4 border-b border-slate-800">
              <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
                <Users className="h-4 w-4 text-purple-400" />
                Active Congressional Traders
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 divide-y divide-slate-800/80">
              {mockPoliticians.slice(0, 5).map((pol) => (
                <div key={pol.id} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between">
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
    </div>
  );
}

