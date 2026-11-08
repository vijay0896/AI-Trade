/**
 * @file marketData.controller.js
 * @description HTTP Controller handling market data and historical candle requests.
 */

const MarketDataService = require('./marketData.service');
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
}

module.exports = MarketDataController;

