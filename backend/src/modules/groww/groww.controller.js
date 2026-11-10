/**
 * @file groww.controller.js
 * @description HTTP Controller handling incoming requests for Groww broker operations.
 */

const GrowwService = require('./groww.service');
const { ApiResponse } = require('../../core/utils/response.utils');
const { asyncHandler } = require('../../core/utils/asyncHandler');

class GrowwController {
  /**
   * @route POST /api/v1/groww/connect
   * @description Explicitly connects to Groww using TOTP sign-in
   */
  static connect = asyncHandler(async (_req, res) => {
    const session = await GrowwService.connect();
    return ApiResponse.success(res, {
      message: 'Groww account connected successfully',
      data: session
    });
  });

  /**
   * @route GET /api/v1/groww/status
   * @description Checks active connection status and session expiry
   */
  static getStatus = asyncHandler(async (_req, res) => {
    const status = GrowwService.getStatus();
    return ApiResponse.success(res, {
      message: 'Connection status retrieved',
      data: status
    });
  });

  /**
   * @route GET /api/v1/groww/profile
   * @description Retrieves user profile details and enabled segments
   */
  static getProfile = asyncHandler(async (_req, res) => {
    const profile = await GrowwService.getProfile();
    return ApiResponse.success(res, {
      message: 'User profile fetched successfully',
      data: profile
    });
  });

  /**
   * @route GET /api/v1/groww/funds
   * @description Retrieves account funds, clear cash, and margins
   */
  static getFunds = asyncHandler(async (_req, res) => {
    const funds = await GrowwService.getFunds();
    return ApiResponse.success(res, {
      message: 'Account funds and margins fetched successfully',
      data: funds
    });
  });

  /**
   * @route GET /api/v1/groww/holdings
   * @description Retrieves Demat stock holdings
   */
  static getHoldings = asyncHandler(async (_req, res) => {
    const holdings = await GrowwService.getHoldings();
    return ApiResponse.success(res, {
      message: 'Holdings fetched successfully',
      data: holdings
    });
  });

  /**
   * @route GET /api/v1/groww/positions
   * @description Retrieves open trading positions
   */
  static getPositions = asyncHandler(async (_req, res) => {
    const positions = await GrowwService.getPositions();
    return ApiResponse.success(res, {
      message: 'Positions fetched successfully',
      data: positions
    });
  });

  /**
   * @route POST /api/v1/groww/backtest
   * @description Executes 15-Minute Intraday 9/21 EMA Crossover Backtest
   */
  static runBacktest = asyncHandler(async (req, res) => {
    const {
      symbols,
      startDate,
      endDate,
      capitalPerTrade,
      enableMultiTimeframe,
      enableNR4Filter
    } = req.body || {};

    const results = await GrowwService.runIntradayBacktest({
      symbols,
      startDate,
      endDate,
      capitalPerTrade: Number(capitalPerTrade) || 100000,
      enableMultiTimeframe: enableMultiTimeframe !== false,
      enableNR4Filter: Boolean(enableNR4Filter)
    });

    return ApiResponse.success(res, {
      message: '15-Minute 9/21 EMA Intraday Backtest executed successfully',
      data: results
    });
  });
}

module.exports = GrowwController;

