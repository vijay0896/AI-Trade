/**
 * @file strategy.service.js
 * @description Core business logic service for Strategy Specifications, Configurations, and Risk Sizing.
 */

const fs = require('fs');
const path = require('path');
const {
  STRATEGY_VARIANTS,
  REQUIRED_INDICATORS_BY_VARIANT,
  DEFAULT_UNIVERSE,
  ACTIVE_STRATEGY
} = require('./strategy.constants');
const {
  PREDEFINED_STRATEGIES,
  ACTIVE_STRATEGY_CONFIG,
  PARAMETER_MATRIX_COHORTS
} = require('./strategy.config');
const {
  StrategyConfigSchema,
  PositionSizeParamsSchema
} = require('./strategy.schema');
const StrategyFormatter = require('./strategy.formatter');
const IndicatorsCalculator = require('../indicators/indicators.calculator');
const { AppError } = require('../../core/utils/asyncHandler');
const logger = require('../../config/logger');

const STRATEGY_STORAGE_DIR = path.resolve(__dirname, '../../../storage/strategy');

class StrategyService {
  /**
   * Get active strategy configuration (EMA 9/21 Crossover)
   * @returns {Object}
   */
  static getActiveConfig() {
    return StrategyFormatter.formatConfig(ACTIVE_STRATEGY_CONFIG);
  }

  /**
   * Get all active strategy configurations (sole active strategy: EMA 9/21 Crossover)
   * If options.includeLegacy is true, also returns historical research variants.
   * @param {Object} [options]
   * @returns {Array<Object>}
   */
  static getAllConfigs(options = {}) {
    if (options && options.activeOnly) {
      return StrategyFormatter.formatConfigList([ACTIVE_STRATEGY_CONFIG]);
    }
    const list = Object.values(PREDEFINED_STRATEGIES);
    return StrategyFormatter.formatConfigList(list);
  }

  /**
   * Get single predefined strategy configuration by variant ID or Variant enum
   * @param {string} idOrVariant
   * @returns {Object}
   */
  static getVariantConfig(idOrVariant) {
    if (!idOrVariant) {
      throw new AppError('Strategy ID or Variant parameter is required', 400);
    }

    const clean = String(idOrVariant).trim().toUpperCase();
    if (
      clean === 'EMA_9_21_CROSSOVER' ||
      clean === 'EMA_9_21' ||
      clean === ACTIVE_STRATEGY.ID.toUpperCase()
    ) {
      return StrategyFormatter.formatConfig(ACTIVE_STRATEGY_CONFIG);
    }

    // Match by variant value, STRATEGY_VARIANTS key, or ID
    let found = PREDEFINED_STRATEGIES[clean];
    if (!found && STRATEGY_VARIANTS[clean]) {
      found = PREDEFINED_STRATEGIES[STRATEGY_VARIANTS[clean]];
    }
    if (!found) {
      found = Object.values(PREDEFINED_STRATEGIES).find(
        cfg => cfg.id.toUpperCase() === clean || cfg.variant.toUpperCase() === clean
      );
    }

    if (!found) {
      throw new AppError(
        `Strategy configuration not found for '${idOrVariant}'. Available variants: ${Object.keys(PREDEFINED_STRATEGIES).join(', ')}`,
        404
      );
    }

    return StrategyFormatter.formatConfig(found);
  }

  /**
   * Validate custom strategy configuration against strict Zod schema
   * @param {Object} rawConfig
   * @returns {Object} Validated and normalized configuration
   */
  static validateCustomConfig(rawConfig) {
    if (!rawConfig || typeof rawConfig !== 'object') {
      throw new AppError('Strategy configuration payload must be a non-empty object', 400);
    }

    const parsed = StrategyConfigSchema.safeParse(rawConfig);
    if (!parsed.success) {
      const errorDetails = parsed.error.issues.map(err => `${err.path.join('.')}: ${err.message}`).join('; ');
      throw new AppError(`Strategy configuration validation failed: ${errorDetails}`, 400);
    }

    // Verify indicator availability for the chosen variant
    const requiredIndicators = REQUIRED_INDICATORS_BY_VARIANT[parsed.data.variant] || [];
    return {
      isValid: true,
      validatedConfig: StrategyFormatter.formatConfig(parsed.data),
      requiredIndicators
    };
  }

  /**
   * Calculate position size based on risk budget, entry price, and stop loss distance
   * @param {Object} params
   * @returns {Object}
   */
  static calculatePositionSize(params) {
    const parsed = PositionSizeParamsSchema.safeParse(params);
    if (!parsed.success) {
      const errorDetails = parsed.error.issues.map(err => `${err.path.join('.')}: ${err.message}`).join('; ');
      throw new AppError(`Position size calculation parameter error: ${errorDetails}`, 400);
    }

    const { capital, riskPercent, entryPrice, stopLossPrice, leverage } = parsed.data;
    const riskBudget = capital * (riskPercent / 100);
    const stopDistance = Math.abs(entryPrice - stopLossPrice);

    if (stopDistance <= 0) {
      throw new AppError('Stop loss distance must be greater than zero', 400);
    }

    const stopDistancePercent = (stopDistance / entryPrice) * 100;
    const rawQuantity = riskBudget / stopDistance;
    const maxCapitalAllowed = capital * leverage;
    const maxSharesByCapital = Math.floor(maxCapitalAllowed / entryPrice);
    const finalQuantity = Math.min(Math.floor(rawQuantity), maxSharesByCapital);

    const result = {
      capital,
      riskPercent,
      riskBudget,
      entryPrice,
      stopLossPrice,
      stopDistance,
      stopDistancePercent,
      rawQuantity,
      quantity: finalQuantity,
      maxSharesByCapital,
      leverage
    };

    return StrategyFormatter.formatPositionSize(result);
  }

