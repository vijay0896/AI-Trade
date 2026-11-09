/**
 * @file backtesting.service.js
 * @description Orchestration service for historical backtest runs, batch evaluations, and results indexing.
 */

const fs = require('fs');
const path = require('path');
const BacktestEngine = require('./backtesting.engine');
const BacktestStorageManager = require('./backtesting.storage');
const { BacktestRunRequestSchema } = require('./backtesting.schema');
const StrategyService = require('../strategy/strategy.service');
const { DEFAULT_UNIVERSE, STRATEGY_VARIANTS, ACTIVE_STRATEGY } = require('../strategy/strategy.constants');
const { AppError } = require('../../core/utils/asyncHandler');
const logger = require('../../config/logger');

class BacktestService {
  /**
   * Run a single backtest for a specific stock and variant
   * @param {Object} rawParams
   * @returns {Promise<Object>}
   */
  static async runBacktest(rawParams) {
    const parsed = BacktestRunRequestSchema.safeParse(rawParams);
    if (!parsed.success) {
      const errMsgs = parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ');
      throw new AppError(`Invalid backtest parameters: ${errMsgs}`, 400);
    }

    const {
      symbol,
      variant,
      capital,
      slippageBps,
      direction,
      startDate,
      endDate,
      saveResults,
      customConfig
    } = parsed.data;

    // Resolve Strategy Configuration
    let strategyConfig;
    if (customConfig) {
      const validated = StrategyService.validateCustomConfig(customConfig);
      strategyConfig = validated.validatedConfig;
    } else {
      strategyConfig = StrategyService.getVariantConfig(variant);
    }

    logger.info(`Starting backtest: ${symbol} | Variant: ${variant} | Capital: Rs. ${capital} | Slippage: ${slippageBps} bps`);

    const result = await BacktestEngine.run({
      symbol,
      strategyConfig,
      capital,
      slippageBps,
      startDate,
      endDate,
      direction
    });

    if (saveResults !== false) {
      const savedDir = BacktestStorageManager.saveRun(result);
      result.savedDirectory = savedDir;
      logger.info(`Backtest run saved: ${result.runMetadata.runId} at ${savedDir}`);
    }

    return result;
  }

  /**
   * Run batch evaluation across symbols or variants
   * @param {Object} options
   * @param {Array<string>} [options.symbols]
   * @param {Array<string>} [options.variants]
   * @param {number} [options.capital]
   * @param {number} [options.slippageBps]
   * @param {'BOTH'|'LONG_ONLY'|'SHORT_ONLY'} [options.direction]
   * @returns {Promise<Object>}
   */
  static async runBatchEvaluation(options = {}) {
    const targetSymbols = options.symbols || DEFAULT_UNIVERSE;
    const targetVariants = options.variants || [STRATEGY_VARIANTS.EMA_9_21_CROSSOVER];
    const capital = options.capital || 100000;
    const slippageBps = options.slippageBps || 2.0;
    const direction = options.direction || ACTIVE_STRATEGY.DIRECTION || 'LONG_ONLY';

    const batchSummary = [];
    const startTime = Date.now();

    for (const sym of targetSymbols) {
      for (const v of targetVariants) {
        try {
          const runRes = await this.runBacktest({
            symbol: sym,
            variant: v,
            capital,
            slippageBps,
            direction,
            saveResults: true
          });

          batchSummary.push({
            runId: runRes.runMetadata.runId,
            symbol: sym,
            variant: v,
            direction,
            totalTrades: runRes.metrics.tradingPerformance.totalTrades,
            winRate: runRes.metrics.tradingPerformance.winRate,
            netPnL: runRes.metrics.overview.netPnL,
            netReturnPercent: runRes.metrics.overview.netReturnPercent,
            profitFactor: runRes.metrics.tradingPerformance.profitFactor,
            maxDrawdownPercent: runRes.metrics.riskPerformance.maxDrawdownPercent,
            totalCharges: runRes.metrics.overview.totalCharges,
            status: 'SUCCESS'
          });
        } catch (err) {
          logger.error(`Batch backtest failed for ${sym} ${v}: ${err.message}`);
          batchSummary.push({
            symbol: sym,
            variant: v,
            status: 'FAILED',
            error: err.message
          });
        }
      }
    }

    return {
      totalRuns: batchSummary.length,
      elapsedMs: Date.now() - startTime,
      results: batchSummary
    };
  }

  /**
   * Get past backtest runs from index
   * @returns {Array<Object>}
   */
  static getPastRuns() {
    return BacktestStorageManager.getPastRuns();
  }

  /**
   * Get single run details
   * @param {string} runId
   * @returns {Object}
   */
  static getRunDetails(runId) {
    const details = BacktestStorageManager.loadRunDetails(runId);
    if (!details) {
      throw new AppError(`Backtest run '${runId}' not found`, 404);
    }
    return details;
  }

  /**
   * Get trades for a specific run
   * @param {string} runId
   * @returns {Array<Object>}
   */
  static getRunTrades(runId) {
    const trades = BacktestStorageManager.loadRunTrades(runId);
    if (!trades) {
      throw new AppError(`Trades for backtest run '${runId}' not found`, 404);
    }
    return trades;
  }

  /**
   * Get 5-year consolidated backtest summary for EMA 9/21 Crossover
   * @returns {Object}
   */
  static getEMA921Summary() {
    const summaryPath = path.resolve(__dirname, '../../../storage/backtesting/ema_9_21/portfolio_summary.json');
    if (fs.existsSync(summaryPath)) {
      return JSON.parse(fs.readFileSync(summaryPath, 'utf-8'));
    }
    return null;
  }
}

module.exports = BacktestService;

