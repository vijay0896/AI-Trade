/**
 * @file marketData.client.js
 * @description HTTP client for communicating with the Groww Historical Candle API v1.
 */

const env = require('../../config/env');
const logger = require('../../config/logger');
const { AppError } = require('../../core/utils/asyncHandler');

class MarketDataClient {
  /**
   * Fetches historical candles from the official Groww API.
   *
   * @param {Object} params - Query parameters for historical candles
   * @param {string} params.accessToken - Valid Groww daily Bearer token
   * @param {string} [params.exchange='NSE'] - Stock exchange (NSE/BSE)
   * @param {string} [params.segment='CASH'] - Market segment (CASH/FNO)
   * @param {string} params.growwSymbol - Unique Groww instrument symbol (e.g. 'NSE-ICICIBANK')
   * @param {string} params.startTime - Start datetime (YYYY-MM-DD HH:mm:ss)
   * @param {string} params.endTime - End datetime (YYYY-MM-DD HH:mm:ss)
   * @param {string} [params.candleInterval='5minute'] - Timeframe interval
   * @param {number} [timeoutMs=10000] - Request timeout in milliseconds
   * @returns {Promise<Object>} Raw API response payload
   */
  static async getHistoricalCandles(
    {
      accessToken,
      exchange = 'NSE',
      segment = 'CASH',
      growwSymbol,
      startTime,
      endTime,
      candleInterval = '5minute'
    },
    timeoutMs = 10000
  ) {
    if (!accessToken) {
      throw new AppError('Groww Access Token is required to fetch historical candles', 401);
    }

    const queryParams = new URLSearchParams({
      exchange,
      segment,
      groww_symbol: growwSymbol,
      start_time: startTime,
      end_time: endTime,
      candle_interval: candleInterval
    });

    const url = `${env.GROWW_API_BASE_URL}/v1/historical/candles?${queryParams.toString()}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      logger.info('Fetching Groww historical candles...', {
        symbol: growwSymbol,
        interval: candleInterval,
        startTime,
        endTime
      });

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
          'X-API-VERSION': env.GROWW_API_VERSION
        },
        signal: controller.signal
      });

      clearTimeout(timeout);

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        if (response.status === 401) {
          logger.warn('Groww Historical API 401: Unauthorized / Token Expired');
          throw new AppError(
            'Groww session expired or unauthorized. Please re-authenticate.',
            401,
            data
          );
        }

        if (response.status === 403) {
          logger.warn('Groww Historical API 403: Forbidden / Permission Denied');
          throw new AppError(
            'Groww Historical Candle API access forbidden (HTTP 403): Your Groww API account does not have permissions for historical/backtesting data. Please verify your Trading API subscription.',
            403,
            data
          );
        }

        const errorMessage =
          data?.error?.message ||
          data?.message ||
          `Groww API returned HTTP ${response.status} (${response.statusText})`;

        logger.error('Groww Historical API HTTP Error:', {
          status: response.status,
          message: errorMessage
        });

        throw new AppError(errorMessage, response.status, data);
      }

      if (!data) {
        throw new AppError('Received empty or invalid JSON response from Groww API', 502);
      }

      return data;
    } catch (err) {
      clearTimeout(timeout);

      if (err instanceof AppError) {
        throw err;
      }

      if (err.name === 'AbortError') {
        logger.error('Groww Historical API request timed out', { timeoutMs });
        throw new AppError(`Groww Historical API request timed out after ${timeoutMs}ms`, 504);
      }

      logger.error('Groww Historical API network error:', { error: err.message });
      throw new AppError(`Groww Historical API Network Failure: ${err.message}`, 502);
    }
  }
}

module.exports = MarketDataClient;

