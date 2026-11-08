/**
 * @file research.calculator.js
 * @description Comprehensive quantitative calculation engine for stock behaviour analysis:
 * Intraday Volatility, Directional Movement, Sideways Dynamics, Opening Range, and Volume/Liquidity Proxies.
 */

const { OPENING_RANGE_CONFIG } = require('./research.constants');

class ResearchCalculator {
  /**
   * Helper: Calculates median of an array of numbers
   * @param {Array<number>} arr
   * @returns {number}
   */
  static median(arr) {
    if (!arr || arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  /**
   * Helper: Calculates percentile (p between 0 and 100)
   * @param {Array<number>} arr
   * @param {number} p
   * @returns {number}
   */
  static percentile(arr, p) {
    if (!arr || arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const index = (p / 100) * (sorted.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index - lower;
    return sorted[lower] * (1 - weight) + sorted[upper] * weight;
  }

  /**
   * Helper: Calculates mean of an array of numbers
   * @param {Array<number>} arr
   * @returns {number}
   */
  static mean(arr) {
    if (!arr || arr.length === 0) return 0;
    const sum = arr.reduce((acc, val) => acc + val, 0);
    return sum / arr.length;
  }

  /**
   * Helper: Calculates sample standard deviation
   * @param {Array<number>} arr
   * @param {number} [meanVal]
   * @returns {number}
   */
  static stdDev(arr, meanVal = null) {
    if (!arr || arr.length <= 1) return 0;
    const m = meanVal !== null ? meanVal : this.mean(arr);
    const variance = arr.reduce((acc, val) => acc + Math.pow(val - m, 2), 0) / (arr.length - 1);
    return Math.sqrt(variance);
  }

  /**
   * A. Intraday Volatility Analysis
   * @param {Object} sessions Map of dateStr -> Array<Candle>
   * @returns {Object}
   */
  static calculateIntradayVolatility(sessions) {
    const dailyRanges = [];
    const dailyRangePcts = [];
    const atrValues = [];
    const atrPctValues = [];
    const byYear = {};
    const byMonth = {};

    for (const [dateStr, candles] of Object.entries(sessions)) {
      if (!candles || candles.length === 0) continue;
      const dayHigh = Math.max(...candles.map(c => c.high));
      const dayLow = Math.min(...candles.map(c => c.low));
      const dayOpen = candles[0].open;
      const dayRange = dayHigh - dayLow;
      const dayRangePct = dayOpen > 0 ? (dayRange / dayOpen) * 100 : 0;

      dailyRanges.push(dayRange);
      dailyRangePcts.push(dayRangePct);

      const year = dateStr.slice(0, 4);
      const month = dateStr.slice(5, 7);

      if (!byYear[year]) byYear[year] = { ranges: [], rangePcts: [], atrs: [] };
      byYear[year].ranges.push(dayRange);
      byYear[year].rangePcts.push(dayRangePct);

      if (!byMonth[month]) byMonth[month] = { rangePcts: [] };
      byMonth[month].rangePcts.push(dayRangePct);

      for (const c of candles) {
        if (c.atr14 !== null && c.atr14 !== undefined && !isNaN(c.atr14)) {
          atrValues.push(c.atr14);
          if (c.close > 0) {
            const atrPct = (c.atr14 / c.close) * 100;
            atrPctValues.push(atrPct);
            byYear[year].atrs.push(atrPct);
          }
        }
      }
    }

    const meanRangePct = this.mean(dailyRangePcts);
    const stdDevRangePct = this.stdDev(dailyRangePcts, meanRangePct);

    // Format by year
    const yearlyBreakdown = {};
    for (const [y, data] of Object.entries(byYear)) {
      yearlyBreakdown[y] = {
        sessionsCount: data.ranges.length,
        meanDailyRange: Number(this.mean(data.ranges).toFixed(2)),
        medianDailyRange: Number(this.median(data.ranges).toFixed(2)),
        meanRangePct: Number(this.mean(data.rangePcts).toFixed(2)),
        medianRangePct: Number(this.median(data.rangePcts).toFixed(2)),
        meanAtrPct: Number(this.mean(data.atrs).toFixed(3))
      };
    }

    // Format by month
    const monthlyBreakdown = {};
    for (const [m, data] of Object.entries(byMonth)) {
      monthlyBreakdown[m] = {
        meanRangePct: Number(this.mean(data.rangePcts).toFixed(2)),
        medianRangePct: Number(this.median(data.rangePcts).toFixed(2))
      };
    }

    return {
      averageDailyRange: Number(this.mean(dailyRanges).toFixed(2)),
      medianDailyRange: Number(this.median(dailyRanges).toFixed(2)),
      averageDailyRangePercent: Number(meanRangePct.toFixed(2)),
      medianDailyRangePercent: Number(this.median(dailyRangePcts).toFixed(2)),
      stdDevDailyRangePercent: Number(stdDevRangePct.toFixed(2)),
      percentile25DailyRangePercent: Number(this.percentile(dailyRangePcts, 25).toFixed(2)),
      percentile75DailyRangePercent: Number(this.percentile(dailyRangePcts, 75).toFixed(2)),
      average5mAtr: Number(this.mean(atrValues).toFixed(2)),
      median5mAtr: Number(this.median(atrValues).toFixed(2)),
      average5mAtrPercent: Number(this.mean(atrPctValues).toFixed(3)),
      median5mAtrPercent: Number(this.median(atrPctValues).toFixed(3)),
      yearlyVolatility: yearlyBreakdown,
      monthlyVolatility: monthlyBreakdown
    };
  }

  /**
   * B. Directional Movement Analysis
   * @param {Object} sessions Map of dateStr -> Array<Candle>
   * @returns {Object}
   */
  static calculateDirectionalMovement(sessions) {
    const sessionERs = [];
    const sessionReturns = [];
    const chopValues = [];
    const adxValues = [];
    let adxAbove20Count = 0;
    let adxAbove25Count = 0;
    let totalAdxBars = 0;
    let adxRisingCount = 0;
    let adxFallingCount = 0;
    let bullishStackBars = 0;
    let bearishStackBars = 0;
    let totalEmaBars = 0;
    let strongDirectionalSessions = 0;
    let weakDirectionalSessions = 0;

    for (const candles of Object.values(sessions)) {
      if (!candles || candles.length < 2) continue;

      const firstBar = candles[0];
      const lastBar = candles[candles.length - 1];

      // Session Return
      const netChange = lastBar.close - firstBar.open;
      const sessionReturnPct = firstBar.open > 0 ? (netChange / firstBar.open) * 100 : 0;
      sessionReturns.push(sessionReturnPct);

      if (Math.abs(sessionReturnPct) >= 1.0) {
        strongDirectionalSessions++;
      } else if (Math.abs(sessionReturnPct) < 0.5) {
        weakDirectionalSessions++;
      }

      // Session Efficiency Ratio: |Close_N - Open_1| / (|Close_1 - Open_1| + sum(|Close_t - Close_t-1|))
      let pathLength = Math.abs(firstBar.close - firstBar.open);
      for (let t = 1; t < candles.length; t++) {
        pathLength += Math.abs(candles[t].close - candles[t - 1].close);
      }
      const netDisplacement = Math.abs(netChange);
      const sessionER = pathLength > 0 ? Math.min(1, netDisplacement / pathLength) : 0;
      sessionERs.push(sessionER);

      // Bar level indicator statistics
      let prevAdx = null;
      for (const c of candles) {
        // Choppiness
        if (c.choppiness14 !== null && !isNaN(c.choppiness14)) {
          chopValues.push(c.choppiness14);
        }

        // ADX
        if (c.adx14 !== null && !isNaN(c.adx14)) {
          adxValues.push(c.adx14);
          totalAdxBars++;
          if (c.adx14 >= 20) adxAbove20Count++;
          if (c.adx14 >= 25) adxAbove25Count++;
          if (prevAdx !== null) {
            if (c.adx14 > prevAdx) adxRisingCount++;
            else adxFallingCount++;
          }
          prevAdx = c.adx14;
        }

        // EMA 20/50 Alignment
        if (c.ema20 !== null && c.ema50 !== null) {
          totalEmaBars++;
          if (c.ema20 > c.ema50) bullishStackBars++;
          else if (c.ema20 < c.ema50) bearishStackBars++;
        }
      }
    }

    const totalSessions = sessionReturns.length;
    const meanER = this.mean(sessionERs);
    const medianER = this.median(sessionERs);
    const chopMean = this.mean(chopValues);
    const chopMedian = this.median(chopValues);
    const chopAbove60Pct = chopValues.length > 0
      ? (chopValues.filter(v => v >= 60).length / chopValues.length) * 100
      : 0;
    const chopBelow40Pct = chopValues.length > 0
      ? (chopValues.filter(v => v < 40).length / chopValues.length) * 100
      : 0;

    return {
      averageSessionEfficiencyRatio: Number(meanER.toFixed(3)),
      medianSessionEfficiencyRatio: Number(medianER.toFixed(3)),
      stdDevSessionEfficiencyRatio: Number(this.stdDev(sessionERs, meanER).toFixed(3)),
      meanChoppinessIndex: Number(chopMean.toFixed(2)),
      medianChoppinessIndex: Number(chopMedian.toFixed(2)),
      percentChoppinessAbove60: Number(chopAbove60Pct.toFixed(2)),
      percentChoppinessBelow40: Number(chopBelow40Pct.toFixed(2)),
      adxAbove20Percent: totalAdxBars > 0 ? Number(((adxAbove20Count / totalAdxBars) * 100).toFixed(2)) : 0,
      adxAbove25Percent: totalAdxBars > 0 ? Number(((adxAbove25Count / totalAdxBars) * 100).toFixed(2)) : 0,
      adxRisingPercent: (adxRisingCount + adxFallingCount) > 0
        ? Number(((adxRisingCount / (adxRisingCount + adxFallingCount)) * 100).toFixed(2))
        : 0,
      emaBullishAlignmentPercent: totalEmaBars > 0
        ? Number(((bullishStackBars / totalEmaBars) * 100).toFixed(2))
        : 0,
      emaBearishAlignmentPercent: totalEmaBars > 0
        ? Number(((bearishStackBars / totalEmaBars) * 100).toFixed(2))
        : 0,
      totalSessionsAnalyzed: totalSessions,
      strongDirectionalSessionsCount: strongDirectionalSessions,
      strongDirectionalSessionsPercent: totalSessions > 0
        ? Number(((strongDirectionalSessions / totalSessions) * 100).toFixed(2))
        : 0,
      weakDirectionalSessionsCount: weakDirectionalSessions,
      weakDirectionalSessionsPercent: totalSessions > 0
        ? Number(((weakDirectionalSessions / totalSessions) * 100).toFixed(2))
        : 0
    };
  }

  /**
   * C. Sideways Behaviour Analysis
   * @param {Object} sessions Map of dateStr -> Array<Candle>
   * @returns {Object}
   */
  static calculateSidewaysBehaviour(sessions) {
    const vwapCrossingsPerSession = [];
    let totalBars = 0;
    let barsAboveVwap = 0;
    let barsBelowVwap = 0;
    let repeatedCrossingsSessions = 0; // >= 5 crossings
    let lowErSessions = 0;             // ER <= 0.22
    let highChopSessions = 0;          // Mean session Chop >= 60
    let lowDirectionalSessions = 0;    // |Return| < 0.40%

    for (const candles of Object.values(sessions)) {
      if (!candles || candles.length < 2) continue;

      let crossings = 0;
      let sessionChopSum = 0;
      let sessionChopCount = 0;
      let pathLength = Math.abs(candles[0].close - candles[0].open);

      for (let i = 0; i < candles.length; i++) {
        const c = candles[i];
        totalBars++;
        if (c.vwap !== null) {
          if (c.close > c.vwap) barsAboveVwap++;
          else if (c.close < c.vwap) barsBelowVwap++;

          if (i > 0 && candles[i - 1].vwap !== null) {
            const prevDiff = candles[i - 1].close - candles[i - 1].vwap;
            const currDiff = c.close - c.vwap;
            if (prevDiff * currDiff < 0) {
              crossings++;
            }
          }
        }

        if (c.choppiness14 !== null) {
          sessionChopSum += c.choppiness14;
          sessionChopCount++;
        }

        if (i > 0) {
          pathLength += Math.abs(c.close - candles[i - 1].close);
        }
      }

      vwapCrossingsPerSession.push(crossings);
      if (crossings >= 5) {
        repeatedCrossingsSessions++;
      }

      // Session ER
      const netDisp = Math.abs(candles[candles.length - 1].close - candles[0].open);
      const er = pathLength > 0 ? netDisp / pathLength : 0;
      if (er <= 0.22) {
        lowErSessions++;
      }

      // Mean Session Chop
      const meanChop = sessionChopCount > 0 ? sessionChopSum / sessionChopCount : 0;
      if (meanChop >= 60.0) {
        highChopSessions++;
      }

      // Low Directional Movement
      const retPct = candles[0].open > 0
        ? Math.abs((candles[candles.length - 1].close - candles[0].open) / candles[0].open) * 100
        : 0;
      if (retPct < 0.40) {
        lowDirectionalSessions++;
      }
    }

    const totalSessions = vwapCrossingsPerSession.length;

    return {
      averageVwapCrossoversPerSession: Number(this.mean(vwapCrossingsPerSession).toFixed(2)),
      medianVwapCrossoversPerSession: Number(this.median(vwapCrossingsPerSession).toFixed(2)),
      maxVwapCrossoversInSession: Math.max(...vwapCrossingsPerSession, 0),
      percentTimeAboveVwap: totalBars > 0 ? Number(((barsAboveVwap / totalBars) * 100).toFixed(2)) : 0,
      percentTimeBelowVwap: totalBars > 0 ? Number(((barsBelowVwap / totalBars) * 100).toFixed(2)) : 0,
      sessionsWithRepeatedCrossingsCount: repeatedCrossingsSessions,
      percentSessionsWithRepeatedCrossings: totalSessions > 0
        ? Number(((repeatedCrossingsSessions / totalSessions) * 100).toFixed(2))
        : 0,
      percentSessionsLowEfficiencyRatio: totalSessions > 0
        ? Number(((lowErSessions / totalSessions) * 100).toFixed(2))
        : 0,
      percentSessionsHighChoppiness: totalSessions > 0
        ? Number(((highChopSessions / totalSessions) * 100).toFixed(2))
        : 0,
      percentSessionsLowDirectionalMovement: totalSessions > 0
        ? Number(((lowDirectionalSessions / totalSessions) * 100).toFixed(2))
        : 0
    };
  }

  /**
   * D. Opening Range (ORB) Analysis
   * @param {Object} sessions Map of dateStr -> Array<Candle>
   * @param {Object} [config=OPENING_RANGE_CONFIG]
   * @returns {Object}
   */
  static calculateOpeningRangeAnalysis(sessions, config = OPENING_RANGE_CONFIG) {
    const orWidths = [];
    const orWidthPcts = [];
    const breakoutFollowThroughs = [];
    const minutesToFirstBreakout = [];
    let eligibleSessions = 0;
    let breakoutSessions = 0;
    let bullishBreakoutSessions = 0;
    let bearishBreakoutSessions = 0;
    let failedBreakoutSessions = 0;
    const byYear = {};

    for (const [dateStr, candles] of Object.entries(sessions)) {
      if (!candles || candles.length < 4) continue;

      // Extract OR candles (09:15, 09:20, 09:25)
      const orCandles = candles.filter(c => {
        const time = c.timestamp.split('T')[1];
        return time >= config.startBar && time <= config.endBar;
      });

      if (orCandles.length !== 3) continue;
      eligibleSessions++;

      const orHigh = Math.max(...orCandles.map(c => c.high));
      const orLow = Math.min(...orCandles.map(c => c.low));
      const orWidth = orHigh - orLow;
      const dayOpen = orCandles[0].open;
      const orWidthPct = dayOpen > 0 ? (orWidth / dayOpen) * 100 : 0;

      orWidths.push(orWidth);
      orWidthPcts.push(orWidthPct);

      const year = dateStr.slice(0, 4);
      if (!byYear[year]) byYear[year] = [];
      byYear[year].push(orWidthPct);

      // Remaining bars up to cutoff (09:30 to 14:30)
      const tradingBars = candles.filter(c => {
        const time = c.timestamp.split('T')[1];
        return time >= config.firstBreakoutBar && time <= config.cutoffTime;
      });

      let hasBrokenOut = false;
      let breakoutType = null;
      let breakoutBarIndex = -1;

      for (let i = 0; i < tradingBars.length; i++) {
        const bar = tradingBars[i];
        if (bar.close > orHigh) {
          hasBrokenOut = true;
          breakoutType = 'BULLISH';
          breakoutBarIndex = i;
          break;
        } else if (bar.close < orLow) {
          hasBrokenOut = true;
          breakoutType = 'BEARISH';
          breakoutBarIndex = i;
          break;
        }
      }

      if (hasBrokenOut) {
        breakoutSessions++;
        if (breakoutType === 'BULLISH') bullishBreakoutSessions++;
        if (breakoutType === 'BEARISH') bearishBreakoutSessions++;

        // Minutes to first breakout: each bar after 09:30 is 5 minutes
        const mins = (breakoutBarIndex + 1) * 5;
        minutesToFirstBreakout.push(mins);

        // Check for Failed Breakout: price closes back inside OR within K bars
        const k = config.failedBreakoutBars || 3;
        const subsequentBars = tradingBars.slice(breakoutBarIndex + 1, breakoutBarIndex + 1 + k);
        let isFailed = false;

        if (breakoutType === 'BULLISH') {
          isFailed = subsequentBars.some(b => b.close <= orHigh);
        } else {
          isFailed = subsequentBars.some(b => b.close >= orLow);
        }

        if (isFailed) {
          failedBreakoutSessions++;
        }

        // Breakout Follow-through (MFE normalized by OR Width)
        const remainingBars = tradingBars.slice(breakoutBarIndex);
        if (orWidth > 0 && remainingBars.length > 0) {
          if (breakoutType === 'BULLISH') {
            const maxExt = Math.max(...remainingBars.map(b => b.high));
            const mfe = (maxExt - orHigh) / orWidth;
            breakoutFollowThroughs.push(Math.max(0, mfe));
          } else {
            const minExt = Math.min(...remainingBars.map(b => b.low));
            const mfe = (orLow - minExt) / orWidth;
            breakoutFollowThroughs.push(Math.max(0, mfe));
          }
        }
      }
    }

    const yearlyOrWidthPct = {};
    for (const [y, pcts] of Object.entries(byYear)) {
      yearlyOrWidthPct[y] = {
        meanOrWidthPct: Number(this.mean(pcts).toFixed(2)),
        medianOrWidthPct: Number(this.median(pcts).toFixed(2))
      };
    }

    return {
      averageOpeningRangeWidth: Number(this.mean(orWidths).toFixed(2)),
      medianOpeningRangeWidth: Number(this.median(orWidths).toFixed(2)),
      averageOpeningRangePercent: Number(this.mean(orWidthPcts).toFixed(2)),
      medianOpeningRangePercent: Number(this.median(orWidthPcts).toFixed(2)),
      eligibleSessionsCount: eligibleSessions,
      breakoutFrequencyPercent: eligibleSessions > 0
        ? Number(((breakoutSessions / eligibleSessions) * 100).toFixed(2))
        : 0,
      bullishBreakoutPercent: eligibleSessions > 0
        ? Number(((bullishBreakoutSessions / eligibleSessions) * 100).toFixed(2))
        : 0,
      bearishBreakoutPercent: eligibleSessions > 0
        ? Number(((bearishBreakoutSessions / eligibleSessions) * 100).toFixed(2))
        : 0,
      breakoutFollowThroughMeanMultiple: Number(this.mean(breakoutFollowThroughs).toFixed(2)),
      breakoutFollowThroughMedianMultiple: Number(this.median(breakoutFollowThroughs).toFixed(2)),
      failedBreakoutFrequencyPercent: breakoutSessions > 0
        ? Number(((failedBreakoutSessions / breakoutSessions) * 100).toFixed(2))
        : 0,
      averageMinutesToFirstBreakout: Number(this.mean(minutesToFirstBreakout).toFixed(1)),
      medianMinutesToFirstBreakout: Number(this.median(minutesToFirstBreakout).toFixed(1)),
      yearlyOpeningRangeVolatility: yearlyOrWidthPct
    };
  }

  /**
   * E. Volume and Liquidity Proxies
   * Note: Traded value is estimated using candle volume * typical VWAP price.
   * This is an empirical trading-activity proxy, NOT an order-book depth measurement.
   * @param {Object} sessions Map of dateStr -> Array<Candle>
   * @returns {Object}
   */
  static calculateVolumeAndLiquidityProxies(sessions) {
    const volumes = [];
    const rvolValues = [];
    const dailyTradedValuesCrores = [];

    for (const candles of Object.values(sessions)) {
      if (!candles || candles.length === 0) continue;

      let sessionTradedValue = 0;
      for (const c of candles) {
        if (c.volume !== null && !isNaN(c.volume)) {
          volumes.push(c.volume);

          // Traded value proxy in INR = volume * (vwap || close)
          const px = c.vwap || c.close;
          if (px > 0) {
            sessionTradedValue += c.volume * px;
          }
        }

        if (c.relativeVolume20 !== null && !isNaN(c.relativeVolume20)) {
          rvolValues.push(c.relativeVolume20);
        }
      }

      // Convert to Crores (1 Cr = 1e7 INR)
      dailyTradedValuesCrores.push(sessionTradedValue / 1e7);
    }

    const meanVol = this.mean(volumes);
    const stdDevVol = this.stdDev(volumes, meanVol);
    const volumeCv = meanVol > 0 ? stdDevVol / meanVol : 0; // Coefficient of Variation

    const rvolAbove12 = rvolValues.filter(v => v >= 1.2).length;
    const rvolAbove15 = rvolValues.filter(v => v >= 1.5).length;
    const rvolAbove20 = rvolValues.filter(v => v >= 2.0).length;
    const totalRvol = rvolValues.length;

    return {
      average5mVolume: Math.round(meanVol),
      median5mVolume: Math.round(this.median(volumes)),
      volumeCoefficientOfVariation: Number(volumeCv.toFixed(2)),
      averageRvol: Number(this.mean(rvolValues).toFixed(2)),
      medianRvol: Number(this.median(rvolValues).toFixed(2)),
      percentRvolAbove12: totalRvol > 0 ? Number(((rvolAbove12 / totalRvol) * 100).toFixed(2)) : 0,
      percentRvolAbove15: totalRvol > 0 ? Number(((rvolAbove15 / totalRvol) * 100).toFixed(2)) : 0,
      percentRvolAbove20: totalRvol > 0 ? Number(((rvolAbove20 / totalRvol) * 100).toFixed(2)) : 0,
      averageDailyTradedValueCrores: Number(this.mean(dailyTradedValuesCrores).toFixed(2)),
      medianDailyTradedValueCrores: Number(this.median(dailyTradedValuesCrores).toFixed(2)),
      tradedValueMethodologyNote: 'Traded value proxy = Sum(5m Candle Volume * VWAP) in INR Crores (1 Cr = 10^7 INR). Proxy of executed turnover only; does not measure bid-ask spread or order book depth.'
    };
  }
}

module.exports = ResearchCalculator;
