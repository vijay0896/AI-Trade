/**
 * @file research.constants.js
 * @description Constants, configuration presets, storage paths, and evaluation thresholds for Phase 7 Quantitative Research.
 */

const path = require('path');

const TARGET_STOCKS = ['ICICIBANK', 'HDFCBANK', 'M&M', 'AXISBANK', 'BHARTIARTL'];

const STORAGE_PATHS = {
  RESEARCH_DIR: path.join(__dirname, '../../../storage/research'),
  DERIVED_INDICATORS_DIR: path.join(__dirname, '../../../storage/derived/indicators'),
  HISTORICAL_DATA_DIR: path.join(__dirname, '../../../storage/historical-data'),
  BACKTEST_RUNS_DIR: path.join(__dirname, '../../../storage/backtesting/runs'),
  OUTPUT_FILES: {
    REPORT_MD: 'RESEARCH_COMPARISON_REPORT.md',
    STOCK_BEHAVIOUR_CSV: 'STOCK_BEHAVIOUR_METRICS.csv',
    SESSION_CLASSIFICATION_CSV: 'DAILY_SESSION_CLASSIFICATION.csv',
    STRATEGY_ROBUSTNESS_CSV: 'STRATEGY_ROBUSTNESS.csv',
    WALK_FORWARD_CSV: 'WALK_FORWARD_RESULTS.csv',
    PARAMETER_SENSITIVITY_CSV: 'PARAMETER_SENSITIVITY.csv',
    RESEARCH_OUTCOMES_JSON: 'RESEARCH_OUTCOMES.json',
    METADATA_JSON: 'research_run_metadata.json'
  }
};

const REGIMES = {
  STRONG_TREND_UP: 'STRONG_TREND_UP',
  STRONG_TREND_DOWN: 'STRONG_TREND_DOWN',
  WEAK_TREND: 'WEAK_TREND',
  SIDEWAYS: 'SIDEWAYS',
  MIXED_UNCLEAR: 'MIXED_UNCLEAR',
  SPECIAL_SESSION: 'SPECIAL_SESSION'
};

const DEFAULT_CLASSIFICATION_THRESHOLDS = {
  strongReturnPct: 0.70,          // |Return| >= 0.70% for Strong Trend
  strongER: 0.25,                 // Session ER >= 0.25 for Strong Trend
  ncpUpper: 0.70,                 // Normalized Close Position >= 0.70 for Strong Trend Up
  ncpLower: 0.30,                 // Normalized Close Position <= 0.30 for Strong Trend Down
  maxTrendVwapCrossovers: 3,      // Max VWAP crosses for Strong Trend
  minSidewaysVwapCrossovers: 5,   // Min VWAP crosses for Sideways
  sidewaysMaxReturnPct: 0.50,     // |Return| < 0.50% for Sideways
  sidewaysMaxER: 0.20,            // Session ER <= 0.20 for Sideways
  sidewaysMinChop: 58.0,          // Mean Choppiness >= 58.0 for Sideways
  weakReturnPct: 0.35,            // |Return| >= 0.35% for Weak Trend
  weakER: 0.18,                   // Session ER >= 0.18 for Weak Trend
  weakMaxVwapCrossovers: 4        // Max VWAP crosses for Weak Trend
};

const SENSITIVITY_THRESHOLDS_GRID = {
  tight: {
    strongReturnPct: 1.00,
    strongER: 0.35,
    ncpUpper: 0.80,
    ncpLower: 0.20,
    maxTrendVwapCrossovers: 2,
    minSidewaysVwapCrossovers: 6,
    sidewaysMaxReturnPct: 0.40,
    sidewaysMaxER: 0.18,
    sidewaysMinChop: 61.8,
    weakReturnPct: 0.50,
    weakER: 0.25,
    weakMaxVwapCrossovers: 3
  },
  baseline: DEFAULT_CLASSIFICATION_THRESHOLDS,
  loose: {
    strongReturnPct: 0.50,
    strongER: 0.20,
    ncpUpper: 0.65,
    ncpLower: 0.35,
    maxTrendVwapCrossovers: 4,
    minSidewaysVwapCrossovers: 4,
    sidewaysMaxReturnPct: 0.60,
    sidewaysMaxER: 0.25,
    sidewaysMinChop: 55.0,
    weakReturnPct: 0.25,
    weakER: 0.15,
    weakMaxVwapCrossovers: 5
  }
};

