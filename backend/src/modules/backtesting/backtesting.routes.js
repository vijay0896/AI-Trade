/**
 * @file backtesting.routes.js
 * @description Express routes for Historical Backtesting Engine and Run Journals.
 */

const express = require('express');
const BacktestController = require('./backtesting.controller');

const router = express.Router();

/**
 * @route GET /api/v1/backtesting/runs
 * @description Get past backtest execution summaries
 */
router.get('/runs', BacktestController.getRuns);

/**
 * @route GET /api/v1/backtesting/runs/:runId
 * @description Get single backtest run details, config, and performance summary
 */
router.get('/runs/:runId', BacktestController.getRunDetails);

/**
 * @route GET /api/v1/backtesting/runs/:runId/trades
 * @description Get trade journal records for a run
 */
router.get('/runs/:runId/trades', BacktestController.getRunTrades);

/**
 * @route POST /api/v1/backtesting/run
 * @description Trigger a backtest execution run
 */
router.post('/run', BacktestController.executeRun);

module.exports = router;

