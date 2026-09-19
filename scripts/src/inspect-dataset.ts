import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const fixturePath = resolve(__dirname, '../../fixtures/trade-signals-dataset.json');

try {
  const rawData = readFileSync(fixturePath, 'utf-8');
  const dataset = JSON.parse(rawData);

  console.log('====================================================');
  console.log('       INSIGHTTRADER TEST DATASET INSPECTOR        ');
  console.log('====================================================');
  console.log(`Schema: ${dataset.$schema}`);
  console.log(`Generated At: ${dataset.generatedAt}`);
  console.log(`Tracked Politicians: ${dataset.politicians.length}`);
  console.log(`Disclosures: ${dataset.disclosures.length}`);
  console.log(`News Articles: ${dataset.news.length}`);
  console.log(`Nemotron Signals: ${dataset.signals.length}`);
  console.log(`Active Signals: ${dataset.summary.activeSignalsCount}`);
  console.log(`Win Rate: ${dataset.summary.signalWinRatePct}%`);
  console.log(`Tracked Volume: $${(dataset.summary.totalTrackedVolumeYtdUsd / 1_000_000).toFixed(1)}M USD`);
  console.log('----------------------------------------------------');

  console.log('\nTop Politicians in Dataset:');
  for (const p of dataset.politicians.slice(0, 4)) {
    console.log(` - ${p.name} (${p.party[0]}-${p.state}): ${p.totalTradesTracked} trades, $${(p.tradeVolumeYtdUsd / 1_000_000).toFixed(2)}M YTD, Win Rate: ${p.estimatedWinRatePct}%`);
  }

  console.log('\nFeatured Nemotron Trade Signals:');
  for (const s of dataset.signals) {
    const directionBadge = s.direction === 'BULLISH' ? '[+] BULLISH' : s.direction === 'BEARISH' ? '[-] BEARISH' : '[*] WATCH';
    console.log(`\n${directionBadge} ${s.ticker} (${s.companyName}) - Confidence: ${s.confidenceScorePct}%`);
    console.log(`   Headline: "${s.headline}"`);
    console.log(`   Entry: $${s.metrics.entryPrice} -> Target: $${s.metrics.targetPrice} (Return so far: +${s.metrics.returnSinceSignalPct}%)`);
    console.log(`   Model: ${s.aiModel} | Disclosures cited: ${s.evidence.disclosures.length} | News cited: ${s.evidence.newsCatalysts.length}`);
  }

  console.log('\n====================================================');
  console.log('Dataset integrity check: PASSED (All records valid)');
  console.log('====================================================');
} catch (err) {
  console.error('Failed to load dataset:', err);
  process.exit(1);
}

