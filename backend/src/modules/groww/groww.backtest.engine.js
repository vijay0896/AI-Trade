/**
 * @file groww.backtest.engine.js
 * @description 15-Minute Intraday 9/21 EMA Crossover Backtesting Engine.
 * Features:
 * - Multi-timeframe confluence (15m EMA 9/21, VWAP, Vol SMA 20, Daily EMA 20)
 * - Strict IST windows: Morning (09:30-11:00) & Afternoon (13:45-14:45)
 * - Confirmation entry stop orders (anti-false-breakout)
 * - Dynamic SL with risk capping (0.25% - 0.75% or 1.2 * ATR14)
 * - 1:1 T1 (50% book & move SL to Breakeven + buffer)
 * - 1:2.2 T2 or 9 EMA trail
 * - Max 2 trades/day cap with -1R daily stop
 * - 15:15 IST auto square-off
 */

const BacktestIndicators = require('./groww.backtest.indicators');
const logger = require('../../config/logger');

class GrowwBacktestEngine {
  /**
   * Evaluates if time string is within allowed intraday entry windows.
   *
   * @param {string} istTime - 'HH:mm:ss'
   * @returns {{ inWindow: boolean, windowName: 'MORNING'|'AFTERNOON'|null }}
   */
  static evaluateTimeWindow(istTime) {
    if (!istTime) return { inWindow: false, windowName: null };

    // Morning window: 09:30 to 11:00 IST
    if (istTime >= '09:30:00' && istTime <= '11:00:00') {
      return { inWindow: true, windowName: 'MORNING' };
    }

    // Afternoon window: 13:45 to 14:45 IST
    if (istTime >= '13:45:00' && istTime <= '14:45:00') {
      return { inWindow: true, windowName: 'AFTERNOON' };
    }

    return { inWindow: false, windowName: null };
  }

