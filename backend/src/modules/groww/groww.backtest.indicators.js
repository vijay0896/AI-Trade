/**
 * @file groww.backtest.indicators.js
 * @description Pure zero-dependency technical indicator calculation engine for 15-minute intraday backtesting.
 * Computes EMA(9), EMA(21), Daily EMA(20), Intraday VWAP, Volume SMA(20), ATR(14), Inside Bar, NR4, and Engulfing/Marubozu.
 */

class BacktestIndicators {
  /**
   * Calculates Exponential Moving Average (EMA) for an array of numeric values.
   *
   * @param {number[]} values - Input series (e.g., closing prices)
   * @param {number} period - EMA period (e.g., 9, 20, 21)
   * @returns {(number|null)[]} Array of EMA values matching input length
   */
  static calculateEMA(values, period) {
    if (!Array.isArray(values) || values.length === 0 || period <= 0) {
      return [];
    }

    const ema = new Array(values.length).fill(null);
    if (values.length < period) return ema;

    // First EMA value is SMA of the first `period` bars
    let sum = 0;
    for (let i = 0; i < period; i++) {
      sum += Number(values[i]) || 0;
    }
    ema[period - 1] = sum / period;

    const multiplier = 2 / (period + 1);

    for (let i = period; i < values.length; i++) {
      const val = Number(values[i]) || 0;
      const prevEma = ema[i - 1];
      ema[i] = val * multiplier + prevEma * (1 - multiplier);
    }

    return ema;
  }

  /**
   * Calculates Average True Range (ATR 14) using Wilder's smoothing.
   *
   * @param {Array<Object>} candles - Array of candles { high, low, close }
   * @param {number} [period=14] - ATR period
   * @returns {(number|null)[]}
   */
  static calculateATR(candles, period = 14) {
    if (!Array.isArray(candles) || candles.length === 0) return [];
    const atr = new Array(candles.length).fill(null);
    if (candles.length < 2) return atr;

    const tr = [candles[0].high - candles[0].low];

    for (let i = 1; i < candles.length; i++) {
      const h = candles[i].high;
      const l = candles[i].low;
      const prevC = candles[i - 1].close;

      const trueRange = Math.max(
        h - l,
        Math.abs(h - prevC),
        Math.abs(l - prevC)
      );
      tr.push(trueRange);
    }

    if (tr.length < period) return atr;

    // First ATR is simple average of first `period` TRs
    let sum = 0;
    for (let i = 0; i < period; i++) {
      sum += tr[i];
    }
    atr[period - 1] = sum / period;

    // Wilder's smoothing for subsequent values
    for (let i = period; i < candles.length; i++) {
      atr[i] = (atr[i - 1] * (period - 1) + tr[i]) / period;
    }

    return atr;
  }

  /**
   * Calculates Simple Moving Average (SMA) of volume.
   *
   * @param {number[]} volumes
   * @param {number} [period=20]
   * @returns {(number|null)[]}
   */
  static calculateVolumeSMA(volumes, period = 20) {
    if (!Array.isArray(volumes) || volumes.length === 0) return [];
    const sma = new Array(volumes.length).fill(null);

    let windowSum = 0;
    for (let i = 0; i < volumes.length; i++) {
      windowSum += Number(volumes[i]) || 0;
      if (i >= period) {
        windowSum -= Number(volumes[i - period]) || 0;
      }
      if (i >= period - 1) {
        sma[i] = windowSum / period;
      } else {
        // Fallback for warmup: average of available bars
        sma[i] = windowSum / (i + 1);
      }
    }

    return sma;
  }

  /**
   * Calculates Intraday Session VWAP resetting at each new trading day.
   * VWAP = sum(TypicalPrice * Volume) / sum(Volume)
   * TypicalPrice = (High + Low + Close) / 3
   *
   * @param {Array<Object>} candles - Array of candles { istDate, high, low, close, volume }
   * @returns {number[]}
   */
  static calculateSessionVWAP(candles) {
    if (!Array.isArray(candles) || candles.length === 0) return [];
    const vwap = new Array(candles.length).fill(null);

    let currentDate = null;
    let cumTypicalVol = 0;
    let cumVolume = 0;

    for (let i = 0; i < candles.length; i++) {
      const c = candles[i];
      const candleDate = c.istDate || (c.timestamp ? c.timestamp.split('T')[0] : '');

      if (candleDate !== currentDate) {
        currentDate = candleDate;
        cumTypicalVol = 0;
        cumVolume = 0;
      }

      const tp = (c.high + c.low + c.close) / 3;
      const vol = Math.max(1, Number(c.volume) || 1);

      cumTypicalVol += tp * vol;
      cumVolume += vol;

      vwap[i] = cumVolume > 0 ? cumTypicalVol / cumVolume : c.close;
    }

    return vwap;
  }

