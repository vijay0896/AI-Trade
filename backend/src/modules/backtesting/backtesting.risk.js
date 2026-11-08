/**
 * @file backtesting.risk.js
 * @description Risk management coordinator, circuit breaker tracking, and capital allocation.
 */

const StrategyService = require('../strategy/strategy.service');

class BacktestRiskManager {
  /**
   * Determine position size for a trade entry
   * @param {Object} params
   * @returns {Object}
   */
  static determinePositionSize(params) {
    return StrategyService.calculatePositionSize(params);
  }

  /**
   * Check if daily loss circuit breaker is triggered
   * @param {number} dailyRealizedPnL Realized P&L for current session
   * @param {number} capital Current account capital
   * @param {number} dailyMaxLossPercent Configured daily max loss limit (e.g. 1.0%)
   * @returns {boolean}
   */
  static isDailyCircuitBreakerTripped(dailyRealizedPnL, capital, dailyMaxLossPercent = 1.0) {
    if (dailyRealizedPnL >= 0) return false;
    const maxLossBudget = capital * (dailyMaxLossPercent / 100.0);
    return Math.abs(dailyRealizedPnL) >= maxLossBudget;
  }

  /**
   * Check if trade entry is permitted under risk rules
   * @param {Object} context
   * @param {number} context.dailyTradesCount Trades executed so far today
   * @param {number} context.maxTradesPerDay Max allowed trades per day (e.g. 2)
   * @param {number} context.dailyRealizedPnL Realized P&L today
   * @param {number} context.capital Initial/current capital
   * @param {number} context.dailyMaxLossPercent
   * @param {boolean} context.hasActivePosition Whether an active trade already exists
   * @returns {{ permitted: boolean, reason?: string }}
   */
  static canEnterTrade(context) {
    if (context.hasActivePosition) {
      return { permitted: false, reason: 'ACTIVE_POSITION_EXISTS' };
    }

    if (context.dailyTradesCount >= context.maxTradesPerDay) {
      return { permitted: false, reason: 'MAX_DAILY_TRADES_REACHED' };
    }

    if (this.isDailyCircuitBreakerTripped(context.dailyRealizedPnL, context.capital, context.dailyMaxLossPercent)) {
      return { permitted: false, reason: 'DAILY_LOSS_LIMIT_REACHED' };
    }

    return { permitted: true };
  }
}

module.exports = BacktestRiskManager;

