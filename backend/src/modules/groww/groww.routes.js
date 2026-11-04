/**
 * @file groww.routes.js
 * @description Routes for Groww Broker API operations.
 */

const express = require('express');
const GrowwController = require('./groww.controller');

const router = express.Router();

/**
 * @route POST /api/v1/groww/connect
 * @description Connects to Groww using TOTP authentication
 */
router.post('/connect', GrowwController.connect);

/**
 * @route GET /api/v1/groww/status
 * @description Check current connection and token status
 */
router.get('/status', GrowwController.getStatus);

/**
 * @route GET /api/v1/groww/profile
 * @description User profile details
 */
router.get('/profile', GrowwController.getProfile);

/**
 * @route GET /api/v1/groww/funds
 * @description Available cash, margins, and collateral
 */
router.get('/funds', GrowwController.getFunds);

/**
 * @route GET /api/v1/groww/holdings
 * @description Demat holdings
 */
router.get('/holdings', GrowwController.getHoldings);

/**
 * @route GET /api/v1/groww/positions
 * @description Open positions
 */
router.get('/positions', GrowwController.getPositions);

module.exports = router;

