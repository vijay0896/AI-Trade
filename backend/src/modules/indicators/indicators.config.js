/**
 * @file indicators.config.js
 * @description Configuration constants and parameters for the Technical Indicator Engine.
 */

const path = require('path');

// Storage Directories
const RAW_STORAGE_DIR = path.resolve(__dirname, '../../../storage/historical-data');
const DERIVED_STORAGE_DIR = path.resolve(__dirname, '../../../storage/derived/indicators');
const REPORT_FILE = path.join(DERIVED_STORAGE_DIR, 'INDICATOR_ENGINE_REPORT.md');
const SUMMARY_JSON_FILE = path.join(DERIVED_STORAGE_DIR, 'indicator_summary.json');

// Target Stocks Universe
const TARGET_STOCKS = ['ICICIBANK', 'HDFCBANK', 'M&M', 'AXISBANK', 'BHARTIARTL'];

// Session Classification Identifiers
const SESSION_TYPES = {
  REGULAR: 'REGULAR',
  MUHURAT_SPECIAL: 'MUHURAT_SPECIAL',
  DR_SPLIT: 'DR_SPLIT',
  CLOSING_AUCTION: 'CLOSING_AUCTION',
  POST_MARKET: 'POST_MARKET',
  UNVERIFIED: 'UNVERIFIED'
};

// Known Special Session Dates (authoritatively confirmed)
const MUHURAT_DATES = new Set([
  '2021-11-04',
  '2022-10-24',
  '2023-11-12',
  '2024-11-01',
  '2025-10-21' // Circular NSE/CMTR/70319 (13:45 to 14:45 normal market)
]);

const DR_SPLIT_DATES = new Set([
  '2024-03-02', // Saturday DR switch drill
  '2024-05-18'  // Saturday DR switch drill
]);

// Indicator Parameters
const INDICATOR_CONFIG = {
  EMA_FAST_PERIOD: 20,
  EMA_SLOW_PERIOD: 50,
  ATR_PERIOD: 14,
  ADX_PERIOD: 14,
  CHOPPINESS_PERIOD: 14,
  EFFICIENCY_RATIO_PERIOD: 14,
  VOLUME_SMA_PERIOD: 20
};

// CSV Header for Derived Indicator Output
const DERIVED_CSV_HEADER = [
  'timestamp',
  'symbol',
  'open',
  'high',
  'low',
  'close',
  'volume',
  'sessionType',
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
].join(',');

module.exports = {
  RAW_STORAGE_DIR,
  DERIVED_STORAGE_DIR,
  REPORT_FILE,
  SUMMARY_JSON_FILE,
  TARGET_STOCKS,
  SESSION_TYPES,
  MUHURAT_DATES,
  DR_SPLIT_DATES,
  INDICATOR_CONFIG,
  DERIVED_CSV_HEADER
};