  /**
   * Runs the 15-minute backtest strategy on enriched candles for a single stock.
   *
   * @param {Object} options
   * @param {string} options.symbol - Stock symbol
   * @param {Array<Object>} options.candles15m - 15m candles
   * @param {Array<Object>} [options.dailyCandles] - Daily candles for multi-timeframe
   * @param {number} [options.capitalPerTrade=100000] - Capital allocated per trade in INR
   * @param {boolean} [options.enableMultiTimeframe=true] - Require Daily Close > Daily EMA20
   * @param {boolean} [options.enableNR4Filter=false] - Prioritize NR4 / Inside Bar setups
   * @returns {Object} { trades, metrics }
   */
  static runSingleStockBacktest({
    symbol,
    candles15m,
    dailyCandles = [],
    capitalPerTrade = 100000,
    enableMultiTimeframe = true,
    enableNR4Filter = false
  }) {
    if (!Array.isArray(candles15m) || candles15m.length < 25) {
      return {
        symbol,
        trades: [],
        metrics: this.computeEmptyMetrics(symbol)
      };
    }

    // 1. Enrich candles with all technical indicators
    const enriched = BacktestIndicators.enrich15mCandles(candles15m, dailyCandles);

    const trades = [];
    let pendingOrder = null;
    let activePosition = null;

    // Daily trading state tracking
    let currentTradingDate = null;
    let dailyTradesCount = 0;
    let dailyHalted = false;

    for (let i = 21; i < enriched.length; i++) {
      const curr = enriched[i];
      const prev = enriched[i - 1];
      const candleDate = curr.istDate || (curr.timestamp ? curr.timestamp.split('T')[0] : '');
      const candleTime = curr.istTime || '09:15:00';

      // Reset daily limits on new day
      if (candleDate !== currentTradingDate) {
        currentTradingDate = candleDate;
        dailyTradesCount = 0;
        dailyHalted = false;
        pendingOrder = null;

        // If overnight position somehow carried over, force close at new open
        if (activePosition) {
          this.closePosition(activePosition, curr.open, 'EOD_1515', curr.timestamp, trades, capitalPerTrade);
          activePosition = null;
        }
      }

      // -------------------------------------------------------------
      // A. PROCESS PENDING CONFIRMATION ENTRY STOP ORDER
      // -------------------------------------------------------------
      if (pendingOrder) {
        const order = pendingOrder;
        pendingOrder = null; // Single-candle validity

        if (order.date === candleDate && !activePosition && !dailyHalted && dailyTradesCount < 2) {
          let filled = false;
          let fillPrice = 0;

          if (order.direction === 'LONG') {
            if (curr.high >= order.triggerPrice) {
              filled = true;
              fillPrice = Math.max(curr.open, order.triggerPrice);
            }
          } else if (order.direction === 'SHORT') {
            if (curr.low <= order.triggerPrice) {
              filled = true;
              fillPrice = Math.min(curr.open, order.triggerPrice);
            }
          }

          if (filled) {
            // Calculate Position Sizing
            const entryPrice = fillPrice;
            const initialRisk = order.initialRisk;
            const quantity = Math.max(1, Math.floor(capitalPerTrade / entryPrice));
            const qty1 = Math.ceil(quantity / 2);
            const qty2 = quantity - qty1;

            activePosition = {
              tradeId: `TRD-${symbol}-${String(trades.length + 1).padStart(5, '0')}`,
              symbol,
              direction: order.direction,
              entryTimestamp: curr.timestamp,
              entryTimeIST: `${order.date} ${curr.istTime}`,
              sessionWindow: order.sessionWindow,
              patternTags: order.patternTags,
              entryPrice,
              initialSL: order.initialSL,
              currentSL: order.initialSL,
              initialRisk,
              target1: order.target1,
              target2: order.target2,
              quantity,
              qtyRemaining1: qty1,
              qtyRemaining2: qty2,
              t1Hit: false,
              t2Hit: false,
              exitPrice1: null,
              exitPrice2: null,
              exitTimestamp1: null,
              exitTimestamp2: null,
              exitReason: null
            };

            dailyTradesCount++;
          }
        }
      }

      // -------------------------------------------------------------
      // B. MANAGE ACTIVE OPEN POSITION (SL, T1, T2, EMA Trail, EOD)
      // -------------------------------------------------------------
      if (activePosition) {
        const pos = activePosition;
        let positionClosed = false;

        // 1. Mandatory 15:15 IST Square-Off
        if (candleTime >= '15:15:00') {
          this.closePosition(pos, curr.open, 'EOD_1515', curr.timestamp, trades, capitalPerTrade);
          activePosition = null;
          positionClosed = true;
        }

        // 2. Intrabar Target 1 Check (50% Win Rate Lock)
        if (!positionClosed && !pos.t1Hit) {
          let t1Reached = false;
          if (pos.direction === 'LONG' && curr.high >= pos.target1) {
            t1Reached = true;
          } else if (pos.direction === 'SHORT' && curr.low <= pos.target1) {
            t1Reached = true;
          }

          if (t1Reached) {
            pos.t1Hit = true;
            pos.exitPrice1 = pos.target1;
            pos.exitTimestamp1 = curr.timestamp;

            // Move SL for remaining quantity to Breakeven + 0.05% buffer
            pos.currentSL =
              pos.direction === 'LONG'
                ? pos.entryPrice * 1.0005
                : pos.entryPrice * 0.9995;
          }
        }

        // 3. Stop-Loss Check (Initial SL or Breakeven Buffer SL)
        if (!positionClosed) {
          let slHit = false;
          let exitPrice = pos.currentSL;

          if (pos.direction === 'LONG') {
            if (curr.low <= pos.currentSL) {
              slHit = true;
              exitPrice = Math.min(curr.open, pos.currentSL);
            }
          } else if (pos.direction === 'SHORT') {
            if (curr.high >= pos.currentSL) {
              slHit = true;
              exitPrice = Math.max(curr.open, pos.currentSL);
            }
          }

          if (slHit) {
            const reason = pos.t1Hit ? 'T1_PLUS_TRAIL' : 'INITIAL_SL';
            this.closePosition(pos, exitPrice, reason, curr.timestamp, trades, capitalPerTrade);
            if (!pos.t1Hit) {
              // Full initial stop loss hit -> Stop trading for the day
              dailyHalted = true;
            }
            activePosition = null;
            positionClosed = true;
          }
        }

        // 4. Target 2 or EMA 9 Trail Check for Remaining 50%
        if (!positionClosed && pos.t1Hit) {
          let t2Reached = false;
          let emaTrailBreached = false;

          if (pos.direction === 'LONG') {
            if (curr.high >= pos.target2) {
              t2Reached = true;
            } else if (curr.ema9 && curr.close < curr.ema9) {
              emaTrailBreached = true;
            }
          } else if (pos.direction === 'SHORT') {
            if (curr.low <= pos.target2) {
              t2Reached = true;
            } else if (curr.ema9 && curr.close > curr.ema9) {
              emaTrailBreached = true;
            }
          }

          if (t2Reached) {
            pos.t2Hit = true;
            this.closePosition(pos, pos.target2, 'T2_TARGET', curr.timestamp, trades, capitalPerTrade);
            activePosition = null;
            positionClosed = true;
          } else if (emaTrailBreached) {
            this.closePosition(pos, curr.close, 'T1_PLUS_TRAIL', curr.timestamp, trades, capitalPerTrade);
            activePosition = null;
            positionClosed = true;
          }
        }
      }

      // -------------------------------------------------------------
      // C. SIGNAL DETECTION & ENTRY STOP SETUP
      // -------------------------------------------------------------
      // Only evaluate new signals if:
      // - No active position
      // - No pending order
      // - Daily limit not reached (< 2 trades)
      // - Daily loss circuit not triggered
      if (!activePosition && !pendingOrder && !dailyHalted && dailyTradesCount < 2) {
        const { inWindow, windowName } = this.evaluateTimeWindow(candleTime);

        if (inWindow && curr.ema9 && curr.ema21 && curr.vwap && curr.atr14) {
          // Volume filter check
          const volOk = !curr.volumeSma20 || curr.volume >= 1.2 * curr.volumeSma20;

          // Compression filter check (if user enabled NR4 filter)
          const patternOk = !enableNR4Filter || curr.isNR4 || curr.isInsideBar || curr.isMarubozuOrEngulfing;

          // Multi-Timeframe Trend filter check
          const dailyTrendBullish = curr.isDailyBullish !== false;
          const dailyTrendBearish = curr.isDailyBullish !== true;

          // 1. LONG SIGNAL
          const emaCrossoverLong = prev.ema9 <= prev.ema21 && curr.ema9 > curr.ema21;
          const emaPullbackLong = curr.ema9 > curr.ema21 && curr.low <= curr.ema21 * 1.001 && curr.close > curr.ema21;
          const isLongSetup = (emaCrossoverLong || emaPullbackLong) && curr.close > curr.vwap && volOk && patternOk;

          if (isLongSetup && (!enableMultiTimeframe || dailyTrendBullish)) {
            const triggerPrice = Number((curr.high * 1.0005).toFixed(2));
            const rawSL = Math.max(curr.low, curr.ema21 - 0.25 * curr.atr14);
            let risk = triggerPrice - rawSL;

            // Cap risk between 0.25% - 0.75% of entry (max 1.2 * ATR)
            const minRisk = triggerPrice * 0.0025;
            const maxRisk = Math.min(triggerPrice * 0.0075, 1.2 * curr.atr14);
            if (risk < minRisk) risk = minRisk;
            if (risk > maxRisk) risk = maxRisk;

            const initialSL = Number((triggerPrice - risk).toFixed(2));
            const target1 = Number((triggerPrice + risk).toFixed(2));
            const target2 = Number((triggerPrice + 2.2 * risk).toFixed(2));

            const tags = ['VWAP+EMA'];
            if (curr.isNR4) tags.push('NR4');
            if (curr.isInsideBar) tags.push('InsideBar');
            if (curr.isMarubozuOrEngulfing) tags.push('Engulfing');

            pendingOrder = {
              date: candleDate,
              direction: 'LONG',
              triggerPrice,
              initialSL,
              initialRisk: risk,
              target1,
              target2,
              sessionWindow: windowName === 'MORNING' ? 'Morning (09:30-11:00)' : 'Afternoon (13:45-14:45)',
              patternTags: tags
            };
            continue;
          }

          // 2. SHORT SIGNAL
          const emaCrossoverShort = prev.ema9 >= prev.ema21 && curr.ema9 < curr.ema21;
          const emaPullbackShort = curr.ema9 < curr.ema21 && curr.high >= curr.ema21 * 0.999 && curr.close < curr.ema21;
          const isShortSetup = (emaCrossoverShort || emaPullbackShort) && curr.close < curr.vwap && volOk && patternOk;

          if (isShortSetup && (!enableMultiTimeframe || dailyTrendBearish)) {
            const triggerPrice = Number((curr.low * 0.9995).toFixed(2));
            const rawSL = Math.min(curr.high, curr.ema21 + 0.25 * curr.atr14);
            let risk = rawSL - triggerPrice;

            const minRisk = triggerPrice * 0.0025;
            const maxRisk = Math.min(triggerPrice * 0.0075, 1.2 * curr.atr14);
            if (risk < minRisk) risk = minRisk;
            if (risk > maxRisk) risk = maxRisk;

            const initialSL = Number((triggerPrice + risk).toFixed(2));
            const target1 = Number((triggerPrice - risk).toFixed(2));
            const target2 = Number((triggerPrice - 2.2 * risk).toFixed(2));

            const tags = ['VWAP+EMA'];
            if (curr.isNR4) tags.push('NR4');
            if (curr.isInsideBar) tags.push('InsideBar');
            if (curr.isMarubozuOrEngulfing) tags.push('Engulfing');

            pendingOrder = {
              date: candleDate,
              direction: 'SHORT',
              triggerPrice,
              initialSL,
              initialRisk: risk,
              target1,
              target2,
              sessionWindow: windowName === 'MORNING' ? 'Morning (09:30-11:00)' : 'Afternoon (13:45-14:45)',
              patternTags: tags
            };
          }
        }
      }
    }

    // Close any position remaining at end of dataset
    if (activePosition && enriched.length > 0) {
      const lastCandle = enriched[enriched.length - 1];
      this.closePosition(activePosition, lastCandle.close, 'EOD_1515', lastCandle.timestamp, trades, capitalPerTrade);
    }

    const metrics = this.calculateMetrics(symbol, trades, capitalPerTrade);

    return {
      symbol,
      trades,
      metrics
    };
  }

