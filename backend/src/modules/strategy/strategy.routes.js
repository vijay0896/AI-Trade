/**
 * @file strategy.routes.js
 * @description Express routes for Strategy Specification, Configurations, and Risk Management.
 */

const express = require('express');
const StrategyController = require('./strategy.controller');

const router = express.Router();

/**
 * @route GET /api/v1/strategy/configs
 * @description Get all active strategy configurations
 */
router.get('/configs', StrategyController.getAllConfigs);

/**
 * @route GET /api/v1/strategy/active
 * @description Get single active strategy configuration (EMA 9/21 Crossover)
 */
router.get('/active', StrategyController.getActiveConfig);

/**
 * @route GET /api/v1/strategy/chart/:symbol
 * @description Get candlestick data with EMA 9/21 and BUY/SELL signals for chart rendering
 */
router.get('/chart/:symbol', StrategyController.getChartData);

/**
 * @route GET /api/v1/strategy/matrix
 * @description Get experimental parameter matrix cohorts
 */
router.get('/matrix', StrategyController.getParameterMatrix);

/**
 * @route GET /api/v1/strategy/configs/:variantId
 * @description Get configuration for a specific variant (e.g. VARIANT_A or STRAT-ORB-VAR-A)
 */
router.get('/configs/:variantId', StrategyController.getVariantConfig);

/**
 * @route POST /api/v1/strategy/validate
 * @description Validate a custom strategy configuration
 */
router.post('/validate', StrategyController.validateConfig);

/**
 * @route POST /api/v1/strategy/position-size
 * @description Compute exact risk-based position size and capital utilization
 */
router.post('/position-size', StrategyController.calculatePositionSize);

module.exports = router;