  /**
   * Identifies volatility compression patterns:
   * 1. Inside Bar: high < prev.high and low > prev.low
   * 2. NR4: Narrowest range of current candle vs preceding 3 candles
   * 3. MarubozuOrEngulfing: Body >= 70% of total range, or Bullish/Bearish Engulfing
   *
   * @param {Array<Object>} candles
   * @returns {Array<Object>} Compression flags for each candle
   */
  static calculateCompressionPatterns(candles) {
    if (!Array.isArray(candles) || candles.length === 0) return [];

    return candles.map((curr, i) => {
      const prev = i > 0 ? candles[i - 1] : null;

      // 1. Inside Bar
      const isInsideBar = Boolean(
        prev &&
        curr.high < prev.high &&
        curr.low > prev.low
      );

      // 2. NR4 (Narrowest Range 4: range strictly smaller than preceding 3 candles)
      let isNR4 = false;
      if (i >= 3) {
        const currRange = curr.high - curr.low;
        const r1 = candles[i - 1].high - candles[i - 1].low;
        const r2 = candles[i - 2].high - candles[i - 2].low;
        const r3 = candles[i - 3].high - candles[i - 3].low;
        isNR4 = currRange < r1 && currRange < r2 && currRange < r3;
      }

      // 3. Marubozu or Engulfing
      const range = curr.high - curr.low;
      const body = Math.abs(curr.close - curr.open);
      const isMarubozu = range > 0 && (body / range) >= 0.70;

      let isBullishEngulfing = false;
      let isBearishEngulfing = false;

      if (prev) {
        // Bullish Engulfing: prev red, curr green, curr body engulfs prev body
        isBullishEngulfing =
          prev.close < prev.open &&
          curr.close > curr.open &&
          curr.close >= prev.open &&
          curr.open <= prev.close;

        // Bearish Engulfing: prev green, curr red, curr body engulfs prev body
        isBearishEngulfing =
          prev.close > prev.open &&
          curr.close < curr.open &&
          curr.close <= prev.open &&
          curr.open >= prev.close;
      }

      const isMarubozuOrEngulfing = isMarubozu || isBullishEngulfing || isBearishEngulfing;

      return {
        isInsideBar,
        isNR4,
        isMarubozuOrEngulfing,
        patternTag: isNR4
          ? 'NR4'
          : isInsideBar
          ? 'InsideBar'
          : isBullishEngulfing
          ? 'BullishEngulfing'
          : isBearishEngulfing
          ? 'BearishEngulfing'
          : isMarubozu
          ? 'Marubozu'
          : 'Standard'
      };
    });
  }

  /**
   * Enriches 15m candles with all indicators and multi-timeframe Daily EMA(20) values.
   *
   * @param {Array<Object>} candles15m - Chronological 15m candles
   * @param {Array<Object>} dailyCandles - Chronological Daily candles
   * @returns {Array<Object>} Enriched 15m candles with indicators
   */
  static enrich15mCandles(candles15m, dailyCandles = []) {
    if (!Array.isArray(candles15m) || candles15m.length === 0) return [];

    const closes = candles15m.map((c) => c.close);
    const volumes = candles15m.map((c) => c.volume);

    // 1. Core 15m Indicators
    const ema9 = this.calculateEMA(closes, 9);
    const ema21 = this.calculateEMA(closes, 21);
    const vwap = this.calculateSessionVWAP(candles15m);
    const volumeSma20 = this.calculateVolumeSMA(volumes, 20);
    const atr14 = this.calculateATR(candles15m, 14);
    const patterns = this.calculateCompressionPatterns(candles15m);

    // 2. Multi-Timeframe: Compute Daily EMA(20) on 1D closes
    const dailyEmaMap = new Map();
    if (Array.isArray(dailyCandles) && dailyCandles.length > 0) {
      const dailyCloses = dailyCandles.map((c) => c.close);
      const dailyEma20 = this.calculateEMA(dailyCloses, 20);

      dailyCandles.forEach((dc, idx) => {
        const dateKey = dc.istDate || (dc.timestamp ? dc.timestamp.split('T')[0] : '');
        if (dateKey) {
          dailyEmaMap.set(dateKey, {
            dailyClose: dc.close,
            dailyEma20: dailyEma20[idx]
          });
        }
      });
    }

    // 3. Assemble complete indicator-enriched candle objects
    return candles15m.map((c, i) => {
      const dateKey = c.istDate || (c.timestamp ? c.timestamp.split('T')[0] : '');
      const dailyInfo = dailyEmaMap.get(dateKey) || null;

      const dailyClose = dailyInfo?.dailyClose ?? null;
      const dailyEma20 = dailyInfo?.dailyEma20 ?? null;
      const isDailyBullish = dailyClose !== null && dailyEma20 !== null ? dailyClose > dailyEma20 : null;

      return {
        ...c,
        ema9: ema9[i],
        ema21: ema21[i],
        vwap: vwap[i],
        volumeSma20: volumeSma20[i],
        atr14: atr14[i],
        dailyClose,
        dailyEma20,
        isDailyBullish,
        isInsideBar: patterns[i].isInsideBar,
        isNR4: patterns[i].isNR4,
        isMarubozuOrEngulfing: patterns[i].isMarubozuOrEngulfing,
        patternTag: patterns[i].patternTag
      };
    });
  }
}

module.exports = BacktestIndicators;

