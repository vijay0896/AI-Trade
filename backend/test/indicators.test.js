/**
 * @file indicators.test.js
 * @description Comprehensive unit test suite for Technical Indicator Engine
 * verifying mathematical formulas, session resets, warm-up periods, and edge cases.
 */

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

const IndicatorsCalculator = require('../src/modules/indicators/indicators.calculator');
const IndicatorsValidator = require('../src/modules/indicators/indicators.validator');
const { SESSION_TYPES } = require('../src/modules/indicators/indicators.config');

describe('Technical Indicator Engine Unit Tests', () => {
  let calc;

  beforeEach(() => {
    calc = new IndicatorsCalculator();
  });

  // --------------------------------------------------------------------------
  // 1. Session Classification Tests
  // --------------------------------------------------------------------------
  describe('Session Classification', () => {
    it('should classify normal continuous market hours as REGULAR', () => {
      assert.equal(
        IndicatorsValidator.classifySession('2024-01-15T09:15:00'),
        SESSION_TYPES.REGULAR
      );
      assert.equal(
        IndicatorsValidator.classifySession('2024-01-15T12:00:00'),
        SESSION_TYPES.REGULAR
      );
      assert.equal(
        IndicatorsValidator.classifySession('2024-01-15T15:25:00'),
        SESSION_TYPES.REGULAR
      );
    });

    it('should classify 15:30:00 as CLOSING_AUCTION', () => {
      assert.equal(
        IndicatorsValidator.classifySession('2024-01-15T15:30:00'),
        SESSION_TYPES.CLOSING_AUCTION
      );
    });

    it('should classify times > 15:30:00 as POST_MARKET', () => {
      assert.equal(
        IndicatorsValidator.classifySession('2024-01-15T15:40:00'),
        SESSION_TYPES.POST_MARKET
      );
      assert.equal(
        IndicatorsValidator.classifySession('2024-01-15T16:00:00'),
        SESSION_TYPES.POST_MARKET
      );
    });

    it('should classify October 21, 2025 as MUHURAT_SPECIAL', () => {
      assert.equal(
        IndicatorsValidator.classifySession('2025-10-21T13:45:00'),
        SESSION_TYPES.MUHURAT_SPECIAL
      );
    });

    it('should classify Disaster Recovery days as DR_SPLIT', () => {
      assert.equal(
        IndicatorsValidator.classifySession('2024-03-02T09:15:00'),
        SESSION_TYPES.DR_SPLIT
      );
      assert.equal(
        IndicatorsValidator.classifySession('2024-05-18T11:30:00'),
        SESSION_TYPES.DR_SPLIT
      );
    });

    it('should classify pre-market times (< 09:15:00) as UNVERIFIED', () => {
      assert.equal(
        IndicatorsValidator.classifySession('2024-01-15T09:05:00'),
        SESSION_TYPES.UNVERIFIED
      );
    });
  });

  // --------------------------------------------------------------------------
  // 2. EMA 20 & EMA 50 Tests
  // --------------------------------------------------------------------------
  describe('EMA Calculations', () => {
    it('should return null during warm-up period (first 19 bars for EMA20)', () => {
      for (let i = 1; i <= 19; i++) {
        const res = calc.processRegularBar({
          timestamp: `2024-01-01T09:${String(15 + (i - 1) * 5).padStart(2, '0')}:00`,
          open: 100,
          high: 105,
          low: 95,
          close: 100,
          volume: 1000
        });
        assert.equal(res.ema20, null);
      }
    });

    it('should initialize EMA20 with SMA on bar 20 and update exponentially on bar 21', () => {
      // 20 bars with constant close 100
      for (let i = 1; i <= 20; i++) {
        const res = calc.processRegularBar({
          timestamp: `2024-01-01T10:${String(i).padStart(2, '0')}:00`,
          open: 100,
          high: 105,
          low: 95,
          close: 100,
          volume: 1000
        });
        if (i === 20) {
          assert.equal(res.ema20, 100.0);
        }
      }

      // Bar 21 with close = 121
      // alpha = 2 / 21
      // EMA21 = 121 * (2/21) + 100 * (19/21) = (242 + 1900) / 21 = 2142 / 21 = 102.00
      const res21 = calc.processRegularBar({
        timestamp: '2024-01-01T10:21:00',
        open: 110,
        high: 125,
        low: 105,
        close: 121,
        volume: 1000
      });
      assert.equal(res21.ema20, 102.0);
    });

    it('should carry EMA across day boundaries without daily reset', () => {
      for (let i = 1; i <= 20; i++) {
        calc.processRegularBar({
          timestamp: `2024-01-01T10:${String(i).padStart(2, '0')}:00`,
          open: 100,
          high: 105,
          low: 95,
          close: 100,
          volume: 1000
        });
      }
      // Day 2 first bar: EMA should NOT be reset to null!
      const resDay2 = calc.processRegularBar({
        timestamp: '2024-01-02T09:15:00',
        open: 100,
        high: 105,
        low: 95,
        close: 100,
        volume: 1000
      });
      assert.equal(resDay2.ema20, 100.0);
    });
  });

  // --------------------------------------------------------------------------
  // 3. VWAP Tests (Intraday Reset & Zero Volume)
  // --------------------------------------------------------------------------
  describe('VWAP Calculations', () => {
    it('should compute typical price volume-weighted average within the same day', () => {
      // Bar 1: H=105, L=95, C=100 -> TP = 100, Vol = 100 -> cumTPV = 10000, cumV = 100 -> VWAP = 100
      const b1 = calc.processRegularBar({
        timestamp: '2024-01-01T09:15:00',
        open: 100,
        high: 105,
        low: 95,
        close: 100,
        volume: 100
      });
      assert.equal(b1.vwap, 100.0);

      // Bar 2: H=115, L=105, C=110 -> TP = 110, Vol = 200 -> cumTPV = 10000 + 22000 = 32000, cumV = 300 -> VWAP = 32000/300 = 106.67
      const b2 = calc.processRegularBar({
        timestamp: '2024-01-01T09:20:00',
        open: 105,
        high: 115,
        low: 105,
        close: 110,
        volume: 200
      });
      assert.equal(b2.vwap, 106.67);
    });

    it('should reset VWAP accumulator on a new regular day', () => {
      calc.processRegularBar({
        timestamp: '2024-01-01T09:15:00',
        open: 100,
        high: 105,
        low: 95,
        close: 100,
        volume: 100
      });
      // New day: H=205, L=195, C=200 -> TP = 200, Vol = 50 -> VWAP must be 200 (not influenced by day 1)
      const newDay = calc.processRegularBar({
        timestamp: '2024-01-02T09:15:00',
        open: 200,
        high: 205,
        low: 195,
        close: 200,
        volume: 50
      });
      assert.equal(newDay.vwap, 200.0);
    });

    it('should handle zero-volume bars safely without NaN', () => {
      const bZero = calc.processRegularBar({
        timestamp: '2024-01-01T09:15:00',
        open: 100,
        high: 105,
        low: 95,
        close: 100,
        volume: 0
      });
      assert.equal(bZero.vwap, 100.0);
    });
  });

  // --------------------------------------------------------------------------
  // 4. ATR 14 Tests
  // --------------------------------------------------------------------------
  describe('ATR 14 Calculations', () => {
    it('should return null for first 13 bars and compute Wilder smoothed ATR on bar 14', () => {
      for (let i = 1; i <= 14; i++) {
        // High = 110, Low = 100 -> TR = 10 every bar
        const res = calc.processRegularBar({
          timestamp: `2024-01-01T09:${String(i * 5).padStart(2, '0')}:00`,
          open: 105,
          high: 110,
          low: 100,
          close: 105,
          volume: 500
        });
        if (i < 14) {
          assert.equal(res.atr14, null);
        } else {
          assert.equal(res.atr14, 10.0);
        }
      }
    });

    it('should incorporate overnight gap into TR on the first bar of the day', () => {
      // Bar 1: close = 100
      calc.processRegularBar({
        timestamp: '2024-01-01T15:25:00',
        open: 100,
        high: 105,
        low: 95,
        close: 100,
        volume: 500
      });
      // Bar 2 (next day open gap up): High = 130, Low = 120, Close = 125
      // TR = max(130-120=10, |130-100|=30, |120-100|=20) = 30
      // Feed remaining bars to verify ATR reacts to the 30 TR
      for (let i = 2; i <= 14; i++) {
        calc.processRegularBar({
          timestamp: `2024-01-02T09:${String(15 + (i - 2) * 5).padStart(2, '0')}:00`,
          open: 125,
          high: 130,
          low: 120,
          close: 125,
          volume: 500
        });
      }
      // TR sum = 10 (bar 1) + 30 (bar 2 gap) + 12 * 10 = 160 / 14 = 11.43
      const lastRes = calc.processRegularBar({
        timestamp: '2024-01-02T10:20:00',
        open: 125,
        high: 130,
        low: 120,
        close: 125,
        volume: 500
      });
      assert.ok(lastRes.atr14 > 10.0);
    });
  });

  // --------------------------------------------------------------------------
  // 5. ADX 14 Tests (+DI14, -DI14, DX, and ADX)
  // --------------------------------------------------------------------------
  describe('ADX 14 Calculations', () => {
    it('should compute +DI14 and -DI14 starting at bar 14', () => {
      for (let i = 1; i <= 14; i++) {
        const res = calc.processRegularBar({
          timestamp: `2024-01-01T09:${String(i * 5).padStart(2, '0')}:00`,
          open: 100 + i,
          high: 105 + i,
          low: 95 + i,
          close: 100 + i,
          volume: 500
        });
        if (i < 14) {
          assert.equal(res.plusDI14, null);
          assert.equal(res.minusDI14, null);
        } else {
          assert.ok(res.plusDI14 >= 0 && res.plusDI14 <= 100);
          assert.ok(res.minusDI14 >= 0 && res.minusDI14 <= 100);
        }
      }
    });

    it('should compute ADX14 starting at bar 27 (14 bars of DX)', () => {
      for (let i = 1; i <= 35; i++) {
        const res = calc.processRegularBar({
          timestamp: `2024-01-01T${String(Math.floor(i / 12) + 9).padStart(2, '0')}:${String((i % 12) * 5).padStart(2, '0')}:00`,
          open: 100 + i,
          high: 105 + i,
          low: 95 + i,
          close: 100 + i,
          volume: 500
        });
        if (i < 27) {
          assert.equal(res.adx14, null);
        } else {
          assert.ok(res.adx14 >= 0 && res.adx14 <= 100);
        }
      }
    });
  });

  // --------------------------------------------------------------------------
  // 6. Choppiness Index 14 Tests
  // --------------------------------------------------------------------------
  describe('Choppiness Index 14', () => {
    it('should be bounded in [0, 100] and return null for first 13 bars', () => {
      for (let i = 1; i <= 20; i++) {
        const res = calc.processRegularBar({
          timestamp: `2024-01-01T09:${String(i * 5).padStart(2, '0')}:00`,
          open: 100,
          high: 105,
          low: 95,
          close: 100,
          volume: 1000
        });
        if (i < 14) {
          assert.equal(res.choppiness14, null);
        } else {
          assert.ok(res.choppiness14 >= 0 && res.choppiness14 <= 100);
        }
      }
    });

    it('should approach high values (~100) in tightly consolidating sideways markets', () => {
      // 14 bars with identical high=105, low=95 -> range=10, sumTR=14*10=140
      // CHOP = 100 * log10(140 / 10) / log10(14) = 100 * log10(14) / log10(14) = 100.00
      for (let i = 1; i <= 14; i++) {
        const res = calc.processRegularBar({
          timestamp: `2024-01-01T09:${String(i * 5).padStart(2, '0')}:00`,
          open: 100,
          high: 105,
          low: 95,
          close: 100,
          volume: 1000
        });
        if (i === 14) {
          assert.equal(res.choppiness14, 100.0);
        }
      }
    });
  });

  // --------------------------------------------------------------------------
  // 7. Efficiency Ratio 14 Tests
  // --------------------------------------------------------------------------
  describe('Efficiency Ratio 14', () => {
    it('should be exactly 1.0 for a strictly monotonic trend with no pullbacks', () => {
      // Each bar closes 1 point higher
      for (let i = 1; i <= 15; i++) {
        const res = calc.processRegularBar({
          timestamp: `2024-01-01T09:${String(i * 5).padStart(2, '0')}:00`,
          open: 100 + i,
          high: 102 + i,
          low: 99 + i,
          close: 100 + i,
          volume: 500
        });
        if (i < 15) {
          assert.equal(res.efficiencyRatio14, null);
        } else {
          // Change = 14, sum of individual changes = 14 * 1 = 14 -> ER = 1.0
          assert.equal(res.efficiencyRatio14, 1.0);
        }
      }
    });

    it('should be 0.0 for net zero movement over 14 bars', () => {
      // Oscillates 100 -> 102 -> 100
      for (let i = 1; i <= 15; i++) {
        const c = i % 2 === 1 ? 100 : 102;
        const res = calc.processRegularBar({
          timestamp: `2024-01-01T09:${String(i * 5).padStart(2, '0')}:00`,
          open: c,
          high: c + 2,
          low: c - 2,
          close: c,
          volume: 500
        });
        if (i === 15) {
          // Bar 1 close = 100, Bar 15 close = 100 -> Change = 0 -> ER = 0.0
          assert.equal(res.efficiencyRatio14, 0.0);
        }
      }
    });
  });

  // --------------------------------------------------------------------------
  // 8. Volume SMA 20 & RVOL Tests
  // --------------------------------------------------------------------------
  describe('Volume SMA 20 & RVOL', () => {
    it('should compute volume SMA over rolling 20 bars and RVOL = volume / SMA', () => {
      for (let i = 1; i <= 20; i++) {
        const res = calc.processRegularBar({
          timestamp: `2024-01-01T10:${String(i).padStart(2, '0')}:00`,
          open: 100,
          high: 105,
          low: 95,
          close: 100,
          volume: 1000
        });
        if (i < 20) {
          assert.equal(res.volumeSMA20, null);
          assert.equal(res.relativeVolume20, null);
        } else {
          assert.equal(res.volumeSMA20, 1000.0);
          assert.equal(res.relativeVolume20, 1.0);
        }
      }

      // Bar 21 with 2x volume (2000)
      const res21 = calc.processRegularBar({
        timestamp: '2024-01-01T10:21:00',
        open: 100,
        high: 105,
        low: 95,
        close: 100,
        volume: 2000
      });
      // New SMA = (19 * 1000 + 2000) / 20 = 21000 / 20 = 1050
      assert.equal(res21.volumeSMA20, 1050.0);
      // RVOL = 2000 / 1050 = 1.90
      assert.equal(res21.relativeVolume20, 1.9);
    });
  });
});

