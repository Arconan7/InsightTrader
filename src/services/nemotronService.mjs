const NVIDIA_NIM_URL = 'https://integrate.api.nvidia.com/v1/chat/completions';
const DEFAULT_MODEL = 'nvidia/llama-3.1-nemotron-70b-instruct';

export async function synthesizeWithNemotron({
  ticker,
  companyName = '',
  disclosures = [],
  newsArticles = [],
  customNotes = '',
  apiKey = null,
  model = DEFAULT_MODEL,
}) {
  const activeKey = apiKey || process.env.NVIDIA_API_KEY || process.env.NEMOTRON_API_KEY;

  // Build the prompt for Nemotron
  const systemPrompt = `You are Nemotron-Finance, an advanced political intelligence and institutional equity research model developed by NVIDIA.
Your role is to cross-examine congressional STOCK Act trade disclosures against policy catalysts, government appropriations, and regulatory news to synthesize actionable, source-linked trade signals.

You must analyze:
1. Committee Jurisdiction: Does the politician's committee oversee the relevant contracts, subsidies, or regulations?
2. Timing & Disclosure Lag: Did the transaction precede a key policy announcement or closed markup?
3. Trade Conviction: Is this a buy, call option, or divestment? What is the estimated dollar bracket?
4. News & Legislative Catalyst: Does recent news confirm or contradict the insider flow?

You MUST respond strictly with a valid JSON object with the following structure (no markdown fences, raw JSON only):
{
  "ticker": "${ticker.toUpperCase()}",
  "companyName": "${companyName || ticker.toUpperCase()}",
  "direction": "BULLISH" | "BEARISH" | "WATCH",
  "confidenceScorePct": number (between 50 and 98),
  "conviction": "High" | "Medium" | "Speculative",
  "timeHorizon": "1-3 Months" | "3-6 Months" | "6-12 Months",
  "headline": "A concise, punchy 1-sentence signal summary",
  "thesis": "A comprehensive 3-5 sentence analytical breakdown linking the politician's trades and committee actions to the news catalysts.",
  "legislativeHooks": ["List of relevant acts, subcommittees, or executive directives"],
  "keyRisks": ["2-3 key risk factors or regulatory headwinds"],
  "priceTargets": {
    "estimatedCurrentPrice": number,
    "targetPrice": number,
    "stopLoss": number,
    "projectedReturnPct": number
  }
}`;

  const userContent = `Analyze the following intelligence inputs for ticker ${ticker.toUpperCase()} (${companyName}):

RECENT CONGRESSIONAL STOCK ACT FILINGS:
${disclosures.map((d, i) => `${i + 1}. Filer: ${d.politicianName} (${d.chamber || 'Congress'}, ${d.state || ''}) | Trade: ${d.transactionType} ${d.amountBracket} | Date: ${d.transactionDate} | Asset: ${d.assetName} | Notes: ${d.notes || ''}`).join('\n')}

RECENT NEWS & REGULATORY CATALYSTS:
${newsArticles.map((n, i) => `${i + 1}. Source: ${n.source} (${n.publishedAt}) | Headline: ${n.headline} | Summary: ${n.summary}`).join('\n')}

ADDITIONAL CONTEXT / NOTES:
${customNotes || 'Analyze standard correlation with federal appropriations and policy timeline.'}

Synthesize a readable, source-linked trade signal. Output raw JSON only.`;

  // If an API key is available, call the real NVIDIA NIM API
  if (activeKey) {
    try {
      const response = await fetch(NVIDIA_NIM_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${activeKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userContent },
          ],
          temperature: 0.2,
          max_tokens: 1500,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const rawOutput = data.choices?.[0]?.message?.content || '';
        const parsed = extractJson(rawOutput);
        if (parsed) {
          return {
            success: true,
            source: 'nvidia-nim',
            synthesisMode: 'NEMOTRON_NIM',
            model,
            note: 'Synthesized via live NVIDIA NIM Llama 3.1 Nemotron API endpoint.',
            signal: formatSynthesizedSignal(parsed, ticker, companyName, disclosures, newsArticles, model),
          };
        }
      } else {
        const errText = await response.text();
        console.warn(`NVIDIA NIM returned status ${response.status}: ${errText}`);
      }
    } catch (err) {
      console.warn('Failed calling NVIDIA NIM API, falling back to local heuristic synthesis:', err.message);
    }
  }

  // Fallback: Local deterministic heuristic engine (explicitly labeled when offline or API key pending)
  return {
    success: true,
    source: 'heuristic-fallback',
    synthesisMode: 'HEURISTIC',
    model: 'Heuristic Fallback (Deterministic Rule Engine)',
    note: activeKey
      ? 'NVIDIA NIM API call was unreachable; generated via deterministic multi-pillar heuristic fallback.'
      : 'No NVIDIA_API_KEY detected in environment; generated via deterministic multi-pillar heuristic fallback. Configure an NVIDIA API key to activate live NIM inference.',
    signal: generateLocalHeuristicSignal(ticker, companyName, disclosures, newsArticles, customNotes),
  };
}

