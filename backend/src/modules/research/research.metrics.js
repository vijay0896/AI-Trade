/**
 * @file research.metrics.js
 * @description Advanced performance analytics, regime-conditional trade metrics,
 * Wilson-score confidence intervals, bootstrap resampling, and dual multi-factor stock ranking engines.
 */

const fs = require('fs');
const path = require('path');
const {
  STORAGE_PATHS,
  RANKING_A_CONFIG,
  RANKING_B_CONFIG,
  REGIMES
} = require('./research.constants');

class ResearchMetrics {
  /**
   * Helper: Calculates median
   */
  static median(arr) {
    if (!arr || arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  /**
   * Helper: Calculates mean
   */
  static mean(arr) {
    if (!arr || arr.length === 0) return 0;
    return arr.reduce((acc, val) => acc + val, 0) / arr.length;
  }

  /**
   * Calculates Wilson Score 95% Binomial Confidence Interval for Win Rate
   * @param {number} totalTrades
   * @param {number} winRatePercent
   * @returns {Object}
   */
  static calculateConfidenceIntervals(totalTrades, winRatePercent) {
    if (!totalTrades || totalTrades <= 0) {
      return {
        sampleSize: 0,
        winRate: 0,
        ciLowerPercent: 0,
        ciUpperPercent: 0,
        marginOfErrorPercent: 0,
        isStatisticallyFragile: true,
        fragilityReason: 'Zero trades executed'
      };
    }

    const n = totalTrades;
    const p = winRatePercent / 100;
    const z = 1.95996; // 95% Confidence level

    const denominator = 1 + (z * z) / n;
    const center = p + (z * z) / (2 * n);
    const rad = z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n));

    const lower = Math.max(0, (center - rad) / denominator);
    const upper = Math.min(1, (center + rad) / denominator);

    const isFragile = n < 30;

    return {
      sampleSize: n,
      winRate: Number(winRatePercent.toFixed(2)),
      ciLowerPercent: Number((lower * 100).toFixed(2)),
      ciUpperPercent: Number((upper * 100).toFixed(2)),
      marginOfErrorPercent: Number((((upper - lower) / 2) * 100).toFixed(2)),
      isStatisticallyFragile: isFragile,
      fragilityReason: isFragile
        ? `Sample size of ${n} trades is below standard statistical threshold (N < 30). Confidence interval spans [${(lower * 100).toFixed(1)}%, ${(upper * 100).toFixed(1)}%], indicating extreme sample fragility.`
        : 'Sample size meets basic sample adequacy threshold (N >= 30).'
    };
  }

  /**
   * Runs non-parametric Bootstrap Resampling (Monte Carlo with replacement)
   * on realized trade Net P&L to evaluate distribution of potential outcomes.
   * @param {Array<Object>} trades
   * @param {number} [iterations=1000]
   * @returns {Object}
   */
  static runBootstrapResampling(trades, iterations = 1000) {
    if (!trades || trades.length === 0) {
      return {
        iterations: 0,
        medianNetPnL: 0,
        percentile5NetPnL: 0,
        percentile95NetPnL: 0,
        probabilityOfLossPercent: 100,
        standardError: 0
      };
    }

    const netPnLs = trades.map(t => (typeof t.netPnL === 'number' ? t.netPnL : parseFloat(t.netPnL) || 0));
    const bootstrapTotals = [];

    // Seeded/deterministic pseudo-random generator
    let seed = 123456789;
    const pseudoRandom = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };

    const n = netPnLs.length;
    for (let iter = 0; iter < iterations; iter++) {
      let sampleSum = 0;
      for (let i = 0; i < n; i++) {
        const randIdx = Math.floor(pseudoRandom() * n);
        sampleSum += netPnLs[randIdx];
      }
      bootstrapTotals.push(sampleSum);
    }

    bootstrapTotals.sort((a, b) => a - b);
    const p5Idx = Math.floor(iterations * 0.05);
    const p50Idx = Math.floor(iterations * 0.50);
    const p95Idx = Math.floor(iterations * 0.95);

    const lossCount = bootstrapTotals.filter(total => total < 0).length;
    const meanTotal = this.mean(bootstrapTotals);
    const stdDevTotal = Math.sqrt(
      bootstrapTotals.reduce((sum, val) => sum + Math.pow(val - meanTotal, 2), 0) / (iterations - 1)
    );

