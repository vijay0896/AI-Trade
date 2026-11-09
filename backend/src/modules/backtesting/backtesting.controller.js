/**
 * @file backtesting.controller.js
 * @description HTTP Controller handling backtest execution, run retrieval, and trade journal queries.
 */

const BacktestService = require('./backtesting.service');
const { ApiResponse } = require('../../core/utils/response.utils');
const { asyncHandler } = require('../../core/utils/asyncHandler');

class BacktestController {
  /**
   * @route GET /api/v1/backtesting/runs
   * @description Get index of all historical backtest runs
   */
  static getRuns = asyncHandler(async (req, res) => {
    const runs = BacktestService.getPastRuns();
    return ApiResponse.success(res, {
      message: 'Backtest runs retrieved successfully',
      data: {
        totalRuns: runs.length,
        runs
      }
    });
  });

  /**
   * @route GET /api/v1/backtesting/runs/:runId
   * @description Get full metadata, summary, and configuration for a specific run
   */
  static getRunDetails = asyncHandler(async (req, res) => {
    const { runId } = req.params;
    const details = BacktestService.getRunDetails(runId);
    return ApiResponse.success(res, {
      message: `Backtest run '${runId}' retrieved successfully`,
      data: details
    });
  });

  /**
   * @route GET /api/v1/backtesting/runs/:runId/trades
   * @description Get detailed trade journal for a specific run
   */
  static getRunTrades = asyncHandler(async (req, res) => {
    const { runId } = req.params;
    const trades = BacktestService.getRunTrades(runId);
    return ApiResponse.success(res, {
      message: `Trades for backtest run '${runId}' retrieved successfully`,
      data: {
        runId,
        totalTrades: trades.length,
        trades
      }
    });
  });

  /**
   * @route GET /api/v1/backtesting/ema9-21/summary
   * @description Get consolidated EMA 9/21 Crossover 5-year backtest performance metrics
   */
  static getEMA921Summary = asyncHandler(async (req, res) => {
    const summary = BacktestService.getEMA921Summary();
    return ApiResponse.success(res, {
      message: 'EMA 9/21 backtest summary retrieved successfully',
      data: summary
    });
  });

  /**
   * @route POST /api/v1/backtesting/run
   * @description Execute a new historical backtest run
   */
  static executeRun = asyncHandler(async (req, res) => {
    const result = await BacktestService.runBacktest(req.body);
    return ApiResponse.success(res, {
      message: `Backtest executed successfully for ${result.runMetadata.symbol} (${result.runMetadata.variant})`,
      data: {
        runMetadata: result.runMetadata,
        metrics: result.metrics,
        tradesSample: result.trades.slice(0, 5) // Return small preview
      }
    });
  });
}

module.exports = BacktestController;

