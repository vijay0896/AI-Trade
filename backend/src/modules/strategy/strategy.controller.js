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
   * @description Get all predefined strategy variant configurations
   */
  static getAllConfigs = asyncHandler(async (req, res) => {
    const configs = StrategyService.getAllConfigs();
    return ApiResponse.success(res, {
      message: 'Strategy configurations retrieved successfully',
      data: {
        totalVariants: configs.length,
        configs
      }
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

