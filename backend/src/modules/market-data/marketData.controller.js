/**
 * @file marketData.controller.js
 * @description HTTP Controller handling market data and historical candle requests.
 */

const MarketDataService = require('./marketData.service');
const HistoricalDownloaderService = require('./downloader/historicalDownloader.service');
const { ApiResponse } = require('../../core/utils/response.utils');
const { asyncHandler } = require('../../core/utils/asyncHandler');

class MarketDataController {
  /**
   * @route GET /api/v1/market-data/historical-candles
   * @description Fetches normalized 5-minute historical OHLCV candles for ICICIBANK from Groww API
   * @access Authenticated (Server Token)
   */
  static getHistoricalCandles = asyncHandler(async (req, res) => {
    const {
      symbol = 'ICICIBANK',
      exchange = 'NSE',
      segment = 'CASH',
      start_time = '2026-11-06 09:15:00',
      end_time = '2026-11-06 15:30:00',
      candle_interval = '5minute'
    } = req.query;

    const data = await MarketDataService.getHistoricalCandles({
      symbol,
      exchange,
      segment,
      startTime: start_time,
      endTime: end_time,
      candleInterval: candle_interval
    });

    return ApiResponse.success(res, {
      message: 'Historical candles fetched successfully',
      data
    });
  });

  /**
   * @route GET /api/v1/market-data/historical-coverage
   * @description Validates whether historical 5-minute data exists back to November 2021
   */
  static validateCoverage = asyncHandler(async (req, res) => {
    const result = await HistoricalDownloaderService.validateCoverage();
    return ApiResponse.success(res, {
      message: result.success
        ? 'Groww 5-year historical data coverage verified'
        : 'Groww historical data coverage verification failed',
      data: result
    });
  });

  /**
   * @route GET /api/v1/market-data/downloader-status
   * @description Returns 5-year downloader checkpoint and completion summary
   */
  static getDownloaderStatus = asyncHandler(async (req, res) => {
    const status = HistoricalDownloaderService.getStatus();
    return ApiResponse.success(res, {
      message: 'Downloader status retrieved successfully',
      data: status
    });
  });
}

module.exports = MarketDataController;

