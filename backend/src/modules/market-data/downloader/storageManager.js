/**
 * @file storageManager.js
 * @description Local filesystem storage manager for historical OHLCV CSV files and checkpoints.
 */

const fs = require('fs');
const path = require('path');
const logger = require('../../../config/logger');

// Base historical data directory
const BASE_STORAGE_DIR = path.resolve(__dirname, '../../../../storage/historical-data');
const CHECKPOINT_FILE = path.join(BASE_STORAGE_DIR, '.checkpoint.json');
const SUMMARY_REPORT_FILE = path.join(BASE_STORAGE_DIR, 'download_summary.json');

class StorageManager {
  /**
   * Initializes storage directories for all target symbols.
   *
   * @param {Array<string>} symbols - List of stock symbols
   */
  static initStorage(symbols = []) {
    if (!fs.existsSync(BASE_STORAGE_DIR)) {
      fs.mkdirSync(BASE_STORAGE_DIR, { recursive: true });
    }

    for (const sym of symbols) {
      const symDir = path.join(BASE_STORAGE_DIR, sym);
      if (!fs.existsSync(symDir)) {
        fs.mkdirSync(symDir, { recursive: true });
      }
    }
  }

  /**
   * Resolves the full path for a monthly CSV file.
   *
   * @param {string} symbol - Stock symbol
   * @param {number|string} year - 4-digit year (e.g. 2021)
   * @param {number|string} month - 2-digit month (01-12)
   * @returns {string} Absolute file path
   */
  static getMonthFilePath(symbol, year, month) {
    const paddedMonth = String(month).padStart(2, '0');
    const yearDir = path.join(BASE_STORAGE_DIR, symbol, String(year));
    if (!fs.existsSync(yearDir)) {
      fs.mkdirSync(yearDir, { recursive: true });
    }
    return path.join(yearDir, `${symbol}_${year}_${paddedMonth}.csv`);
  }

  /**
   * Writes candles into monthly CSV file with header:
   * timestamp,symbol,open,high,low,close,volume
   *
   * @param {string} symbol - Stock symbol
   * @param {number|string} year - 4-digit year
   * @param {number|string} month - 2-digit month
   * @param {Array<Object>} candles - Cleaned, sorted candles
   */
  static saveMonthlyCandles(symbol, year, month, candles) {
    const filePath = this.getMonthFilePath(symbol, year, month);
    const header = 'timestamp,symbol,open,high,low,close,volume\n';
    const rows = candles.map(
      (c) => `${c.timestamp},${c.symbol},${c.open},${c.high},${c.low},${c.close},${c.volume}`
    ).join('\n');

    fs.writeFileSync(filePath, header + rows + '\n', 'utf8');
    logger.info(`Saved ${candles.length} candles to ${path.relative(BASE_STORAGE_DIR, filePath)}`);
  }

  /**
   * Reads existing monthly CSV file if present.
   *
   * @param {string} symbol
   * @param {number|string} year
   * @param {number|string} month
   * @returns {Array<Object>|null}
   */
  static readMonthlyCandles(symbol, year, month) {
    const filePath = this.getMonthFilePath(symbol, year, month);
    if (!fs.existsSync(filePath)) return null;

    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.trim().split('\n');
    if (lines.length <= 1) return [];

    const candles = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const [timestamp, sym, open, high, low, close, volume] = line.split(',');
      candles.push({
        timestamp,
        symbol: sym,
        open: Number(open),
        high: Number(high),
        low: Number(low),
        close: Number(close),
        volume: Number(volume)
      });
    }
    return candles;
  }

  /**
   * Checks whether a specific month has already been completely downloaded.
   *
   * @param {string} symbol
   * @param {number|string} year
   * @param {number|string} month
   * @returns {boolean}
   */
  static isMonthCompleted(symbol, year, month) {
    const checkpoint = this.loadCheckpoint();
    const key = `${symbol}_${year}_${String(month).padStart(2, '0')}`;
    const status = checkpoint[key];
    if (status && status.completed) {
      // Also verify file exists on disk
      const filePath = this.getMonthFilePath(symbol, year, month);
      return fs.existsSync(filePath);
    }
    return false;
  }

  /**
   * Loads the current checkpoint tracker.
   *
   * @returns {Object}
   */
  static loadCheckpoint() {
    if (!fs.existsSync(CHECKPOINT_FILE)) return {};
    try {
      const raw = fs.readFileSync(CHECKPOINT_FILE, 'utf8');
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }

  /**
   * Updates checkpoint for a completed month chunk.
   *
   * @param {string} symbol
   * @param {number|string} year
   * @param {number|string} month
   * @param {Object} stats
   */
  static updateCheckpoint(symbol, year, month, stats = {}) {
    const checkpoint = this.loadCheckpoint();
    const key = `${symbol}_${year}_${String(month).padStart(2, '0')}`;
    checkpoint[key] = {
      completed: true,
      timestamp: new Date().toISOString(),
      candleCount: stats.candleCount || 0,
      duplicatesCount: stats.duplicatesCount || 0,
      earliest: stats.earliest || null,
      latest: stats.latest || null
    };

    fs.writeFileSync(CHECKPOINT_FILE, JSON.stringify(checkpoint, null, 2), 'utf8');
  }

  /**
   * Saves the final download summary report.
   *
   * @param {Object} summary
   */
  static saveSummaryReport(summary) {
    if (!fs.existsSync(BASE_STORAGE_DIR)) {
      fs.mkdirSync(BASE_STORAGE_DIR, { recursive: true });
    }
    fs.writeFileSync(SUMMARY_REPORT_FILE, JSON.stringify(summary, null, 2), 'utf8');
    logger.info(`Summary report saved to ${SUMMARY_REPORT_FILE}`);
  }

  /**
   * Loads the existing download summary report if available.
   *
   * @returns {Object|null}
   */
  static loadSummaryReport() {
    if (!fs.existsSync(SUMMARY_REPORT_FILE)) return null;
    try {
      return JSON.parse(fs.readFileSync(SUMMARY_REPORT_FILE, 'utf8'));
    } catch {
      return null;
    }
  }
}

module.exports = {
  StorageManager,
  BASE_STORAGE_DIR,
  CHECKPOINT_FILE,
  SUMMARY_REPORT_FILE
};

