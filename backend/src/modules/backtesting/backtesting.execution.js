/**
 * @file backtesting.execution.js
 * @description Execution simulator, slippage model, gap handling, and intrabar ambiguity resolution.
 */

const { EXIT_REASONS, AMBIGUITY_RESOLUTIONS } = require('./backtesting.constants');

class BacktestExecutionEngine {
  /**
   * Apply realistic slippage to an execution price
   * @param {number} price Nominal execution price
   * @param {'LONG'|'SHORT'} side Trade direction
   * @param {'ENTRY'|'EXIT'} action Leg action
   * @param {number} slippageBps Slippage in basis points (e.g. 2.0 = 0.02%)
   * @returns {number} Executed price after slippage
   */
  static applySlippage(price, side, action, slippageBps = 0) {
    if (!slippageBps || slippageBps <= 0) {
      return Number(price.toFixed(2));
    }

    const slippageFraction = slippageBps / 10000.0;
    let executedPrice = price;

    if (action === 'ENTRY') {
      // Long entry buys at Ask (+slippage), Short entry sells at Bid (-slippage)
      executedPrice = side === 'LONG' 
        ? price * (1.0 + slippageFraction)
        : price * (1.0 - slippageFraction);
    } else {
      // Long exit sells at Bid (-slippage), Short exit buys back at Ask (+slippage)
      executedPrice = side === 'LONG'
        ? price * (1.0 - slippageFraction)
        : price * (1.0 + slippageFraction);
    }

    return Number(executedPrice.toFixed(2));
  }

  /**
   * Evaluate whether an active position triggers an exit during candle t
   * @param {Object} trade Active trade object
   * @param {Object} candle Current 5-min candle (O, H, L, C, timestamp)
   * @param {Object} exitConfig Exit configuration parameters
   * @param {number} slippageBps Slippage in basis points
   * @returns {Object|null} Exit event object or null if trade remains open
   */
  static evaluateExit(trade, candle, exitConfig, slippageBps = 2.0) {
    const timeStr = candle.timestamp.split('T')[1];
    const squareOffTime = exitConfig.squareOffTime || '15:15:00';
    const maxHoldingBars = exitConfig.maxHoldingDurationBars || 36;
    const ambiguityResolution = exitConfig.ambiguityResolution || AMBIGUITY_RESOLUTIONS.WORST_CASE_STOP;

    // 1. Mandatory Intraday Square-Off Time Check
    if (timeStr >= squareOffTime) {
      const execPrice = this.applySlippage(candle.open, trade.side, 'EXIT', slippageBps);
      return {
        exitTimestamp: candle.timestamp,
        exitPrice: execPrice,
        nominalExitPrice: candle.open,
        exitReason: EXIT_REASONS.SQUARE_OFF,
        barsHeld: trade.barsHeld + 1,
        isAmbiguous: false,
        slippageApplied: Math.abs(execPrice - candle.open)
      };
    }

    // 2. Maximum Holding Duration Check
    if (trade.barsHeld >= maxHoldingBars) {
      const execPrice = this.applySlippage(candle.open, trade.side, 'EXIT', slippageBps);
      return {
        exitTimestamp: candle.timestamp,
        exitPrice: execPrice,
        nominalExitPrice: candle.open,
        exitReason: EXIT_REASONS.MAX_HOLDING_TIME,
        barsHeld: trade.barsHeld + 1,
        isAmbiguous: false,
        slippageApplied: Math.abs(execPrice - candle.open)
      };
    }

    // 3. Intrabar Stop Loss and Target Boundary Evaluation
    let stopHit = false;
    let targetHit = false;

    if (trade.side === 'LONG') {
      stopHit = candle.low <= trade.currentStopLoss;
      targetHit = candle.high >= trade.targetPrice;
    } else {
      stopHit = candle.high >= trade.currentStopLoss;
      targetHit = candle.low <= trade.targetPrice;
    }

    // 4. Same-Bar Ambiguity Resolution
    if (stopHit && targetHit) {
      if (ambiguityResolution === AMBIGUITY_RESOLUTIONS.AMBIGUOUS_SKIP) {
        const execPrice = this.applySlippage(trade.entryPrice, trade.side, 'EXIT', slippageBps);
        return {
          exitTimestamp: candle.timestamp,
          exitPrice: execPrice,
          nominalExitPrice: trade.entryPrice,
          exitReason: EXIT_REASONS.AMBIGUOUS_SAME_BAR,
          barsHeld: trade.barsHeld + 1,
          isAmbiguous: true,
          slippageApplied: 0
        };
      }

      // Conservative Standard: Assume Stop Loss hit first
      let nominalPrice = trade.currentStopLoss;
      if (trade.side === 'LONG' && candle.open < trade.currentStopLoss) {
        nominalPrice = candle.open; // Gap-down beyond stop
      } else if (trade.side === 'SHORT' && candle.open > trade.currentStopLoss) {
        nominalPrice = candle.open; // Gap-up beyond stop
      }

      const execPrice = this.applySlippage(nominalPrice, trade.side, 'EXIT', slippageBps);
      return {
        exitTimestamp: candle.timestamp,
        exitPrice: execPrice,
        nominalExitPrice: nominalPrice,
        exitReason: EXIT_REASONS.STOP_LOSS,
        barsHeld: trade.barsHeld + 1,
        isAmbiguous: true,
        ambiguityDetail: 'Same-bar SL and Target touch; conservative worst-case stop assumed',
        slippageApplied: Math.abs(execPrice - nominalPrice)
      };
    }

    // 5. Unambiguous Stop Loss Hit
    if (stopHit) {
      let nominalPrice = trade.currentStopLoss;
      // Gap-through-stop handling: if candle open gapped past stop, exit at open
      if (trade.side === 'LONG' && candle.open < trade.currentStopLoss) {
        nominalPrice = candle.open;
      } else if (trade.side === 'SHORT' && candle.open > trade.currentStopLoss) {
        nominalPrice = candle.open;
      }

      const execPrice = this.applySlippage(nominalPrice, trade.side, 'EXIT', slippageBps);
      return {
        exitTimestamp: candle.timestamp,
        exitPrice: execPrice,
        nominalExitPrice: nominalPrice,
        exitReason: trade.isTrailingActive ? EXIT_REASONS.TRAILING_STOP : EXIT_REASONS.STOP_LOSS,
        barsHeld: trade.barsHeld + 1,
        isAmbiguous: false,
        slippageApplied: Math.abs(execPrice - nominalPrice)
      };
    }

    // 6. Unambiguous Profit Target Hit
    if (targetHit) {
      let nominalPrice = trade.targetPrice;
      // Gap-through-target handling: if candle open gapped beyond target favourably
      if (trade.side === 'LONG' && candle.open > trade.targetPrice) {
        nominalPrice = candle.open;
      } else if (trade.side === 'SHORT' && candle.open < trade.targetPrice) {
        nominalPrice = candle.open;
      }

      const execPrice = this.applySlippage(nominalPrice, trade.side, 'EXIT', slippageBps);
      return {
        exitTimestamp: candle.timestamp,
        exitPrice: execPrice,
        nominalExitPrice: nominalPrice,
        exitReason: EXIT_REASONS.PROFIT_TARGET,
        barsHeld: trade.barsHeld + 1,
        isAmbiguous: false,
        slippageApplied: Math.abs(execPrice - nominalPrice)
      };
    }

    // 7. Trailing Stop Management (if trade remains open)
    this.updateTrailingStop(trade, candle, exitConfig);

    trade.barsHeld += 1;
    return null;
  }

