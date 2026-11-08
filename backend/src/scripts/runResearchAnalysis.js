#!/usr/bin/env node

/**
 * @file runResearchAnalysis.js
 * @description Standalone CLI runner for Phase 7 Quantitative Research & Stock Behaviour Analysis.
 *
 * Usage:
 *   node src/scripts/runResearchAnalysis.js
 *   npm run research:analyze --prefix backend
 *   node src/scripts/runResearchAnalysis.js --symbol ICICIBANK
 */

const ResearchService = require('../modules/research/research.service');
const { TARGET_STOCKS } = require('../modules/research/research.constants');
const logger = require('../config/logger');

function parseArgs() {
  const args = process.argv.slice(2);
  const params = {
    symbol: 'ALL',
    startDate: null,
    endDate: null
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--symbol' && args[i + 1]) {
      params.symbol = args[++i].trim().toUpperCase();
    } else if (arg === '--start-date' && args[i + 1]) {
      params.startDate = args[++i].trim();
    } else if (arg === '--end-date' && args[i + 1]) {
      params.endDate = args[++i].trim();
    }
  }

  return params;
}

async function main() {
  const params = parseArgs();
  console.log('\n========================================================================');
  console.log(' AI TRADING SYSTEM — PHASE 7: QUANTITATIVE RESEARCH & STOCK RANKING');
  console.log('========================================================================\n');
  console.log(`Research Universe: ${params.symbol === 'ALL' ? TARGET_STOCKS.join(', ') : params.symbol}`);
  console.log(`Dataset Timeframe: 5-minute candles (2021-11-08 to 2026-11-06)`);
  console.log('Status: Executing full research pipeline and dual ranking engine...\n');

  try {
    const t0 = Date.now();
    const result = await ResearchService.runFullAnalysis({
      startDate: params.startDate,
      endDate: params.endDate
    });

    console.log('\n------------------------------------------------------------------------');
    console.log(' EXECUTION SUMMARY & DELIVERABLES GENERATED');
    console.log('------------------------------------------------------------------------');
    console.log(`Pipeline Status: SUCCESS (Completed in ${((Date.now() - t0) / 1000).toFixed(2)}s)`);
    console.log(`Storage Output: backend/storage/research/\n`);
    console.log('Files Created:');
    result.filesGenerated.forEach(f => console.log(`  - ${f}`));

    console.log('\n------------------------------------------------------------------------');
    console.log(' RANKING A: INTRADAY PRICE BEHAVIOUR (Strategy-Independent)');
    console.log('------------------------------------------------------------------------');
    console.table(result.rankings.rankingA.baselineRanking.map(item => ({
      Rank: item.rank,
      Symbol: item.symbol,
      CompositeScore: item.compositeScore,
      TrendPct: `${item.raw.trendPercent.toFixed(1)}%`,
      EfficiencyRatio: item.raw.efficiencyRatio,
      RangePct: `${item.raw.rangePercent}%`,
      Choppiness: item.raw.choppiness,
      VwapCrosses: item.raw.vwapCrossovers,
      TradedValCr: `Rs. ${item.raw.tradedValueProxy} Cr`
    })));

    console.log('\n------------------------------------------------------------------------');
    console.log(' RANKING B: TRADING STRATEGY PERFORMANCE (Variant E / Trend-Following)');
    console.log('------------------------------------------------------------------------');
    console.table(result.rankings.rankingB.baselineRanking.map(item => ({
      Rank: item.rank,
      Symbol: item.symbol,
      CompositeScore: item.compositeScore,
      NetExpectancy: `Rs. ${item.raw.netExpectancy}`,
      ProfitFactor: item.raw.profitFactor,
      MaxDrawdown: `${item.raw.maxDrawdown}%`,
      WinRate: `${item.raw.winRate}%`,
      CostDragRatio: item.raw.costDragRatio.toFixed(2),
      TotalTrades: item.raw.sampleSizeAdequacy
    })));

    console.log('\n========================================================================');
    console.log(' Quantitative Research Report written to:');
    console.log(' backend/storage/research/RESEARCH_COMPARISON_REPORT.md');
    console.log('========================================================================\n');

    process.exit(0);
  } catch (err) {
    console.error('\nResearch Analysis Failed:', err.message);
    if (err.stack) console.error(err.stack);
    process.exit(1);
  }
}

main();

