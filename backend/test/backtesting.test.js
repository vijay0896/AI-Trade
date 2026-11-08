/**
 * @file backtesting.test.js
 * @description Comprehensive unit tests for the Historical Backtesting Engine, Fee Model, Execution, and Risk.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const BacktestFeeEngine = require('../src/modules/backtesting/backtesting.fees');
const BacktestExecutionEngine = require('../src/modules/backtesting/backtesting.execution');
const BacktestRiskManager = require('../src/modules/backtesting/backtesting.risk');
const BacktestMetricsCalculator = require('../src/modules/backtesting/backtesting.metrics');
const BacktestEngine = require('../src/modules/backtesting/backtesting.engine');
const { EXIT_REASONS, AMBIGUITY_RESOLUTIONS, FEE_SCHEDULES } = require('../src/modules/backtesting/backtesting.constants');
const { VARIANT_A_CONFIG, VARIANT_C_CONFIG } = require('../src/modules/strategy/strategy.config');

describe('Historical Backtesting Engine Test Suite', () => {

  describe('Groww Transaction Cost & Statutory Fee Engine', () => {
    it('should calculate accurate intraday charges under Post-Oct 2024 fee schedule', () => {
      // 100 shares of ICICIBANK @ 1500 Entry, 1515 Exit (Long)
      // Entry Turnover: 150,000 | Exit Turnover: 151,500 | Total Turnover: 301,500
      const costs = BacktestFeeEngine.calculateTradeCosts({
        side: 'LONG',
        quantity: 100,
        entryPrice: 1500,
        exitPrice: 1515,
        entryTimestamp: '2024-11-01T09:35:00',
        exitTimestamp: '2024-11-01T10:15:00'
      });

      assert.equal(costs.entryTurnover, 150000);
      assert.equal(costs.exitTurnover, 151500);
      assert.equal(costs.totalTurnover, 301500);

      // Brokerage: 0.1% of 150k = Rs. 150, capped at Rs. 20. Same on exit (Rs. 20). Total = Rs. 40
      assert.equal(costs.brokerage, 40);

      // STT on Intraday Long: 0.025% on SELL leg only: 151,500 * 0.00025 = Rs. 37.88
      assert.equal(costs.stt, 37.88);

      // Stamp Duty: 0.003% on BUY leg only: 150,000 * 0.00003 = Rs. 4.50
      assert.equal(costs.stampDuty, 4.50);

      // Exchange transaction charge (NSE 0.00297%): 301,500 * 0.0000297 = Rs. 8.95
      assert.equal(costs.exchangeCharges, 8.95);

      // GST: 18% on (Brokerage + Exchange + SEBI + IPFT): ~18% of (40 + 8.95 + 0.30 + 0.30) = Rs. 8.92
      assert.ok(costs.gst > 8.0 && costs.gst < 10.0);

      // Total charges must be sum of brokerage + statutory + GST
      assert.equal(costs.totalCharges, Number((costs.brokerage + costs.statutoryCharges + costs.gst).toFixed(2)));
    });

    it('should resolve historical fee schedule for pre-October 2024 dates', () => {
      const schedule = BacktestFeeEngine.resolveFeeSchedule('2023-05-15T10:00:00');
      assert.equal(schedule.effectiveTo, '2024-09-30');
      assert.equal(schedule.exchangeTransactionRate, 0.0000325); // Legacy 0.00325%
      assert.equal(schedule.brokerageRate, 0.0010); // 0.1%
      assert.equal(schedule.brokerageMinPerOrder, 2.0); // Legacy Rs. 2 min floor
    });

    it('should resolve revised minimum brokerage (Rs. 5) for post-June 21, 2025 dates', () => {
      const schedule = BacktestFeeEngine.resolveFeeSchedule('2025-07-01T10:00:00');
      assert.equal(schedule.effectiveFrom, '2025-06-21');
      assert.equal(schedule.brokerageMinPerOrder, 5.0); // Updated Rs. 5 floor
      assert.equal(schedule.exchangeTransactionRate, 0.0000297); // Uniform 0.00297%
    });

    it('should enforce Groww effective-dated minimum brokerage and SEBI 2.5% cap on small orders', () => {
      const preJuneSchedule = BacktestFeeEngine.resolveFeeSchedule('2024-11-01');
      const postJuneSchedule = BacktestFeeEngine.resolveFeeSchedule('2025-07-01');

      // 1. Turnover = Rs. 3,000 (0.1% = Rs. 3.00)
      // Pre-June 2025: min floor Rs. 2 -> nominal Rs. 3 is higher -> Rs. 3.00
      assert.equal(BacktestFeeEngine.computeLegBrokerage(3000, preJuneSchedule), 3.00);
      // Post-June 2025: min floor Rs. 5 -> nominal Rs. 3 is lower -> Rs. 5.00
      assert.equal(BacktestFeeEngine.computeLegBrokerage(3000, postJuneSchedule), 5.00);

      // 2. Turnover = Rs. 50 (Very small order)
      // 2.5% SEBI maximum cap = Rs. 1.25. Brokerage must not exceed 2.5% of order value
      assert.equal(BacktestFeeEngine.computeLegBrokerage(50, postJuneSchedule), 1.25);

      // 3. Turnover = Rs. 50,000 (0.1% = Rs. 50)
      // Capped at maximum Rs. 20
      assert.equal(BacktestFeeEngine.computeLegBrokerage(50000, postJuneSchedule), 20.00);
    });

    it('should strictly exclude STT and Stamp Duty from the GST calculation base', () => {
      const costs = BacktestFeeEngine.calculateTradeCosts({
        side: 'LONG',
        quantity: 50,
        entryPrice: 2000,
        exitPrice: 2010,
        entryTimestamp: '2025-01-10T10:00:00'
      });

      // Taxable services: Brokerage + Exchange charges + SEBI + IPFT
      const entryTaxable = costs.entryLeg.brokerage + costs.entryLeg.exchange + (costs.entryTurnover * 0.000001) + (costs.entryTurnover * 0.000001);
      const exitTaxable = costs.exitLeg.brokerage + costs.exitLeg.exchange + (costs.exitTurnover * 0.000001) + (costs.exitTurnover * 0.000001);
      const totalTaxable = entryTaxable + exitTaxable;
      const expectedGST = Number((totalTaxable * 0.18).toFixed(2));

      assert.equal(costs.gst, expectedGST);
      // Ensure GST is not levied on STT or Stamp Duty
      const totalTaxes = costs.stt + costs.stampDuty;
      assert.ok(costs.gst < (totalTaxable + totalTaxes) * 0.18);
    });

    it('should calculate STT on Entry side for Short trades (Sell first)', () => {
      const costs = BacktestFeeEngine.calculateTradeCosts({
        side: 'SHORT',
        quantity: 100,
        entryPrice: 1000,
        exitPrice: 990,
        entryTimestamp: '2024-11-01T09:35:00',
        exitTimestamp: '2024-11-01T10:15:00'
      });

      // Entry leg is Sell -> STT applies on Entry turnover (100k * 0.00025 = Rs. 25.00)
      assert.equal(costs.entryLeg.stt, 25.00);
      assert.equal(costs.exitLeg.stt, 0.00); // Cover is Buy -> zero STT
      assert.equal(costs.exitLeg.stampDuty, 2.97); // Stamp duty on Buy cover leg (99k * 0.00003 = 2.97)
    });
  });

  describe('Execution Simulator, Slippage & Intrabar Ambiguity', () => {
    it('should apply slippage accurately on entry and exit', () => {
      // Long entry: buys at Ask (1000 + 2 bps = 1000.20)
      const longEntry = BacktestExecutionEngine.applySlippage(1000, 'LONG', 'ENTRY', 2.0);
      assert.equal(longEntry, 1000.20);

      // Long exit: sells at Bid (1010 - 2 bps = 1009.80)
      const longExit = BacktestExecutionEngine.applySlippage(1010, 'LONG', 'EXIT', 2.0);
      assert.equal(longExit, 1009.80);

      // Short entry: sells at Bid (1000 - 2 bps = 999.80)
      const shortEntry = BacktestExecutionEngine.applySlippage(1000, 'SHORT', 'ENTRY', 2.0);
      assert.equal(shortEntry, 999.80);

      // Short exit: buys at Ask (990 + 2 bps = 990.20)
      const shortExit = BacktestExecutionEngine.applySlippage(990, 'SHORT', 'EXIT', 2.0);
      assert.equal(shortExit, 990.20);
    });

    it('should execute Stop Loss when price breaches stop boundary', () => {
      const trade = {
        side: 'LONG',
        entryPrice: 1000,
        currentStopLoss: 990,
        targetPrice: 1020,
        quantity: 10,
        barsHeld: 1
      };

      const candle = {
        timestamp: '2024-11-01T10:00:00',
        open: 995,
        high: 996,
        low: 988, // Low breached 990 SL
        close: 989
      };

      const exit = BacktestExecutionEngine.evaluateExit(trade, candle, { squareOffTime: '15:15:00' }, 0);
      assert.ok(exit);
      assert.equal(exit.exitReason, EXIT_REASONS.STOP_LOSS);
      assert.equal(exit.nominalExitPrice, 990);
    });

    it('should model gap-through-stop at candle open rather than theoretical stop', () => {
      const trade = {
        side: 'LONG',
        entryPrice: 1000,
        currentStopLoss: 990,
        targetPrice: 1020,
        quantity: 10,
        barsHeld: 1
      };

      // Sudden gap down: opens at 985 (below 990 SL)
      const candle = {
        timestamp: '2024-11-01T10:00:00',
        open: 985,
        high: 987,
        low: 980,
        close: 982
      };

      const exit = BacktestExecutionEngine.evaluateExit(trade, candle, { squareOffTime: '15:15:00' }, 0);
      assert.ok(exit);
      assert.equal(exit.exitReason, EXIT_REASONS.STOP_LOSS);
      assert.equal(exit.nominalExitPrice, 985); // Exited at candle open, not 990!
    });

    it('should handle same-bar Stop Loss and Target touch conservatively (worst-case stop)', () => {
      const trade = {
        side: 'LONG',
        entryPrice: 1000,
        currentStopLoss: 990,
        targetPrice: 1020,
        quantity: 10,
        barsHeld: 1
      };

      // Giant bar touching both 985 (SL) and 1025 (Target)
      const giantCandle = {
        timestamp: '2024-11-01T10:00:00',
        open: 1005,
        high: 1025,
        low: 985,
        close: 1015
      };

      const exit = BacktestExecutionEngine.evaluateExit(trade, giantCandle, {
        squareOffTime: '15:15:00',
        ambiguityResolution: AMBIGUITY_RESOLUTIONS.WORST_CASE_STOP
      }, 0);

      assert.ok(exit);
      assert.equal(exit.exitReason, EXIT_REASONS.STOP_LOSS); // Conservative: stop loss assumed first
      assert.equal(exit.isAmbiguous, true);
    });

    it('should enforce mandatory square-off at 15:15 IST', () => {
      const trade = {
        side: 'LONG',
        entryPrice: 1000,
        currentStopLoss: 950,
        targetPrice: 1100,
        quantity: 10,
        barsHeld: 5
      };

      const squareOffCandle = {
        timestamp: '2024-11-01T15:15:00',
        open: 1008,
        high: 1010,
        low: 1007,
        close: 1009
      };

      const exit = BacktestExecutionEngine.evaluateExit(trade, squareOffCandle, { squareOffTime: '15:15:00' }, 0);
      assert.ok(exit);
      assert.equal(exit.exitReason, EXIT_REASONS.SQUARE_OFF);
      assert.equal(exit.nominalExitPrice, 1008);
    });
  });

  describe('Risk Manager & Circuit Breaker', () => {
    it('should block new trade entries when daily circuit breaker is tripped', () => {
      // Capital 100k, daily max loss 1.0% = Rs. 1000
      const context = {
        dailyTradesCount: 1,
        maxTradesPerDay: 2,
        dailyRealizedPnL: -1050, // Exceeded 1000 loss
        capital: 100000,
        dailyMaxLossPercent: 1.0,
        hasActivePosition: false
      };

      const check = BacktestRiskManager.canEnterTrade(context);
      assert.equal(check.permitted, false);
      assert.equal(check.reason, 'DAILY_LOSS_LIMIT_REACHED');
    });

    it('should block new trade entries when max daily trades count reached', () => {
      const context = {
        dailyTradesCount: 2,
        maxTradesPerDay: 2,
        dailyRealizedPnL: 500, // Profitable
        capital: 100000,
        dailyMaxLossPercent: 1.0,
        hasActivePosition: false
      };

      const check = BacktestRiskManager.canEnterTrade(context);
      assert.equal(check.permitted, false);
      assert.equal(check.reason, 'MAX_DAILY_TRADES_REACHED');
    });
  });

  describe('Performance Metrics Analytics Calculator', () => {
    it('should compute accurate win rate, expectancy, and profit factor', () => {
      const sampleTrades = [
        { theoreticalGrossPnL: 1020, totalSlippageCost: 20, grossPnL: 1000, netPnL: 950, brokerage: 40, statutoryCharges: 8, gst: 2, totalCharges: 50, barsHeld: 4, side: 'LONG', exitReason: 'PROFIT_TARGET', entryTimestamp: '2024-01-01T10:00:00' },
        { theoreticalGrossPnL: 1020, totalSlippageCost: 20, grossPnL: 1000, netPnL: 950, brokerage: 40, statutoryCharges: 8, gst: 2, totalCharges: 50, barsHeld: 5, side: 'LONG', exitReason: 'PROFIT_TARGET', entryTimestamp: '2024-01-02T10:00:00' },
        { theoreticalGrossPnL: -490, totalSlippageCost: 10, grossPnL: -500, netPnL: -550, brokerage: 40, statutoryCharges: 8, gst: 2, totalCharges: 50, barsHeld: 2, side: 'SHORT', exitReason: 'STOP_LOSS', entryTimestamp: '2024-01-03T10:00:00' }
      ];

      const dailyRecords = [
        { date: '2024-01-01', startingCapital: 100000, endingCapital: 100950, dailyRealizedPnL: 950, isCircuitBreakerTripped: false },
        { date: '2024-01-02', startingCapital: 100950, endingCapital: 101900, dailyRealizedPnL: 950, isCircuitBreakerTripped: false },
        { date: '2024-01-03', startingCapital: 101900, endingCapital: 101350, dailyRealizedPnL: -550, isCircuitBreakerTripped: false }
      ];

      const metrics = BacktestMetricsCalculator.calculate(sampleTrades, dailyRecords, 100000, 225);

      assert.equal(metrics.tradingPerformance.totalTrades, 3);
      assert.equal(metrics.tradingPerformance.winningTrades, 2);
      assert.equal(metrics.tradingPerformance.losingTrades, 1);
      assert.equal(metrics.tradingPerformance.winRate, 66.67);
      assert.equal(metrics.overview.netPnL, 1350);
      assert.equal(metrics.tradingPerformance.averageWin, 950);
      assert.equal(metrics.tradingPerformance.averageLoss, 550);
      assert.equal(metrics.tradingPerformance.profitFactor, 3.45); // 1900 / 550 = 3.45
      assert.ok(metrics.riskPerformance.maxDrawdown > 0);

      // Financial Accounting Identity Verification
      assert.equal(metrics.overview.accountingIdentity.isReconciled, true);
      assert.equal(
        metrics.overview.theoreticalGrossPnL - metrics.overview.slippageCost - metrics.overview.totalCharges,
        metrics.overview.netPnL
      );
    });

    it('should maintain strict accounting identity on trade-level ledger', () => {
      // Theoretical Gross: 3029.15, Slippage: 836.27, Realized Gross: 2192.88, Charges: 2464.86, Net: -271.98
      const trade = {
        entryTimestamp: '2024-01-01T10:00:00',
        theoreticalGrossPnL: 3029.15,
        totalSlippageCost: 836.27,
        grossPnL: 2192.88,
        totalCharges: 2464.86,
        netPnL: -271.98,
        brokerage: 1454.14,
        statutoryCharges: 723.78,
        gst: 286.94
      };

      const metrics = BacktestMetricsCalculator.calculate([trade], [], 100000, 75);
      assert.equal(metrics.overview.accountingIdentity.isReconciled, true);
      assert.equal(
        Number((metrics.overview.theoreticalGrossPnL - metrics.overview.slippageCost - metrics.overview.totalCharges).toFixed(2)),
        metrics.overview.netPnL
      );
    });
  });

  describe('End-to-End Backtest Determinism & Invariant Checks', () => {
    it('should run backtest deterministically across repeated runs', async () => {
      // Small 1-month run for ICICIBANK Variant A
      const run1 = await BacktestEngine.run({
        symbol: 'ICICIBANK',
        strategyConfig: VARIANT_A_CONFIG,
        capital: 100000,
        slippageBps: 2.0,
        startDate: '2021-11-08',
        endDate: '2021-11-30',
        direction: 'BOTH'
      });

      const run2 = await BacktestEngine.run({
        symbol: 'ICICIBANK',
        strategyConfig: VARIANT_A_CONFIG,
        capital: 100000,
        slippageBps: 2.0,
        startDate: '2021-11-08',
        endDate: '2021-11-30',
        direction: 'BOTH'
      });

      assert.equal(run1.trades.length, run2.trades.length);
      assert.equal(run1.metrics.overview.netPnL, run2.metrics.overview.netPnL);
      assert.equal(run1.metrics.tradingPerformance.winRate, run2.metrics.tradingPerformance.winRate);

      if (run1.trades.length > 0) {
        assert.equal(run1.trades[0].entryTimestamp, run2.trades[0].entryTimestamp);
        assert.equal(run1.trades[0].entryPrice, run2.trades[0].entryPrice);
        assert.equal(run1.trades[0].exitPrice, run2.trades[0].exitPrice);
      }
    });

    it('should strictly exclude non-regular sessions from standard strategy runs', async () => {
      const result = await BacktestEngine.run({
        symbol: 'ICICIBANK',
        strategyConfig: VARIANT_A_CONFIG,
        capital: 100000,
        startDate: '2024-03-01',
        endDate: '2024-03-05' // Includes March 2, 2024 (DR_SPLIT)
      });

      // DR Split session on 2024-03-02 must be recorded in excludedSessions
      const drExcluded = result.excludedSessions.find(e => e.date === '2024-03-02');
      assert.ok(drExcluded, 'Disaster Recovery split session was not excluded');
      assert.match(drExcluded.reason, /SPECIAL_SESSION_DR_SPLIT/);
    });
  });
});

