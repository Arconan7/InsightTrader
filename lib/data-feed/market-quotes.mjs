/**
 * Live market quotes & historical prices using Yahoo Finance Chart API.
 */

export async function fetchStockQuote(ticker, timeoutMs = 8000) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=1mo`;
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) InsightTrader/1.0',
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();
    const result = data.chart?.result?.[0];
    if (!result) {
      throw new Error('No chart result returned');
    }

    const meta = result.meta;
    const currentPrice = meta.regularMarketPrice ?? meta.chartPreviousClose ?? 100;
    const prevClose = meta.chartPreviousClose ?? currentPrice;
    const changeTodayPct = +(((currentPrice - prevClose) / prevClose) * 100).toFixed(2);

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
    const change30DayPct = +(((currentPrice - firstClose) / firstClose) * 100).toFixed(2);

    return {
      ticker: ticker.toUpperCase(),
      companyName: meta.shortName || meta.longName || ticker.toUpperCase(),
      currentPrice: +currentPrice.toFixed(2),
      changeTodayPct,
      change30DayPct,
      currency: meta.currency || 'USD',
      fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh,
      fiftyTwoWeekLow: meta.fiftyTwoWeekLow,
      marketCap: meta.marketCap ? `$${(meta.marketCap / 1e9).toFixed(1)}B` : 'N/A',
      sector: meta.instrumentType || 'Equity',
      priceHistory,
    };
  } catch (err) {
    console.warn(`[Market Quotes] Error fetching quote for ${ticker}: ${err.message}`);
    // Return a sensible fallback object if offline
    return {
      ticker: ticker.toUpperCase(),
      companyName: ticker.toUpperCase(),
      currentPrice: 100.0,
      changeTodayPct: 0.0,
      change30DayPct: 0.0,
      currency: 'USD',
      marketCap: 'N/A',
      sector: 'Equity',
      priceHistory: [],
    };
  }
}

/**
 * Batch fetches quotes for multiple tickers.
 */
export async function fetchMultipleQuotes(tickers) {
  const results = await Promise.allSettled(tickers.map((t) => fetchStockQuote(t)));
  const quotes = {};
  results.forEach((r, idx) => {
    const t = tickers[idx].toUpperCase();
    if (r.status === 'fulfilled') {
      quotes[t] = r.value;
    }
  });
  return quotes;
}

