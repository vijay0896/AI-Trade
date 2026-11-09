/**
 * @file index.js
 * @description Master Router aggregating all API module routes.
 */

const express = require('express');
const growwRoutes = require('../modules/groww/groww.routes');
const healthRoutes = require('../modules/health/health.routes');
const marketDataRoutes = require('../modules/market-data/marketData.routes');
const indicatorsRoutes = require('../modules/indicators/indicators.routes');
const strategyRoutes = require('../modules/strategy/strategy.routes');
const backtestingRoutes = require('../modules/backtesting/backtesting.routes');

const router = express.Router();

// Mount modules
router.use('/groww', growwRoutes);
router.use('/health', healthRoutes);
router.use('/market-data', marketDataRoutes);
router.use('/indicators', indicatorsRoutes);
router.use('/strategy', strategyRoutes);
router.use('/backtesting', backtestingRoutes);

module.exports = router;

