/**
 * Zero-dependency XML RSS 2.0 & Atom feed parser.
 * Handles Yahoo Finance, Google News, and generic financial/policy RSS feeds.
 */

import { isLanxess } from './lanxess-filter.mjs';

function decodeHtmlEntities(str) {
  if (!str) return '';
  return str
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(code))
    .replace(/<[^>]+>/g, '')
    .trim();
}

/**
 * Parses an RSS XML string into structured article objects.
 */
export function parseRssXml(xmlText, defaultSource = 'RSS Feed') {
  const articles = [];
  const itemRegex = /<item[\s>]([\s\S]*?)<\/item>/gi;
  let match;

  const extractTag = (xml, tag) => {
    const reg = new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`, 'i');
    const m = reg.exec(xml);
    return m ? decodeHtmlEntities(m[1]) : '';
  };

  const extractAttr = (xml, tag, attr) => {
    const reg = new RegExp(`<${tag}[^>]*\\s${attr}=["']([^"']+)["'][^>]*>`, 'i');
    const m = reg.exec(xml);
    return m ? m[1] : '';
  };

  while ((match = itemRegex.exec(xmlText)) !== null) {
    const itemContent = match[1];
    const title = extractTag(itemContent, 'title');
    let link = extractTag(itemContent, 'link');
    if (!link) {
      link = extractAttr(itemContent, 'link', 'href');
    }
    const pubDate = extractTag(itemContent, 'pubDate') || new Date().toISOString();
    const description = extractTag(itemContent, 'description');
    const source = extractTag(itemContent, 'source') || defaultSource;

    if (title && link) {
      if (isLanxess({ headline: title, summary: description, name: title })) {
        continue;
      }

      // Analyze sentiment heuristically
      const text = `${title} ${description}`.toLowerCase();
      let sentiment = 'Neutral';
      const bullishWords = ['surge', 'jump', 'gain', 'buy', 'contract', 'awarded', 'bullish', 'expansion', 'upgrade', 'beat', 'record', 'growth', 'soar', 'boost', 'approved'];
      const bearishWords = ['fall', 'drop', 'slump', 'sell', 'loss', 'bearish', 'investigation', 'downgrade', 'miss', 'probe', 'ban', 'decline', 'plunge', 'sanctions', 'risk'];

      let bullScore = bullishWords.filter((w) => text.includes(w)).length;
      let bearScore = bearishWords.filter((w) => text.includes(w)).length;

      if (bullScore > bearScore) sentiment = 'Bullish';
      else if (bearScore > bullScore) sentiment = 'Bearish';

      // Category detection
      let category = 'Macro & Fiscal Policy';
      if (/chip|semiconductor|nvidia|asml|tsmc|intel|foundry|lithography/i.test(text)) {
        category = 'Semiconductors & AI';
      } else if (/defense|lockheed|pentagon|military|weapon|navy|air force|missile|arms/i.test(text)) {
        category = 'Defense & Aerospace';
      } else if (/cyber|software|cloud|crowdstrike|palantir|microsoft|ai|data/i.test(text)) {
        category = 'Cybersecurity & Tech';
      } else if (/energy|oil|gas|clean energy|uranium|critical mineral/i.test(text)) {
        category = 'Energy & Critical Minerals';
      } else if (/health|pharma|fda|biotech|drug|medicine/i.test(text)) {
        category = 'Healthcare & FDA';
      }

      articles.push({
        id: `news-${Buffer.from(link).toString('base64url').slice(0, 16)}`,
        headline: title,
        source,
        publishedAt: new Date(pubDate).toISOString(),
        summary: description || title,
        category,
        sentiment,
        articleUrl: link,
        reliabilityScorePct: 92,
      });
    }
  }

  return articles;
}

/**
 * Fetches RSS feed from URL with standard headers and timeout.
 */
export async function fetchRssFeed(url, defaultSource = 'News Feed', timeoutMs = 8000) {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 InsightTrader/1.0',
        Accept: 'application/rss+xml, application/xml, text/xml, */*',
      },
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    const xml = await res.text();
    return parseRssXml(xml, defaultSource);
  } catch (err) {
    console.warn(`[RSS Parser] Failed to fetch feed ${url}: ${err.message}`);
    return [];
  }
}

/**
 * Deduplicates articles by normalized headline and URL.
 */
export function deduplicateArticles(articles = []) {
  const seenTitles = new Set();
  const seenUrls = new Set();
  const deduped = [];

  for (const a of articles) {
    if (!a || !a.headline) continue;
    if (isLanxess(a)) continue;

    // Normalize headline for matching
    const normTitle = a.headline
      .toLowerCase()
      .replace(/[^a-z0-9]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const normUrl = (a.articleUrl || '').split('?')[0].toLowerCase();

    if (normTitle.length > 10 && seenTitles.has(normTitle)) continue;
    if (normUrl && seenUrls.has(normUrl)) continue;

    if (normTitle.length > 10) seenTitles.add(normTitle);
    if (normUrl) seenUrls.add(normUrl);

    deduped.push(a);
  }

  return deduped;
}

/**
 * Fetches ticker-specific news from Yahoo Finance RSS.
 */
export async function fetchTickerRssNews(ticker) {
  const cleanTicker = (ticker || '').trim().toUpperCase();
  if (!cleanTicker || isLanxess(cleanTicker)) return [];

  const url = `https://feeds.finance.yahoo.com/rss/2.0/headline?s=${encodeURIComponent(cleanTicker)}&region=US&lang=en-US`;
  const articles = await fetchRssFeed(url, `Yahoo Finance (${cleanTicker})`);
  return articles.map((a) => ({
    ...a,
    relatedTickers: [cleanTicker],
  }));
}

/**
 * Fetches congressional and policy news from Google News RSS.
 */
export async function fetchPolicyRssNews(query = 'congress stock trading policy') {
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
  return fetchRssFeed(url, 'Congressional Policy Wire');
}

/**
 * Fetches market-wide news from Yahoo Finance, CNBC, and MarketWatch.
 */
export async function fetchMarketWideNews() {
  const [yahooTop, cnbcMarkets, marketwatch] = await Promise.allSettled([
    fetchRssFeed('https://finance.yahoo.com/news/rssindex', 'Yahoo Finance Top News'),
    fetchRssFeed('https://news.google.com/rss/search?q=site:cnbc.com+markets+OR+investing&hl=en-US&gl=US&ceid=US:en', 'CNBC Markets'),
    fetchRssFeed('https://news.google.com/rss/search?q=site:marketwatch.com+stocks+OR+defense+OR+semiconductors&hl=en-US&gl=US&ceid=US:en', 'MarketWatch'),
  ]);

  const articles = [
    ...(yahooTop.status === 'fulfilled' ? yahooTop.value : []),
    ...(cnbcMarkets.status === 'fulfilled' ? cnbcMarkets.value : []),
    ...(marketwatch.status === 'fulfilled' ? marketwatch.value : []),
  ];

  return deduplicateArticles(articles);
}

/**
 * Fetches regulatory and policy wire news.
 */
export async function fetchRegulatoryAndPolicyNews() {
  const [secWire, congressPolicy] = await Promise.allSettled([
    fetchRssFeed('https://news.google.com/rss/search?q=SEC+regulations+OR+federal+trade+commission+antitrust&hl=en-US&gl=US&ceid=US:en', 'SEC & Regulatory Wire'),
    fetchRssFeed('https://news.google.com/rss/search?q=congress+STOCK+Act+OR+defense+appropriations+budget&hl=en-US&gl=US&ceid=US:en', 'Congressional Policy Wire'),
  ]);

  const articles = [
    ...(secWire.status === 'fulfilled' ? secWire.value : []),
    ...(congressPolicy.status === 'fulfilled' ? congressPolicy.value : []),
  ];

  return deduplicateArticles(articles);
}

/**
 * Ingests and combines stock-specific, market-wide, regulatory, and policy feeds.
 * Deduplicates and tags articles with mentioned tracked tickers.
 */
export async function fetchAllExpandedNews(trackedTickers = []) {
  const cleanTickers = (trackedTickers || [])
    .map((t) => (t || '').trim().toUpperCase())
    .filter((t) => t && !isLanxess(t));

  const tickerFeedPromises = cleanTickers.map((t) => fetchTickerRssNews(t));
  const marketPromise = fetchMarketWideNews();
  const regulatoryPromise = fetchRegulatoryAndPolicyNews();

  const results = await Promise.allSettled([
    ...tickerFeedPromises,
    marketPromise,
    regulatoryPromise,
  ]);

  const rawArticles = [];
  for (const r of results) {
    if (r.status === 'fulfilled' && Array.isArray(r.value)) {
      rawArticles.push(...r.value);
    }
  }

  // Deduplicate across all combined feeds
  const deduped = deduplicateArticles(rawArticles);

  // Tag articles with any tracked tickers mentioned in headline or summary
  const taggedArticles = deduped.map((article) => {
    const text = `${article.headline || ''} ${article.summary || ''}`.toUpperCase();
    const matched = new Set(article.relatedTickers || []);

    for (const t of cleanTickers) {
      if (text.includes(t)) {
        matched.add(t);
      }
    }

    return {
      ...article,
      relatedTickers: Array.from(matched),
    };
  });

  // Sort chronologically descending
  return taggedArticles.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
}