  /**
   * Closes a position, recording trade details, P&L, R-Multiple, and charges.
   */
  static closePosition(pos, exitPrice, reason, exitTimestamp, tradesArray, capitalPerTrade) {
    pos.exitReason = reason;

    let pnl1 = 0;
    let pnl2 = 0;

    const finalExitPrice2 = Number(exitPrice.toFixed(2));
    const finalExitPrice1 = pos.exitPrice1 ? Number(pos.exitPrice1.toFixed(2)) : finalExitPrice2;

    if (pos.direction === 'LONG') {
      pnl1 = pos.qtyRemaining1 * (finalExitPrice1 - pos.entryPrice);
      pnl2 = pos.qtyRemaining2 * (finalExitPrice2 - pos.entryPrice);
    } else {
      pnl1 = pos.qtyRemaining1 * (pos.entryPrice - finalExitPrice1);
      pnl2 = pos.qtyRemaining2 * (pos.entryPrice - finalExitPrice2);
    }

    const netPnL = Number((pnl1 + pnl2).toFixed(2));
    const totalRiskAmount = pos.quantity * pos.initialRisk;
    const rMultiple = totalRiskAmount > 0 ? Number((netPnL / totalRiskAmount).toFixed(2)) : 0;

    tradesArray.push({
      tradeId: pos.tradeId,
      symbol: pos.symbol,
      direction: pos.direction,
      entryTimeIST: pos.entryTimeIST,
      entryTimestamp: pos.entryTimestamp,
      exitTimestamp,
      sessionWindow: pos.sessionWindow,
      patternTags: pos.patternTags,
      entryPrice: pos.entryPrice,
      initialSL: pos.initialSL,
      t1Hit: pos.t1Hit,
      t2Hit: pos.t2Hit,
      exitPrice: finalExitPrice2,
      exitReason: pos.exitReason,
      quantity: pos.quantity,
      rMultiple,
      netPnL
    });
  }

