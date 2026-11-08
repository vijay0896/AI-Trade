/**
 * @file backtesting.metrics.js
 * @description Quantitative Performance and Risk Analytics Calculator for Backtesting Engine.
 */

class BacktestMetricsCalculator {
  /**
   * Compute comprehensive trade performance, risk, and periodic metrics
   * @param {Array<Object>} trades List of completed trades
   * @param {Array<Object>} dailyRecords List of daily performance records
   * @param {number} initialCapital Starting portfolio capital
   * @param {number} totalRegularBars Total regular candles in backtest period
   * @returns {Object}
   */
  static calculate(trades, dailyRecords, initialCapital = 100000, totalRegularBars = 0) {
    if (!Array.isArray(trades) || trades.length === 0) {
      return this.getEmptyMetrics(initialCapital);
    }

    let winningTrades = 0;
    let losingTrades = 0;
    let scratchTrades = 0;
    let grossWins = 0;
    let grossLosses = 0;
    let netWins = 0;
    let netLosses = 0;
    let totalGrossPnL = 0;
    let totalNetPnL = 0;
    let totalBrokerage = 0;
    let totalStatutory = 0;
    let totalGST = 0;
    let totalCharges = 0;
    let totalSlippageCost = 0;
    let totalBarsInMarket = 0;

    let largestWin = 0;
    let largestLoss = 0;
    let currentConsecutiveWins = 0;
    let maxConsecutiveWins = 0;
    let currentConsecutiveLosses = 0;
    let maxConsecutiveLosses = 0;

    const longTrades = [];
    const shortTrades = [];
    const exitReasons = {};

    for (const t of trades) {
      totalGrossPnL += t.grossPnL;
      totalNetPnL += t.netPnL;
      totalBrokerage += t.brokerage;
      totalStatutory += t.statutoryCharges;
      totalGST += t.gst;
      totalCharges += t.totalCharges;
      totalSlippageCost += (t.entrySlippageCost || 0) + (t.exitSlippageCost || 0);
      totalBarsInMarket += t.barsHeld || 1;

      // Exit Reason Count
      exitReasons[t.exitReason] = (exitReasons[t.exitReason] || 0) + 1;

      // Directional breakdown
      if (t.side === 'LONG') {
        longTrades.push(t);
      } else {
        shortTrades.push(t);
      }

      // Win / Loss / Scratch
      if (t.netPnL > 0) {
        winningTrades++;
        grossWins += t.grossPnL;
        netWins += t.netPnL;
        largestWin = Math.max(largestWin, t.netPnL);

        currentConsecutiveWins++;
        maxConsecutiveWins = Math.max(maxConsecutiveWins, currentConsecutiveWins);
        currentConsecutiveLosses = 0;
      } else if (t.netPnL < 0) {
        losingTrades++;
        grossLosses += Math.abs(t.grossPnL);
        netLosses += Math.abs(t.netPnL);
        largestLoss = Math.min(largestLoss, t.netPnL);

        currentConsecutiveLosses++;
        maxConsecutiveLosses = Math.max(maxConsecutiveLosses, currentConsecutiveLosses);
        currentConsecutiveWins = 0;
      } else {
        scratchTrades++;
      }
    }

    const totalTrades = trades.length;
    const winRate = Number(((winningTrades / totalTrades) * 100).toFixed(2));
    const averageWin = winningTrades > 0 ? Number((netWins / winningTrades).toFixed(2)) : 0;
    const averageLoss = losingTrades > 0 ? Number((netLosses / losingTrades).toFixed(2)) : 0;
    const winRateFraction = winRate / 100.0;
    const expectancy = Number(((winRateFraction * averageWin) - ((1.0 - winRateFraction) * averageLoss)).toFixed(2));
    
    let profitFactor = 0;
    if (netLosses === 0) {
      profitFactor = netWins > 0 ? 999.0 : 0;
    } else {
      profitFactor = Number((netWins / netLosses).toFixed(2));
    }

    const averageRealizedRR = averageLoss > 0 ? Number((averageWin / averageLoss).toFixed(2)) : 0;

    // Drawdown Calculation from daily equity curve
    const drawdownStats = this.calculateDrawdown(dailyRecords, initialCapital);

    // Directional Performance
    const longPerformance = this.calculateSubgroupMetrics(longTrades);
    const shortPerformance = this.calculateSubgroupMetrics(shortTrades);

    // Time in market
    const timeInMarketPercent = totalRegularBars > 0 
      ? Number(((totalBarsInMarket / totalRegularBars) * 100).toFixed(2))
      : 0;

    // Monthly & Yearly aggregations
    const monthlyPnL = this.aggregateByPeriod(trades, 'MONTH');
    const yearlyPnL = this.aggregateByPeriod(trades, 'YEAR');

    // Circuit Breaker triggers
    const circuitBreakerTriggers = dailyRecords.filter(d => d.isCircuitBreakerTripped).length;

    return {
      overview: {
        initialCapital,
        endingCapital: Number((initialCapital + totalNetPnL).toFixed(2)),
        netReturnPercent: Number(((totalNetPnL / initialCapital) * 100).toFixed(2)),
        grossPnL: Number(totalGrossPnL.toFixed(2)),
        netPnL: Number(totalNetPnL.toFixed(2)),
        totalCharges: Number(totalCharges.toFixed(2)),
        brokerage: Number(totalBrokerage.toFixed(2)),
        statutoryCharges: Number(totalStatutory.toFixed(2)),
        gst: Number(totalGST.toFixed(2)),
        slippageCost: Number(totalSlippageCost.toFixed(2)),
        costsPercentOfGross: grossWins > 0 ? Number(((totalCharges / grossWins) * 100).toFixed(2)) : 0
      },
      tradingPerformance: {
        totalTrades,
        winningTrades,
        losingTrades,
        scratchTrades,
        winRate,
        averageWin,
        averageLoss,
        expectancy,
        profitFactor,
        averageRealizedRR
      },
      riskPerformance: {
        maxDrawdown: drawdownStats.maxDrawdown,
        maxDrawdownPercent: drawdownStats.maxDrawdownPercent,
        drawdownDurationDays: drawdownStats.drawdownDurationDays,
        largestWin: Number(largestWin.toFixed(2)),
        largestLoss: Number(largestLoss.toFixed(2)),
        maxConsecutiveWins,
        maxConsecutiveLosses,
        dailyLossLimitTriggers: circuitBreakerTriggers,
        timeInMarketPercent
      },
      directionalAnalysis: {
        long: longPerformance,
        short: shortPerformance
      },
      exitReasonBreakdown: exitReasons,
      periodicBreakdown: {
        monthly: monthlyPnL,
        yearly: yearlyPnL
      }
    };
  }

