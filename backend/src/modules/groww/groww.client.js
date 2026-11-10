/**
 * @file groww.client.js
 * @description Direct HTTP client layer for communicating with the official Groww Trading API v1.
 */

const env = require('../../config/env');
const logger = require('../../config/logger');
const { AppError } = require('../../core/utils/asyncHandler');

class GrowwClient {
  /**
   * Request access token using TOTP flow.
   *
   * @param {string} apiKey - Groww JWT API key
   * @param {string} totp - 6-digit TOTP code
   * @returns {Promise<Object>} Access token response
   */
  static async requestAccessToken(apiKey, totp) {
    const url = `${env.GROWW_API_BASE_URL}/v1/token/api/access`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          key_type: 'totp',
          totp
        })
      });

      const data = await response.json();

      if (!response.ok) {
        logger.error('Groww Token Error Response:', data);
        throw new AppError(
          data.message || data.error || 'Failed to authenticate with Groww API',
          response.status,
          data
        );
      }

      return data;
    } catch (err) {
      if (err instanceof AppError) throw err;
      logger.error('Groww Token Request Exception:', { error: err.message });
      throw new AppError(`Groww Connection Failed: ${err.message}`, 502);
    }
  }

  /**
   * Fetches user profile details from Groww.
   *
   * @param {string} accessToken
   * @returns {Promise<Object>} User details payload
   */
  static async getUserProfile(accessToken) {
    return this._authorizedGet(`${env.GROWW_API_BASE_URL}/v1/user/detail`, accessToken);
  }

  /**
   * Fetches funds and margins details.
   *
   * @param {string} accessToken
   * @returns {Promise<Object>} Margins payload
   */
  static async getMargins(accessToken) {
    return this._authorizedGet(`${env.GROWW_API_BASE_URL}/v1/margins/detail/user`, accessToken);
  }

  /**
   * Fetches demat holdings.
   *
   * @param {string} accessToken
   * @returns {Promise<Object>} Holdings payload
   */
  static async getHoldings(accessToken) {
    return this._authorizedGet(`${env.GROWW_API_BASE_URL}/v1/holdings/user`, accessToken);
  }

  /**
   * Fetches current open positions.
   *
   * @param {string} accessToken
   * @returns {Promise<Object>} Positions payload
   */
  static async getPositions(accessToken) {
    return this._authorizedGet(`${env.GROWW_API_BASE_URL}/v1/positions/user`, accessToken);
  }

  /**
   * Fetches historical candles from Groww API.
   * Supports 15m and Daily intervals with flexible parameters.
   *
   * @param {Object} params
   * @param {string} params.growwSymbol - e.g. 'NSE-TATAMOTORS'
   * @param {string} [params.exchange='NSE']
   * @param {string} [params.segment='CASH']
   * @param {string} params.startTime - 'YYYY-MM-DD HH:mm:ss'
   * @param {string} params.endTime - 'YYYY-MM-DD HH:mm:ss'
   * @param {string|number} [params.candleInterval='15minute'] - '15minute' or '1day' or interval in minutes (15, 1440)
   * @param {string} accessToken
   * @returns {Promise<Object>}
   */
  static async getHistoricalCandles(params, accessToken) {
    let intervalStr = params.candleInterval || '15minute';
    if (params.interval_in_minutes === 1440 || intervalStr === '1440' || intervalStr === '1day' || intervalStr === 'daily') {
      intervalStr = '1day';
    } else if (params.interval_in_minutes === 15 || intervalStr === '15' || intervalStr === '15m') {
      intervalStr = '15minute';
    }

    const growwSymbol = params.growwSymbol || (params.tradingSymbol ? `${params.exchange || 'NSE'}-${params.tradingSymbol}` : 'NSE-ICICIBANK');
    const exchange = params.exchange || 'NSE';
    const segment = params.segment || 'CASH';

    const queryParams = new URLSearchParams({
      exchange,
      segment,
      groww_symbol: growwSymbol,
      start_time: params.startTime,
      end_time: params.endTime,
      candle_interval: intervalStr
    });

    const url = `${env.GROWW_API_BASE_URL}/v1/historical/candles?${queryParams.toString()}`;

    try {
      return await this._authorizedGet(url, accessToken);
    } catch (err) {
      logger.warn(`Groww getHistoricalCandles primary API failed for ${growwSymbol} [${intervalStr}]: ${err.message}. Trying range endpoint fallback...`);
      // Try /v1/historical/candle/range endpoint format as requested
      const tradingSymbol = growwSymbol.replace(/^(NSE|BSE)-/, '');
      const rangeParams = new URLSearchParams({
        exchange,
        segment,
        trading_symbol: tradingSymbol,
        interval_in_minutes: intervalStr === '1day' ? '1440' : '15',
        start_time: params.startTime,
        end_time: params.endTime
      });
      const rangeUrl = `${env.GROWW_API_BASE_URL}/v1/historical/candle/range?${rangeParams.toString()}`;
      try {
        return await this._authorizedGet(rangeUrl, accessToken);
      } catch (rangeErr) {
        throw err;
      }
    }
  }

  /**
   * Generic authorized GET request handler with automatic 429 rate-limit backoff & retry.
   *
   * @private
   * @param {string} url
   * @param {string} accessToken
   * @param {number} [retries=3]
   * @param {number} [backoffMs=1500]
   * @returns {Promise<Object>}
   */
  static async _authorizedGet(url, accessToken, retries = 3, backoffMs = 1500) {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/json',
            'X-API-VERSION': env.GROWW_API_VERSION
          }
        });

        // Handle 429 Rate Limit with exponential backoff retry
        if (response.status === 429) {
          const retryAfterHeader = response.headers.get('retry-after');
          const retryAfterSec = retryAfterHeader ? parseInt(retryAfterHeader, 10) : NaN;
          const waitMs = !isNaN(retryAfterSec) && retryAfterSec > 0
            ? retryAfterSec * 1000
            : backoffMs * attempt;

          if (attempt < retries) {
            logger.warn(`Groww API 429 Rate Limit hit on [${url}]. Backing off for ${waitMs}ms (retry ${attempt}/${retries})...`);
            await new Promise((resolve) => setTimeout(resolve, waitMs));
            continue;
          }
        }

        let data;
        try {
          data = await response.json();
        } catch {
          data = null;
        }

        if (!response.ok) {
          logger.warn(`Groww API GET [${url}] returned status ${response.status}`, data);
          const errMsg = data?.error?.message || data?.message || `Groww API error: ${response.statusText}`;
          throw new AppError(errMsg, response.status, data);
        }

        return data;
      } catch (err) {
        if (err instanceof AppError) {
          // If 429 exhausted all retries or other HTTP client error, throw it
          throw err;
        }
        if (attempt < retries) {
          logger.warn(`Groww API Network Error on [${url}]: ${err.message}. Retrying in ${backoffMs * attempt}ms...`);
          await new Promise((resolve) => setTimeout(resolve, backoffMs * attempt));
          continue;
        }
        logger.error(`Groww API Network Error on [${url}]:`, { error: err.message });
        throw new AppError(`Groww Service Error: ${err.message}`, 502);
      }
    }
  }

    /**
   * Fetches live market quote for an instrument (with auto-fallback).
   *
   * @param {string} accessToken
   * @param {string} exchange
   * @param {string} tradingSymbol
   * @returns {Promise<Object>}
   */
  static async getLiveQuote(accessToken, exchange = 'NSE', tradingSymbol) {
    const url = `${env.GROWW_API_BASE_URL}/v1/live-data/quote?exchange=${exchange}&segment=CASH&trading_symbol=${tradingSymbol}`;
    try {
      return await this._authorizedGet(url, accessToken);
    } catch (err) {
      // Fallback to real-time NSE quote if Groww plan does not have Live Data permission (403)
      return await this.getFallbackLiveQuote(tradingSymbol);
    }
  }

  /**
   * Real-time live market fallback quote.
   */
  static async getFallbackLiveQuote(tradingSymbol) {
    try {
      const symbol = `${tradingSymbol}.NS`;
      const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d`);
      const json = await res.json();
      const meta = json.chart?.result?.[0]?.meta;
      if (meta && meta.regularMarketPrice) {
        const ltp = Number(meta.regularMarketPrice);
        const prevClose = Number(meta.chartPreviousClose || meta.previousClose || ltp);
        const dayChange = ltp - prevClose;
        const dayChangePerc = prevClose ? (dayChange / prevClose) * 100 : 0;
        return {
          status: 'SUCCESS',
          payload: {
            last_price: ltp,
            day_change: Math.round(dayChange * 100) / 100,
            day_change_perc: Math.round(dayChangePerc * 100) / 100
          }
        };
      }
    } catch (e) {
      logger.error(`Fallback quote error for ${tradingSymbol}: ${e.message}`);
    }
    return null;
  }
}

module.exports = GrowwClient;

