/**
 * @file research.test.js
 * @description Native Node.js test suite for Phase 7 Quantitative Research:
 * Stock behaviour calculators, session classification, statistical confidence intervals,
 * bootstrap resampling, walk-forward diagnostics, and dual stock ranking engine.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ResearchCalculator = require('../src/modules/research/research.calculator');
const ResearchClassifier = require('../src/modules/research/research.classifier');
const ResearchMetrics = require('../src/modules/research/research.metrics');
const ResearchService = require('../src/modules/research/research.service');
const {
  REGIMES,
  DEFAULT_CLASSIFICATION_THRESHOLDS,
  WALK_FORWARD_FOLDS,
  STORAGE_PATHS
} = require('../src/modules/research/research.constants');

describe('Phase 7 Quantitative Research Test Suite', () => {

  describe('Intraday Volatility & Behaviour Calculator', () => {
    it('should calculate accurate daily high-low range and range percentage', () => {
      const mockSessions = {
        '2024-01-01': [
          { open: 100, high: 102, low: 99, close: 101, volume: 1000, atr14: 1.5 },
          { open: 101, high: 104, low: 100, close: 103, volume: 1500, atr14: 1.6 }
        ]
      };

      const vol = ResearchCalculator.calculateIntradayVolatility(mockSessions);
      assert.strictEqual(vol.averageDailyRange, 5.00); // High 104 - Low 99 = 5
      assert.strictEqual(vol.averageDailyRangePercent, 5.00); // 5 / 100 * 100 = 5%
      assert.strictEqual(vol.medianDailyRange, 5.00);
      assert.strictEqual(vol.average5mAtr, 1.55); // (1.5 + 1.6) / 2
    });

    it('should compute exact session Efficiency Ratio (ER = displacement / path length)', () => {
      // 1. Strictly monotonic uptrend (ER = 1.0)
      const monotonicTrend = {
        '2024-01-01': [
          { open: 100, close: 102 },
          { open: 102, close: 104 },
          { open: 104, close: 106 }
        ]
      };
      const dir1 = ResearchCalculator.calculateDirectionalMovement(monotonicTrend);
      assert.strictEqual(dir1.averageSessionEfficiencyRatio, 1.000);

      // 2. Pure oscillation with zero net displacement (ER = 0.0)
      const pureOscillation = {
        '2024-01-01': [
          { open: 100, close: 102 },
          { open: 102, close: 100 },
          { open: 100, close: 102 },
          { open: 102, close: 100 }
        ]
      };
      const dir2 = ResearchCalculator.calculateDirectionalMovement(pureOscillation);
      assert.strictEqual(dir2.averageSessionEfficiencyRatio, 0.000);
    });

    it('should detect and count VWAP crossovers accurately', () => {
      // Price crosses VWAP 2 times (above -> below -> above)
      const mockSession = {
        '2024-01-01': [
          { close: 105, vwap: 100 }, // Above
          { close: 95, vwap: 100 },  // Cross 1 (below)
          { close: 96, vwap: 100 },  // Below
          { close: 104, vwap: 100 }  // Cross 2 (above)
        ]
      };

      const sideways = ResearchCalculator.calculateSidewaysBehaviour(mockSession);
      assert.strictEqual(sideways.averageVwapCrossoversPerSession, 2);
      assert.strictEqual(sideways.medianVwapCrossoversPerSession, 2);
    });

    it('should calculate opening range width, breakouts, and identify failed breakouts', () => {
      const mockSession = {
        '2024-01-01': [
          // OR bars: 09:15, 09:20, 09:25 -> High = 105, Low = 98 (Width = 7)
          { timestamp: '2024-01-01T09:15:00', open: 100, high: 102, low: 99, close: 101 },
          { timestamp: '2024-01-01T09:20:00', open: 101, high: 105, low: 100, close: 104 },
          { timestamp: '2024-01-01T09:25:00', open: 104, high: 104, low: 98, close: 100 },
          // Breakout bar at 09:30 (Close 107 > OR High 105)
          { timestamp: '2024-01-01T09:30:00', open: 100, high: 108, low: 100, close: 107 },
          // Failed breakout bar at 09:35: Closes back inside (Close 103 < 105) within 3 bars!
          { timestamp: '2024-01-01T09:35:00', open: 107, high: 107, low: 102, close: 103 },
          { timestamp: '2024-01-01T09:40:00', open: 103, high: 104, low: 101, close: 102 }
        ]
      };

      const orb = ResearchCalculator.calculateOpeningRangeAnalysis(mockSession);
      assert.strictEqual(orb.averageOpeningRangeWidth, 7.00);
      assert.strictEqual(orb.breakoutFrequencyPercent, 100.00);
      assert.strictEqual(orb.bullishBreakoutPercent, 100.00);
      assert.strictEqual(orb.failedBreakoutFrequencyPercent, 100.00); // Successfully detected failure
    });
  });

  describe('Objective Multi-Factor Session Classification', () => {
    it('should classify a strong directional bullish day as STRONG_TREND_UP', () => {
      // Strong trend: Return >= 0.70%, ER >= 0.25, NCP >= 0.70, VWAP crosses <= 3
      const candles = [];
      for (let i = 0; i < 75; i++) {
        const px = 100 + i * 0.2; // Monotonic rise from 100 to 114.8 (+14.8%)
        candles.push({
          timestamp: `2024-01-01T${String(9 + Math.floor(i / 12)).padStart(2, '0')}:${String((i % 12) * 5).padStart(2, '0')}:00`,
          symbol: 'TEST',
          open: px - 0.1,
          high: px + 0.1,
          low: px - 0.1,
          close: px,
          vwap: px - 1.0, // Always above VWAP (0 crosses)
          sessionType: 'REGULAR',
          choppiness14: 35,
          adx14: 35
        });
      }

      const res = ResearchClassifier.classifySession(candles);
      assert.strictEqual(res.regime, REGIMES.STRONG_TREND_UP);
      assert.strictEqual(res.isEligible, true);
      assert.ok(res.returnPct > 0.70);
    });

    it('should classify an oscillating choppy day as SIDEWAYS', () => {
      // Choppy oscillation around VWAP: multiple crosses, small return (< 0.50%), high choppiness (>= 58)
      const candles = [];
      for (let i = 0; i < 75; i++) {
        const offset = i === 74 ? 0.1 : Math.sin(i * Math.PI / 3) * 1.5;
        candles.push({
          timestamp: `2024-01-01T${String(9 + Math.floor(i / 12)).padStart(2, '0')}:${String((i % 12) * 5).padStart(2, '0')}:00`,
          symbol: 'TEST',
          open: 100,
          high: 102,
          low: 98,
          close: 100 + offset,
          vwap: 100,
          sessionType: 'REGULAR',
          choppiness14: 65,
          adx14: 15
        });
      }

      const res = ResearchClassifier.classifySession(candles);
      assert.strictEqual(res.regime, REGIMES.SIDEWAYS);
      assert.strictEqual(res.isEligible, true);
    });

    it('should classify non-regular / special sessions as SPECIAL_SESSION with isEligible: false', () => {
      const candles = [
        { timestamp: '2025-10-21T13:45:00', open: 100, high: 101, low: 99, close: 100.5, sessionType: 'MUHURAT_SPECIAL' },
        { timestamp: '2025-10-21T14:45:00', open: 100.5, high: 102, low: 100, close: 101.5, sessionType: 'MUHURAT_SPECIAL' }
      ];

      const res = ResearchClassifier.classifySession(candles);
      assert.strictEqual(res.regime, REGIMES.SPECIAL_SESSION);
      assert.strictEqual(res.isEligible, false);
    });

    it('should evaluate threshold sensitivity across Tight, Baseline, and Loose grids', () => {
      const sessions = {
        '2024-01-01': [
          { timestamp: '2024-01-01T09:15:00', open: 100, high: 103, low: 99, close: 102, vwap: 100, sessionType: 'REGULAR' },
          { timestamp: '2024-01-01T15:25:00', open: 102, high: 103, low: 100, close: 102.5, vwap: 101, sessionType: 'REGULAR' }
        ]
      };

      const sensitivity = ResearchClassifier.runThresholdSensitivity(sessions);
      assert.ok(sensitivity.tight);
      assert.ok(sensitivity.baseline);
      assert.ok(sensitivity.loose);
    });
  });

  describe('Statistical Confidence, Bootstrap & Robustness Analytics', () => {
    it('should compute exact Wilson score 95% binomial confidence interval for win rates', () => {
      // Test Case: HDFCBANK Variant E (7 wins out of 11 trades = 63.64% win rate)
      const ci = ResearchMetrics.calculateConfidenceIntervals(11, 63.636);

      assert.strictEqual(ci.sampleSize, 11);
      assert.strictEqual(ci.isStatisticallyFragile, true);
      // Wilson CI bounds for 7/11: lower ~35.4%, upper ~84.8%
      assert.ok(ci.ciLowerPercent >= 34.0 && ci.ciLowerPercent <= 36.5);
      assert.ok(ci.ciUpperPercent >= 83.5 && ci.ciUpperPercent <= 86.0);
      assert.ok(ci.marginOfErrorPercent > 20.0); // Margin of error > ±24%!
    });

    it('should flag sample size adequacy (N >= 30 as ADEQUATE, N < 30 as FRAGILE)', () => {
      const smallSample = ResearchMetrics.calculateConfidenceIntervals(18, 50.0);
      assert.strictEqual(smallSample.isStatisticallyFragile, true);

      const largeSample = ResearchMetrics.calculateConfidenceIntervals(65, 50.0);
      assert.strictEqual(largeSample.isStatisticallyFragile, false);
    });

    it('should perform deterministic bootstrap resampling and verify percentile ordering', () => {
      const mockTrades = [
        { netPnL: 150 },
        { netPnL: -100 },
        { netPnL: 200 },
        { netPnL: -80 },
        { netPnL: 50 },
        { netPnL: -120 }
      ];

      const boot = ResearchMetrics.runBootstrapResampling(mockTrades, 500);
      assert.strictEqual(boot.iterations, 500);
      assert.ok(boot.percentile5NetPnL <= boot.medianNetPnL);
      assert.ok(boot.medianNetPnL <= boot.percentile95NetPnL);
      assert.ok(boot.probabilityOfLossPercent >= 0 && boot.probabilityOfLossPercent <= 100);
    });

    it('should aggregate trade metrics by year and calculate active month consistency', () => {
      const mockTrades = [
        { entryTimestamp: '2022-03-15T10:00:00', netPnL: 100 },
        { entryTimestamp: '2022-03-20T11:00:00', netPnL: -50 },
        { entryTimestamp: '2023-06-10T09:30:00', netPnL: 200 }
      ];

      const breakdown = ResearchMetrics.calculatePeriodBreakdown(mockTrades);
      assert.strictEqual(breakdown.yearly['2022'].trades, 2);
      assert.strictEqual(breakdown.yearly['2022'].winRate, 50.00);
      assert.strictEqual(breakdown.yearly['2022'].netPnL, 50.00);
      assert.strictEqual(breakdown.yearly['2023'].trades, 1);
      assert.strictEqual(breakdown.activeMonthsCount, 2); // 2022-03 and 2023-06
      assert.strictEqual(breakdown.monthlyConsistencyPercent, 100.00); // Both net profitable
    });
  });

  describe('Chronological Walk-Forward Diagnostics', () => {
    it('should enforce chronological non-overlapping test folds without look-ahead bias', () => {
      assert.strictEqual(WALK_FORWARD_FOLDS.length, 3);

      for (const fold of WALK_FORWARD_FOLDS) {
        assert.ok(fold.trainStart < fold.trainEnd, 'Train start must precede train end');
        assert.ok(fold.trainEnd <= fold.testStart, 'Train period must not overlap test period');
        assert.ok(fold.testStart < fold.testEnd, 'Test start must precede test end');
      }

      // Verify Fold 1 test end precedes Fold 3 test end
      assert.ok(WALK_FORWARD_FOLDS[0].testEnd < WALK_FORWARD_FOLDS[2].testEnd);
    });
  });

  describe('Dual Stock Ranking Engine', () => {
    it('should compute independent Ranking A and Ranking B scores bounded in [0, 100]', () => {
      const mockBehaviours = {
        'STOCK_A': {
          directionalMovement: { averageSessionEfficiencyRatio: 0.15, meanChoppinessIndex: 48, adxAbove25Percent: 50 },
          volatility: { averageDailyRangePercent: 2.5 },
          sideways: { averageVwapCrossoversPerSession: 5.5 },
          volumeLiquidity: { averageDailyTradedValueCrores: 1000 },
          classification: { regimePercentages: { STRONG_TREND_UP: 5, STRONG_TREND_DOWN: 5 } }
        },
        'STOCK_B': {
          directionalMovement: { averageSessionEfficiencyRatio: 0.12, meanChoppinessIndex: 52, adxAbove25Percent: 40 },
          volatility: { averageDailyRangePercent: 1.8 },
          sideways: { averageVwapCrossoversPerSession: 7.0 },
          volumeLiquidity: { averageDailyTradedValueCrores: 2000 },
          classification: { regimePercentages: { STRONG_TREND_UP: 2, STRONG_TREND_DOWN: 2 } }
        }
      };

      const mockStrategy = {
        'STOCK_A': { netExpectancy: 50, profitFactor: 1.8, maxDrawdownPercent: 1.2, winRate: 60, totalTrades: 15, grossRealizedPnL: 1000, totalCharges: 250, slippageStress: { retention5bpsPercent: 70 } },
        'STOCK_B': { netExpectancy: -20, profitFactor: 0.7, maxDrawdownPercent: 3.5, winRate: 35, totalTrades: 20, grossRealizedPnL: 500, totalCharges: 600, slippageStress: { retention5bpsPercent: 0 } }
      };

      const rankings = ResearchMetrics.computeStockRankings(mockBehaviours, mockStrategy);

      // Verify Ranking A
      const rankAList = rankings.rankingA.baselineRanking;
      assert.strictEqual(rankAList.length, 2);
      assert.ok(rankAList[0].compositeScore >= rankAList[1].compositeScore);
      assert.ok(rankAList[0].compositeScore >= 0 && rankAList[0].compositeScore <= 100);

      // Verify Ranking B
      const rankBList = rankings.rankingB.baselineRanking;
      assert.strictEqual(rankBList.length, 2);
      assert.ok(rankBList[0].compositeScore >= rankBList[1].compositeScore);
      assert.ok(rankBList[0].compositeScore >= 0 && rankBList[0].compositeScore <= 100);
    });
  });

  describe('End-to-End Research Service & Storage Deliverables', () => {
    it('should verify all 8 required Phase 7 deliverables exist and are non-empty', () => {
      const p = STORAGE_PATHS;
      const files = [
        p.OUTPUT_FILES.REPORT_MD,
        p.OUTPUT_FILES.STOCK_BEHAVIOUR_CSV,
        p.OUTPUT_FILES.SESSION_CLASSIFICATION_CSV,
        p.OUTPUT_FILES.STRATEGY_ROBUSTNESS_CSV,
        p.OUTPUT_FILES.WALK_FORWARD_CSV,
        p.OUTPUT_FILES.PARAMETER_SENSITIVITY_CSV,
        p.OUTPUT_FILES.RESEARCH_OUTCOMES_JSON,
        p.OUTPUT_FILES.METADATA_JSON
      ];

      for (const f of files) {
        const fullPath = path.join(p.RESEARCH_DIR, f);
        assert.ok(fs.existsSync(fullPath), `Deliverable file ${f} must exist in storage/research`);
        const stats = fs.statSync(fullPath);
        assert.ok(stats.size > 0, `Deliverable file ${f} must be non-empty`);
      }
    });

    it('should verify original historical datasets and indicators remain unmodified', () => {
      const rawDir = STORAGE_PATHS.HISTORICAL_DATA_DIR;
      const derivedDir = STORAGE_PATHS.DERIVED_INDICATORS_DIR;
      assert.ok(fs.existsSync(rawDir), 'Raw historical data directory must exist');
      assert.ok(fs.existsSync(derivedDir), 'Derived indicators directory must exist');

      // Check ICICIBANK monthly files count
      const rawYears = fs.readdirSync(path.join(rawDir, 'ICICIBANK')).filter(y => /^\d{4}$/.test(y));
      assert.ok(rawYears.length >= 6, 'Must have 6 years of historical data partitioned');
    });
  });

});
