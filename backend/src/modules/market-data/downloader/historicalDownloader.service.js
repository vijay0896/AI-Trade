/**
 * @file historicalDownloader.service.js
 * @description Orchestrator for validating 5-year historical coverage and bulk downloading
 * 5-minute OHLCV candle datasets with throttling, retry, deduplication, and resume support.
 */

const GrowwService = require('../../groww/groww.service');
const MarketDataClient = require('../marketData.client');
const MarketDataFormatter = require('../marketData.formatter');
const IntegrityValidator = require('./integrityValidator');
const { StorageManager } = require('./storageManager');
const logger = require('../../../config/logger');

// Target stocks specified in Task 2
const TARGET_STOCKS = [
  { symbol: 'ICICIBANK', growwSymbol: 'NSE-ICICIBANK', exchange: 'NSE', segment: 'CASH' },
  { symbol: 'HDFCBANK', growwSymbol: 'NSE-HDFCBANK', exchange: 'NSE', segment: 'CASH' },
  { symbol: 'M&M', growwSymbol: 'NSE-M&M', exchange: 'NSE', segment: 'CASH' },
  { symbol: 'AXISBANK', growwSymbol: 'NSE-AXISBANK', exchange: 'NSE', segment: 'CASH' },
  { symbol: 'BHARTIARTL', growwSymbol: 'NSE-BHARTIARTL', exchange: 'NSE', segment: 'CASH' }
];

const DEFAULT_TIMEFRAME = '5minute';
const DEFAULT_THROTTLE_MS = 250;
const MAX_RETRIES = 3;

class HistoricalDownloaderService {
  /**
   * Generates safe date chunks (max 16 days each <= 28 days) organized by month.
   * Period: 2021-11-08 09:15:00 to 2026-11-06 15:30:00.
   *
   * @returns {Array<Object>}
   */
  static generateMonthlyChunks() {
    const chunks = [];
    const startYear = 2021, startMonth = 11;
    const endYear = 2026, endMonth = 11;

    for (let y = startYear; y <= endYear; y++) {
      const mStart = (y === startYear) ? startMonth : 1;
      const mEnd = (y === endYear) ? endMonth : 12;

      for (let m = mStart; m <= mEnd; m++) {
        const paddedMonth = String(m).padStart(2, '0');
        const lastDay = new Date(y, m, 0).getDate();

        const parts = [];
        if (y === 2021 && m === 11) {
          parts.push({
            start: '2021-11-08 09:15:00',
            end: '2021-11-15 15:30:00'
          });
          parts.push({
            start: '2021-11-16 09:15:00',
            end: '2021-11-30 15:30:00'
          });
        } else if (y === 2026 && m === 11) {
          parts.push({
            start: '2026-11-01 09:15:00',
            end: '2026-11-06 15:30:00'
          });
        } else {
          parts.push({
            start: `${y}-${paddedMonth}-01 09:15:00`,
            end: `${y}-${paddedMonth}-15 15:30:00`
          });
          parts.push({
            start: `${y}-${paddedMonth}-16 09:15:00`,
            end: `${y}-${paddedMonth}-${lastDay} 15:30:00`
          });
        }

        chunks.push({
          year: y,
          month: m,
          monthKey: `${y}-${paddedMonth}`,
          parts
        });
      }
    }
    return chunks;
  }

  /**
   * Sleeps for a specified duration in milliseconds.
   *
   * @param {number} ms
   * @returns {Promise<void>}
   */
  static sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Phase A: Validates whether 5-minute historical candles are accessible back to November 2021.
   *
   * @returns {Promise<Object>}
   */
  static async validateCoverage() {
    logger.info('Executing Phase A: Historical Coverage Validation for 2021-11-08...');

    try {
      const accessToken = await GrowwService.ensureValidToken();
      const raw = await MarketDataClient.getHistoricalCandles({
        accessToken,
        exchange: 'NSE',
        segment: 'CASH',
        growwSymbol: 'NSE-ICICIBANK',
        startTime: '2021-11-08 09:15:00',
        endTime: '2021-11-08 15:30:00',
        candleInterval: DEFAULT_TIMEFRAME
      });

      const candles = raw?.payload?.candles || [];
      if (candles.length === 0) {
        return {
          success: false,
          error: 'Groww returned empty candles array for 2021-11-08',
          availablePeriod: 'Unknown / Limited'
        };
      }

      const earliest = candles[0][0];
      const latest = candles[candles.length - 1][0];

      logger.info('Phase A Validation Successful!', {
        symbol: 'NSE-ICICIBANK',
        candleCount: candles.length,
        earliest,
        latest
      });

      return {
        success: true,
        symbol: 'NSE-ICICIBANK',
        testDate: '2021-11-08',
        candleCount: candles.length,
        earliest,
        latest,
        verified: true
      };
    } catch (err) {
      logger.error('Phase A Historical Coverage Validation Failed:', {
        message: err.message,
        statusCode: err.statusCode
      });

      return {
        success: false,
        error: err.message,
        statusCode: err.statusCode || 500,
        availablePeriod: 'Access restricted or unavailable'
      };
    }
  }

