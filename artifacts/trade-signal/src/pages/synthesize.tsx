import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Sparkles,
  Radio,
  FileText,
  TrendingUp,
  TrendingDown,
  ShieldAlert,
  ArrowRight,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  Lock,
  Layers,
  Search,
} from 'lucide-react';
import type { PublicDisclosure, NewsArticle, TradeSignal } from '@/types/intelligence';

export default function SynthesizePage() {
  const [ticker, setTicker] = useState<string>('LMT');
  const [apiKey, setApiKey] = useState<string>('');
  const [selectedDisclosures, setSelectedDisclosures] = useState<Set<string>>(new Set());
  const [selectedNews, setSelectedNews] = useState<Set<string>>(new Set());
  const [disclosures, setDisclosures] = useState<PublicDisclosure[]>([]);
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [isLoadingFeeds, setIsLoadingFeeds] = useState<boolean>(false);
  const [isSynthesizing, setIsSynthesizing] = useState<boolean>(false);
  const [synthesizedSignal, setSynthesizedSignal] = useState<TradeSignal | null>(null);
  const [publishedSuccess, setPublishedSuccess] = useState<boolean>(false);

  // Load real disclosures and live news feeds
  useEffect(() => {
    async function loadFeeds() {
      setIsLoadingFeeds(true);
      try {
        const [dRes, nRes] = await Promise.all([
          fetch(`/api/real/disclosures?ticker=${ticker}`),
          fetch('/api/real/news'),
        ]);

        if (dRes.ok) {
          const dData = await dRes.json();
          setDisclosures(dData);
          // Auto-select first matching trade
          if (dData.length > 0) {
            setSelectedDisclosures(new Set([dData[0].id]));
          }
        }

        if (nRes.ok) {
          const nData = await nRes.json();
          setNews(nData);
          // Auto-select articles mentioning the ticker
          const matches = nData.filter((a: NewsArticle) =>
            a.relatedTickers?.includes(ticker)
          );
          if (matches.length > 0) {
            setSelectedNews(new Set(matches.map((m: NewsArticle) => m.id)));
          }
        }
      } catch (err) {
        console.error('Failed to fetch real feeds:', err);
      } finally {
        setIsLoadingFeeds(false);
      }
    }

    loadFeeds();
  }, [ticker]);

  const toggleDisclosure = (id: string) => {
    setSelectedDisclosures(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleNews = (id: string) => {
    setSelectedNews(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSynthesize = async () => {
    setIsSynthesizing(true);
    setPublishedSuccess(false);

    const chosenDisclosures = disclosures.filter(d => selectedDisclosures.has(d.id));
    const chosenNews = news.filter(n => selectedNews.has(n.id));

    try {
      const res = await fetch('/api/nemotron/synthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticker,
          disclosures: chosenDisclosures,
          newsArticles: chosenNews,
          apiKey: apiKey || undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.signal) {
          setSynthesizedSignal(data.signal);
        }
      } else {
        alert('Synthesis call failed');
      }
    } catch (e: any) {
      alert('Error during synthesis: ' + e.message);
    } finally {
      setIsSynthesizing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Studio Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Sparkles className="h-5 w-5" />
            </span>
            <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">
              Nemotron News & Catalyst Synthesis Studio
            </h2>
            <Badge className="bg-amber-950 text-amber-300 border-amber-800 text-[11px]">
              NVIDIA NIM
            </Badge>
          </div>
          <p className="text-xs md:text-sm text-slate-400 mt-1">
            Cross-examine real RSS news headlines against official congressional filings to produce synthesized AI trade signals.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Lock className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <Input
              type="password"
              placeholder="NVIDIA API Key (optional)"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="bg-slate-900 border-slate-800 text-xs pl-8 w-56 text-slate-200 placeholder-slate-500"
            />
          </div>
        </div>
      </div>

      {/* Target Asset Selector */}
      <Card className="bg-slate-900 border-slate-800">
        <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
              Target Asset
            </span>
            <p className="text-xs text-slate-500">
              Choose an active ticker to pull matching STOCK Act disclosures and news
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Input
              type="text"
              value={ticker}
              onChange={(e) => setTicker(e.target.value.toUpperCase())}
              className="bg-slate-950 border-slate-700 text-center font-black text-sm uppercase w-28 text-emerald-400"
            />
            <div className="flex flex-wrap gap-1">
              {['LMT', 'NVDA', 'PLTR', 'CRWD', 'TSM', 'ASML', 'XOM'].map((t) => (
                <button
                  key={t}
                  onClick={() => setTicker(t)}
                  className={`px-2.5 py-1 text-xs font-bold rounded border transition-colors ${
                    ticker === t
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Studio Workspace: 2 Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Data Selectors (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Matching Disclosures */}
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="p-4 border-b border-slate-800 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xs font-bold text-white flex items-center gap-2">
                  <FileText className="h-4 w-4 text-purple-400" />
                  Real Congressional Trades ({ticker})
                </CardTitle>
                <CardDescription className="text-[11px] text-slate-400">
                  Select filings to cite in synthesis ({selectedDisclosures.size} selected)
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-2 max-h-64 overflow-y-auto">
              {disclosures.length === 0 ? (
                <p className="text-xs text-slate-500 italic py-2">
                  No direct filings for {ticker} in cache. Enter a different ticker or select news below.
                </p>
              ) : (
                disclosures.map((d) => {
                  const isChecked = selectedDisclosures.has(d.id);
                  return (
                    <div
                      key={d.id}
                      onClick={() => toggleDisclosure(d.id)}
                      className={`p-3 rounded-lg border cursor-pointer transition-all ${
                        isChecked
                          ? 'bg-slate-950 border-purple-500/80 ring-1 ring-purple-500/30'
                          : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs mb-1">
                        <strong className="text-white">{d.politicianName}</strong>
                        <Badge
                          className={`text-[10px] ${
                            d.transactionType === 'BUY'
                              ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                              : 'bg-rose-950 text-rose-300 border-rose-800'
                          }`}
                        >
                          {d.transactionType} ({d.amountBracket})
                        </Badge>
                      </div>
                      <p className="text-[11px] text-slate-400 line-clamp-1">{d.assetName}</p>
                      <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1">
                        <span>Trade: {d.transactionDate}</span>
                        <span>Lag: {d.disclosureLagDays} days</span>
                        <a
                          href={d.filingDocUrl}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-purple-400 hover:underline flex items-center gap-0.5"
                        >
                          Official PDF <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          {/* Live RSS News Stream */}
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="p-4 border-b border-slate-800 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xs font-bold text-white flex items-center gap-2">
                  <Radio className="h-4 w-4 text-amber-400" />
                  Live RSS News Stream
                </CardTitle>
                <CardDescription className="text-[11px] text-slate-400">
                  Select policy catalysts to synthesize ({selectedNews.size} selected)
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-2 max-h-80 overflow-y-auto">
              {news.map((n) => {
                const isChecked = selectedNews.has(n.id);
                const matchesTicker = n.relatedTickers?.includes(ticker);

                return (
                  <div
                    key={n.id}
                    onClick={() => toggleNews(n.id)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      isChecked
                        ? 'bg-slate-950 border-amber-500/80 ring-1 ring-amber-500/30'
                        : matchesTicker
                        ? 'bg-amber-950/10 border-amber-900/40 hover:border-amber-700'
                        : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                      <span className="font-semibold text-slate-300">{n.source}</span>
                      <span>{n.publishedAt?.split('T')[0]}</span>
                    </div>
                    <p className="text-xs font-medium text-slate-200 leading-snug mb-1.5">
                      {n.headline}
                    </p>
                    <p className="text-[11px] text-slate-400 line-clamp-2 mb-2">
                      {n.summary}
                    </p>
                    <div className="flex items-center justify-between text-[10px]">
                      <div className="flex gap-1">
                        {n.relatedTickers?.map((rt) => (
                          <Badge
                            key={rt}
                            variant="outline"
                            className="text-[9px] px-1 py-0 border-slate-700 text-slate-300 font-mono"
                          >
                            {rt}
                          </Badge>
                        ))}
                      </div>
                      <span
                        className={`font-semibold ${
                          n.sentiment === 'Bullish'
                            ? 'text-emerald-400'
                            : n.sentiment === 'Bearish'
                            ? 'text-rose-400'
                            : 'text-slate-400'
                        }`}
                      >
                        {n.sentiment}
                      </span>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Nemotron Trigger & Generated Signal (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          {/* Action Trigger Card */}
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="p-4 border-b border-slate-800">
              <CardTitle className="text-xs font-bold text-white flex items-center justify-between">
                <span>NVIDIA Nemotron Engine</span>
                <Badge variant="outline" className="border-emerald-500/40 text-emerald-400 text-[10px]">
                  Llama 3.1 Nemotron 70B
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="text-xs text-slate-400 space-y-1 bg-slate-950 p-3 rounded-lg border border-slate-800/80">
                <div className="flex justify-between">
                  <span>Selected Disclosures:</span>
                  <strong className="text-white font-mono">{selectedDisclosures.size}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Selected News Articles:</span>
                  <strong className="text-white font-mono">{selectedNews.size}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Target Asset:</span>
                  <strong className="text-emerald-400 font-mono">{ticker}</strong>
                </div>
              </div>

              <Button
                onClick={handleSynthesize}
                disabled={isSynthesizing}
                className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs py-5"
              >
                {isSynthesizing ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Synthesizing with Nemotron AI...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Synthesize Trade Signal With Nemotron
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Synthesized Signal Result Card */}
          {synthesizedSignal && (
            <Card className="bg-slate-900 border-emerald-500/80 ring-1 ring-emerald-500/30 space-y-4 p-5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Badge
                    className={`font-semibold text-xs ${
                      synthesizedSignal.direction === 'BULLISH'
                        ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                        : 'bg-rose-950 text-rose-300 border-rose-800'
                    }`}
                  >
                    {synthesizedSignal.direction === 'BULLISH' && <TrendingUp className="h-3 w-3 mr-1 inline" />}
                    {synthesizedSignal.direction === 'BEARISH' && <TrendingDown className="h-3 w-3 mr-1 inline" />}
                    {synthesizedSignal.direction} · {synthesizedSignal.confidenceScorePct}%
                  </Badge>
                  <span className="text-xs font-bold text-white">{synthesizedSignal.conviction} Conviction</span>
                </div>

                <Badge variant="outline" className="text-[10px] text-slate-400 border-slate-700">
                  {synthesizedSignal.aiModel}
                </Badge>
              </div>

              <div>
                <h3 className="text-sm font-bold text-white mb-1">
                  {synthesizedSignal.headline}
                </h3>
                <p className="text-xs text-slate-300 bg-slate-950 p-3 rounded-lg border border-slate-800/80 leading-relaxed">
                  {synthesizedSignal.thesis}
                </p>
              </div>

              {/* Citations */}
              <div>
                <h4 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Cited Evidence & Disclosures
                </h4>
                <div className="space-y-1.5">
                  {synthesizedSignal.evidence.disclosures.map((d, i) => (
                    <div key={i} className="text-xs bg-slate-950 p-2 rounded border border-slate-800/80 flex justify-between">
                      <span className="text-white font-medium">{d.politicianName}</span>
                      <span className="text-emerald-400 font-semibold">{d.transactionType} ({d.amountBracket})</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Legislative Reference */}
              {synthesizedSignal.evidence.legislativeHooks?.length > 0 && (
                <div>
                  <h4 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Legislative Reference
                  </h4>
                  <ul className="text-xs text-slate-300 list-disc list-inside space-y-0.5">
                    {synthesizedSignal.evidence.legislativeHooks.map((h, i) => (
                      <li key={i}>{h}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Key Risks */}
              <div>
                <h4 className="text-[11px] font-semibold uppercase tracking-wider text-rose-400 mb-1 flex items-center gap-1">
                  <ShieldAlert className="h-3.5 w-3.5" />
                  Key Risk Factors
                </h4>
                <ul className="text-xs text-slate-400 list-disc list-inside space-y-0.5">
                  {synthesizedSignal.keyRisks.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>

              <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-400">
                  Target: <strong className="text-emerald-400">${synthesizedSignal.metrics.targetPrice}</strong>
                </span>
                <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Signal Ready
                </span>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

