/**
 * @file groww.service.js
 * @description Business Logic Layer coordinating Groww API connection, token lifecycle, and account data retrieval.
 */

const env = require('../../config/env');
const logger = require('../../config/logger');
const { generateTOTP } = require('../../core/utils/totp.utils');
const GrowwClient = require('./groww.client');
const GrowwFormatter = require('./groww.formatter');

class GrowwService {
  /**
   * In-memory cache for active broker session
   * @private
   */
  static #session = {
    token: null,
    expiry: null,
    tokenRefId: null,
    sessionName: null,
    active: false,
    lastConnectedAt: null
  };

  /**
   * Connects to Groww using TOTP sign-in method.
   * Generates a 6-digit TOTP code and exchanges it for a daily access token.
   *
   * @returns {Promise<Object>} Formatted session details
   */
  static async connect() {
    logger.info('Initiating Groww TOTP connection...');

    // 1. Generate current 6-digit TOTP using TOTPQR base32 secret
    const totpCode = generateTOTP(env.TOTPQR);

    // 2. Request access token from Groww API
    const response = await GrowwClient.requestAccessToken(env.TOTP, totpCode);

    // 3. Cache session data
    this.#session = {
      token: response.token,
      expiry: response.expiry,
      tokenRefId: response.tokenRefId,
      sessionName: response.sessionName,
      active: response.active ?? true,
      lastConnectedAt: new Date().toISOString()
    };

    logger.info('Groww session established successfully', {
      sessionName: this.#session.sessionName,
      expiry: this.#session.expiry
    });

    return GrowwFormatter.formatSession(this.#session);
  }

  /**
   * Ensures a valid, unexpired token exists; auto-connects if necessary.
   *
   * @returns {Promise<string>} Valid access token
   */
  static async ensureValidToken() {
    const isExpired =
      !this.#session.token ||
      !this.#session.expiry ||
      new Date(this.#session.expiry).getTime() <= Date.now() + 60000;

    if (isExpired) {
      logger.info('Access token missing or expiring soon. Refreshing connection...');
      await this.connect();
    }

    return this.#session.token;
  }

  /**
   * Gets current connection and session status.
   *
   * @returns {Object} Session status info
   */
  static getStatus() {
    return GrowwFormatter.formatSession(this.#session);
  }

  /**
   * Fetches user profile details.
   *
   * @returns {Promise<Object>} Formatted profile details
   */
  static async getProfile() {
    const token = await this.ensureValidToken();
    const rawProfile = await GrowwClient.getUserProfile(token);
    return GrowwFormatter.formatProfile(rawProfile);
  }

  /**
   * Fetches account funds and margin balances.
   *
   * @returns {Promise<Object>} Formatted funds details
   */
  static async getFunds() {
    const token = await this.ensureValidToken();
    const rawMargins = await GrowwClient.getMargins(token);
    return GrowwFormatter.formatFunds(rawMargins);
  }

  /**
   * Fetches user Demat holdings.
   *
   * @returns {Promise<Object>} Formatted holdings data
   */
  static async getHoldings() {
    const token = await this.ensureValidToken();
    const rawHoldings = await GrowwClient.getHoldings(token);
    return GrowwFormatter.formatHoldings(rawHoldings);
  }

  /**
   * Fetches open positions.
   *
   * @returns {Promise<Object>} Formatted positions data
   */
  static async getPositions() {
    const token = await this.ensureValidToken();
    const rawPositions = await GrowwClient.getPositions(token);
    return GrowwFormatter.formatPositions(rawPositions);
  }
}

module.exports = GrowwService;

