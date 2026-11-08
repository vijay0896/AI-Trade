/**
 * @file research.controller.js
 * @description HTTP Controller handling Phase 7 Quantitative Research endpoints.
 */

const ResearchService = require('./research.service');
const { ApiResponse } = require('../../core/utils/response.utils');
const { asyncHandler, AppError } = require('../../core/utils/asyncHandler');
const { TARGET_STOCKS } = require('./research.constants');

class ResearchController {
  /**
   * @route GET /api/v1/research/summary
   * @description Retrieves high-level research summary outcomes and stock rankings
   */
  static getSummary = asyncHandler(async (req, res) => {
    const summary = ResearchService.getSummary();
    if (!summary) {
      return ApiResponse.success(res, {
        message: 'Research pipeline outcomes not yet generated. Please run research analysis.',
        data: { hasRun: false, summary: null }
      });
    }

    return ApiResponse.success(res, {
      message: 'Quantitative research summary retrieved successfully',
      data: { hasRun: true, ...summary }
    });
  });

  /**
   * @route GET /api/v1/research/stocks
   * @description Retrieves list of stocks in the research universe
   */
  static getStocks = asyncHandler(async (req, res) => {
    const stocks = ResearchService.getStocks();
    return ApiResponse.success(res, {
      message: 'Research stock universe retrieved successfully',
      data: { stocks }
    });
  });

  /**
   * @route GET /api/v1/research/stock-behaviour
   * @description Retrieves granular behaviour metrics for all stocks or a specific symbol
   */
  static getStockBehaviour = asyncHandler(async (req, res) => {
    const { symbol } = req.query;
    if (symbol) {
      const cleanSym = String(symbol).trim().toUpperCase();
      if (!TARGET_STOCKS.includes(cleanSym)) {
        throw new AppError(
          `Invalid symbol '${symbol}'. Supported symbols: ${TARGET_STOCKS.join(', ')}`,
          400
        );
      }
      const data = ResearchService.getStockBehaviour(cleanSym);
      if (!data) {
        throw new AppError(`Research behaviour metrics not found for ${cleanSym}`, 404);
      }
      return ApiResponse.success(res, {
        message: `Stock behaviour metrics for ${cleanSym} retrieved successfully`,
        data
      });
    }

    const data = ResearchService.getStockBehaviour();
    if (!data) {
      return ApiResponse.success(res, {
        message: 'Stock behaviour metrics not yet generated',
        data: null
      });
    }

    return ApiResponse.success(res, {
      message: 'Stock behaviour metrics retrieved successfully for all stocks',
      data
    });
  });

  /**
   * @route GET /api/v1/research/strategy-robustness
   * @description Retrieves canonical strategy robustness metrics, confidence intervals, and bootstrap stats
   */
  static getStrategyRobustness = asyncHandler(async (req, res) => {
    const data = ResearchService.getStrategyRobustness();
    return ApiResponse.success(res, {
      message: 'Strategy robustness metrics retrieved successfully',
      data: { runs: data }
    });
  });

  /**
   * @route GET /api/v1/research/period-performance
   * @description Retrieves walk-forward diagnostics and parameter sensitivity results
   */
  static getPeriodPerformance = asyncHandler(async (req, res) => {
    const data = ResearchService.getPeriodPerformance();
    return ApiResponse.success(res, {
      message: 'Period performance and walk-forward diagnostics retrieved successfully',
      data
    });
  });
}

module.exports = ResearchController;

