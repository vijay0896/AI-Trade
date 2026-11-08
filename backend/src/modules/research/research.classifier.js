/**
 * @file research.classifier.js
 * @description Objective multi-factor session classification engine.
 * Classifies completed trading sessions into STRONG_TREND_UP, STRONG_TREND_DOWN,
 * WEAK_TREND, SIDEWAYS, and MIXED_UNCLEAR regimes, and evaluates threshold sensitivity.
 */

const {
  REGIMES,
  DEFAULT_CLASSIFICATION_THRESHOLDS,
  SENSITIVITY_THRESHOLDS_GRID
} = require('./research.constants');

class ResearchClassifier {
  /**
   * Classify a single completed trading session
   * @param {Array<Object>} candles - Regular 5-minute candles for the session
   * @param {Object} [thresholds=DEFAULT_CLASSIFICATION_THRESHOLDS]
   * @returns {Object} Classified session record
   */
  static classifySession(candles, thresholds = DEFAULT_CLASSIFICATION_THRESHOLDS) {
    if (!candles || candles.length < 2) {
      return {
        regime: REGIMES.MIXED_UNCLEAR,
        reason: 'INSUFFICIENT_CANDLES',
        isEligible: false
      };
    }

    const firstBar = candles[0];
    const lastBar = candles[candles.length - 1];
    const dateStr = firstBar.timestamp.split('T')[0];
    const symbol = firstBar.symbol;

    // Check if session has special/non-regular bars
    const isSpecial = candles.some(c => c.sessionType !== 'REGULAR');
    if (isSpecial) {
      const specialType = candles.find(c => c.sessionType !== 'REGULAR')?.sessionType || 'SPECIAL';
      return {
        date: dateStr,
        symbol,
        regime: REGIMES.SPECIAL_SESSION,
        reason: `SPECIAL_SESSION_${specialType}`,
        isEligible: false,
        returnPct: 0,
        efficiencyRatio: 0,
        ncp: 0.5,
        vwapCrossovers: 0,
        meanChoppiness: 0,
        highLowRangePct: 0
      };
    }

    // Basic Metrics
    const dayHigh = Math.max(...candles.map(c => c.high));
    const dayLow = Math.min(...candles.map(c => c.low));
    const dayOpen = firstBar.open;
    const dayClose = lastBar.close;

    const highLowRange = dayHigh - dayLow;
    const highLowRangePct = dayOpen > 0 ? (highLowRange / dayOpen) * 100 : 0;
    const netReturn = dayClose - dayOpen;
    const returnPct = dayOpen > 0 ? (netReturn / dayOpen) * 100 : 0;

    // Normalized Close Position (NCP): (Close - Low) / (High - Low)
    const ncp = highLowRange > 0 ? (dayClose - dayLow) / highLowRange : 0.5;

    // Session Efficiency Ratio (ER): |Close_N - Open_1| / (|Close_1 - Open_1| + sum(|Close_t - Close_t-1|))
    let pathLength = Math.abs(firstBar.close - firstBar.open);
    let vwapCrossovers = 0;
    let chopSum = 0;
    let chopCount = 0;
    let adxSum = 0;
    let adxCount = 0;

    for (let t = 0; t < candles.length; t++) {
      const c = candles[t];

      if (t > 0) {
        pathLength += Math.abs(c.close - candles[t - 1].close);

        if (c.vwap !== null && candles[t - 1].vwap !== null) {
          const prevDiff = candles[t - 1].close - candles[t - 1].vwap;
          const currDiff = c.close - c.vwap;
          if (prevDiff * currDiff < 0) {
            vwapCrossovers++;
          }
        }
      }

      if (c.choppiness14 !== null && !isNaN(c.choppiness14)) {
        chopSum += c.choppiness14;
        chopCount++;
      }

      if (c.adx14 !== null && !isNaN(c.adx14)) {
        adxSum += c.adx14;
        adxCount++;
      }
    }

    const netDisplacement = Math.abs(netReturn);
    const efficiencyRatio = pathLength > 0 ? netDisplacement / pathLength : 0;
    const meanChoppiness = chopCount > 0 ? chopSum / chopCount : 50;
    const meanAdx = adxCount > 0 ? adxSum / adxCount : 20;

    // Classification Rules:
    let regime = REGIMES.MIXED_UNCLEAR;
    let rationale = '';

    // 1. Strong Trend Up
    if (
      returnPct >= thresholds.strongReturnPct &&
      efficiencyRatio >= thresholds.strongER &&
      ncp >= thresholds.ncpUpper &&
      vwapCrossovers <= thresholds.maxTrendVwapCrossovers
    ) {
      regime = REGIMES.STRONG_TREND_UP;
      rationale = `Return >= +${thresholds.strongReturnPct}%, ER >= ${thresholds.strongER}, NCP >= ${thresholds.ncpUpper}, VWAP Crosses <= ${thresholds.maxTrendVwapCrossovers}`;
    }
    // 2. Strong Trend Down
    else if (
      returnPct <= -thresholds.strongReturnPct &&
      efficiencyRatio >= thresholds.strongER &&
      ncp <= thresholds.ncpLower &&
      vwapCrossovers <= thresholds.maxTrendVwapCrossovers
    ) {
      regime = REGIMES.STRONG_TREND_DOWN;
      rationale = `Return <= -${thresholds.strongReturnPct}%, ER >= ${thresholds.strongER}, NCP <= ${thresholds.ncpLower}, VWAP Crosses <= ${thresholds.maxTrendVwapCrossovers}`;
    }
    // 3. Sideways
    else if (
      (efficiencyRatio <= thresholds.sidewaysMaxER || meanChoppiness >= thresholds.sidewaysMinChop) &&
      vwapCrossovers >= thresholds.minSidewaysVwapCrossovers &&
      Math.abs(returnPct) < thresholds.sidewaysMaxReturnPct
    ) {
      regime = REGIMES.SIDEWAYS;
      rationale = `(ER <= ${thresholds.sidewaysMaxER} or Chop >= ${thresholds.sidewaysMinChop}) & VWAP Crosses >= ${thresholds.minSidewaysVwapCrossovers} & |Return| < ${thresholds.sidewaysMaxReturnPct}%`;
    }
    // 4. Weak Trend
    else if (
      Math.abs(returnPct) >= thresholds.weakReturnPct &&
      efficiencyRatio >= thresholds.weakER &&
      vwapCrossovers <= thresholds.weakMaxVwapCrossovers
    ) {
      regime = REGIMES.WEAK_TREND;
      rationale = `|Return| >= ${thresholds.weakReturnPct}%, ER >= ${thresholds.weakER}, VWAP Crosses <= ${thresholds.weakMaxVwapCrossovers}`;
    }
    // 5. Mixed / Unclear
    else {
      regime = REGIMES.MIXED_UNCLEAR;
      rationale = 'Conflicting factors or moderate range without clear directional efficiency or clean oscillation';
    }

    return {
      date: dateStr,
      symbol,
      regime,
      rationale,
      isEligible: true,
      returnPct: Number(returnPct.toFixed(2)),
      efficiencyRatio: Number(efficiencyRatio.toFixed(3)),
      ncp: Number(ncp.toFixed(3)),
      vwapCrossovers,
      meanChoppiness: Number(meanChoppiness.toFixed(2)),
      meanAdx: Number(meanAdx.toFixed(2)),
      highLowRangePct: Number(highLowRangePct.toFixed(2)),
      barsCount: candles.length
    };
  }