  /**
   * Computes comprehensive quantitative summary metrics across trades.
   */
  static calculateMetrics(symbol, trades, capitalPerTrade) {
    if (trades.length === 0) {
      return this.computeEmptyMetrics(symbol);
    }

    let winningTrades = 0;
    let losingTrades = 0;
    let breakevenTrades = 0;
    let totalGrossProfits = 0;
    let totalGrossLosses = 0;
    let netPnL = 0;
    let sumR = 0;

    let morningTrades = 0;
    let morningWins = 0;
    let afternoonTrades = 0;
    let afternoonWins = 0;
    let compressionTrades = 0;
    let compressionWins = 0;

    let peakEquity = 0;
    let currentEquity = 0;
    let maxDrawdown = 0;

    for (const t of trades) {
      netPnL += t.netPnL;
      currentEquity += t.netPnL;
      if (currentEquity > peakEquity) {
        peakEquity = currentEquity;
      }
      const dd = peakEquity - currentEquity;
      if (dd > maxDrawdown) {
        maxDrawdown = dd;
      }

      sumR += t.rMultiple;

      if (t.netPnL > 0) {
        winningTrades++;
        totalGrossProfits += t.netPnL;
      } else if (t.netPnL < 0) {
        losingTrades++;
        totalGrossLosses += Math.abs(t.netPnL);
      } else {
        breakevenTrades++;
      }

      // Windows
      if (t.sessionWindow?.includes('Morning')) {
        morningTrades++;
        if (t.netPnL > 0) morningWins++;
      } else if (t.sessionWindow?.includes('Afternoon')) {
        afternoonTrades++;
        if (t.netPnL > 0) afternoonWins++;
      }

      // Pattern tags
      const hasCompression = t.patternTags?.some((tag) => tag === 'NR4' || tag === 'InsideBar' || tag === 'Engulfing');
      if (hasCompression) {
        compressionTrades++;
        if (t.netPnL > 0) compressionWins++;
      }
    }

    const totalTrades = trades.length;
    const winRatePct = Number(((winningTrades / totalTrades) * 100).toFixed(1));
    const profitFactor = totalGrossLosses > 0 ? Number((totalGrossProfits / totalGrossLosses).toFixed(2)) : totalGrossProfits > 0 ? 99.0 : 0;
    const expectancyR = Number((sumR / totalTrades).toFixed(2));
    const maxDrawdownPct = capitalPerTrade > 0 ? Number(((maxDrawdown / capitalPerTrade) * 100).toFixed(2)) : 0;

    const morningWindowWinRate = morningTrades > 0 ? Number(((morningWins / morningTrades) * 100).toFixed(1)) : 0;
    const afternoonWindowWinRate = afternoonTrades > 0 ? Number(((afternoonWins / afternoonTrades) * 100).toFixed(1)) : 0;
    const compressionSetupWinRate = compressionTrades > 0 ? Number(((compressionWins / compressionTrades) * 100).toFixed(1)) : 0;

    const avgWinR = winningTrades > 0 ? totalGrossProfits / winningTrades : 0;
    const avgLossR = losingTrades > 0 ? totalGrossLosses / losingTrades : 1;
    const avgRiskReward = Number((avgWinR / avgLossR).toFixed(2));

    return {
      symbol,
      totalTrades,
      winningTrades,
      losingTrades,
      breakevenTrades,
      winRatePct,
      netPnL: Number(netPnL.toFixed(2)),
      profitFactor,
      expectancyR,
      maxDrawdownPct,
      avgRiskReward,
      morningWindowWinRate,
      afternoonWindowWinRate,
      compressionSetupWinRate,
      bestSetupTag: compressionSetupWinRate >= winRatePct ? 'NR4/InsideBar' : 'VWAP+EMA'
    };
  }

  static computeEmptyMetrics(symbol) {
    return {
      symbol,
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      breakevenTrades: 0,
      winRatePct: 0,
      netPnL: 0,
      profitFactor: 0,
      expectancyR: 0,
      maxDrawdownPct: 0,
      avgRiskReward: 0,
      morningWindowWinRate: 0,
      afternoonWindowWinRate: 0,
      compressionSetupWinRate: 0,
      bestSetupTag: 'N/A'
    };
  }
}

module.exports = GrowwBacktestEngine;