  /**
   * Fetches candles for a date chunk with exponential backoff retries on 429 and 5xx errors.
   *
   * @param {Object} options
   * @param {string} options.growwSymbol
   * @param {string} options.exchange
   * @param {string} options.segment
   * @param {string} options.startTime
   * @param {string} options.endTime
   * @param {number} [retryCount=0]
   * @returns {Promise<Array<Object>>}
   */
  static async fetchChunkWithRetry(
    { growwSymbol, exchange, segment, startTime, endTime },
    retryCount = 0
  ) {
    try {
      // Ensure token is continuously valid across long runs
      const accessToken = await GrowwService.ensureValidToken();

      const raw = await MarketDataClient.getHistoricalCandles({
        accessToken,
        exchange,
        segment,
        growwSymbol,
        startTime,
        endTime,
        candleInterval: DEFAULT_TIMEFRAME
      });

      const rawCandles = raw?.payload?.candles || [];
      return rawCandles.map((c) => MarketDataFormatter.normalizeSingleCandle(c));
    } catch (err) {
      const isRetryable =
        err.statusCode === 429 ||
        (err.statusCode >= 500 && err.statusCode < 600) ||
        err.name === 'AbortError' ||
        err.message?.includes('fetch failed');

      if (isRetryable && retryCount < MAX_RETRIES) {
        const backoffMs = Math.pow(2, retryCount) * 1000 + Math.floor(Math.random() * 500);
        logger.warn(
          `Groww API error (HTTP ${err.statusCode || 'NET'}). Retrying chunk ${startTime} -> ${endTime} (Attempt ${retryCount + 1}/${MAX_RETRIES}) after ${backoffMs}ms...`
        );
        await this.sleep(backoffMs);
        return this.fetchChunkWithRetry(
          { growwSymbol, exchange, segment, startTime, endTime },
          retryCount + 1
        );
      }

      logger.error(`Failed to fetch chunk ${startTime} -> ${endTime} after ${retryCount} retries`, {
        error: err.message,
        statusCode: err.statusCode
      });
      throw err;
    }
  }

