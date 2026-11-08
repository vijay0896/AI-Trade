#!/usr/bin/env node
/**
 * @file downloadHistoricalData.js
 * @description Standalone CLI script to validate Groww 5-year historical coverage
 * and download 5-minute OHLCV candles for ICICIBANK, HDFCBANK, M&M, AXISBANK, and BHARTIARTL.
 */

const path = require('path');
const dotenv = require('dotenv');

// Load backend .env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const HistoricalDownloaderService = require('../modules/market-data/downloader/historicalDownloader.service');
const logger = require('../config/logger');

async function main() {
  console.log('===============================================================');
  console.log('  AI TRADING SYSTEM — 5-YEAR HISTORICAL DATA DOWNLOADER');
  console.log('  Target Stocks: ICICIBANK, HDFCBANK, M&M, AXISBANK, BHARTIARTL');
  console.log('  Period: 2021-11-08 09:15:00 to 2026-11-06 15:30:00');
  console.log('  Candle Interval: 5minute');
  console.log('===============================================================\n');

  try {
    // 1. Phase A: Coverage Validation
    console.log('[Phase A] Running Historical Coverage Validation (2021-11-08)...');
    const coverage = await HistoricalDownloaderService.validateCoverage();

    if (!coverage.success) {
      console.error('\n❌ Phase A FAILED!');
      console.error(`Error: ${coverage.error}`);
      console.error(`Available Period: ${coverage.availablePeriod}`);
      console.error('Stopping bulk download as instructed.\n');
      process.exit(1);
    }

    console.log('✅ Phase A PASSED!');
    console.log(`Verified Symbol: ${coverage.symbol}`);
    console.log(`Test Date: ${coverage.testDate}`);
    console.log(`Candles Received: ${coverage.candleCount}`);
    console.log(`Range: ${coverage.earliest} -> ${coverage.latest}\n`);

    // 2. Parse CLI symbol filter if provided (e.g. --symbols=ICICIBANK,HDFCBANK)
    const args = process.argv.slice(2);
    let filterSymbols = null;
    const symbolsArg = args.find((a) => a.startsWith('--symbols='));
    if (symbolsArg) {
      filterSymbols = symbolsArg.split('=')[1].split(',').map((s) => s.trim().toUpperCase());
      console.log(`Filtering download to requested symbols: ${filterSymbols.join(', ')}\n`);
    }

    // 3. Phase B, C, D: Bulk Download
    console.log('[Phase B, C, D] Initiating 5-Year Data Download...');
    const result = await HistoricalDownloaderService.downloadAll({
      symbols: filterSymbols,
      throttleMs: 250
    });

    console.log('\n===============================================================');
    console.log('  DOWNLOAD COMPLETE — SUMMARY REPORT');
    console.log('===============================================================');
    console.log(`Execution Time: ${result.elapsedSeconds} seconds\n`);

    for (const stock of result.stocks) {
      console.log(`Stock: ${stock.symbol}`);
      console.log(`  Status:               ${stock.downloadCompletionStatus}`);
      console.log(`  Total Candles:        ${stock.totalDownloadedCandles.toLocaleString()}`);
      console.log(`  Earliest Candle:      ${stock.actualEarliestCandle}`);
      console.log(`  Latest Candle:        ${stock.actualLatestCandle}`);
      console.log(`  Duplicates Removed:   ${stock.duplicateCandlesRemoved}`);
      console.log(`  Missing Intervals:    ${stock.missingCandleIntervalsCount}`);
      console.log(`  Failed API Requests:  ${stock.failedApiRequests}`);
      console.log('---------------------------------------------------------------');
    }

    console.log('\nAll historical CSV files organized in: backend/storage/historical-data/');
    console.log('Full summary saved to: backend/storage/historical-data/download_summary.json\n');
  } catch (err) {
    console.error('\n❌ Unhandled Downloader Error:', err.message);
    logger.error('Downloader CLI failure:', { error: err.message, stack: err.stack });
    process.exit(1);
  }
}

main();

