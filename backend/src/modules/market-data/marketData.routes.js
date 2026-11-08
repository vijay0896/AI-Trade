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

module.exports = router;