  /**
   * Calculate maximum drawdown and duration from equity curve
   * @param {Array<Object>} dailyRecords
   * @param {number} initialCapital
   * @returns {Object}
   */
  static calculateDrawdown(dailyRecords, initialCapital) {
    if (!Array.isArray(dailyRecords) || dailyRecords.length === 0) {
      return { maxDrawdown: 0, maxDrawdownPercent: 0, drawdownDurationDays: 0 };
    }

    let peak = initialCapital;
    let maxDrawdown = 0;
    let maxDrawdownPercent = 0;
    let currentDdDays = 0;
    let maxDdDurationDays = 0;

    for (const d of dailyRecords) {
      const equity = d.endingCapital;
      if (equity > peak) {
        peak = equity;
        currentDdDays = 0;
      } else {
        const dd = peak - equity;
        const ddPct = (dd / peak) * 100;
        if (dd > maxDrawdown) {
          maxDrawdown = dd;
          maxDrawdownPercent = ddPct;
        }
        currentDdDays++;
        maxDdDurationDays = Math.max(maxDdDurationDays, currentDdDays);
      }
    }

    return {
      maxDrawdown: Number(maxDrawdown.toFixed(2)),
      maxDrawdownPercent: Number(maxDrawdownPercent.toFixed(2)),
      drawdownDurationDays: maxDdDurationDays
    };
  }