  /**
   * Retrieve parameter matrix cohorts
   * @returns {Object}
   */
  static getParameterMatrix() {
    return StrategyFormatter.formatParameterMatrix(PARAMETER_MATRIX_COHORTS);
  }

  /**
   * Get 5-minute candle data with continuous EMA 9, EMA 21, and BUY/SELL markers for a stock
   * @param {string} symbol
   * @param {string} [requestedDate] YYYY-MM-DD
   * @returns {Promise<Object>}
   */
  static async getChartData(symbol, requestedDate = null) {
    const cleanSym = String(symbol).trim().toUpperCase();
    if (!DEFAULT_UNIVERSE.includes(cleanSym)) {
      throw new AppError(`Symbol '${symbol}' is not supported. Universe: ${DEFAULT_UNIVERSE.join(', ')}`, 400);
    }

    const BacktestEngine = require('../backtesting/backtesting.engine');
    const { candlesByDay } = await BacktestEngine.loadDerivedCandles(cleanSym);
    const sortedDays = Object.keys(candlesByDay).sort();
    if (sortedDays.length === 0) {
      throw new AppError(`No historical market data found for '${cleanSym}'`, 404);
    }

    const targetDate = requestedDate && sortedDays.includes(requestedDate)
      ? requestedDate
      : sortedDays[sortedDays.length - 1];

    // Compute continuous EMAs across all regular session bars up to targetDate
    const calc = new IndicatorsCalculator();
    let prevEMA9 = null;
    let prevEMA21 = null;
    const dayCandles = [];
    let currentSignal = 'HOLD';

    for (const d of sortedDays) {
      const isTarget = (d === targetDate);
      for (const c of candlesByDay[d]) {
        if (c.sessionType === 'REGULAR') {
          const ind = calc.processRegularBar(c);
          const currEMA9 = ind.ema9;
          const currEMA21 = ind.ema21;
          let signal = null; // 'BUY' | 'SELL' | null

          if (currEMA9 !== null && currEMA21 !== null && prevEMA9 !== null && prevEMA21 !== null) {
            if (prevEMA9 <= prevEMA21 && currEMA9 > currEMA21) {
              signal = 'BUY';
            } else if (prevEMA9 >= prevEMA21 && currEMA9 < currEMA21) {
              signal = 'SELL';
            }
          }

          if (isTarget) {
            dayCandles.push({
              timestamp: c.timestamp,
              time: c.timestamp.split('T')[1].slice(0, 5),
              open: c.open,
              high: c.high,
              low: c.low,
              close: c.close,
              volume: c.volume,
              ema9: currEMA9,
              ema21: currEMA21,
              signal
            });
            if (signal) {
              currentSignal = signal;
            }
          }

          if (currEMA9 !== null) prevEMA9 = currEMA9;
          if (currEMA21 !== null) prevEMA21 = currEMA21;
        }
      }
      if (d === targetDate) break;
    }

    const lastCandle = dayCandles[dayCandles.length - 1] || null;

    return {
      symbol: cleanSym,
      date: targetDate,
      availableDates: sortedDays.slice(-90), // Last 90 trading days for fast selection
      totalAvailableDates: sortedDays.length,
      currentEMA9: lastCandle?.ema9 ?? null,
      currentEMA21: lastCandle?.ema21 ?? null,
      currentPrice: lastCandle?.close ?? null,
      currentSignal: currentSignal || 'HOLD',
      strategy: {
        id: ACTIVE_STRATEGY.ID,
        name: ACTIVE_STRATEGY.NAME,
        fastPeriod: ACTIVE_STRATEGY.FAST_PERIOD,
        slowPeriod: ACTIVE_STRATEGY.SLOW_PERIOD,
        fastColor: ACTIVE_STRATEGY.FAST_COLOR,
        slowColor: ACTIVE_STRATEGY.SLOW_COLOR,
        timeframe: ACTIVE_STRATEGY.TIMEFRAME
      },
      candles: dayCandles
    };
  }

  /**
   * Export all strategy configurations to JSON file in storage
   */
  static exportConfigurationsToFile() {
    if (!fs.existsSync(STRATEGY_STORAGE_DIR)) {
      fs.mkdirSync(STRATEGY_STORAGE_DIR, { recursive: true });
    }

    const outPath = path.join(STRATEGY_STORAGE_DIR, 'STRATEGY_CONFIGURATIONS.json');
    const data = {
      schemaVersion: '1.0.0',
      exportedAt: new Date().toISOString(),
      universe: DEFAULT_UNIVERSE,
      variants: Object.values(PREDEFINED_STRATEGIES)
    };

    fs.writeFileSync(outPath, JSON.stringify(data, null, 2), 'utf-8');
    logger.info(`Strategy configurations exported to ${outPath}`);
    return outPath;
  }
}

module.exports = StrategyService;