  /**
   * Downloads 5-year historical data for a single stock.
   *
   * @param {Object} stock - Stock definition
   * @param {Object} [options]
   * @param {Function} [options.onProgress] - Progress callback
   * @param {number} [options.throttleMs=250] - Request delay in ms
   * @returns {Promise<Object>} Summary statistics for this stock
   */
  static async downloadStock(stock, options = {}) {
    const { symbol, growwSymbol, exchange, segment } = stock;
    const throttleMs = options.throttleMs || DEFAULT_THROTTLE_MS;
    const monthChunks = this.generateMonthlyChunks();

    logger.info(`Starting download for ${symbol} (${monthChunks.length} months)...`);

    let totalCandles = 0;
    let totalDuplicates = 0;
    let totalInvalid = 0;
    let failedChunks = 0;
    let earliestCandle = null;
    let latestCandle = null;
    const allMissingIntervals = [];

    for (let i = 0; i < monthChunks.length; i++) {
      const { year, month, monthKey, parts } = monthChunks[i];

      // 1. Check if already completed (resumability)
      if (StorageManager.isMonthCompleted(symbol, year, month)) {
        const existingCandles = StorageManager.readMonthlyCandles(symbol, year, month) || [];
        totalCandles += existingCandles.length;
        if (existingCandles.length > 0) {
          if (!earliestCandle) earliestCandle = existingCandles[0].timestamp;
          latestCandle = existingCandles[existingCandles.length - 1].timestamp;
        }

        if (options.onProgress) {
          options.onProgress({
            symbol,
            monthIndex: i + 1,
            totalMonths: monthChunks.length,
            monthKey,
            skipped: true,
            totalCandles
          });
        }
        continue;
      }

      // 2. Download all parts for this month
      const monthCandles = [];
      let monthFetchFailed = false;

      for (const part of parts) {
        try {
          await this.sleep(throttleMs);
          const partCandles = await this.fetchChunkWithRetry({
            growwSymbol,
            exchange,
            segment,
            startTime: part.start,
            endTime: part.end
          });
          monthCandles.push(...partCandles);
        } catch (err) {
          monthFetchFailed = true;
          failedChunks++;
          logger.error(`Error downloading ${symbol} part ${part.start}: ${err.message}`);
          break;
        }
      }

      if (monthFetchFailed) {
        logger.error(`Skipping month ${monthKey} for ${symbol} due to API fetch failures`);
        continue;
      }

      // 3. Data Integrity & Deduplication
      const { cleanedCandles, duplicatesCount, invalidCount } =
        IntegrityValidator.processAndValidateCandles(monthCandles, symbol);

      totalDuplicates += duplicatesCount;
      totalInvalid += invalidCount;
      totalCandles += cleanedCandles.length;

      if (cleanedCandles.length > 0) {
        if (!earliestCandle) earliestCandle = cleanedCandles[0].timestamp;
        latestCandle = cleanedCandles[cleanedCandles.length - 1].timestamp;
      }

      // 4. Missing Interval Detection
      const missing = IntegrityValidator.detectMissingIntervals(cleanedCandles);
      if (missing.length > 0) {
        allMissingIntervals.push(...missing);
      }

      // 5. Save to local monthly CSV
      StorageManager.saveMonthlyCandles(symbol, year, month, cleanedCandles);

      // 6. Update Checkpoint
      StorageManager.updateCheckpoint(symbol, year, month, {
        candleCount: cleanedCandles.length,
        duplicatesCount,
        earliest: cleanedCandles[0]?.timestamp || null,
        latest: cleanedCandles[cleanedCandles.length - 1]?.timestamp || null
      });

      if (options.onProgress) {
        options.onProgress({
          symbol,
          monthIndex: i + 1,
          totalMonths: monthChunks.length,
          monthKey,
          skipped: false,
          monthCandles: cleanedCandles.length,
          totalCandles
        });
      }
    }

    const isComplete = failedChunks === 0;

    return {
      symbol,
      requestedPeriod: '2021-11-08 to 2026-11-06',
      actualEarliestCandle: earliestCandle,
      actualLatestCandle: latestCandle,
      totalDownloadedCandles: totalCandles,
      duplicateCandlesRemoved: totalDuplicates,
      invalidCandlesRejected: totalInvalid,
      missingCandleIntervalsCount: allMissingIntervals.length,
      failedApiRequests: failedChunks,
      downloadCompletionStatus: isComplete ? 'COMPLETED' : 'PARTIAL'
    };
  }

  /**
   * Orchestrates downloading for all 5 target stocks after Phase A validation.
   *
   * @param {Object} [options]
   * @param {Array<string>} [options.symbols] - Optional subset of symbols to download
   * @param {number} [options.throttleMs=250] - Request delay in ms
   * @returns {Promise<Object>} Master summary report
   */
  static async downloadAll(options = {}) {
    StorageManager.initStorage(TARGET_STOCKS.map((s) => s.symbol));

    // Phase A: Coverage Check
    const coverage = await this.validateCoverage();
    if (!coverage.success) {
      throw new Error(
        `Historical Coverage Validation failed: ${coverage.error}. Bulk download stopped.`
      );
    }

    const symbolsToDownload = options.symbols
      ? TARGET_STOCKS.filter((s) => options.symbols.includes(s.symbol))
      : TARGET_STOCKS;

    logger.info(`Starting 5-year historical download for ${symbolsToDownload.length} stocks...`);

    const stockReports = [];
    const startTime = Date.now();

    for (const stock of symbolsToDownload) {
      const report = await this.downloadStock(stock, {
        throttleMs: options.throttleMs,
        onProgress: (p) => {
          const pct = ((p.monthIndex / p.totalMonths) * 100).toFixed(1);
          const action = p.skipped ? 'Cached' : `+${p.monthCandles} candles`;
          console.log(`[${p.symbol}] [${p.monthIndex}/${p.totalMonths} - ${pct}%] ${p.monthKey}: ${action} (Total: ${p.totalCandles})`);
        }
      });
      stockReports.push(report);
    }

    const elapsedSeconds = Math.round((Date.now() - startTime) / 1000);

    const masterSummary = {
      generatedAt: new Date().toISOString(),
      timeframe: DEFAULT_TIMEFRAME,
      coverageValidation: coverage,
      elapsedSeconds,
      stocks: stockReports
    };

    StorageManager.saveSummaryReport(masterSummary);
    return masterSummary;
  }

  /**
   * Returns current downloader status and existing summary report.
   *
   * @returns {Object}
   */
  static getStatus() {
    const summary = StorageManager.loadSummaryReport();
    const checkpoint = StorageManager.loadCheckpoint();
    const completedMonthsCount = Object.keys(checkpoint).length;

    return {
      hasCompletedRun: Boolean(summary),
      completedMonthsCount,
      summary
    };
  }
}

module.exports = HistoricalDownloaderService;