  /**
   * Helper to calculate subgroup metrics (Long or Short)
   * @param {Array<Object>} trades
   * @returns {Object}
   */
  static calculateSubgroupMetrics(trades) {
    const total = trades.length;
    if (total === 0) {
      return { totalTrades: 0, winRate: 0, netPnL: 0, profitFactor: 0, avgTrade: 0 };
    }

    let wins = 0;
    let netPnL = 0;
    let grossWins = 0;
    let grossLosses = 0;

    for (const t of trades) {
      netPnL += t.netPnL;
      if (t.netPnL > 0) {
        wins++;
        grossWins += t.netPnL;
      } else if (t.netPnL < 0) {
        grossLosses += Math.abs(t.netPnL);
      }
    }

    const winRate = Number(((wins / total) * 100).toFixed(2));
    const profitFactor = grossLosses === 0 ? (grossWins > 0 ? 999.0 : 0) : Number((grossWins / grossLosses).toFixed(2));
    const avgTrade = Number((netPnL / total).toFixed(2));

    return {
      totalTrades: total,
      winningTrades: wins,
      winRate,
      netPnL: Number(netPnL.toFixed(2)),
      profitFactor,
      avgTrade
    };
  }

  /**
   * Aggregate P&L by Month or Year
   * @param {Array<Object>} trades
   * @param {'MONTH'|'YEAR'} periodType
   * @returns {Object}
   */
  static aggregateByPeriod(trades, periodType) {
    const summary = {};
    for (const t of trades) {
      const date = t.entryTimestamp.split('T')[0];
      const key = periodType === 'YEAR' ? date.substring(0, 4) : date.substring(0, 7);
      if (!summary[key]) {
        summary[key] = { period: key, trades: 0, wins: 0, grossPnL: 0, netPnL: 0, charges: 0 };
      }
      summary[key].trades++;
      if (t.netPnL > 0) summary[key].wins++;
      summary[key].grossPnL += t.grossPnL;
      summary[key].netPnL += t.netPnL;
      summary[key].charges += t.totalCharges;
    }

    for (const k of Object.keys(summary)) {
      summary[k].grossPnL = Number(summary[k].grossPnL.toFixed(2));
      summary[k].netPnL = Number(summary[k].netPnL.toFixed(2));
      summary[k].charges = Number(summary[k].charges.toFixed(2));
      summary[k].winRate = Number(((summary[k].wins / summary[k].trades) * 100).toFixed(2));
    }

    return summary;
  }

  /**
   * Zero-trade fallback object
   * @param {number} initialCapital
   * @returns {Object}
   */
  static getEmptyMetrics(initialCapital) {
    return {
      overview: {
        initialCapital,
        endingCapital: initialCapital,
        netReturnPercent: 0,
        grossPnL: 0,
        netPnL: 0,
        totalCharges: 0,
        brokerage: 0,
        statutoryCharges: 0,
        gst: 0,
        slippageCost: 0,
        costsPercentOfGross: 0
      },
      tradingPerformance: {
        totalTrades: 0,
        winningTrades: 0,
        losingTrades: 0,
        scratchTrades: 0,
        winRate: 0,
        averageWin: 0,
        averageLoss: 0,
        expectancy: 0,
        profitFactor: 0,
        averageRealizedRR: 0
      },
      riskPerformance: {
        maxDrawdown: 0,
        maxDrawdownPercent: 0,
        drawdownDurationDays: 0,
        largestWin: 0,
        largestLoss: 0,
        maxConsecutiveWins: 0,
        maxConsecutiveLosses: 0,
        dailyLossLimitTriggers: 0,
        timeInMarketPercent: 0
      },
      directionalAnalysis: {
        long: { totalTrades: 0, winRate: 0, netPnL: 0, profitFactor: 0, avgTrade: 0 },
        short: { totalTrades: 0, winRate: 0, netPnL: 0, profitFactor: 0, avgTrade: 0 }
      },
      exitReasonBreakdown: {},
      periodicBreakdown: { monthly: {}, yearly: {} }
    };
  }
}

module.exports = BacktestMetricsCalculator;