    return {
      iterations,
      medianNetPnL: Number(bootstrapTotals[p50Idx].toFixed(2)),
      percentile5NetPnL: Number(bootstrapTotals[p5Idx].toFixed(2)),
      percentile95NetPnL: Number(bootstrapTotals[p95Idx].toFixed(2)),
      probabilityOfLossPercent: Number(((lossCount / iterations) * 100).toFixed(2)),
      standardError: Number(stdDevTotal.toFixed(2))
    };
  }

  /**
   * Evaluates Strategy Performance breakdown across years and half-years
   * @param {Array<Object>} trades
   * @returns {Object}
   */
  static calculatePeriodBreakdown(trades) {
    const yearly = {};
    const monthly = {};

    for (const t of trades) {
      const dateStr = (t.entryTimestamp || '').split('T')[0];
      if (!dateStr) continue;

      const year = dateStr.slice(0, 4);
      const month = dateStr.slice(0, 7);
      const halfYear = `${year}-H${parseInt(dateStr.slice(5, 7), 10) <= 6 ? '1' : '2'}`;
      const pnl = typeof t.netPnL === 'number' ? t.netPnL : parseFloat(t.netPnL) || 0;
      const isWin = pnl > 0;

      // Yearly
      if (!yearly[year]) {
        yearly[year] = { trades: 0, wins: 0, netPnL: 0, grossPnL: 0, charges: 0 };
      }
      yearly[year].trades++;
      if (isWin) yearly[year].wins++;
      yearly[year].netPnL += pnl;

      // Half-Yearly
      if (!yearly[halfYear]) {
        yearly[halfYear] = { trades: 0, wins: 0, netPnL: 0, grossPnL: 0, charges: 0 };
      }
      yearly[halfYear].trades++;
      if (isWin) yearly[halfYear].wins++;
      yearly[halfYear].netPnL += pnl;

      // Monthly
      if (!monthly[month]) {
        monthly[month] = { trades: 0, wins: 0, netPnL: 0 };
      }
      monthly[month].trades++;
      if (isWin) monthly[month].wins++;
      monthly[month].netPnL += pnl;
    }

    // Format Yearly
    const formattedYearly = {};
    for (const [period, data] of Object.entries(yearly)) {
      formattedYearly[period] = {
        trades: data.trades,
        winRate: data.trades > 0 ? Number(((data.wins / data.trades) * 100).toFixed(2)) : 0,
        netPnL: Number(data.netPnL.toFixed(2))
      };
    }

    // Monthly consistency: % of active trading months that were net profitable
    const activeMonths = Object.values(monthly);
    const profitableMonths = activeMonths.filter(m => m.netPnL > 0).length;
    const monthlyConsistencyPercent = activeMonths.length > 0
      ? Number(((profitableMonths / activeMonths.length) * 100).toFixed(2))
      : 0;

    return {
      yearly: formattedYearly,
      activeMonthsCount: activeMonths.length,
      profitableMonthsCount: profitableMonths,
      monthlyConsistencyPercent
    };
  }

  /**
   * Evaluates Trade Performance conditioned on Classified Session Regime
   * @param {Array<Object>} trades
   * @param {Map<string, string>|Object} sessionRegimes Map of dateStr -> regime
   * @returns {Object}
   */
  static calculateRegimePerformance(trades, sessionRegimes) {
    const regimes = [
      REGIMES.STRONG_TREND_UP,
      REGIMES.STRONG_TREND_DOWN,
      REGIMES.WEAK_TREND,
      REGIMES.SIDEWAYS,
      REGIMES.MIXED_UNCLEAR
    ];

    const breakdown = {};
    for (const r of regimes) {
      breakdown[r] = {
        trades: 0,
        wins: 0,
        netPnL: 0,
        theoreticalGross: 0,
        charges: 0,
        winRate: 0
      };
    }

    for (const t of trades) {
      const dateStr = (t.entryTimestamp || '').split('T')[0];
      const regime = sessionRegimes[dateStr] || REGIMES.MIXED_UNCLEAR;
      const target = breakdown[regime] || breakdown[REGIMES.MIXED_UNCLEAR];

      const pnl = typeof t.netPnL === 'number' ? t.netPnL : parseFloat(t.netPnL) || 0;
      const gross = typeof t.theoreticalGrossPnL === 'number' ? t.theoreticalGrossPnL : parseFloat(t.theoreticalGrossPnL) || 0;
      const charges = typeof t.totalCharges === 'number' ? t.totalCharges : parseFloat(t.totalCharges) || 0;

      target.trades++;
      if (pnl > 0) target.wins++;
      target.netPnL += pnl;
      target.theoreticalGross += gross;
      target.charges += charges;
    }

    for (const r of regimes) {
      const b = breakdown[r];
      b.winRate = b.trades > 0 ? Number(((b.wins / b.trades) * 100).toFixed(2)) : 0;
      b.netPnL = Number(b.netPnL.toFixed(2));
      b.theoreticalGross = Number(b.theoreticalGross.toFixed(2));
      b.charges = Number(b.charges.toFixed(2));
    }

    return breakdown;
  }

  /**
   * Helper: Min-Max Normalization into [0, 1]
   */
  static normalize(val, min, max, invert = false) {
    if (max === min) return 0.5;
    const norm = (val - min) / (max - min);
    const clamped = Math.max(0, Math.min(1, norm));
    return invert ? 1 - clamped : clamped;
  }

  /**
   * Dual Multi-Factor Stock Ranking Engine:
   * Generates Ranking A (Intraday Price Behaviour) and Ranking B (Trading Strategy Performance)
   * with complete weight vectors, raw metric disclosure, and weighting sensitivity analysis.
   *
   * @param {Object} stockBehaviours Map of symbol -> behaviour metrics
   * @param {Object} strategyMetrics Map of symbol -> strategy performance metrics
   * @returns {Object} Complete ranking matrices and sensitivity analysis
   */
  static computeStockRankings(stockBehaviours, strategyMetrics) {
    const symbols = Object.keys(stockBehaviours);

    // ==========================================
    // 1. RANKING A: INTRADAY PRICE BEHAVIOUR
    // ==========================================
    const rawA = {};
    for (const s of symbols) {
      const b = stockBehaviours[s];
      rawA[s] = {
        symbol: s,
        trendPercent: (b.classification?.regimePercentages?.STRONG_TREND_UP || 0) +
                      (b.classification?.regimePercentages?.STRONG_TREND_DOWN || 0),
        efficiencyRatio: b.directionalMovement.averageSessionEfficiencyRatio,
        rangePercent: b.volatility.averageDailyRangePercent,
        choppiness: b.directionalMovement.meanChoppinessIndex,
        vwapCrossovers: b.sideways.averageVwapCrossoversPerSession,
        adxStrength: b.directionalMovement.adxAbove25Percent,
        tradedValueProxy: b.volumeLiquidity.averageDailyTradedValueCrores
      };
    }

    // Determine min/max for normalization across symbols
    const getBounds = (arr, key) => {
      const vals = arr.map(item => item[key]);
      return { min: Math.min(...vals), max: Math.max(...vals) };
    };

    const rawAList = Object.values(rawA);
    const boundsA = {
      trendPercent: getBounds(rawAList, 'trendPercent'),
      efficiencyRatio: getBounds(rawAList, 'efficiencyRatio'),
      rangePercent: getBounds(rawAList, 'rangePercent'),
      choppiness: getBounds(rawAList, 'choppiness'),
      vwapCrossovers: getBounds(rawAList, 'vwapCrossovers'),
      adxStrength: getBounds(rawAList, 'adxStrength'),
      tradedValueProxy: getBounds(rawAList, 'tradedValueProxy')
    };

    // Calculate composite scores for all weight variants
    const rankingASensitivity = {};
    for (const [weightVariant, weights] of Object.entries(RANKING_A_CONFIG.weights)) {
      const scored = symbols.map(s => {
        const raw = rawA[s];
        const sTrend = this.normalize(raw.trendPercent, boundsA.trendPercent.min, boundsA.trendPercent.max);
        const sER = this.normalize(raw.efficiencyRatio, boundsA.efficiencyRatio.min, boundsA.efficiencyRatio.max);
        const sRange = this.normalize(raw.rangePercent, boundsA.rangePercent.min, boundsA.rangePercent.max);
        const sChop = this.normalize(raw.choppiness, boundsA.choppiness.min, boundsA.choppiness.max, true); // Lower chop is better
        const sVwap = this.normalize(raw.vwapCrossovers, boundsA.vwapCrossovers.min, boundsA.vwapCrossovers.max, true); // Fewer crosses is better
        const sAdx = this.normalize(raw.adxStrength, boundsA.adxStrength.min, boundsA.adxStrength.max);
        const sVol = this.normalize(raw.tradedValueProxy, boundsA.tradedValueProxy.min, boundsA.tradedValueProxy.max);

        const composite = (
          sTrend * weights.trendPercent +
          sER * weights.efficiencyRatio +
          sRange * weights.rangePercent +
          sChop * weights.choppiness +
          sVwap * weights.vwapCrossovers +
          sAdx * weights.adxStrength +
          sVol * weights.tradedValueProxy
        ) * 100;

        return {
          symbol: s,
          compositeScore: Number(composite.toFixed(2)),
          raw: rawA[s],
          normalized: {
            trendPercent: Number(sTrend.toFixed(3)),
            efficiencyRatio: Number(sER.toFixed(3)),
            rangePercent: Number(sRange.toFixed(3)),
            choppiness: Number(sChop.toFixed(3)),
            vwapCrossovers: Number(sVwap.toFixed(3)),
            adxStrength: Number(sAdx.toFixed(3)),
            tradedValueProxy: Number(sVol.toFixed(3))
          }
        };
      });

      scored.sort((a, b) => b.compositeScore - a.compositeScore);
      scored.forEach((item, idx) => { item.rank = idx + 1; });
      rankingASensitivity[weightVariant] = scored;
    }

    // ==========================================
    // 2. RANKING B: TRADING STRATEGY PERFORMANCE
    // ==========================================
    const rawB = {};
    for (const s of symbols) {
      const sm = strategyMetrics[s] || {};
      rawB[s] = {
        symbol: s,
        netExpectancy: sm.netExpectancy || 0,
        profitFactor: sm.profitFactor || 0,
        maxDrawdown: sm.maxDrawdownPercent || 0,
        winRate: sm.winRate || 0,
        costDragRatio: sm.grossRealizedPnL > 0 ? (sm.totalCharges / sm.grossRealizedPnL) : 2.0,
        slippageResilience: sm.slippageStress?.retention5bpsPercent || 0,
        sampleSizeAdequacy: sm.totalTrades || 0
      };
    }

    const rawBList = Object.values(rawB);
    const boundsB = {
      netExpectancy: getBounds(rawBList, 'netExpectancy'),
      profitFactor: getBounds(rawBList, 'profitFactor'),
      maxDrawdown: getBounds(rawBList, 'maxDrawdown'),
      winRate: getBounds(rawBList, 'winRate'),
      costDragRatio: getBounds(rawBList, 'costDragRatio'),
      slippageResilience: getBounds(rawBList, 'slippageResilience'),
      sampleSizeAdequacy: getBounds(rawBList, 'sampleSizeAdequacy')
    };

    const rankingBSensitivity = {};
    for (const [weightVariant, weights] of Object.entries(RANKING_B_CONFIG.weights)) {
      const scored = symbols.map(s => {
        const raw = rawB[s];
        const sExp = this.normalize(raw.netExpectancy, boundsB.netExpectancy.min, boundsB.netExpectancy.max);
        const sPF = this.normalize(raw.profitFactor, boundsB.profitFactor.min, boundsB.profitFactor.max);
        const sDD = this.normalize(raw.maxDrawdown, boundsB.maxDrawdown.min, boundsB.maxDrawdown.max, true); // Lower DD is better
        const sWR = this.normalize(raw.winRate, boundsB.winRate.min, boundsB.winRate.max);
        const sCost = this.normalize(raw.costDragRatio, boundsB.costDragRatio.min, boundsB.costDragRatio.max, true); // Lower drag is better
        const sSlip = this.normalize(raw.slippageResilience, boundsB.slippageResilience.min, boundsB.slippageResilience.max);
        const sSamp = this.normalize(raw.sampleSizeAdequacy, boundsB.sampleSizeAdequacy.min, boundsB.sampleSizeAdequacy.max);

        const composite = (
          sExp * weights.netExpectancy +
          sPF * weights.profitFactor +
          sDD * weights.maxDrawdown +
          sWR * weights.winRate +
          sCost * weights.costDragRatio +
          sSlip * weights.slippageResilience +
          sSamp * weights.sampleSizeAdequacy
        ) * 100;

        return {
          symbol: s,
          compositeScore: Number(composite.toFixed(2)),
          raw: rawB[s],
          normalized: {
            netExpectancy: Number(sExp.toFixed(3)),
            profitFactor: Number(sPF.toFixed(3)),
            maxDrawdown: Number(sDD.toFixed(3)),
            winRate: Number(sWR.toFixed(3)),
            costDragRatio: Number(sCost.toFixed(3)),
            slippageResilience: Number(sSlip.toFixed(3)),
            sampleSizeAdequacy: Number(sSamp.toFixed(3))
          }
        };
      });

      scored.sort((a, b) => b.compositeScore - a.compositeScore);
      scored.forEach((item, idx) => { item.rank = idx + 1; });
      rankingBSensitivity[weightVariant] = scored;
    }

    return {
      rankingA: {
        description: 'Ranking A: Intraday Price Behaviour (Independent of Trading Strategy)',
        baselineRanking: rankingASensitivity.baseline,
        weightingSensitivity: rankingASensitivity,
        rawMetrics: rawA
      },
      rankingB: {
        description: 'Ranking B: Trading Strategy Performance (Variant E / Intraday Trend Following)',
        baselineRanking: rankingBSensitivity.baseline,
        weightingSensitivity: rankingBSensitivity,
        rawMetrics: rawB
      }
    };
  }
}

module.exports = ResearchMetrics;

