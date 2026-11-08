/**
 * @file backtesting.engine.js
 * @description Core deterministic historical backtesting engine executing candle-by-candle simulation.
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
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
    const {
      symbol,
      strategyConfig,
      capital = 100000,
      slippageBps = 2.0,
      startDate = null,
      endDate = null,
      direction = strategyConfig.entry.direction || 'BOTH',
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

      // Filter: Check for special or non-regular sessions
      const hasNonRegular = dayCandles.some(c => c.sessionType !== 'REGULAR');
      if (hasNonRegular && strategyConfig.specialSessions === 'SUPPRESS_ALL') {
        const specialType = dayCandles.find(c => c.sessionType !== 'REGULAR')?.sessionType || 'NON_REGULAR';
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
            const exitPrice = exitEvent.exitPrice;
            const grossPnL = activeTrade.side === 'LONG'
              ? (exitPrice - activeTrade.entryPrice) * activeTrade.quantity
              : (activeTrade.entryPrice - exitPrice) * activeTrade.quantity;

            const feeResult = BacktestFeeEngine.calculateTradeCosts({
              side: activeTrade.side,
              quantity: activeTrade.quantity,
              entryPrice: activeTrade.entryPrice,
              exitPrice,
              entryTimestamp: activeTrade.entryTimestamp,
              exitTimestamp: exitEvent.exitTimestamp,
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
              exitTimestamp: exitEvent.exitTimestamp,
              nominalEntryPrice: activeTrade.nominalEntryPrice,
              entryPrice: activeTrade.entryPrice,
              nominalExitPrice: exitEvent.nominalExitPrice,
              exitPrice,
              quantity: activeTrade.quantity,
              positionValue: activeTrade.positionValue,
              initialStopLoss: activeTrade.initialStopLoss,
              targetPrice: activeTrade.targetPrice,
              exitReason: exitEvent.exitReason,
              barsHeld: exitEvent.barsHeld,
              grossPnL: Number(grossPnL.toFixed(2)),
              netPnL: Number(netPnL.toFixed(2)),
              brokerage: feeResult.brokerage,
              statutoryCharges: feeResult.statutoryCharges,
              gst: feeResult.gst,
              totalCharges: feeResult.totalCharges,
              entrySlippageCost: activeTrade.entrySlippageCost,
              exitSlippageCost: exitEvent.slippageApplied * activeTrade.quantity,
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