function extractJson(text) {
  try {
    return JSON.parse(text);
  } catch (e) {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch (e2) {}
    }
    return null;
  }
}

function formatSynthesizedSignal(parsed, ticker, companyName, disclosures, newsArticles, model) {
  return {
    id: `nemotron-sig-${Date.now()}`,
    ticker: ticker.toUpperCase(),
    companyName: companyName || parsed.companyName || `${ticker.toUpperCase()} Corp`,
    sector: inferSector(ticker),
    direction: parsed.direction || 'BULLISH',
    status: 'ACTIVE',
    conviction: parsed.conviction || 'High',
    confidenceScorePct: parsed.confidenceScorePct || 88,
    timeHorizon: parsed.timeHorizon || '3-6 Months',
    generatedAt: new Date().toISOString(),
    headline: parsed.headline || `Nemotron Synthesized Signal for ${ticker.toUpperCase()}`,
    thesis: parsed.thesis,
    aiModel: `${model} (Live NIM)`,
    synthesisMode: 'NEMOTRON_NIM',
    provenance: 'DERIVED',
    evidence: {
      disclosures: disclosures.map(d => ({
        disclosureId: d.id,
        politicianName: d.politicianName,
        transactionType: d.transactionType,
        transactionDate: d.transactionDate,
        amountBracket: d.amountBracket,
        committeeContext: d.notes || `${d.chamber} committee jurisdiction review`,
      })),
      newsCatalysts: newsArticles.map(n => ({
        newsId: n.id,
        headline: n.headline,
        source: n.source,
        publishedAt: n.publishedAt,
        relevanceNote: n.summary,
      })),
      legislativeHooks: parsed.legislativeHooks || ['Federal Procurement Reauthorization & Strategic Appropriations'],
    },
    keyRisks: parsed.keyRisks || ['Regulatory compliance audits and delivery milestones'],
    metrics: {
      entryPrice: parsed.priceTargets?.estimatedCurrentPrice || 150.0,
      currentPrice: parsed.priceTargets?.estimatedCurrentPrice || 150.0,
      targetPrice: parsed.priceTargets?.targetPrice || 175.0,
      stopLossPrice: parsed.priceTargets?.stopLoss || 138.0,
      returnSinceSignalPct: 0.0,
      benchmarkReturnPct: 0.0,
    },
    tags: ['NVIDIA Nemotron', parsed.direction || 'BULLISH', 'STOCK Act Analysis', 'Live NIM'],
  };
}

