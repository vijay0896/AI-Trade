/**
 * @file health.controller.js
 * @description Health and readiness check controller.
 */

const { ApiResponse } = require('../../core/utils/response.utils');
const { asyncHandler } = require('../../core/utils/asyncHandler');
const GrowwService = require('../groww/groww.service');

class HealthController {
  static getHealth = asyncHandler(async (_req, res) => {
    const growwStatus = GrowwService.getStatus();

    return ApiResponse.success(res, {
      message: 'AI Trading Backend Service is healthy',
      data: {
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        broker: {
          name: 'Groww',
          connected: growwStatus.isConnected,
          active: growwStatus.active,
          expiresInMinutes: growwStatus.expiresInMinutes
        }
      }
    });
  });
}

module.exports = HealthController;

