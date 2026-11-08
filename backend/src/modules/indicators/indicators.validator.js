/**
 * @file indicators.validator.js
 * @description Session classification logic and numerical validation of technical indicator outputs.
 */

const { SESSION_TYPES, MUHURAT_DATES, DR_SPLIT_DATES } = require('./indicators.config');

class IndicatorsValidator {
  /**
   * Deterministically classifies a candle timestamp into its designated session type.
   *
   * @param {string} timestamp - ISO timestamp (YYYY-MM-DDTHH:mm:ss)
   * @returns {string} Session type identifier
   */
  static classifySession(timestamp) {
    if (!timestamp || typeof timestamp !== 'string') {
      return SESSION_TYPES.UNVERIFIED;
    }

    const [date, time] = timestamp.split('T');
    if (!date || !time) {
      return SESSION_TYPES.UNVERIFIED;
    }

    // 1. Scheduled Special Sessions
    if (MUHURAT_DATES.has(date)) {
      return SESSION_TYPES.MUHURAT_SPECIAL;
    }

    if (DR_SPLIT_DATES.has(date)) {
      return SESSION_TYPES.DR_SPLIT;
    }

    // 2. Post-Market & Closing Auction Boundaries
    if (time === '15:30:00') {
      return SESSION_TYPES.CLOSING_AUCTION;
    }

    if (time > '15:30:00') {
      return SESSION_TYPES.POST_MARKET;
    }

    // 3. Pre-Market discovery ticks (09:00 / 09:05)
    if (time < '09:15:00') {
      return SESSION_TYPES.UNVERIFIED;
    }

    // 4. Standard Continuous Trading Session (09:15:00 to 15:25:00)
    if (time >= '09:15:00' && time <= '15:25:00') {
      // September 26, 2025 anomaly after 14:45 is unverified
      if (date === '2025-09-26' && time > '14:45:00') {
        return SESSION_TYPES.UNVERIFIED;
      }
      return SESSION_TYPES.REGULAR;
    }

    return SESSION_TYPES.UNVERIFIED;
  }

  /**
   * Validates calculated indicator fields to guarantee numerical integrity (no NaN or Infinity).
   *
   * @param {Object} indicators - Indicator values for a single bar
   * @returns {{ isValid: boolean, error?: string }}
   */
  static validateOutputs(indicators) {
    const numericKeys = [
      'ema20',
      'ema50',
      'vwap',
      'atr14',
      'adx14',
      'plusDI14',
      'minusDI14',
      'choppiness14',
      'efficiencyRatio14',
      'volumeSMA20',
      'relativeVolume20'
    ];

    for (const key of numericKeys) {
      const val = indicators[key];
      if (val === null || val === undefined) {
        continue; // Warm-up state is valid
      }

      if (typeof val !== 'number' || isNaN(val) || !isFinite(val)) {
        return { isValid: false, error: `Invalid ${key}: ${val} (must be finite number or null)` };
      }

      // Range and positivity checks
      if (['ema20', 'ema50', 'vwap', 'atr14'].includes(key) && val <= 0) {
        return { isValid: false, error: `${key} must be strictly positive (> 0), received ${val}` };
      }

      if (['adx14', 'plusDI14', 'minusDI14', 'choppiness14'].includes(key) && (val < 0 || val > 100.01)) {
        return { isValid: false, error: `${key} out of [0, 100] bounds, received ${val}` };
      }

      if (key === 'efficiencyRatio14' && (val < 0 || val > 1.0001)) {
        return { isValid: false, error: `efficiencyRatio14 out of [0, 1] bounds, received ${val}` };
      }

      if (['volumeSMA20', 'relativeVolume20'].includes(key) && val < 0) {
        return { isValid: false, error: `${key} cannot be negative, received ${val}` };
      }
    }

    return { isValid: true };
  }
}

module.exports = IndicatorsValidator;

