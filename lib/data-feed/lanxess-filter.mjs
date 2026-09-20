/**
 * Lanxess Defensive Exclusion Filter.
 * Guarantees zero Lanxess AG data anywhere in UI, cache, signals, news, quotes, or search.
 */

export const LANXESS_SYMBOLS = new Set(['LXS.DE', 'LNXSF', 'LNXSY', 'LXS']);

/**
 * Returns true if an entity represents Lanxess AG or a known Lanxess symbol.
 * Does NOT filter unrelated tickers (e.g. L, LX, etc.).
 */
export function isLanxess(entity) {
  if (!entity) return false;

  if (typeof entity === 'string') {
    const s = entity.trim().toUpperCase();
    if (LANXESS_SYMBOLS.has(s)) return true;
    if (s.includes('LANXESS')) return true;
    return false;
  }

  // Check ticker / symbol
  const ticker = (entity.ticker || entity.symbol || '').trim().toUpperCase();
  if (ticker && LANXESS_SYMBOLS.has(ticker)) {
    return true;
  }

  // Check company / asset names and headlines
  const textFields = [
    entity.companyName,
    entity.name,
    entity.assetName,
    entity.headline,
    entity.title,
    entity.summary,
    entity.thesis,
  ].filter(Boolean);

  for (const text of textFields) {
    if (typeof text === 'string' && text.toUpperCase().includes('LANXESS')) {
      return true;
    }
  }

  // Check related tickers if present
  if (Array.isArray(entity.relatedTickers)) {
    for (const rt of entity.relatedTickers) {
      if (LANXESS_SYMBOLS.has(String(rt).trim().toUpperCase())) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Recursively or collection-level sanitizes dataset removing all Lanxess entries.
 */
export function sanitizeDataset(dataset) {
  if (!dataset) return dataset;

  if (Array.isArray(dataset)) {
    return dataset.filter((item) => !isLanxess(item));
  }

  if (typeof dataset !== 'object') return dataset;

  const sanitized = { ...dataset };

  if (Array.isArray(sanitized.signals)) {
    sanitized.signals = sanitized.signals.filter((s) => !isLanxess(s));
  }

  if (Array.isArray(sanitized.disclosures)) {
    sanitized.disclosures = sanitized.disclosures.filter((d) => !isLanxess(d));
  }

  if (Array.isArray(sanitized.news)) {
    sanitized.news = sanitized.news.filter((n) => !isLanxess(n));
  }

  if (Array.isArray(sanitized.quotes)) {
    sanitized.quotes = sanitized.quotes.filter((q) => !isLanxess(q));
  }

  if (Array.isArray(sanitized.politicians)) {
    sanitized.politicians = sanitized.politicians.filter((p) => !isLanxess(p));
  }

  if (Array.isArray(sanitized.trumpPosts)) {
    sanitized.trumpPosts = sanitized.trumpPosts.filter((t) => !isLanxess(t));
  }

  return sanitized;
}
