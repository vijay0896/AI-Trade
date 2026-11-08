/**
 * @file indicators.controller.js
 * @description HTTP Controller handling technical indicator engine queries and reports.
 */

const IndicatorsService = require('./indicators.service');
const { ApiResponse } = require('../../core/utils/response.utils');
const { asyncHandler, AppError } = require('../../core/utils/asyncHandler');
const { TARGET_STOCKS } = require('./indicators.config');

class IndicatorsController {
  /**
   * @route GET /api/v1/indicators/status
   * @description Retrieves Technical Indicator Engine calculation summary and telemetry
   */
  static getStatus = asyncHandler(async (req, res) => {
    const summary = IndicatorsService.getStatus();
    if (!summary) {
      return ApiResponse.success(res, {
        message: 'Technical Indicator Engine has not run yet or summary report is missing',
        data: { hasRun: false, summary: null }
      });
    }

    return ApiResponse.success(res, {
      message: 'Technical Indicator Engine status retrieved successfully',
      data: { hasRun: true, summary }
    });
  });

  /**
   * @route GET /api/v1/indicators/latest
   * @description Retrieves the latest calculated indicator bar for a given stock
   */
  static getLatest = asyncHandler(async (req, res) => {
    const { symbol = 'ICICIBANK' } = req.query;
    const cleanSym = String(symbol).trim().toUpperCase();

    if (!TARGET_STOCKS.includes(cleanSym)) {
      throw new AppError(
        `Invalid symbol '${symbol}'. Supported symbols: ${TARGET_STOCKS.join(', ')}`,
        400
      );
    }

    const latest = IndicatorsService.getLatestIndicators(cleanSym);
    if (!latest) {
      throw new AppError(`No calculated indicators found for ${cleanSym}`, 404);
    }

    return ApiResponse.success(res, {
      message: `Latest indicators retrieved for ${cleanSym}`,
      data: latest
    });
  });
}

module.exports = IndicatorsController;