  /**
   * Update trailing stop loss if favorable price extension occurs
   * @param {Object} trade
   * @param {Object} candle
   * @param {Object} exitConfig
   */
  static updateTrailingStop(trade, candle, exitConfig) {
    if (!exitConfig.targetMode || !exitConfig.targetMode.startsWith('TRAILING')) {
      return;
    }

    const initialRisk = Math.abs(trade.entryPrice - trade.initialStopLoss);
    if (trade.side === 'LONG') {
      const currentGain = candle.high - trade.entryPrice;
      // Move to breakeven once 1:1 Risk reached
      if (currentGain >= initialRisk && trade.currentStopLoss < trade.entryPrice) {
        trade.currentStopLoss = trade.entryPrice;
        trade.isTrailingActive = true;
      }
      // Trail behind EMA20 if configured and EMA20 is higher
      if (exitConfig.targetMode === 'TRAILING_EMA20' && candle.ema20 && candle.ema20 > trade.currentStopLoss) {
        trade.currentStopLoss = Number(candle.ema20.toFixed(2));
        trade.isTrailingActive = true;
      }
    } else {
      const currentGain = trade.entryPrice - candle.low;
      if (currentGain >= initialRisk && trade.currentStopLoss > trade.entryPrice) {
        trade.currentStopLoss = trade.entryPrice;
        trade.isTrailingActive = true;
      }
      if (exitConfig.targetMode === 'TRAILING_EMA20' && candle.ema20 && candle.ema20 < trade.currentStopLoss) {
        trade.currentStopLoss = Number(candle.ema20.toFixed(2));
        trade.isTrailingActive = true;
      }
    }
  }
}

module.exports = BacktestExecutionEngine;

