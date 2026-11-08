/**
 * @file research.routes.js
 * @description Express routing definition for Phase 7 Quantitative Research endpoints.
 */

const express = require('express');
const ResearchController = require('./research.controller');

const router = express.Router();

router.get('/summary', ResearchController.getSummary);
router.get('/stocks', ResearchController.getStocks);
router.get('/stock-behaviour', ResearchController.getStockBehaviour);
router.get('/strategy-robustness', ResearchController.getStrategyRobustness);
router.get('/period-performance', ResearchController.getPeriodPerformance);

module.exports = router;

