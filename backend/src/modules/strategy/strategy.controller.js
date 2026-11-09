/**
 * @file strategy.controller.js
 * @description HTTP Controller handling Strategy Specification, Configuration, and Risk endpoints.
 */

const StrategyService = require('./strategy.service');
const { ApiResponse } = require('../../core/utils/response.utils');
const { asyncHandler } = require('../../core/utils/asyncHandler');

class StrategyController {
  /**
   * @route GET /api/v1/strategy/configs
   * @description Get all active strategy configurations (sole active: EMA 9/21 Crossover)
   */
  static getAllConfigs = asyncHandler(async (req, res) => {
    const includeLegacy = req.query.includeLegacy === 'true';
    const configs = StrategyService.getAllConfigs({ activeOnly: !includeLegacy });
    return ApiResponse.success(res, {
      message: 'Strategy configurations retrieved successfully',
      data: {
        totalVariants: configs.length,
        configs
      }
    });
  });

  /**
   * @route GET /api/v1/strategy/active
   * @description Get single active strategy configuration (EMA 9/21 Crossover)
   */
  static getActiveConfig = asyncHandler(async (req, res) => {
    const config = StrategyService.getActiveConfig();
    return ApiResponse.success(res, {
      message: 'Active strategy configuration retrieved successfully',
      data: config
    });
  });

  /**
   * @route GET /api/v1/strategy/chart/:symbol
   * @description Get candlestick data with EMA 9/21 and BUY/SELL signals for chart rendering
   */
  static getChartData = asyncHandler(async (req, res) => {
    const { symbol } = req.params;
    const { date } = req.query;
    const chartData = await StrategyService.getChartData(symbol, date);
    return ApiResponse.success(res, {
      message: `Chart data for '${symbol}' retrieved successfully`,
      data: chartData
    });
  });

  /**
   * @route GET /api/v1/strategy/configs/:variantId
   * @description Get single strategy configuration by variant ID or name
   */
  static getVariantConfig = asyncHandler(async (req, res) => {
    const { variantId } = req.params;
    const config = StrategyService.getVariantConfig(variantId);
    return ApiResponse.success(res, {
      message: `Strategy configuration for '${variantId}' retrieved successfully`,
      data: config
    });
  });

  /**
   * @route POST /api/v1/strategy/validate
   * @description Validate custom strategy configuration against strict Zod schema
   */
  static validateConfig = asyncHandler(async (req, res) => {
    const result = StrategyService.validateCustomConfig(req.body);
    return ApiResponse.success(res, {
      message: 'Strategy configuration validated successfully',
      data: result
    });
  });

  /**
   * @route POST /api/v1/strategy/position-size
   * @description Calculate position size and risk allocation
   */
  static calculatePositionSize = asyncHandler(async (req, res) => {
    const sizing = StrategyService.calculatePositionSize(req.body);
    return ApiResponse.success(res, {
      message: 'Position size calculated successfully',
      data: sizing
    });
  });

  /**
   * @route GET /api/v1/strategy/matrix
   * @description Retrieve the experimental parameter matrix for backtesting
   */
  static getParameterMatrix = asyncHandler(async (req, res) => {
    const matrix = StrategyService.getParameterMatrix();
    return ApiResponse.success(res, {
      message: 'Parameter matrix retrieved successfully',
      data: matrix
    });
  });
}

module.exports = StrategyController;

