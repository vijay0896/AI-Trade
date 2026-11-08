/**
 * @file strategy.formatter.js
 * @description Normalization and Data Transfer Object (DTO) formatters for Strategy module.
 */

class StrategyFormatter {
  /**
   * Format single strategy configuration into consistent API response
   * @param {Object} config
   * @returns {Object}
   */
  static formatConfig(config) {
    if (!config) return null;
    return {
      id: config.id,
      name: config.name,
      version: config.version,
      variant: config.variant,
      description: config.description,
      universe: config.universe,
      timeframe: config.timeframe,
      timezone: config.timezone,
      openingRange: {
        startTime: config.openingRange.startTime,
        endTime: config.openingRange.endTime,
        candleInterval: config.openingRange.candleInterval,
        expectedBars: config.openingRange.expectedBars,
        minWidthPercent: config.openingRange.minWidthPercent,
        maxWidthPercent: config.openingRange.maxWidthPercent
      },
      entry: {
        entryType: config.entry.entryType,
        direction: config.entry.direction,
        entryStartTime: config.entry.entryStartTime,
        entryCutoffTime: config.entry.entryCutoffTime,
        retestTolerancePercent: config.entry.retestTolerancePercent,
        retestMaxBars: config.entry.retestMaxBars,
        requireRetestConfirmationBar: config.entry.requireRetestConfirmationBar
      },
      exit: {
        stopLossMode: config.exit.stopLossMode,
        atrMultiplierSL: config.exit.atrMultiplierSL,
        swingLookbackBars: config.exit.swingLookbackBars,
        targetMode: config.exit.targetMode,
        riskRewardRatio: config.exit.riskRewardRatio,
        squareOffTime: config.exit.squareOffTime,
        maxHoldingDurationBars: config.exit.maxHoldingDurationBars,
        gapThroughStopModel: config.exit.gapThroughStopModel
      },
      filters: {
        adxThreshold: config.filters.adxThreshold,
        adxRequireRising: config.filters.adxRequireRising,
        diDirectionalConfirm: config.filters.diDirectionalConfirm,
        rvolThreshold: config.filters.rvolThreshold,
        choppinessMaxThreshold: config.filters.choppinessMaxThreshold,
        efficiencyRatioMin: config.filters.efficiencyRatioMin,
        maxVwapCrossesInFirstHour: config.filters.maxVwapCrossesInFirstHour
      },
      risk: {
        accountCapital: config.risk.accountCapital,
        riskPerTradePercent: config.risk.riskPerTradePercent,
        dailyMaxLossPercent: config.risk.dailyMaxLossPercent,
        maxTradesPerDay: config.risk.maxTradesPerDay,
        maxActivePositionsPerStock: config.risk.maxActivePositionsPerStock,
        maxPortfolioExposurePercent: config.risk.maxPortfolioExposurePercent,
        leverageMultiplier: config.risk.leverageMultiplier
      },
      specialSessions: config.specialSessions
    };
  }

  /**
   * Format list of strategy configurations
   * @param {Array<Object>} configs
   * @returns {Array<Object>}
   */
  static formatConfigList(configs) {
    if (!Array.isArray(configs)) return [];
    return configs.map(cfg => this.formatConfig(cfg));
  }

  /**
   * Format position size calculation result
   * @param {Object} sizing
   * @returns {Object}
   */
  static formatPositionSize(sizing) {
    return {
      capital: Number(sizing.capital.toFixed(2)),
      riskPercent: Number(sizing.riskPercent.toFixed(2)),
      riskBudget: Number(sizing.riskBudget.toFixed(2)),
      entryPrice: Number(sizing.entryPrice.toFixed(2)),
      stopLossPrice: Number(sizing.stopLossPrice.toFixed(2)),
      stopDistance: Number(sizing.stopDistance.toFixed(2)),
      stopDistancePercent: Number(sizing.stopDistancePercent.toFixed(2)),
      rawQuantity: Number(sizing.rawQuantity.toFixed(4)),
      quantity: Math.floor(sizing.quantity),
      positionValue: Number((Math.floor(sizing.quantity) * sizing.entryPrice).toFixed(2)),
      capitalUtilizationPercent: Number(
        ((Math.floor(sizing.quantity) * sizing.entryPrice / sizing.capital) * 100).toFixed(2)
      ),
      isExecutable: Math.floor(sizing.quantity) >= 1,
      executionWarning: Math.floor(sizing.quantity) < 1 ? 'Insufficient capital for given risk stop distance; minimum 1 share cannot be traded.' : null
    };
  }

  /**
   * Format experimental parameter matrix
   * @param {Array<Object>} cohorts
   * @returns {Object}
   */
  static formatParameterMatrix(cohorts) {
    const grouped = {};
    for (const exp of cohorts) {
      if (!grouped[exp.cohort]) {
        grouped[exp.cohort] = [];
      }
      grouped[exp.cohort].push(exp);
    }

    return {
      totalExperiments: cohorts.length,
      cohortCount: Object.keys(grouped).length,
      cohorts: grouped
    };
  }
}

module.exports = StrategyFormatter;