  /**
   * Classify all sessions for a symbol
   * @param {Object} sessionsByDay Map of dateStr -> Array<Candle>
   * @param {Object} [thresholds=DEFAULT_CLASSIFICATION_THRESHOLDS]
   * @returns {Object} Classified sessions list and regime distribution summary
   */
  static classifyAllSessions(sessionsByDay, thresholds = DEFAULT_CLASSIFICATION_THRESHOLDS) {
    const classifications = [];
    const regimeCounts = {
      [REGIMES.STRONG_TREND_UP]: 0,
      [REGIMES.STRONG_TREND_DOWN]: 0,
      [REGIMES.WEAK_TREND]: 0,
      [REGIMES.SIDEWAYS]: 0,
      [REGIMES.MIXED_UNCLEAR]: 0,
      [REGIMES.SPECIAL_SESSION]: 0
    };

    let eligibleCount = 0;

    for (const candles of Object.values(sessionsByDay)) {
      const record = this.classifySession(candles, thresholds);
      classifications.push(record);
      regimeCounts[record.regime] = (regimeCounts[record.regime] || 0) + 1;
      if (record.isEligible) {
        eligibleCount++;
      }
    }

    const total = classifications.length;
    const regimePercentages = {};
    for (const [regime, count] of Object.entries(regimeCounts)) {
      regimePercentages[regime] = eligibleCount > 0 && regime !== REGIMES.SPECIAL_SESSION
        ? Number(((count / eligibleCount) * 100).toFixed(2))
        : 0;
    }

    return {
      classifications,
      totalSessions: total,
      eligibleSessions: eligibleCount,
      regimeCounts,
      regimePercentages
    };
  }

  /**
   * Threshold Sensitivity Analysis
   * Compares regime distributions under Tight, Baseline, and Loose thresholds
   * @param {Object} sessionsByDay
   * @returns {Object}
   */
  static runThresholdSensitivity(sessionsByDay) {
    const sensitivityResults = {};

    for (const [key, thresh] of Object.entries(SENSITIVITY_THRESHOLDS_GRID)) {
      const result = this.classifyAllSessions(sessionsByDay, thresh);
      sensitivityResults[key] = {
        thresholds: thresh,
        regimeCounts: result.regimeCounts,
        regimePercentages: result.regimePercentages
      };
    }

    return sensitivityResults;
  }
}

module.exports = ResearchClassifier;
