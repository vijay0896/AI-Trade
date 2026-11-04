/**
 * @file health.routes.js
 * @description Routes for health checks.
 */

const express = require('express');
const HealthController = require('./health.controller');

const router = express.Router();

router.get('/', HealthController.getHealth);

module.exports = router;

