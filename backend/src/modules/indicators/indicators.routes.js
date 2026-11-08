/**
 * @file indicators.routes.js
 * @description Express routes for the Technical Indicator Engine.
 */

const express = require('express');
const IndicatorsController = require('./indicators.controller');

const router = express.Router();

/**
 * @route GET /api/v1/indicators/status
 * @description Status and master telemetry report of the Indicator Engine
 */
router.get('/status', IndicatorsController.getStatus);

/**
 * @route GET /api/v1/indicators/latest
 * @description Latest calculated indicators for an individual stock
 */
router.get('/latest', IndicatorsController.getLatest);

module.exports = router;

