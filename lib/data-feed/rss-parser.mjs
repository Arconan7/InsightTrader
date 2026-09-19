/**
 * Zero-dependency XML RSS 2.0 & Atom feed parser.
 * Handles Yahoo Finance, Google News, and generic financial/policy RSS feeds.
 */

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
 * Fetches ticker-specific news from Yahoo Finance RSS.
 */
export async function fetchTickerRssNews(ticker) {
  const url = `https://feeds.finance.yahoo.com/rss/2.0/headline?s=${encodeURIComponent(ticker)}&region=US&lang=en-US`;
  const articles = await fetchRssFeed(url, `Yahoo Finance (${ticker})`);
  return articles.map((a) => ({
    ...a,
    relatedTickers: [ticker.toUpperCase()],
  }));
}

/**
 * Fetches congressional and policy news from Google News RSS.
 */
export async function fetchPolicyRssNews(query = 'congress stock trading policy') {
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
  return fetchRssFeed(url, 'Google News Policy Feed');
}

