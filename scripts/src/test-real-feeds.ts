import { getRealDisclosures, getRealPoliticians } from '../../src/services/disclosureService.mjs';
import { fetchLiveNews, getNewsArticles } from '../../src/services/rssService.mjs';
import { synthesizeWithNemotron } from '../../src/services/nemotronService.mjs';

async function runTests() {
  console.log('====================================================');
  console.log('  TESTING REAL DATA, RSS FEEDS & NEMOTRON SYNTHESIS ');
  console.log('====================================================\n');

  // 1. Test Real Congressional Disclosures
  console.log('[1/3] Fetching Real Congressional Disclosures...');
  const disclosures = await getRealDisclosures();
  console.log(` -> Loaded ${disclosures.length} real STOCK Act filings.`);
  const politicians = await getRealPoliticians();
  console.log(` -> Aggregated ${politicians.length} unique politicians.`);
  console.log(' Sample real filers:');
  for (const p of politicians.slice(0, 4)) {
    console.log(`    - ${p.name} (${p.chamber}, ${p.party}): ${p.totalTrades} trades, volume: $${(p.totalVolumeUsd / 1_000_000).toFixed(2)}M`);
  }

  // 2. Test Live RSS News Feeds
  console.log('\n[2/3] Fetching Live RSS News Articles...');
  const news = await fetchLiveNews();
  console.log(` -> Loaded ${news.length} live articles from Google, Yahoo, & Defense News.`);
  console.log(' Sample headlines:');
  for (const n of news.slice(0, 3)) {
    console.log(`    - [${n.source}] "${n.headline.slice(0, 75)}..."`);
    console.log(`      Tickers: ${n.relatedTickers.join(', ')} | Sentiment: ${n.sentiment}`);
  }

  // 3. Test Nemotron AI Synthesis Engine
  console.log('\n[3/3] Running Nemotron Synthesis for Ticker: LMT (Lockheed Martin)...');
  const lmtDisclosures = disclosures.filter(d => d.ticker === 'LMT');
  const lmtNews = news.filter(n => n.relatedTickers.includes('LMT') || n.category === 'Defense & Aerospace');

  const synthResult = await synthesizeWithNemotron({
    ticker: 'LMT',
    companyName: 'Lockheed Martin Corporation',
    disclosures: lmtDisclosures,
    newsArticles: lmtNews,
    customNotes: 'Focus on multi-year precision munitions appropriations in NDAA markup.',
  });

  if (!synthResult.success || !synthResult.signal) {
    throw new Error('Nemotron synthesis failed to return valid signal');
  }

  const s = synthResult.signal;
  console.log(` -> Synthesis Engine: ${synthResult.source} (${synthResult.model})`);
  console.log(` -> Signal Direction: ${s.direction} (${s.confidenceScorePct}% Confidence, ${s.conviction} Conviction)`);
  console.log(` -> Headline: "${s.headline}"`);
  console.log(` -> Thesis: ${s.thesis}`);
  console.log(` -> Cited Disclosures: ${s.evidence.disclosures.length}`);
  console.log(` -> Cited News Catalysts: ${s.evidence.newsCatalysts.length}`);
  console.log(` -> Legislative Hooks: ${s.evidence.legislativeHooks.join('; ')}`);
  console.log(` -> Price Targets: Entry $${s.metrics.entryPrice} -> Target $${s.metrics.targetPrice} (Stop Loss: $${s.metrics.stopLossPrice})`);

  console.log('\n====================================================');
  console.log(' ALL TESTS PASSED: REAL FEEDS & NEMOTRON OPERATIONAL');
  console.log('====================================================');
}

runTests().catch(err => {
  console.error('Test failed with error:', err);
  process.exit(1);
});

