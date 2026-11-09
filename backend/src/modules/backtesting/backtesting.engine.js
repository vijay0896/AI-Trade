/**
 * @file backtesting.engine.js
 * @description Core deterministic historical backtesting engine executing candle-by-candle simulation.
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const IndicatorsCalculator = require('../indicators/indicators.calculator');
const {
  BACKTEST_STORAGE_PATHS,
  EXIT_REASONS
} = require('./backtesting.constants');
const BacktestFeeEngine = require('./backtesting.fees');
const BacktestExecutionEngine = require('./backtesting.execution');
const BacktestRiskManager = require('./backtesting.risk');
const BacktestMetricsCalculator = require('./backtesting.metrics');
const { STRATEGY_VARIANTS, ENTRY_TYPES, STOP_LOSS_MODES, TARGET_MODES } = require('../strategy/strategy.constants');

class BacktestEngine {
  /**
   * Run historical backtest for a specific stock and strategy configuration
   * @param {Object} options
   * @param {string} options.symbol NSE stock symbol (e.g. ICICIBANK)
   * @param {Object} options.strategyConfig Validated strategy configuration object
   * @param {number} [options.capital=100000] Initial capital in INR
   * @param {number} [options.slippageBps=2.0] Slippage in basis points
   * @param {string} [options.startDate] Optional start date filter (YYYY-MM-DD)
   * @param {string} [options.endDate] Optional end date filter (YYYY-MM-DD)
   * @param {'BOTH'|'LONG_ONLY'|'SHORT_ONLY'} [options.direction] Direction override
   * @param {Object} [options.customFeeSchedule] Optional custom fee schedule
   * @returns {Promise<Object>} Backtest run result
   */
  static async run(options) {
    const { strategyConfig } = options;
    if (
      strategyConfig?.id === 'ema_9_21_crossover' ||
      strategyConfig?.strategyId === 'ema_9_21_crossover' ||
      strategyConfig?.variant === 'EMA_9_21_CROSSOVER' ||
      strategyConfig?.variant === 'ema_9_21_crossover'
    ) {
      return this.runEMA921(options);
    }

    const {
      symbol,
      capital = 100000,
      slippageBps = 2.0,
      startDate = null,
      endDate = null,
      direction = strategyConfig.entry?.direction || 'BOTH',
      customFeeSchedule = null
    } = options;

    const startTimeMs = Date.now();
    const runId = `RUN-${symbol}-${strategyConfig.variant}-${Date.now().toString(36).toUpperCase()}`;

    // 1. Ingest derived indicator candles
    const { candlesByDay, totalCandlesProcessed, totalRegularBars } = await this.loadDerivedCandles(
      symbol,
      startDate,
      endDate
    );

    const completedTrades = [];
    const dailyRecords = [];
    const excludedSessions = [];
    let runningCapital = capital;
    let globalTradeIndex = 1;

    // 2. Iterate trading day by trading day
    const sortedDays = Object.keys(candlesByDay).sort();

    for (const day of sortedDays) {
      const dayCandles = candlesByDay[day];
      const startOfDayCapital = runningCapital;

      // Filter: Check for special or non-regular sessions (Muhurat, DR split)
      const isSpecial = dayCandles.some(c => c.sessionType === 'MUHURAT_SPECIAL' || c.sessionType === 'DR_SPLIT');
      if (isSpecial && strategyConfig.specialSessions === 'SUPPRESS_ALL') {
        const specialType = dayCandles.find(c => c.sessionType === 'MUHURAT_SPECIAL' || c.sessionType === 'DR_SPLIT')?.sessionType || 'NON_REGULAR';
        excludedSessions.push({
          date: day,
          symbol,
          reason: `SPECIAL_SESSION_${specialType}`,
          candlesCount: dayCandles.length
        });
        continue;
      }

      // Filter: Extract Opening Range candles (09:15, 09:20, 09:25)
      const orCandles = dayCandles.filter(c => {
        const time = c.timestamp.split('T')[1];
        return time === '09:15:00' || time === '09:20:00' || time === '09:25:00';
      });

      if (orCandles.length !== 3) {
        excludedSessions.push({
          date: day,
          symbol,
          reason: 'INCOMPLETE_OPENING_RANGE',
          candlesCount: orCandles.length
        });
        continue;
      }

      // Calculate Opening Range bounds
      const orHigh = Math.max(...orCandles.map(c => c.high));
      const orLow = Math.min(...orCandles.map(c => c.low));
      const orWidth = orHigh - orLow;
      const orWidthPercent = (orWidth / orLow) * 100;

      // Opening Range Width Guards
      const minWidthPct = strategyConfig.openingRange.minWidthPercent || 0.1;
      const maxWidthPct = strategyConfig.openingRange.maxWidthPercent || 3.5;

      if (orWidthPercent < minWidthPct) {
        excludedSessions.push({
          date: day,
          symbol,
          reason: 'OR_WIDTH_TOO_NARROW',
          orWidthPercent: Number(orWidthPercent.toFixed(2))
        });
        continue;
      }

      if (orWidthPercent > maxWidthPct) {
        excludedSessions.push({
          date: day,
          symbol,
          reason: 'OR_WIDTH_TOO_WIDE',
          orWidthPercent: Number(orWidthPercent.toFixed(2))
        });
        continue;
      }

      // Day Session Trading State
      let dailyTradesCount = 0;
      let dailyRealizedPnL = 0;
      let activeTrade = null;
      let pendingSignal = null;
      let retestTracking = null;

      // Continuous Market Session bars from 09:30:00 to 15:25:00
      const actionableCandles = dayCandles.filter(c => {
        const time = c.timestamp.split('T')[1];
        return time >= '09:30:00' && time <= '15:25:00' && c.sessionType === 'REGULAR';
      });

      for (let barIdx = 0; barIdx < actionableCandles.length; barIdx++) {
        const candle = actionableCandles[barIdx];
        const timeStr = candle.timestamp.split('T')[1];

        // ---------------------------------------------------------
        // A. Process Active Trade Exit Evaluation
        // ---------------------------------------------------------
        if (activeTrade) {
          const exitEvent = BacktestExecutionEngine.evaluateExit(
            activeTrade,
            candle,
            strategyConfig.exit,
            slippageBps
          );

          if (exitEvent) {
            // Finalize Trade
            const qty = activeTrade.quantity;
            const nominalEntryPrice = activeTrade.nominalEntryPrice;
            const execEntryPrice = activeTrade.entryPrice;
            const nominalExitPrice = exitEvent.nominalExitPrice;
            const execExitPrice = exitEvent.exitPrice;

            // 1. Theoretical Gross P&L before slippage
            const theoreticalGrossPnL = activeTrade.side === 'LONG'
              ? (nominalExitPrice - nominalEntryPrice) * qty
              : (nominalEntryPrice - nominalExitPrice) * qty;

            // 2. Slippage Costs
            const entrySlippageCost = Math.abs(execEntryPrice - nominalEntryPrice) * qty;
            const exitSlippageCost = Math.abs(execExitPrice - nominalExitPrice) * qty;
            const totalSlippageCost = entrySlippageCost + exitSlippageCost;

            // 3. Gross Realized P&L after slippage
            const grossRealizedPnL = activeTrade.side === 'LONG'
              ? (execExitPrice - execEntryPrice) * qty
              : (execEntryPrice - execExitPrice) * qty;

            // 4. Itemized Transaction Charges (Brokerage + Statutory + GST)
            const feeResult = BacktestFeeEngine.calculateTradeCosts({
              side: activeTrade.side,
              quantity: qty,
              entryPrice: execEntryPrice,
              exitPrice: execExitPrice,
              entryTimestamp: activeTrade.entryTimestamp,
              exitTimestamp: exitEvent.exitTimestamp,
              customSchedule: customFeeSchedule
            });

            // 5. Final Net Realized P&L
            const netPnL = grossRealizedPnL - feeResult.totalCharges;
            dailyRealizedPnL += netPnL;
            runningCapital += netPnL;

            completedTrades.push({
              tradeId: activeTrade.tradeId,
              symbol,
              side: activeTrade.side,
              entryTimestamp: activeTrade.entryTimestamp,
              exitTimestamp: exitEvent.exitTimestamp,
              nominalEntryPrice: Number(nominalEntryPrice.toFixed(2)),
              entryPrice: Number(execEntryPrice.toFixed(2)),
              nominalExitPrice: Number(nominalExitPrice.toFixed(2)),
              exitPrice: Number(execExitPrice.toFixed(2)),
              quantity: qty,
              positionValue: activeTrade.positionValue,
              initialStopLoss: activeTrade.initialStopLoss,
              targetPrice: activeTrade.targetPrice,
              exitReason: exitEvent.exitReason,
              barsHeld: exitEvent.barsHeld,
              theoreticalGrossPnL: Number(theoreticalGrossPnL.toFixed(2)),
              entrySlippageCost: Number(entrySlippageCost.toFixed(2)),
              exitSlippageCost: Number(exitSlippageCost.toFixed(2)),
              totalSlippageCost: Number(totalSlippageCost.toFixed(2)),
              grossPnL: Number(grossRealizedPnL.toFixed(2)), // Gross realized after slippage
              brokerage: feeResult.brokerage,
              stt: feeResult.stt,
              stampDuty: feeResult.stampDuty,
              exchangeCharges: feeResult.exchangeCharges,
              sebiCharges: feeResult.sebiCharges,
              ipftCharges: feeResult.ipftCharges,
              statutoryCharges: feeResult.statutoryCharges,
              gst: feeResult.gst,
              totalCharges: feeResult.totalCharges,
              netPnL: Number(netPnL.toFixed(2)),
              isAmbiguous: exitEvent.isAmbiguous,
              ambiguityDetail: exitEvent.ambiguityDetail || null
            });

            activeTrade = null;
          }
        }

        // ---------------------------------------------------------
        // B. Execute Pending Signal at Candle Open (Model A or B)
        // ---------------------------------------------------------
        if (!activeTrade && pendingSignal) {
          const riskCheck = BacktestRiskManager.canEnterTrade({
            dailyTradesCount,
            maxTradesPerDay: strategyConfig.risk.maxTradesPerDay || 2,
            dailyRealizedPnL,
            capital: runningCapital,
            dailyMaxLossPercent: strategyConfig.risk.dailyMaxLossPercent || 1.0,
            hasActivePosition: false
          });

          if (riskCheck.permitted) {
            const entryExecPrice = BacktestExecutionEngine.applySlippage(
              candle.open,
              pendingSignal.side,
              'ENTRY',
              slippageBps
            );

            // Determine Stop Loss Price
            const stopPrice = this.computeStopLossPrice(
              pendingSignal.side,
              entryExecPrice,
              orHigh,
              orLow,
              candle,
              actionableCandles,
              barIdx,
              strategyConfig.exit
            );

            // Determine Target Price
            const stopDistance = Math.abs(entryExecPrice - stopPrice);
            const rrRatio = strategyConfig.exit.riskRewardRatio || 1.5;
            const targetPrice = pendingSignal.side === 'LONG'
              ? Number((entryExecPrice + (rrRatio * stopDistance)).toFixed(2))
              : Number((entryExecPrice - (rrRatio * stopDistance)).toFixed(2));

            // Position Sizing
            const sizing = BacktestRiskManager.determinePositionSize({
              capital: runningCapital,
              riskPercent: strategyConfig.risk.riskPerTradePercent || 0.5,
              entryPrice: entryExecPrice,
              stopLossPrice: stopPrice,
              leverage: strategyConfig.risk.leverageMultiplier || 1
            });

            if (sizing.isExecutable && sizing.quantity >= 1) {
              activeTrade = {
                tradeId: `TRD-${symbol}-${String(globalTradeIndex++).padStart(5, '0')}`,
                symbol,
                side: pendingSignal.side,
                entryTimestamp: candle.timestamp,
                nominalEntryPrice: candle.open,
                entryPrice: entryExecPrice,
                quantity: sizing.quantity,
                positionValue: sizing.positionValue,
                initialStopLoss: stopPrice,
                currentStopLoss: stopPrice,
                targetPrice,
                barsHeld: 1,
                entrySlippageCost: Math.abs(entryExecPrice - candle.open) * sizing.quantity,
                isTrailingActive: false
              };
              dailyTradesCount++;
            }
          }

          pendingSignal = null;
        }

        // ---------------------------------------------------------
        // C. Evaluate New Signals on Candle Close (Strictly Causal)
        // ---------------------------------------------------------
        if (!activeTrade && !pendingSignal) {
          const entryCutoff = strategyConfig.entry.entryCutoffTime || '14:30:00';
          if (timeStr <= entryCutoff) {
            const riskCheck = BacktestRiskManager.canEnterTrade({
              dailyTradesCount,
              maxTradesPerDay: strategyConfig.risk.maxTradesPerDay || 2,
              dailyRealizedPnL,
              capital: runningCapital,
              dailyMaxLossPercent: strategyConfig.risk.dailyMaxLossPercent || 1.0,
              hasActivePosition: false
            });

            if (riskCheck.permitted) {
              const entryType = strategyConfig.entry.entryType || ENTRY_TYPES.BREAKOUT_CLOSE;

              if (entryType === ENTRY_TYPES.BREAKOUT_CLOSE) {
                // Model A: Breakout Close Confirmation
                const signal = this.evaluateBreakoutSignal(
                  candle,
                  orHigh,
                  orLow,
                  strategyConfig,
                  direction
                );

                if (signal) {
                  pendingSignal = {
                    side: signal,
                    signalTimestamp: candle.timestamp,
                    breakoutClose: candle.close
                  };
                }
              } else if (entryType === ENTRY_TYPES.RETEST_CONFIRMATION) {
                // Model B: Retest & Confirmation
                const retestSignal = this.evaluateRetestModel(
                  candle,
                  orHigh,
                  orLow,
                  strategyConfig,
                  direction,
                  retestTracking
                );

                if (retestSignal.updatedTracking) {
                  retestTracking = retestSignal.updatedTracking;
                }
                if (retestSignal.confirmedSide) {
                  pendingSignal = {
                    side: retestSignal.confirmedSide,
                    signalTimestamp: candle.timestamp,
                    breakoutClose: candle.close
                  };
                  retestTracking = null;
                }
              }
            }
          }
        }
      }

      // End of Day: Unconditional Square-off if trade somehow carried
      if (activeTrade) {
        const lastCandle = actionableCandles[actionableCandles.length - 1];
        const exitPrice = BacktestExecutionEngine.applySlippage(lastCandle.close, activeTrade.side, 'EXIT', slippageBps);
        const grossPnL = activeTrade.side === 'LONG'
          ? (exitPrice - activeTrade.entryPrice) * activeTrade.quantity
          : (activeTrade.entryPrice - exitPrice) * activeTrade.quantity;

        const feeResult = BacktestFeeEngine.calculateTradeCosts({
          side: activeTrade.side,
          quantity: activeTrade.quantity,
          entryPrice: activeTrade.entryPrice,
          exitPrice,
          entryTimestamp: activeTrade.entryTimestamp,
          exitTimestamp: lastCandle.timestamp,
          customSchedule: customFeeSchedule
        });

        const netPnL = grossPnL - feeResult.totalCharges;
        dailyRealizedPnL += netPnL;
        runningCapital += netPnL;

        completedTrades.push({
          tradeId: activeTrade.tradeId,
          symbol,
          side: activeTrade.side,
          entryTimestamp: activeTrade.entryTimestamp,
          exitTimestamp: lastCandle.timestamp,
          nominalEntryPrice: activeTrade.nominalEntryPrice,
          entryPrice: activeTrade.entryPrice,
          nominalExitPrice: lastCandle.close,
          exitPrice,
          quantity: activeTrade.quantity,
          positionValue: activeTrade.positionValue,
          initialStopLoss: activeTrade.initialStopLoss,
          targetPrice: activeTrade.targetPrice,
          exitReason: EXIT_REASONS.SQUARE_OFF,
          barsHeld: activeTrade.barsHeld,
          grossPnL: Number(grossPnL.toFixed(2)),
          netPnL: Number(netPnL.toFixed(2)),
          brokerage: feeResult.brokerage,
          statutoryCharges: feeResult.statutoryCharges,
          gst: feeResult.gst,
          totalCharges: feeResult.totalCharges,
          entrySlippageCost: activeTrade.entrySlippageCost,
          exitSlippageCost: Math.abs(exitPrice - lastCandle.close) * activeTrade.quantity,
          isAmbiguous: false
        });
        activeTrade = null;
      }

      // Record Daily Summary
      const isBreakerTripped = BacktestRiskManager.isDailyCircuitBreakerTripped(
        dailyRealizedPnL,
        startOfDayCapital,
        strategyConfig.risk.dailyMaxLossPercent || 1.0
      );

      dailyRecords.push({
        date: day,
        startingCapital: Number(startOfDayCapital.toFixed(2)),
        endingCapital: Number(runningCapital.toFixed(2)),
        dailyRealizedPnL: Number(dailyRealizedPnL.toFixed(2)),
        tradesCount: dailyTradesCount,
        isCircuitBreakerTripped: isBreakerTripped
      });
    }

    // 3. Compute Comprehensive Analytics & Metrics
    const metrics = BacktestMetricsCalculator.calculate(
      completedTrades,
      dailyRecords,
      capital,
      totalRegularBars
    );

    const runtimeMs = Date.now() - startTimeMs;

    return {
      runMetadata: {
        runId,
        symbol,
        strategyId: strategyConfig.id,
        strategyName: strategyConfig.name,
        variant: strategyConfig.variant,
        direction,
        timeframe: '5minute',
        startDate: sortedDays[0] || null,
        endDate: sortedDays[sortedDays.length - 1] || null,
        totalCandlesProcessed,
        totalRegularBars,
        totalTradingDays: sortedDays.length,
        excludedSessionsCount: excludedSessions.length,
        initialCapital: capital,
        endingCapital: Number(runningCapital.toFixed(2)),
        slippageBps,
        executedAt: new Date().toISOString(),
        runtimeMs
      },
      strategyConfig,
      metrics,
      trades: completedTrades,
      dailyPerformance: dailyRecords,
      excludedSessions
    };
  }

  /**
   * Evaluate Breakout Signal based on variant filters
   * @param {Object} candle
   * @param {number} orHigh
   * @param {number} orLow
   * @param {Object} strategyConfig
   * @param {string} direction
   * @returns {'LONG'|'SHORT'|null}
   */
  static evaluateBreakoutSignal(candle, orHigh, orLow, strategyConfig, direction) {
    const { variant, filters } = strategyConfig;

    // Check Long Breakout: Close > Opening Range High
    if (candle.close > orHigh && direction !== 'SHORT_ONLY') {
      if (this.isLongFilterSatisfied(candle, variant, filters)) {
        return 'LONG';
      }
    }

    // Check Short Breakdown: Close < Opening Range Low
    if (candle.close < orLow && direction !== 'LONG_ONLY') {
      if (this.isShortFilterSatisfied(candle, variant, filters)) {
        return 'SHORT';
      }
    }

    return null;
  }

  /**
   * Check indicator filters for Long signal
   */
  static isLongFilterSatisfied(candle, variant, filters) {
    // Variant A: Pure Price Action
    if (variant === STRATEGY_VARIANTS.VARIANT_A) return true;

    // Variant B: ORB + VWAP
    if (candle.vwap == null || candle.close <= candle.vwap) return false;
    if (variant === STRATEGY_VARIANTS.VARIANT_B) return true;

    // Variant C: ORB + VWAP + EMA 20/50
    if (candle.ema20 == null || candle.ema50 == null || candle.ema20 <= candle.ema50) return false;
    if (variant === STRATEGY_VARIANTS.VARIANT_C) return true;

    // Variant D: ORB + VWAP + EMA + ADX 14 & (+DI / -DI)
    const adxThreshold = filters.adxThreshold || 20;
    if (candle.adx14 == null || candle.adx14 < adxThreshold) return false;
    if (filters.diDirectionalConfirm && (candle.plusDI14 == null || candle.minusDI14 == null || candle.plusDI14 <= candle.minusDI14)) {
      return false;
    }
    if (variant === STRATEGY_VARIANTS.VARIANT_D) return true;

    // Variant E: Full Trend Confirmation
    const rvolThreshold = filters.rvolThreshold || 1.5;
    if (candle.relativeVolume20 == null || candle.relativeVolume20 < rvolThreshold) return false;
    if (filters.choppinessMaxThreshold && candle.choppiness14 != null && candle.choppiness14 >= filters.choppinessMaxThreshold) {
      return false;
    }
    if (filters.efficiencyRatioMin && candle.efficiencyRatio14 != null && candle.efficiencyRatio14 < filters.efficiencyRatioMin) {
      return false;
    }

    return true;
  }

  /**
   * Check indicator filters for Short signal
   */
  static isShortFilterSatisfied(candle, variant, filters) {
    // Variant A: Pure Price Action
    if (variant === STRATEGY_VARIANTS.VARIANT_A) return true;

    // Variant B: ORB + VWAP
    if (candle.vwap == null || candle.close >= candle.vwap) return false;
    if (variant === STRATEGY_VARIANTS.VARIANT_B) return true;

    // Variant C: ORB + VWAP + EMA 20/50
    if (candle.ema20 == null || candle.ema50 == null || candle.ema20 >= candle.ema50) return false;
    if (variant === STRATEGY_VARIANTS.VARIANT_C) return true;

    // Variant D: ORB + VWAP + EMA + ADX 14 & (+DI / -DI)
    const adxThreshold = filters.adxThreshold || 20;
    if (candle.adx14 == null || candle.adx14 < adxThreshold) return false;
    if (filters.diDirectionalConfirm && (candle.plusDI14 == null || candle.minusDI14 == null || candle.minusDI14 <= candle.plusDI14)) {
      return false;
    }
    if (variant === STRATEGY_VARIANTS.VARIANT_D) return true;

    // Variant E: Full Trend Confirmation
    const rvolThreshold = filters.rvolThreshold || 1.5;
    if (candle.relativeVolume20 == null || candle.relativeVolume20 < rvolThreshold) return false;
    if (filters.choppinessMaxThreshold && candle.choppiness14 != null && candle.choppiness14 >= filters.choppinessMaxThreshold) {
      return false;
    }
    if (filters.efficiencyRatioMin && candle.efficiencyRatio14 != null && candle.efficiencyRatio14 < filters.efficiencyRatioMin) {
      return false;
    }

    return true;
  }

  /**
   * Model B: Retest & Confirmation Tracker
   */
  static evaluateRetestModel(candle, orHigh, orLow, strategyConfig, direction, currentTracking) {
    const tolPct = strategyConfig.entry.retestTolerancePercent || 0.2;
    const maxBars = strategyConfig.entry.retestMaxBars || 6;
    const tolHigh = orHigh * (1 + tolPct / 100);
    const tolLow = orHigh * (1 - tolPct / 100);
    const tolShortHigh = orLow * (1 + tolPct / 100);
    const tolShortLow = orLow * (1 - tolPct / 100);

    // If no active breakout tracking, check if candle just broke out
    if (!currentTracking) {
      if (candle.close > orHigh && direction !== 'SHORT_ONLY') {
        return {
          updatedTracking: { side: 'LONG', breakoutClose: candle.close, barsElapsed: 0, touchedRetest: false },
          confirmedSide: null
        };
      }
      if (candle.close < orLow && direction !== 'LONG_ONLY') {
        return {
          updatedTracking: { side: 'SHORT', breakoutClose: candle.close, barsElapsed: 0, touchedRetest: false },
          confirmedSide: null
        };
      }
      return { updatedTracking: null, confirmedSide: null };
    }

    // Existing breakout tracking
    currentTracking.barsElapsed++;

    // Invalidate if too many bars without confirmation
    if (currentTracking.barsElapsed > maxBars) {
      return { updatedTracking: null, confirmedSide: null };
    }

    if (currentTracking.side === 'LONG') {
      // Check if low pulled back into retest zone
      if (candle.low <= tolHigh && candle.low >= tolLow) {
        currentTracking.touchedRetest = true;
      }
      // Confirm if retest was touched and candle closes green above previous close
      if (currentTracking.touchedRetest && candle.close > candle.open && candle.close > orHigh) {
        if (this.isLongFilterSatisfied(candle, strategyConfig.variant, strategyConfig.filters)) {
          return { updatedTracking: null, confirmedSide: 'LONG' };
        }
      }
      // If candle breaks down below OR Low, setup is invalidated
      if (candle.close < orLow) {
        return { updatedTracking: null, confirmedSide: null };
      }
    } else {
      if (candle.high >= tolShortLow && candle.high <= tolShortHigh) {
        currentTracking.touchedRetest = true;
      }
      if (currentTracking.touchedRetest && candle.close < candle.open && candle.close < orLow) {
        if (this.isShortFilterSatisfied(candle, strategyConfig.variant, strategyConfig.filters)) {
          return { updatedTracking: null, confirmedSide: 'SHORT' };
        }
      }
      if (candle.close > orHigh) {
        return { updatedTracking: null, confirmedSide: null };
      }
    }

    return { updatedTracking: currentTracking, confirmedSide: null };
  }

  /**
   * Compute Stop Loss price based on strategy exit configuration
   */
  static computeStopLossPrice(side, entryPrice, orHigh, orLow, candle, candles, barIdx, exitConfig) {
    const mode = exitConfig.stopLossMode || STOP_LOSS_MODES.OR_OPPOSITE;

    if (mode === STOP_LOSS_MODES.OR_OPPOSITE) {
      return side === 'LONG' ? orLow : orHigh;
    }

    if (mode === STOP_LOSS_MODES.BREAKOUT_BAR_EXTREME) {
      return side === 'LONG' ? candle.low : candle.high;
    }

    if (mode === STOP_LOSS_MODES.SWING_EXTREME) {
      const lookback = exitConfig.swingLookbackBars || 5;
      const startIdx = Math.max(0, barIdx - lookback);
      const priorBars = candles.slice(startIdx, barIdx);
      if (priorBars.length > 0) {
        if (side === 'LONG') {
          return Math.min(...priorBars.map(b => b.low));
        } else {
          return Math.max(...priorBars.map(b => b.high));
        }
      }
      return side === 'LONG' ? orLow : orHigh;
    }

    if (mode === STOP_LOSS_MODES.ATR_BASED) {
      const atrMult = exitConfig.atrMultiplierSL || 1.5;
      const atrVal = candle.atr14 || (entryPrice * 0.005);
      const dist = atrMult * atrVal;
      return side === 'LONG'
        ? Number((entryPrice - dist).toFixed(2))
        : Number((entryPrice + dist).toFixed(2));
    }

    return side === 'LONG' ? orLow : orHigh;
  }

  /**
   * Run historical backtest for EMA 9 / EMA 21 Crossover Strategy
   * Long-only trend-following, candle-close signal + next-candle-open execution,
   * square-off at 15:15 IST, fixed share quantity (1 share), full Groww fee schedule.
   *
   * @param {Object} options
   * @returns {Promise<Object>} Backtest run result
   */
  static async runEMA921(options) {
    const {
      symbol,
      strategyConfig,
      capital = 100000,
      slippageBps = 2.0,
      startDate = null,
      endDate = null,
      customFeeSchedule = null
    } = options;

    const startTimeMs = Date.now();
    const runId = `RUN-${symbol}-EMA9_21-${Date.now().toString(36).toUpperCase()}`;

    // 1. Ingest derived indicator candles
    const { candlesByDay, totalCandlesProcessed, totalRegularBars } = await this.loadDerivedCandles(
      symbol,
      startDate,
      endDate
    );

    const sortedDays = Object.keys(candlesByDay).sort();
    const completedTrades = [];
    const dailyRecords = [];
    const excludedSessions = [];
    let runningCapital = capital;
    let globalTradeIndex = 1;
    let totalBuySignals = 0;
    let totalSellSignals = 0;

    // 2. Compute streaming continuous EMA 9 and EMA 21 across all regular candles chronologically
    const calc = new IndicatorsCalculator();
    let prevEMA9 = null;
    let prevEMA21 = null;

    // Enrich all regular candles with continuous EMA 9 and EMA 21
    for (const day of sortedDays) {
      const dayCandles = candlesByDay[day];
      for (const candle of dayCandles) {
        if (candle.sessionType === 'REGULAR') {
          const indicators = calc.processRegularBar(candle);
          candle.ema9 = indicators.ema9;
          candle.ema21 = indicators.ema21;

          // Check crossover only when both current and previous EMAs are valid
          let buySignal = false;
          let sellSignal = false;
          if (
            candle.ema9 !== null &&
            candle.ema21 !== null &&
            prevEMA9 !== null &&
            prevEMA21 !== null
          ) {
            // Bullish Crossover: Previous EMA 9 <= EMA 21, Current EMA 9 > EMA 21
            if (prevEMA9 <= prevEMA21 && candle.ema9 > candle.ema21) {
              buySignal = true;
              totalBuySignals++;
            }
            // Bearish Crossunder: Previous EMA 9 >= EMA 21, Current EMA 9 < EMA 21
            else if (prevEMA9 >= prevEMA21 && candle.ema9 < candle.ema21) {
              sellSignal = true;
              totalSellSignals++;
            }
          }

          candle.buySignal = buySignal;
          candle.sellSignal = sellSignal;

          if (candle.ema9 !== null) prevEMA9 = candle.ema9;
          if (candle.ema21 !== null) prevEMA21 = candle.ema21;
        } else {
          candle.buySignal = false;
          candle.sellSignal = false;
        }
      }
    }

    // 3. Candle-by-candle simulation day by day
    const fixedQuantity = strategyConfig.fixedQuantity || 1;
    const entryCutoffTime = strategyConfig.entryCutoffTime || '15:00:00';
    const squareOffTime = strategyConfig.squareOffTime || '15:15:00';

    for (const day of sortedDays) {
      const dayCandles = candlesByDay[day];
      const startOfDayCapital = runningCapital;

      // Filter: Check for special or non-regular sessions (Muhurat, DR split)
      const isSpecial = dayCandles.some(c => c.sessionType === 'MUHURAT_SPECIAL' || c.sessionType === 'DR_SPLIT');
      if (isSpecial && strategyConfig.specialSessions === 'SUPPRESS_ALL') {
        const specialType = dayCandles.find(c => c.sessionType === 'MUHURAT_SPECIAL' || c.sessionType === 'DR_SPLIT')?.sessionType || 'NON_REGULAR';
        excludedSessions.push({
          date: day,
          symbol,
          reason: `SPECIAL_SESSION_${specialType}`,
          candlesCount: dayCandles.length
        });
        continue;
      }

      // Regular continuous session bars
      const actionableCandles = dayCandles.filter(c => c.sessionType === 'REGULAR');
      if (actionableCandles.length === 0) continue;

      let activeTrade = null;
      let pendingBuySignal = null;
      let pendingSellSignal = null;
      let dailyTradesCount = 0;
      let dailyRealizedPnL = 0;

      for (let barIdx = 0; barIdx < actionableCandles.length; barIdx++) {
        const candle = actionableCandles[barIdx];
        const timeStr = candle.timestamp.split('T')[1];

        // -------------------------------------------------------------
        // Step A: Check Pending Exit (from prior bar's SELL crossunder)
        // -------------------------------------------------------------
        if (activeTrade && pendingSellSignal) {
          const nominalExitPrice = candle.open;
          const execExitPrice = BacktestExecutionEngine.applySlippage(
            nominalExitPrice,
            'LONG',
            'EXIT',
            slippageBps
          );

          const qty = activeTrade.quantity;
          const nominalEntryPrice = activeTrade.nominalEntryPrice;
          const execEntryPrice = activeTrade.entryPrice;

          const theoreticalGrossPnL = (nominalExitPrice - nominalEntryPrice) * qty;
          const entrySlippageCost = Math.abs(execEntryPrice - nominalEntryPrice) * qty;
          const exitSlippageCost = Math.abs(execExitPrice - nominalExitPrice) * qty;
          const totalSlippageCost = entrySlippageCost + exitSlippageCost;
          const grossRealizedPnL = (execExitPrice - execEntryPrice) * qty;

          const feeResult = BacktestFeeEngine.calculateTradeCosts({
            side: 'LONG',
            quantity: qty,
            entryPrice: execEntryPrice,
            exitPrice: execExitPrice,
            entryTimestamp: activeTrade.entryTimestamp,
            exitTimestamp: candle.timestamp,
            customSchedule: customFeeSchedule
          });

          const netPnL = grossRealizedPnL - feeResult.totalCharges;
          dailyRealizedPnL += netPnL;
          runningCapital += netPnL;

          completedTrades.push({
            tradeId: activeTrade.tradeId,
            symbol,
            side: 'LONG',
            entryTimestamp: activeTrade.entryTimestamp,
            exitTimestamp: candle.timestamp,
            nominalEntryPrice: Number(nominalEntryPrice.toFixed(2)),
            entryPrice: Number(execEntryPrice.toFixed(2)),
            nominalExitPrice: Number(nominalExitPrice.toFixed(2)),
            exitPrice: Number(execExitPrice.toFixed(2)),
            quantity: qty,
            positionValue: activeTrade.positionValue,
            initialStopLoss: null,
            targetPrice: null,
            exitReason: EXIT_REASONS.BEARISH_CROSSOVER || 'BEARISH_CROSSOVER',
            barsHeld: activeTrade.barsHeld + 1,
            theoreticalGrossPnL: Number(theoreticalGrossPnL.toFixed(2)),
            entrySlippageCost: Number(entrySlippageCost.toFixed(2)),
            exitSlippageCost: Number(exitSlippageCost.toFixed(2)),
            totalSlippageCost: Number(totalSlippageCost.toFixed(2)),
            grossPnL: Number(grossRealizedPnL.toFixed(2)),
            brokerage: feeResult.brokerage,
            stt: feeResult.stt,
            stampDuty: feeResult.stampDuty,
            exchangeCharges: feeResult.exchangeCharges,
            sebiCharges: feeResult.sebiCharges,
            ipftCharges: feeResult.ipftCharges,
            statutoryCharges: feeResult.statutoryCharges,
            gst: feeResult.gst,
            totalCharges: feeResult.totalCharges,
            netPnL: Number(netPnL.toFixed(2)),
            isAmbiguous: false,
            ambiguityDetail: null
          });

          activeTrade = null;
          pendingSellSignal = null;
        }

        // -------------------------------------------------------------
        // Step B: Intraday Square-off at 15:15:00 IST
        // -------------------------------------------------------------
        if (activeTrade && timeStr >= squareOffTime) {
          const nominalExitPrice = candle.open;
          const execExitPrice = BacktestExecutionEngine.applySlippage(
            nominalExitPrice,
            'LONG',
            'EXIT',
            slippageBps
          );

          const qty = activeTrade.quantity;
          const nominalEntryPrice = activeTrade.nominalEntryPrice;
          const execEntryPrice = activeTrade.entryPrice;

          const theoreticalGrossPnL = (nominalExitPrice - nominalEntryPrice) * qty;
          const entrySlippageCost = Math.abs(execEntryPrice - nominalEntryPrice) * qty;
          const exitSlippageCost = Math.abs(execExitPrice - nominalExitPrice) * qty;
          const totalSlippageCost = entrySlippageCost + exitSlippageCost;
          const grossRealizedPnL = (execExitPrice - execEntryPrice) * qty;

          const feeResult = BacktestFeeEngine.calculateTradeCosts({
            side: 'LONG',
            quantity: qty,
            entryPrice: execEntryPrice,
            exitPrice: execExitPrice,
            entryTimestamp: activeTrade.entryTimestamp,
            exitTimestamp: candle.timestamp,
            customSchedule: customFeeSchedule
          });

          const netPnL = grossRealizedPnL - feeResult.totalCharges;
          dailyRealizedPnL += netPnL;
          runningCapital += netPnL;

          completedTrades.push({
            tradeId: activeTrade.tradeId,
            symbol,
            side: 'LONG',
            entryTimestamp: activeTrade.entryTimestamp,
            exitTimestamp: candle.timestamp,
            nominalEntryPrice: Number(nominalEntryPrice.toFixed(2)),
            entryPrice: Number(execEntryPrice.toFixed(2)),
            nominalExitPrice: Number(nominalExitPrice.toFixed(2)),
            exitPrice: Number(execExitPrice.toFixed(2)),
            quantity: qty,
            positionValue: activeTrade.positionValue,
            initialStopLoss: null,
            targetPrice: null,
            exitReason: EXIT_REASONS.SQUARE_OFF || 'INTRADAY_SQUARE_OFF',
            barsHeld: activeTrade.barsHeld + 1,
            theoreticalGrossPnL: Number(theoreticalGrossPnL.toFixed(2)),
            entrySlippageCost: Number(entrySlippageCost.toFixed(2)),
            exitSlippageCost: Number(exitSlippageCost.toFixed(2)),
            totalSlippageCost: Number(totalSlippageCost.toFixed(2)),
            grossPnL: Number(grossRealizedPnL.toFixed(2)),
            brokerage: feeResult.brokerage,
            stt: feeResult.stt,
            stampDuty: feeResult.stampDuty,
            exchangeCharges: feeResult.exchangeCharges,
            sebiCharges: feeResult.sebiCharges,
            ipftCharges: feeResult.ipftCharges,
            statutoryCharges: feeResult.statutoryCharges,
            gst: feeResult.gst,
            totalCharges: feeResult.totalCharges,
            netPnL: Number(netPnL.toFixed(2)),
            isAmbiguous: false,
            ambiguityDetail: null
          });

          activeTrade = null;
          pendingSellSignal = null;
        }

        // -------------------------------------------------------------
        // Step C: Execute Pending Entry (from prior bar's BUY crossover)
        // -------------------------------------------------------------
        if (!activeTrade && pendingBuySignal) {
          if (timeStr < squareOffTime) {
            const nominalEntryPrice = candle.open;
            const execEntryPrice = BacktestExecutionEngine.applySlippage(
              nominalEntryPrice,
              'LONG',
              'ENTRY',
              slippageBps
            );

            const qty = fixedQuantity;
            const positionValue = execEntryPrice * qty;

            if (positionValue <= runningCapital) {
              activeTrade = {
                tradeId: `TRD-${symbol}-${String(globalTradeIndex++).padStart(5, '0')}`,
                symbol,
                side: 'LONG',
                entryTimestamp: candle.timestamp,
                nominalEntryPrice,
                entryPrice: execEntryPrice,
                quantity: qty,
                positionValue: Number(positionValue.toFixed(2)),
                initialStopLoss: null,
                targetPrice: null,
                barsHeld: 0,
                entrySlippageCost: Math.abs(execEntryPrice - nominalEntryPrice) * qty
              };
              dailyTradesCount++;
            }
          }
          pendingBuySignal = null;
        }

        // Update bars held
        if (activeTrade) {
          activeTrade.barsHeld++;
        }

        // -------------------------------------------------------------
        // Step D: Evaluate Signals on Candle Close (Strictly Causal)
        // -------------------------------------------------------------
        if (candle.buySignal) {
          // Bullish Crossover: Previous EMA 9 <= EMA 21, Current EMA 9 > EMA 21
          // Only trigger pending BUY if NO active position and time is before cutoff
          if (!activeTrade && !pendingBuySignal && timeStr <= entryCutoffTime) {
            pendingBuySignal = {
              signalTimestamp: candle.timestamp,
              signalPrice: candle.close
            };
          }
        }

        if (candle.sellSignal) {
          // Bearish Crossunder: Previous EMA 9 >= EMA 21, Current EMA 9 < EMA 21
          // Only trigger exit if an active long position exists
          if (activeTrade && !pendingSellSignal) {
            pendingSellSignal = {
              signalTimestamp: candle.timestamp,
              signalPrice: candle.close
            };
          }
        }
      }

      // End of Day: Unconditional safety square-off if activeTrade survived
      if (activeTrade) {
        const lastCandle = actionableCandles[actionableCandles.length - 1];
        const nominalExitPrice = lastCandle.close;
        const execExitPrice = BacktestExecutionEngine.applySlippage(
          nominalExitPrice,
          'LONG',
          'EXIT',
          slippageBps
        );

        const qty = activeTrade.quantity;
        const grossRealizedPnL = (execExitPrice - activeTrade.entryPrice) * qty;
        const feeResult = BacktestFeeEngine.calculateTradeCosts({
          side: 'LONG',
          quantity: qty,
          entryPrice: activeTrade.entryPrice,
          exitPrice: execExitPrice,
          entryTimestamp: activeTrade.entryTimestamp,
          exitTimestamp: lastCandle.timestamp,
          customSchedule: customFeeSchedule
        });

        const netPnL = grossRealizedPnL - feeResult.totalCharges;
        dailyRealizedPnL += netPnL;
        runningCapital += netPnL;

        completedTrades.push({
          tradeId: activeTrade.tradeId,
          symbol,
          side: 'LONG',
          entryTimestamp: activeTrade.entryTimestamp,
          exitTimestamp: lastCandle.timestamp,
          nominalEntryPrice: activeTrade.nominalEntryPrice,
          entryPrice: activeTrade.entryPrice,
          nominalExitPrice,
          exitPrice: execExitPrice,
          quantity: qty,
          positionValue: activeTrade.positionValue,
          initialStopLoss: null,
          targetPrice: null,
          exitReason: EXIT_REASONS.SQUARE_OFF || 'INTRADAY_SQUARE_OFF',
          barsHeld: activeTrade.barsHeld,
          theoreticalGrossPnL: Number(((nominalExitPrice - activeTrade.nominalEntryPrice) * qty).toFixed(2)),
          entrySlippageCost: Number(activeTrade.entrySlippageCost.toFixed(2)),
          exitSlippageCost: Number((Math.abs(execExitPrice - nominalExitPrice) * qty).toFixed(2)),
          totalSlippageCost: Number((activeTrade.entrySlippageCost + Math.abs(execExitPrice - nominalExitPrice) * qty).toFixed(2)),
          grossPnL: Number(grossRealizedPnL.toFixed(2)),
          brokerage: feeResult.brokerage,
          stt: feeResult.stt,
          stampDuty: feeResult.stampDuty,
          exchangeCharges: feeResult.exchangeCharges,
          sebiCharges: feeResult.sebiCharges,
          ipftCharges: feeResult.ipftCharges,
          statutoryCharges: feeResult.statutoryCharges,
          gst: feeResult.gst,
          totalCharges: feeResult.totalCharges,
          netPnL: Number(netPnL.toFixed(2)),
          isAmbiguous: false,
          ambiguityDetail: null
        });

        activeTrade = null;
      }

      // Record daily summary
      dailyRecords.push({
        date: day,
        symbol,
        startOfDayCapital: Number(startOfDayCapital.toFixed(2)),
        endingCapital: Number(runningCapital.toFixed(2)),
        endOfDayCapital: Number(runningCapital.toFixed(2)),
        dailyRealizedPnL: Number(dailyRealizedPnL.toFixed(2)),
        tradesCount: dailyTradesCount
      });
    }

    const runtimeMs = Date.now() - startTimeMs;
    const metrics = BacktestMetricsCalculator.calculate(
      completedTrades,
      dailyRecords,
      capital,
      totalRegularBars
    );

    return {
      runMetadata: {
        runId,
        symbol,
        strategyId: 'ema_9_21_crossover',
        strategyName: 'EMA 9/21 Crossover',
        variant: 'EMA_9_21_CROSSOVER',
        direction: 'LONG_ONLY',
        timeframe: '5minute',
        startDate: sortedDays[0] || null,
        endDate: sortedDays[sortedDays.length - 1] || null,
        totalCandlesProcessed,
        totalRegularBars,
        totalTradingDays: sortedDays.length,
        excludedSessionsCount: excludedSessions.length,
        initialCapital: capital,
        endingCapital: Number(runningCapital.toFixed(2)),
        slippageBps,
        executedAt: new Date().toISOString(),
        runtimeMs
      },
      strategyConfig,
      signals: {
        totalBuySignals,
        totalSellSignals
      },
      metrics,
      trades: completedTrades,
      dailyPerformance: dailyRecords,
      excludedSessions
    };
  }

  /**
   * Load and parse all derived indicator CSVs for a symbol
   */
  static async loadDerivedCandles(symbol, startDateFilter = null, endDateFilter = null) {
    const symbolDir = path.join(BACKTEST_STORAGE_PATHS.DERIVED_INDICATORS_DIR, symbol);
    if (!fs.existsSync(symbolDir)) {
      throw new Error(`Derived indicators directory not found for symbol ${symbol}: ${symbolDir}`);
    }

    const years = fs.readdirSync(symbolDir).filter(f => /^\d{4}$/.test(f)).sort();
    const candlesByDay = {};
    let totalCandlesProcessed = 0;
    let totalRegularBars = 0;

    for (const year of years) {
      const yearDir = path.join(symbolDir, year);
      const csvFiles = fs.readdirSync(yearDir).filter(f => f.endsWith('.csv')).sort();

      for (const file of csvFiles) {
        const filePath = path.join(yearDir, file);
        const fileStream = fs.createReadStream(filePath);
        const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

        let isHeader = true;
        for await (const line of rl) {
          if (isHeader) {
            isHeader = false;
            continue;
          }
          if (!line.trim()) continue;

          totalCandlesProcessed++;
          const parts = line.split(',');
          const timestamp = parts[0];
          const dateStr = timestamp.split('T')[0];

          if (startDateFilter && dateStr < startDateFilter) continue;
          if (endDateFilter && dateStr > endDateFilter) continue;

          const open = parseFloat(parts[2]);
          const high = parseFloat(parts[3]);
          const low = parseFloat(parts[4]);
          const close = parseFloat(parts[5]);
          const volume = parseFloat(parts[6]);
          const sessionType = parts[7];

          if (sessionType === 'REGULAR') {
            totalRegularBars++;
          }

          const candle = {
            timestamp,
            symbol: parts[1],
            open,
            high,
            low,
            close,
            volume,
            sessionType,
            ema20: parts[8] ? parseFloat(parts[8]) : null,
            ema50: parts[9] ? parseFloat(parts[9]) : null,
            vwap: parts[10] ? parseFloat(parts[10]) : null,
            atr14: parts[11] ? parseFloat(parts[11]) : null,
            adx14: parts[12] ? parseFloat(parts[12]) : null,
            plusDI14: parts[13] ? parseFloat(parts[13]) : null,
            minusDI14: parts[14] ? parseFloat(parts[14]) : null,
            choppiness14: parts[15] ? parseFloat(parts[15]) : null,
            efficiencyRatio14: parts[16] ? parseFloat(parts[16]) : null,
            volumeSMA20: parts[17] ? parseFloat(parts[17]) : null,
            relativeVolume20: parts[18] ? parseFloat(parts[18]) : null
          };

          if (!candlesByDay[dateStr]) {
            candlesByDay[dateStr] = [];
          }
          candlesByDay[dateStr].push(candle);
        }
      }
    }

    return { candlesByDay, totalCandlesProcessed, totalRegularBars };
  }
}

module.exports = BacktestEngine;

