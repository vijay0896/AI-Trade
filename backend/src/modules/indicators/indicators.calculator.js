/**
 * @file indicators.calculator.js
 * @description Production-grade, deterministic, streaming technical indicator calculator.
 * Strictly strictly causal (no future data leakage), SMA warm-up initialized,
 * Wilder's smoothed ATR/ADX, intraday session resetting VWAP, and zero-guard protection.
 */

const LOG10_14 = Math.log10(14);

class IndicatorsCalculator {
  constructor() {
    this.reset();
  }

  /**
   * Resets all internal state for a fresh stock sequence.
   */
  reset() {
    // 1. EMA 20 & EMA 50
    this.ema20Alpha = 2 / (20 + 1);
    this.ema50Alpha = 2 / (50 + 1);
    this.ema20Window = [];
    this.ema50Window = [];
    this.currentEMA20 = null;
    this.currentEMA50 = null;

    // 2. VWAP
    this.currentVWAPDate = null;
    this.cumTypicalPriceVol = 0;
    this.cumVolume = 0;

    // 3. ATR 14
    this.prevRegularClose = null;
    this.trWindow = [];
    this.currentATR14 = null;

    // 4. ADX 14, +DI14, -DI14
    this.prevHigh = null;
    this.prevLow = null;
    this.plusDMWindow = [];
    this.minusDMWindow = [];
    this.adxTRWindow = [];
    this.smoothTR14 = null;
    this.smoothPlusDM14 = null;
    this.smoothMinusDM14 = null;
    this.dxWindow = [];
    this.currentADX14 = null;

    // 5. Choppiness Index 14
    this.chopWindow = []; // { high, low, tr }

    // 6. Efficiency Ratio 14
    this.erCloseWindow = []; // last 15 closes

    // 7. Volume SMA 20 & RVOL
    this.volWindow = [];
  }

