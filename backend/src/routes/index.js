/**
 * @file index.js
 * @description Master Router aggregating all API module routes.
 */

const express = require('express');
const growwRoutes = require('../modules/groww/groww.routes');
const healthRoutes = require('../modules/health/health.routes');
const marketDataRoutes = require('../modules/market-data/marketData.routes');

const router = express.Router();

// Mount modules
router.use('/groww', growwRoutes);
router.use('/health', healthRoutes);
router.use('/market-data', marketDataRoutes);

module.exports = router;

