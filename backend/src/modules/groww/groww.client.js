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
   * Generic authorized GET request handler.
   *
   * @private
   * @param {string} url
   * @param {string} accessToken
   * @returns {Promise<Object>}
   */
  static async _authorizedGet(url, accessToken) {
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
          'X-API-VERSION': env.GROWW_API_VERSION
        }
      });

      const data = await response.json();

      if (!response.ok) {
        logger.warn(`Groww API GET [${url}] returned status ${response.status}`, data);
        throw new AppError(
          data.message || data.error || `Groww API error: ${response.statusText}`,
          response.status,
          data
        );
      }

      return data;
    } catch (err) {
      if (err instanceof AppError) throw err;
      logger.error(`Groww API Network Error on [${url}]:`, { error: err.message });
      throw new AppError(`Groww Service Error: ${err.message}`, 502);
    }
  }
}

module.exports = GrowwClient;

