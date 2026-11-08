#!/usr/bin/env node
/**
 * @file calculateIndicators.js
 * @description Standalone CLI script to calculate production-grade technical indicators
 * across all historical 5-minute candles and generate derived partitioned datasets.
 */

const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const IndicatorsService = require('../modules/indicators/indicators.service');
const { TARGET_STOCKS } = require('../modules/indicators/indicators.config');

async function main() {
  console.log('===============================================================');
  console.log('  AI TRADING SYSTEM — TECHNICAL INDICATOR ENGINE');
  console.log('  Calculators: EMA20, EMA50, VWAP, ATR14, ADX14, +DI14, -DI14,');
  console.log('               Choppiness14, EfficiencyRatio14, VolSMA20, RVOL20');
  console.log('  Timeframe: 5-Minute Continuous Regular Session (09:15–15:25)');
  console.log('===============================================================\n');

  const args = process.argv.slice(2);
  let filterSymbols = null;

  const symbolsArg = args.find((a) => a.startsWith('--symbols='));
  if (symbolsArg) {
    filterSymbols = symbolsArg
      .split('=')[1]
      .split(',')
      .map((s) => s.trim().toUpperCase())
      .filter((s) => TARGET_STOCKS.includes(s));
    console.log(`Filtering indicator calculations to: ${filterSymbols.join(', ')}\n`);
  }

  try {
    const report = await IndicatorsService.processAll({
      symbols: filterSymbols
    });

    console.log('\n===============================================================');
    console.log('  INDICATOR CALCULATION COMPLETE — MASTER SUMMARY');
    console.log('===============================================================');
    console.log(`Execution Time: ${report.elapsedSeconds} seconds\n`);

    for (const s of report.stocks) {
      console.log(`Stock: ${s.symbol}`);
      console.log(`  Total Candles Scanned:      ${s.totalCandles.toLocaleString()}`);
      console.log(`  Regular Session Candles:    ${s.sessionCounts.regular.toLocaleString()}`);
      console.log(`  Special Sessions Isolated:  ${s.sessionCounts.special} (Muhurat & DR)`);
      console.log(`  Closing Auctions Isolated:  ${s.sessionCounts.closingAuction} (15:30)`);
      console.log(`  Post-Market Isolated:       ${s.sessionCounts.postMarket} (>15:30)`);
      console.log(`  Warm-Up Candles (Nulls):    ${s.warmUpCandles}`);
      console.log(`  Fully Calculated Candles:   ${s.fullyCalculatedCandles.toLocaleString()}`);
      console.log(`  EMA20 Range:                [${s.metrics.ema20.min}, ${s.metrics.ema20.max}] (Avg: ${s.metrics.ema20.avg})`);
      console.log(`  VWAP Range:                 [${s.metrics.vwap.min}, ${s.metrics.vwap.max}] (Avg: ${s.metrics.vwap.avg})`);
      console.log(`  ATR14 Range:                [${s.metrics.atr14.min}, ${s.metrics.atr14.max}] (Avg: ${s.metrics.atr14.avg})`);
      console.log(`  ADX14 Range:                [${s.metrics.adx14.min}, ${s.metrics.adx14.max}] (Avg: ${s.metrics.adx14.avg})`);
      console.log(`  Choppiness14 Range:         [${s.metrics.choppiness14.min}, ${s.metrics.choppiness14.max}] (Avg: ${s.metrics.choppiness14.avg})`);
      console.log(`  EfficiencyRatio14 Range:    [${s.metrics.efficiencyRatio14.min}, ${s.metrics.efficiencyRatio14.max}] (Avg: ${s.metrics.efficiencyRatio14.avg})`);
      console.log('---------------------------------------------------------------');
    }

    console.log('\nDerived indicator CSVs saved to: backend/storage/derived/indicators/');
    console.log('Full report generated at: backend/storage/derived/indicators/INDICATOR_ENGINE_REPORT.md\n');
  } catch (err) {
    console.error('\n❌ Indicator Engine Error:', err.message);
    process.exit(1);
  }
}

main();

