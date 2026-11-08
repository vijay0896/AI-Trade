/**
 * @file integrityValidator.js
 * @description Data integrity validation, deduplication, chronological sorting,
 * and missing candle detection for historical market data.
 */

class IntegrityValidator {
  /**
   * Validates a single candle against strict OHLC and volume constraints.
   *
   * @param {Object} candle
   * @param {string} candle.timestamp - ISO timestamp string (YYYY-MM-DDTHH:mm:ss)
   * @param {number} candle.open - Open price
   * @param {number} candle.high - High price
   * @param {number} candle.low - Low price
   * @param {number} candle.close - Close price
   * @param {number} candle.volume - Traded volume
   * @returns {{ isValid: boolean, error?: string }}
   */
  static validateCandle(candle) {
    if (!candle.timestamp || typeof candle.timestamp !== 'string') {
      return { isValid: false, error: 'Missing or invalid timestamp' };
    }

    const { open, high, low, close, volume } = candle;

    if (
      typeof open !== 'number' ||
      typeof high !== 'number' ||
      typeof low !== 'number' ||
      typeof close !== 'number' ||
      typeof volume !== 'number'
    ) {
      return { isValid: false, error: 'Non-numeric OHLCV value' };
    }

    if (open <= 0 || high <= 0 || low <= 0 || close <= 0) {
      return { isValid: false, error: 'OHLC price must be strictly positive (> 0)' };
    }

    if (volume < 0) {
      return { isValid: false, error: 'Volume must be non-negative (>= 0)' };
    }

    // High must be >= max(open, close), Low must be <= min(open, close)
    // Small epsilon (0.01) to account for floating point representations
    const maxOC = Math.max(open, close) - 0.01;
    const minOC = Math.min(open, close) + 0.01;

    if (high < maxOC) {
      return { isValid: false, error: `High (${high}) is less than max(open, close) (${maxOC})` };
    }

    if (low > minOC) {
      return { isValid: false, error: `Low (${low}) is greater than min(open, close) (${minOC})` };
    }

    return { isValid: true };
  }

  /**
   * Cleans, validates, deduplicates, and chronologically sorts candle records.
   *
   * @param {Array<Object>} rawCandles - Array of candle objects
   * @param {string} symbol - Trading symbol (e.g. 'ICICIBANK')
   * @returns {{
   *   cleanedCandles: Array<Object>,
   *   duplicatesCount: number,
   *   invalidCount: number,
   *   errors: Array<string>
   * }}
   */
  static processAndValidateCandles(rawCandles, symbol) {
    if (!Array.isArray(rawCandles)) {
      return { cleanedCandles: [], duplicatesCount: 0, invalidCount: 0, errors: ['Input is not an array'] };
    }

    const seenTimestamps = new Set();
    const validCandles = [];
    let duplicatesCount = 0;
    let invalidCount = 0;
    const errors = [];

    for (const c of rawCandles) {
      const validation = this.validateCandle(c);
      if (!validation.isValid) {
        invalidCount++;
        errors.push(`[${c.timestamp || 'UNKNOWN'}] ${validation.error}`);
        continue;
      }

      if (seenTimestamps.has(c.timestamp)) {
        duplicatesCount++;
        continue;
      }

      seenTimestamps.add(c.timestamp);
      validCandles.push({
        timestamp: c.timestamp,
        symbol,
        open: Number(c.open.toFixed(2)),
        high: Number(c.high.toFixed(2)),
        low: Number(c.low.toFixed(2)),
        close: Number(c.close.toFixed(2)),
        volume: Math.round(c.volume)
      });
    }

    // Chronological sorting (ascending)
    validCandles.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    return {
      cleanedCandles: validCandles,
      duplicatesCount,
      invalidCount,
      errors
    };
  }

  /**
   * Detects missing 5-minute candle intervals during active trading sessions.
   * Compares consecutive candles on the same trading day (expected interval: 5 minutes / 300,000ms).
   *
   * @param {Array<Object>} sortedCandles - Sorted candles array
   * @returns {Array<{ expectedTime: string, previousTime: string, nextTime: string, gapMinutes: number }>}
   */
  static detectMissingIntervals(sortedCandles) {
    const missingIntervals = [];
    if (!sortedCandles || sortedCandles.length < 2) return missingIntervals;

    for (let i = 0; i < sortedCandles.length - 1; i++) {
      const current = sortedCandles[i];
      const next = sortedCandles[i + 1];

      const currentDate = current.timestamp.split('T')[0];
      const nextDate = next.timestamp.split('T')[0];

      // Only check gaps within the SAME trading day
      if (currentDate === nextDate) {
        const currentTime = new Date(current.timestamp).getTime();
        const nextTime = new Date(next.timestamp).getTime();
        const diffMinutes = (nextTime - currentTime) / (60 * 1000);

        if (diffMinutes > 5) {
          missingIntervals.push({
            date: currentDate,
            previousTime: current.timestamp,
            nextTime: next.timestamp,
            gapMinutes: diffMinutes,
            missingCandlesCount: Math.round(diffMinutes / 5) - 1
          });
        }
      }
    }

    return missingIntervals;
  }
}

module.exports = IntegrityValidator;