  /**
   * Processes a single regular-session candle and computes updated indicators.
   *
   * @param {Object} bar
   * @param {string} bar.timestamp - ISO timestamp string (YYYY-MM-DDTHH:mm:ss)
   * @param {number} bar.open
   * @param {number} bar.high
   * @param {number} bar.low
   * @param {number} bar.close
   * @param {number} bar.volume
   * @returns {Object} Calculated indicator values (null if in warm-up period)
   */
  processRegularBar({ timestamp, open, high, low, close, volume }) {
    const [date] = timestamp.split('T');

    // -------------------------------------------------------------
    // 1. EMA 20 & EMA 50
    // -------------------------------------------------------------
    // EMA 20
    let ema20 = null;
    if (this.currentEMA20 === null) {
      this.ema20Window.push(close);
      if (this.ema20Window.length === 20) {
        const sum = this.ema20Window.reduce((a, b) => a + b, 0);
        this.currentEMA20 = sum / 20;
        ema20 = Number(this.currentEMA20.toFixed(2));
      }
    } else {
      this.currentEMA20 = close * this.ema20Alpha + this.currentEMA20 * (1 - this.ema20Alpha);
      ema20 = Number(this.currentEMA20.toFixed(2));
    }

    // EMA 50
    let ema50 = null;
    if (this.currentEMA50 === null) {
      this.ema50Window.push(close);
      if (this.ema50Window.length === 50) {
        const sum = this.ema50Window.reduce((a, b) => a + b, 0);
        this.currentEMA50 = sum / 50;
        ema50 = Number(this.currentEMA50.toFixed(2));
      }
    } else {
      this.currentEMA50 = close * this.ema50Alpha + this.currentEMA50 * (1 - this.ema50Alpha);
      ema50 = Number(this.currentEMA50.toFixed(2));
    }

    // -------------------------------------------------------------
    // 2. VWAP (Intraday Reset)
    // -------------------------------------------------------------
    const typicalPrice = (high + low + close) / 3;
    if (this.currentVWAPDate !== date) {
      // New regular trading session: reset intraday accumulators
      this.currentVWAPDate = date;
      this.cumTypicalPriceVol = typicalPrice * volume;
      this.cumVolume = volume;
    } else {
      this.cumTypicalPriceVol += typicalPrice * volume;
      this.cumVolume += volume;
    }

    let vwap = typicalPrice;
    if (this.cumVolume > 0) {
      vwap = this.cumTypicalPriceVol / this.cumVolume;
    }
    vwap = Number(vwap.toFixed(2));

    // -------------------------------------------------------------
    // 3. ATR 14 (Wilder's Smoothing)
    // -------------------------------------------------------------
    let tr;
    if (this.prevRegularClose === null) {
      tr = high - low;
    } else {
      tr = Math.max(
        high - low,
        Math.abs(high - this.prevRegularClose),
        Math.abs(low - this.prevRegularClose)
      );
    }
    this.prevRegularClose = close;

    let atr14 = null;
    if (this.currentATR14 === null) {
      this.trWindow.push(tr);
      if (this.trWindow.length === 14) {
        const sumTR = this.trWindow.reduce((a, b) => a + b, 0);
        this.currentATR14 = sumTR / 14;
        atr14 = Number(this.currentATR14.toFixed(2));
      }
    } else {
      this.currentATR14 = (this.currentATR14 * 13 + tr) / 14;
      atr14 = Number(this.currentATR14.toFixed(2));
    }

    // -------------------------------------------------------------
    // 4. ADX 14 with +DI14 and -DI14
    // -------------------------------------------------------------
    let plusDM = 0;
    let minusDM = 0;
    if (this.prevHigh !== null && this.prevLow !== null) {
      const upMove = high - this.prevHigh;
      const downMove = this.prevLow - low;
      if (upMove > downMove && upMove > 0) plusDM = upMove;
      if (downMove > upMove && downMove > 0) minusDM = downMove;
    }
    this.prevHigh = high;
    this.prevLow = low;

    let plusDI14 = null;
    let minusDI14 = null;
    let adx14 = null;

    if (this.smoothTR14 === null) {
      this.plusDMWindow.push(plusDM);
      this.minusDMWindow.push(minusDM);
      this.adxTRWindow.push(tr);

      if (this.adxTRWindow.length === 14) {
        this.smoothTR14 = this.adxTRWindow.reduce((a, b) => a + b, 0);
        this.smoothPlusDM14 = this.plusDMWindow.reduce((a, b) => a + b, 0);
        this.smoothMinusDM14 = this.minusDMWindow.reduce((a, b) => a + b, 0);

        const diSum = this.smoothPlusDM14 + this.smoothMinusDM14;
        const plusVal = this.smoothTR14 > 0 ? (100 * this.smoothPlusDM14) / this.smoothTR14 : 0;
        const minusVal = this.smoothTR14 > 0 ? (100 * this.smoothMinusDM14) / this.smoothTR14 : 0;
        plusDI14 = Number(plusVal.toFixed(2));
        minusDI14 = Number(minusVal.toFixed(2));

        const diTotal = plusVal + minusVal;
        const dx = diTotal > 0 ? (100 * Math.abs(plusVal - minusVal)) / diTotal : 0;
        this.dxWindow.push(dx);
      }
    } else {
      // Wilder's smoothing for TR, +DM, -DM
      this.smoothTR14 = this.smoothTR14 - this.smoothTR14 / 14 + tr;
      this.smoothPlusDM14 = this.smoothPlusDM14 - this.smoothPlusDM14 / 14 + plusDM;
      this.smoothMinusDM14 = this.smoothMinusDM14 - this.smoothMinusDM14 / 14 + minusDM;

      const plusVal = this.smoothTR14 > 0 ? (100 * this.smoothPlusDM14) / this.smoothTR14 : 0;
      const minusVal = this.smoothTR14 > 0 ? (100 * this.smoothMinusDM14) / this.smoothTR14 : 0;
      plusDI14 = Number(plusVal.toFixed(2));
      minusDI14 = Number(minusVal.toFixed(2));

      const diTotal = plusVal + minusVal;
      const dx = diTotal > 0 ? (100 * Math.abs(plusVal - minusVal)) / diTotal : 0;

      if (this.currentADX14 === null) {
        this.dxWindow.push(dx);
        if (this.dxWindow.length === 14) {
          const sumDX = this.dxWindow.reduce((a, b) => a + b, 0);
          this.currentADX14 = sumDX / 14;
          adx14 = Number(this.currentADX14.toFixed(2));
        }
      } else {
        this.currentADX14 = (this.currentADX14 * 13 + dx) / 14;
        adx14 = Number(this.currentADX14.toFixed(2));
      }
    }

    // -------------------------------------------------------------
    // 5. Choppiness Index 14
    // -------------------------------------------------------------
    this.chopWindow.push({ high, low, tr });
    if (this.chopWindow.length > 14) {
      this.chopWindow.shift();
    }

    let choppiness14 = null;
    if (this.chopWindow.length === 14) {
      let sumTR = 0;
      let highestHigh = -Infinity;
      let lowestLow = Infinity;

      for (let i = 0; i < 14; i++) {
        const item = this.chopWindow[i];
        sumTR += item.tr;
        if (item.high > highestHigh) highestHigh = item.high;
        if (item.low < lowestLow) lowestLow = item.low;
      }

      const range = highestHigh - lowestLow;
      if (range <= 0 || sumTR <= 0) {
        choppiness14 = 0;
      } else {
        const rawChop = 100 * (Math.log10(sumTR / range) / LOG10_14);
        choppiness14 = Number(Math.max(0, Math.min(100, rawChop)).toFixed(2));
      }
    }

    // -------------------------------------------------------------
    // 6. Efficiency Ratio 14
    // -------------------------------------------------------------
    this.erCloseWindow.push(close);
    if (this.erCloseWindow.length > 15) {
      this.erCloseWindow.shift();
    }

    let efficiencyRatio14 = null;
    if (this.erCloseWindow.length === 15) {
      const netChange = Math.abs(close - this.erCloseWindow[0]);
      let sumPriceChanges = 0;
      for (let i = 1; i < 15; i++) {
        sumPriceChanges += Math.abs(this.erCloseWindow[i] - this.erCloseWindow[i - 1]);
      }

      if (sumPriceChanges <= 0) {
        efficiencyRatio14 = 0;
      } else {
        const rawER = netChange / sumPriceChanges;
        efficiencyRatio14 = Number(Math.max(0, Math.min(1, rawER)).toFixed(4));
      }
    }

    // -------------------------------------------------------------
    // 7. Volume SMA 20 & Relative Volume 20 (RVOL)
    // -------------------------------------------------------------
    this.volWindow.push(volume);
    if (this.volWindow.length > 20) {
      this.volWindow.shift();
    }

    let volumeSMA20 = null;
    let relativeVolume20 = null;
    if (this.volWindow.length === 20) {
      const volSum = this.volWindow.reduce((a, b) => a + b, 0);
      volumeSMA20 = Number((volSum / 20).toFixed(2));
      if (volumeSMA20 > 0) {
        relativeVolume20 = Number((volume / volumeSMA20).toFixed(2));
      } else {
        relativeVolume20 = 0;
      }
    }

    return {
      ema20,
      ema50,
      vwap,
      atr14,
      adx14,
      plusDI14,
      minusDI14,
      choppiness14,
      efficiencyRatio14,
      volumeSMA20,
      relativeVolume20
    };
  }
}

module.exports = IndicatorsCalculator;