const OPENING_RANGE_CONFIG = {
  startBar: '09:15:00',
  endBar: '09:25:00', // 3 bars: 09:15, 09:20, 09:25 forming 15-minute range
  firstBreakoutBar: '09:30:00',
  cutoffTime: '14:30:00',
  failedBreakoutBars: 3
};

const WALK_FORWARD_FOLDS = [
  {
    foldId: 'FOLD_1',
    trainStart: '2021-11-08',
    trainEnd: '2023-10-31',
    testStart: '2023-11-01',
    testEnd: '2024-10-31',
    label: 'Fold 1 (Train: 24m, Test: 12m)'
  },
  {
    foldId: 'FOLD_2',
    trainStart: '2022-11-01',
    trainEnd: '2024-10-31',
    testStart: '2024-11-01',
    testEnd: '2025-10-31',
    label: 'Fold 2 (Train: 24m, Test: 12m)'
  },
  {
    foldId: 'FOLD_3',
    trainStart: '2023-11-01',
    trainEnd: '2025-10-31',
    testStart: '2025-11-01',
    testEnd: '2026-11-06',
    label: 'Fold 3 (Train: 24m, Test: 12m)'
  }
];

const RANKING_A_CONFIG = {
  weights: {
    baseline: {
      trendPercent: 0.25,
      efficiencyRatio: 0.20,
      rangePercent: 0.15,
      choppiness: 0.15,         // Inverse (lower chop is better)
      vwapCrossovers: 0.10,     // Inverse (fewer crosses is better)
      adxStrength: 0.10,
      tradedValueProxy: 0.05
    },
    trendHeavy: {
      trendPercent: 0.40,
      efficiencyRatio: 0.25,
      rangePercent: 0.10,
      choppiness: 0.10,
      vwapCrossovers: 0.05,
      adxStrength: 0.05,
      tradedValueProxy: 0.05
    },
    volatilityHeavy: {
      rangePercent: 0.35,
      adxStrength: 0.20,
      trendPercent: 0.15,
      efficiencyRatio: 0.10,
      choppiness: 0.10,
      vwapCrossovers: 0.05,
      tradedValueProxy: 0.05
    }
  }
};

const RANKING_B_CONFIG = {
  weights: {
    baseline: {
      netExpectancy: 0.25,
      profitFactor: 0.20,
      maxDrawdown: 0.15,        // Inverse (lower is better)
      winRate: 0.15,
      costDragRatio: 0.10,      // Inverse (lower is better)
      slippageResilience: 0.10, // Profit retained at 5 bps
      sampleSizeAdequacy: 0.05
    },
    capitalPreservation: {
      maxDrawdown: 0.30,
      costDragRatio: 0.20,
      profitFactor: 0.20,
      netExpectancy: 0.15,
      winRate: 0.05,
      slippageResilience: 0.05,
      sampleSizeAdequacy: 0.05
    },
    returnFocused: {
      netExpectancy: 0.35,
      profitFactor: 0.30,
      winRate: 0.15,
      maxDrawdown: 0.10,
      slippageResilience: 0.05,
      costDragRatio: 0.05,
      sampleSizeAdequacy: 0.00
    }
  }
};

module.exports = {
  TARGET_STOCKS,
  STORAGE_PATHS,
  REGIMES,
  DEFAULT_CLASSIFICATION_THRESHOLDS,
  SENSITIVITY_THRESHOLDS_GRID,
  OPENING_RANGE_CONFIG,
  WALK_FORWARD_FOLDS,
  RANKING_A_CONFIG,
  RANKING_B_CONFIG
};
