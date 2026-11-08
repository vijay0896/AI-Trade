/**
 * @file marketData.service.js
 * @description Business logic layer for Market Data operations and Groww Historical Candle API.
 */

const GrowwService = require('../groww/groww.service');
const MarketDataClient = require('./marketData.client');
const MarketDataFormatter = require('./marketData.formatter');
const { AppError } = require('../../core/utils/asyncHandler');
const logger = require('../../config/logger');

// Supported instruments for Task 1
const SUPPORTED_SYMBOLS = ['ICICIBANK', 'NSE-ICICIBANK'];
const OFFICIAL_GROWW_SYMBOL = 'NSE-ICICIBANK';

class MarketDataService {
  /**
   * Fetches, validates, and normalizes 5-minute historical candles for ICICIBANK.
   *
   * @param {Object} options
   * @param {string} [options.symbol='ICICIBANK'] - Ticker symbol (ICICIBANK only)
   * @param {string} [options.exchange='NSE'] - Stock exchange
   * @param {string} [options.segment='CASH'] - Market segment
   * @param {string} [options.startTime='2026-11-06 09:15:00'] - Start datetime (YYYY-MM-DD HH:mm:ss)
   * @param {string} [options.endTime='2026-11-06 15:30:00'] - End datetime (YYYY-MM-DD HH:mm:ss)
   * @param {string} [options.candleInterval='5minute'] - Timeframe interval (5minute only)
   * @returns {Promise<Object>} Normalized historical candle dataset
   */
  static async getHistoricalCandles({
    symbol = 'ICICIBANK',
    exchange = 'NSE',
    segment = 'CASH',
    startTime = '2026-11-06 09:15:00',
    endTime = '2026-11-06 15:30:00',
    candleInterval = '5minute'
  } = {}) {
    // 1. Strict Scope Validation: Support ICICIBANK only for Task 1
    const normalizedSymbol = String(symbol).trim().toUpperCase();
    if (!SUPPORTED_SYMBOLS.includes(normalizedSymbol)) {
      throw new AppError(
        `Invalid symbol '${symbol}'. For this task, only ICICIBANK is supported.`,
        400
      );
    }

    // 2. Interval Validation: Support 5minute only for Task 1
    if (candleInterval !== '5minute') {
      throw new AppError(
        `Invalid candle interval '${candleInterval}'. Supported interval for this task is '5minute'.`,
        400
      );
    }

    // 3. Date Range Validation
    const startDate = new Date(startTime);
    const endDate = new Date(endTime);

    if (isNaN(startDate.getTime())) {
      throw new AppError(
        `Invalid start_time format: '${startTime}'. Expected format: YYYY-MM-DD HH:mm:ss`,
        400
      );
    }

    if (isNaN(endDate.getTime())) {
      throw new AppError(
        `Invalid end_time format: '${endTime}'. Expected format: YYYY-MM-DD HH:mm:ss`,
        400
      );
    }

    if (startDate.getTime() >= endDate.getTime()) {
      throw new AppError('start_time must be chronologically earlier than end_time', 400);
    }

    // 4. Reuse existing Groww authentication & session token
    const accessToken = await GrowwService.ensureValidToken();

    // 5. Query Groww Official Historical Candles API
    logger.info('Querying Groww Historical Candle API', {
      growwSymbol: OFFICIAL_GROWW_SYMBOL,
      interval: candleInterval,
      startTime,
      endTime
    });

    const rawResponse = await MarketDataClient.getHistoricalCandles({
      accessToken,
      exchange,
      segment,
      growwSymbol: OFFICIAL_GROWW_SYMBOL,
      startTime,
      endTime,
      candleInterval
    });

    // 6. Normalize and format response
    const formattedData = MarketDataFormatter.formatCandlesResponse(rawResponse, {
      growwSymbol: OFFICIAL_GROWW_SYMBOL,
      candleInterval,
      startTime,
      endTime
    });

    // 7. Check for empty candle response
    if (formattedData.candleCount === 0) {
      logger.warn('Groww returned 0 historical candles for specified range', {
        symbol: OFFICIAL_GROWW_SYMBOL,
        startTime,
        endTime
      });
    }

    return formattedData;
  }
}

module.exports = MarketDataService;

