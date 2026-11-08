/**
 * @file marketData.routes.js
 * @description Express routes for Market Data operations.
 */

const express = require('express');
const MarketDataController = require('./marketData.controller');

const router = express.Router();

/**
 * @route GET /api/v1/market-data/historical-candles
 * @description Fetches normalized 5-minute historical candles for ICICIBANK from Groww API
 */
router.get('/historical-candles', MarketDataController.getHistoricalCandles);

/**
 * @route GET /api/v1/market-data/historical-coverage
 * @description Validates whether 5-year historical candles exist back to November 2021
 */
router.get('/historical-coverage', MarketDataController.validateCoverage);

/**
 * @route GET /api/v1/market-data/downloader-status
 * @description Checks 5-year data downloader checkpoint and summary report
 */
router.get('/downloader-status', MarketDataController.getDownloaderStatus);

module.exports = router;