function generateLocalHeuristicSignal(ticker, companyName, disclosures, newsArticles, customNotes) {
  const t = ticker.toUpperCase();
  const buyCount = disclosures.filter(d => d.transactionType === 'BUY').length;
  const sellCount = disclosures.filter(d => d.transactionType === 'SELL').length;
  const direction = buyCount >= sellCount ? 'BULLISH' : 'BEARISH';
  const confidenceScorePct = Math.min(96, Math.max(72, 75 + (disclosures.length * 4) + (newsArticles.length * 3)));
  const conviction = confidenceScorePct > 88 ? 'High' : 'Medium';

  const primaryFiler = disclosures[0]?.politicianName || 'Key Congressional Members';
  const primaryNews = newsArticles[0]?.headline || 'federal legislative updates and appropriations milestones';

  const thesis = `Multi-pillar heuristic correlation identifies directional alignment between ${disclosures.length} congressional disclosure(s) and recent regulatory catalysts in ${t}. Filings by ${primaryFiler} coincide with ${primaryNews}. (Note: Synthesized via deterministic rule engine fallback; live NVIDIA NIM inference requires configured NVIDIA_API_KEY).`;

  return {
    id: `heuristic-sig-${Date.now()}`,
    ticker: t,
    companyName: companyName || `${t} Corporation`,
    sector: inferSector(t),
    direction,
    status: 'ACTIVE',
    conviction,
    confidenceScorePct,
    timeHorizon: '3-6 Months',
    generatedAt: new Date().toISOString(),
    headline: `${direction === 'BULLISH' ? 'Bullish Accumulation' : 'Defensive Divestment'} Signal in ${t} Correlated with ${primaryFiler}`,
    thesis,
    aiModel: 'Heuristic Fallback (Deterministic Rule Engine)',
    synthesisMode: 'HEURISTIC',
    provenance: 'DERIVED',
    evidence: {
      disclosures: disclosures.map(d => ({
        disclosureId: d.id,
        politicianName: d.politicianName,
        transactionType: d.transactionType,
        transactionDate: d.transactionDate,
        amountBracket: d.amountBracket,
        committeeContext: d.notes || `${d.chamber || 'Congress'} Committee Insight`,
      })),
      newsCatalysts: newsArticles.map(n => ({
        newsId: n.id,
        headline: n.headline,
        source: n.source,
        publishedAt: n.publishedAt,
        relevanceNote: n.summary,
      })),
      legislativeHooks: [
        'Congressional Defense & Commerce Oversight Committee Proceedings',
        'Executive Branch Technology & Supply Chain Mandates',
      ],
    },
    keyRisks: [
      'Macro volatility and shifts in federal budget timing',
      'Potential legislative debates surrounding congressional trading transparency',
    ],
    metrics: {
      entryPrice: 120.0,
      currentPrice: 120.0,
      targetPrice: direction === 'BULLISH' ? 142.0 : 102.0,
      stopLossPrice: direction === 'BULLISH' ? 111.0 : 129.0,
      returnSinceSignalPct: 0.0,
      benchmarkReturnPct: 0.0,
    },
    tags: ['Heuristic Fallback', direction, 'Institutional Flow'],
  };
}

function inferSector(ticker) {
  const map = {
    NVDA: 'Semiconductors & AI',
    AVGO: 'Semiconductors & AI',
    TSM: 'Semiconductors & AI',
    ASML: 'Semiconductors & AI',
    LMT: 'Defense & Aerospace',
    RTX: 'Defense & Aerospace',
    NOC: 'Defense & Aerospace',
    BA: 'Defense & Aerospace',
    PLTR: 'Cybersecurity & Tech',
    CRWD: 'Cybersecurity & Tech',
    MSFT: 'Big Tech & Cloud',
    AAPL: 'Consumer Tech',
    XOM: 'Energy & Critical Minerals',
    CVX: 'Energy & Critical Minerals',
  };
  return map[ticker.toUpperCase()] || 'Diversified Equities';
}

export function checkNemotronStatus() {
  const activeKey = process.env.NVIDIA_API_KEY || process.env.NEMOTRON_API_KEY;
  return {
    configured: Boolean(activeKey),
    maskedKey: activeKey ? `${activeKey.slice(0, 6)}...${activeKey.slice(-4)}` : null,
    defaultModel: DEFAULT_MODEL,
    endpoint: NVIDIA_NIM_URL,
    status: activeKey ? 'LIVE_NIM_READY' : 'OFFLINE_HEURISTIC_FALLBACK',
    description: activeKey
      ? 'NVIDIA NIM active with Llama 3.1 Nemotron 70B inference endpoint'
      : 'Deterministic multi-pillar rule engine fallback active (No NVIDIA_API_KEY detected)',
  };
}
