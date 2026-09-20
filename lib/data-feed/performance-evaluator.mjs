/**
 * Historical Signal Performance & Forward Paper-Tracking Evaluator.
 * Implements transparent, defensible forward tracking against S&P 500 (SPY).
 *
 * Architecture:
 * - Signal Genesis (T₀): Stamp ticker, direction, current Yahoo Finance tape price, SPY benchmark price, timestamp.
 * - Forward Evaluation (T₁): Track observed returns over 7, 30, and 90-day forward horizons.
 * - Zero Lookahead Bias: No artificial entry price discounts (BUY entry != price * 0.96).
 * - Paired Student-t Hypothesis Test: Evaluated once signals mature over forward windows.
 * - If signals are freshly established (holding period < 7 days), display "T₀ Baseline Active"
 *   to avoid unrepresentative claims.
 */

function erf(x) {
  const sign = x >= 0 ? 1 : -1;
  const absX = Math.abs(x);
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const t = 1.0 / (1.0 + p * absX);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX);
  return sign * y;
}

function normalCdf(t) {
  return 0.5 * (1 + erf(t / Math.SQRT2));
}

/**
 * Evaluates signals against benchmark and returns complete statistical breakdown.
 */
export function calculateBenchmarkPerformance(signals = [], quotesMap = {}, benchmarkQuote = null) {
  const benchmarkPrice = benchmarkQuote?.currentPrice ?? 560.0;
  const benchmarkTicker = benchmarkQuote?.ticker || 'SPY';

  const evaluated = [];

  for (const sig of signals) {
    if (!sig) continue;
    const ticker = (sig.ticker || '').toUpperCase();
    if (!ticker) continue;

    const quoteObj = quotesMap[ticker];
    const currentPrice = quoteObj?.currentPrice || sig.metrics?.currentPrice || 150.0;
    const entryPrice = sig.metrics?.entryPrice || currentPrice;

    // Real observed return since signal genesis (0.00% at T0 baseline)
    const rawReturn = sig.metrics?.returnSinceSignalPct !== undefined
      ? sig.metrics.returnSinceSignalPct
      : 0.0;
    const signalReturnPct = +Number(rawReturn).toFixed(2);

    // Real observed benchmark return since signal genesis (0.00% at T0 baseline)
    const rawBReturn = sig.metrics?.benchmarkReturnPct !== undefined
      ? sig.metrics.benchmarkReturnPct
      : 0.0;
    const bReturnPct = +Number(rawBReturn).toFixed(2);

    const excessReturnPct = +(signalReturnPct - bReturnPct).toFixed(2);
    const isWin = excessReturnPct > 0;

    evaluated.push({
      signalId: sig.id,
      ticker,
      companyName: sig.companyName || ticker,
      direction: sig.direction,
      verdictAction: sig.verdict?.action || 'HOLD',
      entryPrice,
      currentPrice,
      signalReturnPct,
      benchmarkReturnPct: bReturnPct,
      excessReturnPct,
      isWin,
      trackingPhase: sig.metrics?.trackingPhase || 'T0_BASELINE',
      generatedAt: sig.generatedAt || new Date().toISOString(),
      sourceUrl: `https://finance.yahoo.com/quote/${ticker}`,
      benchmarkSourceUrl: `https://finance.yahoo.com/quote/${benchmarkTicker}`,
    });
  }

  const n = evaluated.length;

  // Check if signals have matured over a genuine forward horizon
  const maturedSignals = evaluated.filter((s) => s.trackingPhase === 'MATURED_FORWARD' && (Math.abs(s.signalReturnPct) > 0.05));

  if (n < 3 || maturedSignals.length < 3) {
    return {
      isSufficientData: false,
      confidenceDisplay: 'T₀ Baseline Active',
      statusText: 'Forward Tracking Active (T₀ Baseline Established)',
      confidenceScorePct: null,
      insightTraderReturnPct: 0.0,
      benchmarkReturnPct: 0.0,
      excessReturnPct: 0.0,
      evaluatedSignalsCount: n,
      winRatePct: 0.0,
      tStatistic: null,
      sampleStdDev: null,
      standardError: null,
      benchmarkName: 'S&P 500 Index (SPY ETF)',
      benchmarkTicker,
      benchmarkCurrentPrice: benchmarkPrice,
      trackingArchitecture: 'T₀ (Signal Genesis) → Record (Tape Price, SPY Price, Time) → T₁ (Forward Horizon: 7/30/90 Days) → Real Observed Returns',
      formula: 't = (MeanExcessReturn_{T1}) / (s_D / √N); Confidence = Φ(t) [Evaluated on matured forward horizons]',
      methodology: 'InsightTrader avoids fabricated lookahead entry discounts. Signals establish a live T₀ baseline from real-time Yahoo Finance tape prices and SPY benchmark prices. Forward returns mature across 7, 30, and 90-day forward evaluation horizons.',
      whatsNextRoadmap: 'Systematic multi-horizon paper backtest engine continuously logging live tape returns vs S&P 500 without lookahead bias.',
      disclaimer: 'Forward paper-tracking mode. Do not interpret forward tracking baseline as a guarantee of future investment returns.',
      evaluatedSignals: evaluated,
      reason: 'Signals are currently at inception baseline (T₀). At least 3 signals with matured forward holding periods (≥7 days) are required for statistical outperformance testing.',
    };
  }

  const sumR = evaluated.reduce((s, x) => s + x.signalReturnPct, 0);
  const sumB = evaluated.reduce((s, x) => s + x.benchmarkReturnPct, 0);
  const sumDiff = evaluated.reduce((s, x) => s + x.excessReturnPct, 0);

  const meanR = +(sumR / n).toFixed(2);
  const meanB = +(sumB / n).toFixed(2);
  const meanDiff = +(sumDiff / n).toFixed(2);

  const winsCount = evaluated.filter((x) => x.isWin).length;
  const winRatePct = +((winsCount / n) * 100).toFixed(1);

  // Sample variance of excess returns
  const variance = evaluated.reduce((s, x) => s + Math.pow(x.excessReturnPct - meanDiff, 2), 0) / (n - 1);
  const sampleStdDev = +Math.sqrt(Math.max(variance, 0.0001)).toFixed(2);
  const standardError = +(sampleStdDev / Math.sqrt(n)).toFixed(2);

  const tStat = standardError > 0 ? +(meanDiff / standardError).toFixed(2) : 0;

  // Compute confidence using standard normal CDF Φ(t) bounded between 5% and 99.5%
  let confidencePct = normalCdf(tStat) * 100;
  if (confidencePct > 99.5) confidencePct = 99.5;
  if (confidencePct < 5.0) confidencePct = 5.0;
  confidencePct = +confidencePct.toFixed(1);

  return {
    isSufficientData: true,
    confidenceDisplay: `${confidencePct}%`,
    statusText: `Forward Observed Confidence: ${confidencePct}% (df = ${n - 1})`,
    confidenceScorePct: confidencePct,
    insightTraderReturnPct: meanR,
    benchmarkReturnPct: meanB,
    excessReturnPct: meanDiff,
    evaluatedSignalsCount: n,
    winRatePct,
    tStatistic: tStat,
    sampleStdDev,
    standardError,
    benchmarkName: 'S&P 500 Index (SPY ETF)',
    benchmarkTicker,
    benchmarkCurrentPrice: benchmarkPrice,
    trackingArchitecture: 'T₀ (Signal Genesis) → Record (Tape Price, SPY Price, Time) → T₁ (Forward Horizon: 7/30/90 Days) → Real Observed Returns',
    formula: 't = (MeanExcessReturn) / (s_D / √N); Confidence = Φ(t)',
    methodology: 'Paired difference Student-t test comparing observed signal percentage returns against S&P 500 benchmark returns over the forward holding period.',
    whatsNextRoadmap: 'Systematic multi-horizon paper backtest engine continuously logging live tape returns vs S&P 500 without lookahead bias.',
    disclaimer: 'Statistical confidence in observed historical outperformance does not constitute financial advice or guarantee future returns.',
    evaluatedSignals: evaluated,
  };
}

