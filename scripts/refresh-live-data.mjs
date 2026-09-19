/**
 * Script to run live data refresh pipeline from the CLI.
 */
import { refreshLiveIntelligence, getIntelligence } from '../lib/data-feed/live-intelligence-service.mjs';

async function main() {
  console.log('====================================================');
  console.log('   INSIGHTTRADER: LIVE DATA PIPELINE SYNCHRONIZER   ');
  console.log('====================================================');

  const startTime = Date.now();
  const dataset = await refreshLiveIntelligence();
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log('----------------------------------------------------');
  console.log(`Sync completed in ${duration} seconds.`);
  console.log(`Mode: ${dataset.summary.dataSourceMode}`);
  console.log(`Active Signals: ${dataset.summary.activeSignalsCount}`);
  console.log(`Official PTR Filings Cataloged: ${dataset.summary.officialPtrFilingsCataloged}`);
  console.log(`Tracked Politicians: ${dataset.summary.trackedPoliticiansCount}`);
  console.log(`Tracked Volume YTD: $${(dataset.summary.totalTrackedVolumeYtdUsd / 1e6).toFixed(1)}M USD`);
  console.log(`Ingested RSS News Articles: ${dataset.news.length}`);
  console.log('----------------------------------------------------');

  console.log('\nSynthesized Live Signals:');
  for (const s of dataset.signals) {
    console.log(` - [${s.direction}] ${s.ticker} (${s.companyName}): Current Price: $${s.metrics.currentPrice} -> Target: $${s.metrics.targetPrice} (Confidence: ${s.confidenceScorePct}%)`);
    console.log(`   Headline: "${s.headline}"`);
    console.log(`   Citations: ${s.evidence.disclosures.length} official filing(s), ${s.evidence.newsCatalysts.length} live RSS news catalyst(s)`);
  }
  console.log('====================================================\n');
}

main().catch((err) => {
  console.error('Pipeline failed:', err);
  process.exit(1);
});

