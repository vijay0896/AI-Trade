/**
 * @file strategy.service.js
 * @description Core business logic service for Strategy Specifications, Configurations, and Risk Sizing.
 */

const fs = require('fs');
const path = require('path');
const {
  STRATEGY_VARIANTS,
  REQUIRED_INDICATORS_BY_VARIANT,
  DEFAULT_UNIVERSE
} = require('./strategy.constants');
const {
  PREDEFINED_STRATEGIES,
  PARAMETER_MATRIX_COHORTS
} = require('./strategy.config');
const {
  StrategyConfigSchema,
  PositionSizeParamsSchema
} = require('./strategy.schema');
const StrategyFormatter = require('./strategy.formatter');
const { AppError } = require('../../core/utils/asyncHandler');
const logger = require('../../config/logger');

const STRATEGY_STORAGE_DIR = path.resolve(__dirname, '../../../storage/strategy');

class StrategyService {
  /**
   * Get all predefined core strategy configurations
   * @returns {Array<Object>}
   */
  static getAllConfigs() {
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
