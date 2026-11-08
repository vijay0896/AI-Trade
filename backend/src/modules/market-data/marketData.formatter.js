/**
 * @file marketData.formatter.js
 * @description Normalization and presentation formatting layer for historical candle data.
 */

const { AppError } = require('../../core/utils/asyncHandler');

class MarketDataFormatter {
  /**
   * Normalizes raw timestamp value into standard ISO string (YYYY-MM-DDTHH:mm:ss).
   *
   * @param {number|string} rawTimestamp - Epoch seconds, epoch milliseconds, or date string
   * @returns {string} Formatted timestamp
   */
  static formatTimestamp(rawTimestamp) {
    if (!rawTimestamp) return '';

    let date;
    if (typeof rawTimestamp === 'number') {
      // If seconds (10 digits), convert to ms; if already ms (13 digits), use directly
      date = new Date(rawTimestamp > 1e11 ? rawTimestamp : rawTimestamp * 1000);
    } else if (typeof rawTimestamp === 'string') {
      // If numeric string
      if (/^\d+$/.test(rawTimestamp)) {
        const num = Number(rawTimestamp);
        date = new Date(num > 1e11 ? num : num * 1000);
      } else {
        // e.g., '2026-11-06 09:15:00' -> '2026-11-06T09:15:00'
        return rawTimestamp.replace(' ', 'T').slice(0, 19);
      }
    } else {
      date = new Date(rawTimestamp);
    }

    if (isNaN(date.getTime())) {
      return String(rawTimestamp);
    }

    // Return YYYY-MM-DDTHH:mm:ss
    const pad = (n) => String(n).padStart(2, '0');
    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    const seconds = pad(date.getSeconds());

    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
  }

  /**
   * Normalizes raw candle array or object into strict normalized OHLCV schema.
   *
   * @param {Array|Object} rawCandle
   * @returns {Object} Normalized candle
   */
  static normalizeSingleCandle(rawCandle) {
    // Array format: [timestamp, open, high, low, close, volume, (optional oi)]
    if (Array.isArray(rawCandle)) {
      return {
        timestamp: this.formatTimestamp(rawCandle[0]),
        open: Number(rawCandle[1] ?? 0),
        high: Number(rawCandle[2] ?? 0),
        low: Number(rawCandle[3] ?? 0),
        close: Number(rawCandle[4] ?? 0),
        volume: Number(rawCandle[5] ?? 0)
      };
    }

    // Object format: { timestamp, open, high, low, close, volume }
    if (typeof rawCandle === 'object' && rawCandle !== null) {
      return {
        timestamp: this.formatTimestamp(
          rawCandle.timestamp || rawCandle.time || rawCandle.date
        ),
        open: Number(rawCandle.open ?? 0),
        high: Number(rawCandle.high ?? 0),
        low: Number(rawCandle.low ?? 0),
        close: Number(rawCandle.close ?? 0),
        volume: Number(rawCandle.volume ?? rawCandle.vol ?? 0)
      };
    }

    throw new AppError('Invalid candle data type encountered during normalization', 500);
  }

  /**
   * Normalizes, deduplicates, and validates full historical candles API response.
   *
   * @param {Object} rawResponse - Raw API response from Groww
   * @param {Object} metadata - Query metadata (symbol, interval, requested range)
   * @returns {Object} Normalized response payload
   */
  static formatCandlesResponse(rawResponse, metadata = {}) {
    const payload = rawResponse?.payload || rawResponse;

    if (!payload) {
      throw new AppError('Groww response payload is missing or empty', 502);
    }

    const rawCandles = payload.candles || payload.candle_data || [];

    if (!Array.isArray(rawCandles)) {
      throw new AppError('Invalid candle structure: expected array of candles', 502);
    }

    if (rawCandles.length === 0) {
      return {
        symbol: metadata.growwSymbol || 'NSE-ICICIBANK',
        candleInterval: metadata.candleInterval || '5minute',
        startTime: metadata.startTime || null,
        endTime: metadata.endTime || null,
        candleCount: 0,
        candles: []
      };
    }

    // 1. Normalize individual candles
    const normalizedCandles = rawCandles.map((c) => this.normalizeSingleCandle(c));

    // 2. Sort chronologically
    normalizedCandles.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    // 3. Deduplicate by timestamp
    const seenTimestamps = new Set();
    const uniqueCandles = [];

    for (const candle of normalizedCandles) {
      if (!seenTimestamps.has(candle.timestamp)) {
        seenTimestamps.add(candle.timestamp);
        uniqueCandles.push(candle);
      }
    }

    return {
      symbol: metadata.growwSymbol || 'NSE-ICICIBANK',
      candleInterval: metadata.candleInterval || '5minute',
      startTime: metadata.startTime || uniqueCandles[0]?.timestamp,
      endTime: metadata.endTime || uniqueCandles[uniqueCandles.length - 1]?.timestamp,
      candleCount: uniqueCandles.length,
      candles: uniqueCandles
    };
  }
}

module.exports = MarketDataFormatter;

