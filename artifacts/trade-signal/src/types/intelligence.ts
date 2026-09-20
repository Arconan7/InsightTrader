export type Chamber = 'Senate' | 'House';
export type PoliticalParty = 'Democrat' | 'Republican' | 'Independent';

export interface Politician {
  id: string;
  name: string;
  chamber: Chamber;
  party: PoliticalParty;
  state: string;
  district?: string;
  committees: string[];
  avatarUrl: string;
  totalTradesTracked: number;
  tradeVolumeYtdUsd: number;
  estimatedWinRatePct: number;
  alphaVsSp500Pct: number;
  lastActiveDate: string;
}

export type TransactionType = 'BUY' | 'SELL' | 'EXCHANGE';
export type FilerRelationship = 'Self' | 'Spouse' | 'Joint' | 'Dependent Child';

export interface PublicDisclosure {
  id: string;
  politicianId: string;
  politicianName: string;
  relationship: FilerRelationship;
  ticker: string;
  assetName: string;
  transactionType: TransactionType;
  transactionDate: string;
  disclosureDate: string;
  disclosureLagDays: number;
  amountBracket: string;
  estimatedAmountUsd: number;
  filingDocUrl: string;
  filingSource: 'House Clerk' | 'Senate Financial Disclosures';
  notes?: string;
}

export type NewsCategory =
  | 'Defense & Aerospace'
  | 'Semiconductors & AI'
  | 'Energy & Critical Minerals'
  | 'Cybersecurity & Tech'
  | 'Healthcare & FDA'
  | 'Macro & Fiscal Policy';

export interface NewsArticle {
  id: string;
  headline: string;
  source: string;
  publishedAt: string;
  summary: string;
  category: NewsCategory;
  relatedTickers: string[];
  sentiment: 'Bullish' | 'Bearish' | 'Neutral';
  articleUrl: string;
  reliabilityScorePct: number;
}

export type SignalDirection = 'BULLISH' | 'BEARISH' | 'WATCH';
export type SignalStatus = 'ACTIVE' | 'RESOLVED_PROFIT' | 'RESOLVED_LOSS' | 'EXPIRED';
export type TimeHorizon = '1-3 Months' | '3-6 Months' | '6-12 Months';
export type ConvictionLevel = 'High' | 'Medium' | 'Speculative';

export interface Citation {
  id: string;
  claim: string;
  sourceType: 'Government Filing' | 'Financial Press' | 'Legislative Record' | 'Exchange Tape';
  sourceName: string;
  sourceUrl: string;
  verifiedDate: string;
  badgeText: string;
}

export interface SignalEvidence {
  disclosures: Array<{
    disclosureId: string;
    politicianName: string;
    transactionType: TransactionType;
    transactionDate: string;
    amountBracket: string;
    committeeContext: string;
    filingDocUrl?: string;
  }>;
  newsCatalysts: Array<{
    newsId: string;
    headline: string;
    source: string;
    publishedAt: string;
    relevanceNote: string;
    articleUrl?: string;
  }>;
  legislativeHooks: string[];
}

export interface SignalPriceMetrics {
  entryPrice: number;
  currentPrice: number;
  targetPrice: number;
  stopLossPrice: number;
  returnSinceSignalPct: number;
  benchmarkReturnPct: number; // e.g. S&P 500 or sector ETF
}

export interface TradeSignal {
  id: string;
  ticker: string;
  companyName: string;
  sector: string;
  direction: SignalDirection;
  status: SignalStatus;
  conviction: ConvictionLevel;
  confidenceScorePct: number; // 0-100
  timeHorizon: TimeHorizon;
  generatedAt: string;
  headline: string;
  thesis: string;
  aiModel: 'Nemotron-70B-Instruct' | 'Nemotron-4-340B-Reward' | 'Nemotron-Custom-Finance';
  evidence: SignalEvidence;
  citations?: Citation[];
  keyRisks: string[];
  metrics: SignalPriceMetrics;
  tags: string[];
}

export interface PricePoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  hasPoliticianTrade?: boolean;
  hasSignalTrigger?: boolean;
  tradeNote?: string;
}

export interface StockQuote {
  ticker: string;
  companyName: string;
  currentPrice: number;
  changeTodayPct: number;
  change30DayPct: number;
  marketCap: string;
  sector: string;
  priceHistory: PricePoint[];
}

export interface DashboardSummary {
  activeSignalsCount: number;
  avgConfidenceScorePct: number;
  totalTrackedVolumeYtdUsd: number;
  signalWinRatePct?: number;
  avgSignalAlphaPct?: number;
  totalDisclosuresCount: number;
  trackedPoliticiansCount: number;
  officialPtrFilingsCataloged?: number;
  lastUpdatedIso: string;
  dataSourceMode?: string;
  dataSources?: string[];
}

export interface InsightDataset {
  summary: DashboardSummary;
  signals: TradeSignal[];
  disclosures: PublicDisclosure[];
  politicians: Politician[];
  news: NewsArticle[];
  quotes: StockQuote[];
}

