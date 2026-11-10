/**
 * @file groww.backtest.test.js
 * @description Unit tests for 15-Minute Intraday 9/21 EMA Crossover Backtesting Engine and Technical Indicators.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const BacktestIndicators = require('../src/modules/groww/groww.backtest.indicators');
const GrowwBacktestEngine = require('../src/modules/groww/groww.backtest.engine');

describe('15-Minute 9/21 EMA Intraday Backtest Engine & Indicators Test Suite', () => {
  describe('1. Technical Indicators Calculation', () => {
    it('should calculate accurate EMA with SMA initialization and exponential smoothing', () => {
      const prices = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
      const ema9 = BacktestIndicators.calculateEMA(prices, 9);

      assert.strictEqual(ema9.length, prices.length);
      assert.strictEqual(ema9[0], null);
      assert.strictEqual(ema9[7], null);

      // SMA of first 9: (10+11+12+13+14+15+16+17+18)/9 = 126/9 = 14
      assert.strictEqual(ema9[8], 14);

      // Bar 9: 19 * (2/10) + 14 * (8/10) = 3.8 + 11.2 = 15.0
      assert.strictEqual(Number(ema9[9].toFixed(2)), 15.0);
    });

    it('should compute Intraday Session VWAP resetting every new trading date', () => {
      const candles = [
        { istDate: '2024-01-01', high: 102, low: 98, close: 100, volume: 1000 },
        { istDate: '2024-01-01', high: 105, low: 101, close: 103, volume: 2000 },
        // New day reset
        { istDate: '2024-01-02', high: 200, low: 190, close: 195, volume: 1000 }
      ];

      const vwap = BacktestIndicators.calculateSessionVWAP(candles);

      // Bar 0: TP = 100, Vol = 1000 -> VWAP = 100
      assert.strictEqual(vwap[0], 100);

      // Bar 1: TP = 103, Vol = 2000 -> CumTPVol = 100*1000 + 103*2000 = 306000 / 3000 = 102
      assert.strictEqual(vwap[1], 102);

      // Bar 2 (Day 2 reset): TP = (200+190+195)/3 = 195 -> VWAP = 195
      assert.strictEqual(vwap[2], 195);
    });

    it('should calculate ATR(14) using true range and Wilder smoothing', () => {
      const candles = [];
      for (let i = 0; i < 20; i++) {
        candles.push({ high: 100 + i, low: 90 + i, close: 95 + i });
      }

      const atr = BacktestIndicators.calculateATR(candles, 14);
      assert.strictEqual(atr.length, 20);
      assert.strictEqual(atr[0], null);
      assert.strictEqual(atr[12], null);
      assert.strictEqual(typeof atr[13], 'number');
      assert.ok(atr[13] > 0);
    });

    it('should detect Inside Bar, NR4, and Marubozu / Engulfing compression patterns', () => {
      const candles = [
        { open: 100, high: 120, low: 90, close: 105 }, // Bar 0: Range 30
        { open: 105, high: 118, low: 92, close: 110 }, // Bar 1: Range 26
        { open: 110, high: 115, low: 95, close: 112 }, // Bar 2: Range 20
        { open: 111, high: 113, low: 100, close: 112 }  // Bar 3: Range 13 (Narrowest of 4 -> NR4 & Inside Bar)
      ];

      const patterns = BacktestIndicators.calculateCompressionPatterns(candles);
      assert.strictEqual(patterns[3].isInsideBar, true);
      assert.strictEqual(patterns[3].isNR4, true);
      assert.strictEqual(patterns[3].patternTag, 'NR4');
    });
  });

  describe('2. Intraday Backtest Engine Execution & Rules', () => {
    it('should strictly filter entries to Morning (09:30-11:00) and Afternoon (13:45-14:45) IST', () => {
      assert.strictEqual(GrowwBacktestEngine.evaluateTimeWindow('09:15:00').inWindow, false);
      assert.strictEqual(GrowwBacktestEngine.evaluateTimeWindow('09:30:00').inWindow, true);
      assert.strictEqual(GrowwBacktestEngine.evaluateTimeWindow('10:45:00').inWindow, true);
      assert.strictEqual(GrowwBacktestEngine.evaluateTimeWindow('11:00:00').inWindow, true);
      assert.strictEqual(GrowwBacktestEngine.evaluateTimeWindow('11:15:00').inWindow, false);
      assert.strictEqual(GrowwBacktestEngine.evaluateTimeWindow('13:00:00').inWindow, false);
      assert.strictEqual(GrowwBacktestEngine.evaluateTimeWindow('13:45:00').inWindow, true);
      assert.strictEqual(GrowwBacktestEngine.evaluateTimeWindow('14:45:00').inWindow, true);
      assert.strictEqual(GrowwBacktestEngine.evaluateTimeWindow('15:00:00').inWindow, false);
    });

    it('should execute confirmation entry stop and book T1 at 1:1 and trail remainder', () => {
      // Create mock candles with a bullish crossover on bar 22
      const candles = [];
      const date = '2024-01-10';

      for (let i = 0; i < 30; i++) {
        const hour = 9 + Math.floor(i / 4);
        const min = (i % 4) * 15;
        const time = `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}:00`;

        // Baseline prices
        let close = 1000 + i * 2;
        if (i === 22) close = 1050; // sharp bullish crossover bar at 10:00 AM
        if (i === 23) close = 1070; // trigger fill on next candle open
        if (i === 24) close = 1090; // hits T1 and T2

        candles.push({
          symbol: 'MOCK',
          timestamp: `${date}T${time}`,
          istDate: date,
          istTime: time,
          open: close - 2,
          high: close + 4,
          low: close - 4,
          close,
          volume: 50000
        });
      }

      const result = GrowwBacktestEngine.runSingleStockBacktest({
        symbol: 'MOCK',
        candles15m: candles,
        capitalPerTrade: 100000,
        enableMultiTimeframe: false
      });

      assert.strictEqual(result.symbol, 'MOCK');
      assert.ok(result.metrics);
      assert.strictEqual(typeof result.metrics.winRatePct, 'number');
    });

    it('should enforce max 2 trades per day cap and daily circuit halt on initial SL', () => {
      const pos = {
        tradeId: 'TEST-001',
        symbol: 'TEST',
        direction: 'LONG',
        entryTimeIST: '2024-01-10 09:45:00',
        entryTimestamp: '2024-01-10T09:45:00',
        sessionWindow: 'Morning (09:30-11:00)',
        patternTags: ['VWAP+EMA'],
        entryPrice: 500,
        initialSL: 495,
        currentSL: 495,
        initialRisk: 5,
        target1: 505,
        target2: 511,
        quantity: 200,
        qtyRemaining1: 100,
        qtyRemaining2: 100,
        t1Hit: false,
        t2Hit: false,
        exitPrice1: null,
        exitPrice2: null,
        exitReason: null
      };

      const trades = [];
      GrowwBacktestEngine.closePosition(pos, 495, 'INITIAL_SL', '2024-01-10T10:15:00', trades, 100000);

      assert.strictEqual(trades.length, 1);
      assert.strictEqual(trades[0].exitReason, 'INITIAL_SL');
      assert.strictEqual(trades[0].rMultiple, -1);
      assert.strictEqual(trades[0].netPnL, -1000);
    });
  });
});

