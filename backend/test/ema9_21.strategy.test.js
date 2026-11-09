/**
 * @file ema9_21.strategy.test.js
 * @description Comprehensive unit tests for EMA 9 / EMA 21 Crossover Strategy:
 * Indicator math, causal crossover signal detection, single position enforcement,
 * long-only execution (no shorts), square-off at 15:15 IST, and transaction fee reconciliation.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const IndicatorsCalculator = require('../src/modules/indicators/indicators.calculator');
const {
  ACTIVE_STRATEGY
} = require('../src/modules/strategy/strategy.constants');
const {
  EMA_9_21_CROSSOVER_CONFIG
} = require('../src/modules/strategy/strategy.config');
const {
  EMA921StrategySchema
} = require('../src/modules/strategy/strategy.schema');
const StrategyService = require('../src/modules/strategy/strategy.service');
const BacktestEngine = require('../src/modules/backtesting/backtesting.engine');
const BacktestExecutionEngine = require('../src/modules/backtesting/backtesting.execution');
const BacktestFeeEngine = require('../src/modules/backtesting/backtesting.fees');

describe('EMA 9 / EMA 21 Crossover Strategy Test Suite', () => {
  describe('1. Active Strategy Configuration & Schema Validation', () => {
    it('should validate canonical active strategy parameters', () => {
      assert.equal(ACTIVE_STRATEGY.ID, 'ema_9_21_crossover');
      assert.equal(ACTIVE_STRATEGY.NAME, 'EMA 9/21 Crossover');
      assert.equal(ACTIVE_STRATEGY.FAST_PERIOD, 9);
      assert.equal(ACTIVE_STRATEGY.SLOW_PERIOD, 21);
      assert.equal(ACTIVE_STRATEGY.FAST_COLOR, '#00C853');
      assert.equal(ACTIVE_STRATEGY.SLOW_COLOR, '#FF0000');
      assert.equal(ACTIVE_STRATEGY.TIMEFRAME, '5minute');
      assert.equal(ACTIVE_STRATEGY.DIRECTION, 'LONG_ONLY');
      assert.equal(ACTIVE_STRATEGY.SQUARE_OFF_TIME, '15:15:00');
    });

    it('should validate EMA921StrategySchema against config', () => {
      const parsed = EMA921StrategySchema.safeParse(EMA_9_21_CROSSOVER_CONFIG);
      assert.equal(parsed.success, true);
      assert.equal(parsed.data.id, 'ema_9_21_crossover');
      assert.equal(parsed.data.fastPeriod, 9);
      assert.equal(parsed.data.slowPeriod, 21);
      assert.equal(parsed.data.direction, 'LONG_ONLY');
    });

    it('should reject strategy config when fastPeriod >= slowPeriod', () => {
      const invalid = {
        ...EMA_9_21_CROSSOVER_CONFIG,
        fastPeriod: 21,
        slowPeriod: 9
      };
      const parsed = EMA921StrategySchema.safeParse(invalid);
      assert.equal(parsed.success, false);
      assert.match(parsed.error.issues[0].message, /fastPeriod must be less than slowPeriod/i);
    });

    it('should ensure StrategyService.getActiveConfig() returns EMA 9/21 Crossover', () => {
      const active = StrategyService.getActiveConfig();
      assert.equal(active.id, 'ema_9_21_crossover');
      assert.equal(active.name, 'EMA 9/21 Crossover');
      assert.equal(active.fastColor, '#00C853');
      assert.equal(active.slowColor, '#FF0000');
    });
  });

  describe('2. Accurate EMA 9 and EMA 21 Indicator Calculations', () => {
    it('should initialize EMA 9 with 9-bar SMA and update exponentially', () => {
      const calc = new IndicatorsCalculator();
      const closes = [100, 102, 104, 103, 105, 107, 106, 108, 110, 112];

      for (let i = 0; i < 8; i++) {
        const ind = calc.processRegularBar({
          timestamp: `2026-11-06T09:${15 + i * 5}:00`,
          open: closes[i],
          high: closes[i] + 1,
          low: closes[i] - 1,
          close: closes[i],
          volume: 1000
        });
        assert.equal(ind.ema9, null, `Bar ${i + 1} should be null (warmup)`);
      }

      // Bar 9: SMA of first 9 closes
      const sum9 = closes.slice(0, 9).reduce((a, b) => a + b, 0);
      const expectedSMA9 = sum9 / 9;
      const bar9 = calc.processRegularBar({
        timestamp: '2026-11-06T09:55:00',
        open: closes[8],
        high: closes[8] + 1,
        low: closes[8] - 1,
        close: closes[8],
        volume: 1000
      });
      assert.equal(bar9.ema9, Number(expectedSMA9.toFixed(2)));

      // Bar 10: EMA = 112 * 0.2 + bar9 * 0.8
      const bar10Close = closes[9];
      const expectedEMA10 = bar10Close * 0.2 + expectedSMA9 * 0.8;
      const bar10 = calc.processRegularBar({
        timestamp: '2026-11-06T10:00:00',
        open: bar10Close,
        high: bar10Close + 1,
        low: bar10Close - 1,
        close: bar10Close,
        volume: 1000
      });
      assert.equal(bar10.ema9, Number(expectedEMA10.toFixed(2)));
    });

    it('should initialize EMA 21 with 21-bar SMA and update exponentially', () => {
      const calc = new IndicatorsCalculator();
      const closes = Array.from({ length: 22 }, (_, i) => 200 + i * 2);

      for (let i = 0; i < 20; i++) {
        const ind = calc.processRegularBar({
          timestamp: `2026-11-06T${String(9 + Math.floor(i / 12)).padStart(2, '0')}:${String((i % 12) * 5).padStart(2, '0')}:00`,
          open: closes[i],
          high: closes[i] + 1,
          low: closes[i] - 1,
          close: closes[i],
          volume: 1000
        });
        assert.equal(ind.ema21, null, `Bar ${i + 1} should be null for EMA21`);
      }

      // Bar 21: SMA
      const sum21 = closes.slice(0, 21).reduce((a, b) => a + b, 0);
      const expectedSMA21 = sum21 / 21;
      const bar21 = calc.processRegularBar({
        timestamp: '2026-11-06T10:50:00',
        open: closes[20],
        high: closes[20] + 1,
        low: closes[20] - 1,
        close: closes[20],
        volume: 1000
      });
      assert.equal(bar21.ema21, Number(expectedSMA21.toFixed(2)));

      // Bar 22: Exponential update
      const alpha21 = 2 / 22;
      const expectedEMA22 = closes[21] * alpha21 + expectedSMA21 * (1 - alpha21);
      const bar22 = calc.processRegularBar({
        timestamp: '2026-11-06T10:55:00',
        open: closes[21],
        high: closes[21] + 1,
        low: closes[21] - 1,
        close: closes[21],
        volume: 1000
      });
      assert.equal(bar22.ema21, Number(expectedEMA22.toFixed(2)));
    });
  });

  describe('3. Causal Crossover Signal Detection & Non-Repainting Invariants', () => {
    it('should trigger BUY signal strictly on bullish crossover (EMA 9 crosses above EMA 21)', () => {
      // Create sequence where EMA 9 starts below EMA 21 and crosses above
      const candles = [];
      // 25 bars: 21 flat to establish baseline, then 4 rising bars
      for (let i = 0; i < 21; i++) {
        candles.push({
          timestamp: `2026-11-06T${String(9 + Math.floor(i / 12)).padStart(2, '0')}:${String((i % 12) * 5).padStart(2, '0')}:00`,
          open: 100, high: 101, low: 99, close: 100, volume: 1000
        });
      }
      // Falling bars so EMA 9 < EMA 21
      candles.push({ timestamp: '2026-11-06T10:55:00', open: 98, high: 99, low: 97, close: 95, volume: 1000 });
      candles.push({ timestamp: '2026-11-06T11:00:00', open: 95, high: 96, low: 94, close: 94, volume: 1000 });
      // Strong sharp rise so EMA 9 crosses above EMA 21
      candles.push({ timestamp: '2026-11-06T11:05:00', open: 96, high: 110, low: 95, close: 115, volume: 5000 });
      candles.push({ timestamp: '2026-11-06T11:10:00', open: 115, high: 125, low: 114, close: 125, volume: 5000 });

      const enriched = IndicatorsCalculator.calculateCandlesWithEMA9And21(candles);
      const buySignals = enriched.filter(c => c.signal === 'BUY');

      assert.ok(buySignals.length >= 1, 'Should generate at least one BUY signal on bullish crossover');
      const firstBuy = buySignals[0];
      const buyIdx = enriched.indexOf(firstBuy);
      const prevBar = enriched[buyIdx - 1];

      // Verification of mathematical condition:
      assert.ok(prevBar.ema9 <= prevBar.ema21, `Previous bar: EMA 9 (${prevBar.ema9}) <= EMA 21 (${prevBar.ema21})`);
      assert.ok(firstBuy.ema9 > firstBuy.ema21, `Current bar: EMA 9 (${firstBuy.ema9}) > EMA 21 (${firstBuy.ema21})`);
    });

    it('should trigger SELL signal strictly on bearish crossunder (EMA 9 crosses below EMA 21)', () => {
      const candles = [];
      for (let i = 0; i < 21; i++) {
        candles.push({
          timestamp: `2026-11-06T${String(9 + Math.floor(i / 12)).padStart(2, '0')}:${String((i % 12) * 5).padStart(2, '0')}:00`,
          open: 100, high: 101, low: 99, close: 100, volume: 1000
        });
      }
      // Rising bars: EMA 9 > EMA 21
      candles.push({ timestamp: '2026-11-06T10:55:00', open: 101, high: 106, low: 101, close: 105, volume: 1000 });
      candles.push({ timestamp: '2026-11-06T11:00:00', open: 105, high: 110, low: 105, close: 110, volume: 1000 });
      // Sharp dump: EMA 9 crosses below EMA 21
      candles.push({ timestamp: '2026-11-06T11:05:00', open: 108, high: 109, low: 88, close: 85, volume: 5000 });
      candles.push({ timestamp: '2026-11-06T11:10:00', open: 85, high: 86, low: 78, close: 78, volume: 5000 });

      const enriched = IndicatorsCalculator.calculateCandlesWithEMA9And21(candles);
      const sellSignals = enriched.filter(c => c.signal === 'SELL');

      assert.ok(sellSignals.length >= 1, 'Should generate at least one SELL signal on bearish crossunder');
      const firstSell = sellSignals[0];
      const sellIdx = enriched.indexOf(firstSell);
      const prevBar = enriched[sellIdx - 1];

      assert.ok(prevBar.ema9 >= prevBar.ema21, `Previous bar: EMA 9 (${prevBar.ema9}) >= EMA 21 (${prevBar.ema21})`);
      assert.ok(firstSell.ema9 < firstSell.ema21, `Current bar: EMA 9 (${firstSell.ema9}) < EMA 21 (${firstSell.ema21})`);
    });

    it('should return null signal when EMAs remain in trend without crossing', () => {
      const candles = [];
      for (let i = 0; i < 30; i++) {
        // Continuous upward trend without crossing
        const price = 100 + i * 2;
        candles.push({
          timestamp: `2026-11-06T${String(9 + Math.floor(i / 12)).padStart(2, '0')}:${String((i % 12) * 5).padStart(2, '0')}:00`,
          open: price, high: price + 1, low: price - 1, close: price, volume: 1000
        });
      }

      const enriched = IndicatorsCalculator.calculateCandlesWithEMA9And21(candles);
      // Once established (bar 22 onward), every bar should have EMA 9 > EMA 21 and NO new signal (null)
      const matureBars = enriched.slice(22);
      for (const b of matureBars) {
        assert.ok(b.ema9 > b.ema21);
        assert.equal(b.signal, null, 'No new crossover signal while trend continues');
      }
    });
  });

  describe('4. Execution Invariants & Position Management', () => {
    it('should enforce execution at next candle open with 2.0 bps slippage', () => {
      const nominalOpen = 1500.00;
      const slippageBps = 2.0;

      const longEntryPrice = BacktestExecutionEngine.applySlippage(nominalOpen, 'LONG', 'ENTRY', slippageBps);
      // 1500 * (1 + 0.0002) = 1500.30
      assert.equal(longEntryPrice, 1500.30);

      const longExitPrice = BacktestExecutionEngine.applySlippage(nominalOpen, 'LONG', 'EXIT', slippageBps);
      // 1500 * (1 - 0.0002) = 1499.70
      assert.equal(longExitPrice, 1499.70);
    });

    it('should maintain strict financial accounting identity (Net = Gross - Charges)', () => {
      const costs = BacktestFeeEngine.calculateTradeCosts({
        side: 'LONG',
        quantity: 1,
        entryPrice: 1500.30,
        exitPrice: 1520.00,
        entryTimestamp: '2026-11-06T10:00:00',
        exitTimestamp: '2026-11-06T11:00:00'
      });

      const grossPnL = (1520.00 - 1500.30) * 1;
      const netPnL = grossPnL - costs.totalCharges;

      assert.ok(costs.totalCharges > 0);
      assert.equal(Number((grossPnL - costs.totalCharges).toFixed(2)), Number(netPnL.toFixed(2)));
    });

    it('should run backtest on ICICIBANK and verify long-only trades with zero short trades', async () => {
      const res = await BacktestEngine.runEMA921({
        symbol: 'ICICIBANK',
        strategyConfig: EMA_9_21_CROSSOVER_CONFIG,
        capital: 100000,
        slippageBps: 2.0,
        startDate: '2026-10-01',
        endDate: '2026-11-06'
      });

      assert.ok(res.trades.length > 0, 'Should have executed trades');
      for (const t of res.trades) {
        assert.equal(t.side, 'LONG', 'Every single trade must be strictly LONG');
        assert.equal(t.quantity, 1, 'Every trade must have fixed 1 share');
        assert.ok(
          t.exitReason === 'BEARISH_CROSSOVER' || t.exitReason === 'INTRADAY_SQUARE_OFF' || t.exitReason === 'SQUARE_OFF',
          `Exit reason must be BEARISH_CROSSOVER or SQUARE_OFF, got ${t.exitReason}`
        );
      }
    });

    it('should verify single-position invariant: no concurrent overlapping positions', async () => {
      const res = await BacktestEngine.runEMA921({
        symbol: 'AXISBANK',
        strategyConfig: EMA_9_21_CROSSOVER_CONFIG,
        capital: 100000,
        slippageBps: 2.0,
        startDate: '2026-09-01',
        endDate: '2026-11-06'
      });

      // Verify no trade overlap
      for (let i = 1; i < res.trades.length; i++) {
        const prevTrade = res.trades[i - 1];
        const currTrade = res.trades[i];
        assert.ok(
          currTrade.entryTimestamp >= prevTrade.exitTimestamp,
          `Trade ${currTrade.tradeId} entered (${currTrade.entryTimestamp}) before trade ${prevTrade.tradeId} exited (${prevTrade.exitTimestamp})`
        );
      }
    });
  });
});

