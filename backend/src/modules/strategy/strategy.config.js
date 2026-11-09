/**
 * @file strategy.config.js
 * @description Predefined, validated strategy specifications for Variants A, B, C, D, and E,
 * and reproducible experimental parameter configurations.
 */

const {
  STRATEGY_VARIANTS,
  DIRECTION_MODES,
  ENTRY_TYPES,
  STOP_LOSS_MODES,
  TARGET_MODES,
  SPECIAL_SESSION_MODES,
  DEFAULT_UNIVERSE,
  TIME_CONVENTIONS
} = require('./strategy.constants');
const { StrategyConfigSchema, EMA921StrategySchema } = require('./strategy.schema');

/**
 * Base Template for all Strategy Variants
 */
const BASE_STRATEGY_TEMPLATE = {
  version: '1.0.0',
  universe: DEFAULT_UNIVERSE,
  timeframe: TIME_CONVENTIONS.TIMEFRAME,
  timezone: TIME_CONVENTIONS.TIMEZONE,
  openingRange: {
    startTime: TIME_CONVENTIONS.OPENING_RANGE_START,
    endTime: TIME_CONVENTIONS.OPENING_RANGE_END,
    candleInterval: '5minute',
    expectedBars: 3,
    minWidthPercent: 0.1,
    maxWidthPercent: 3.5
  },
  entry: {
    entryType: ENTRY_TYPES.BREAKOUT_CLOSE,
    direction: DIRECTION_MODES.BOTH,
    entryStartTime: TIME_CONVENTIONS.ENTRY_START_TIME,
    entryCutoffTime: TIME_CONVENTIONS.DEFAULT_ENTRY_CUTOFF,
    retestTolerancePercent: 0.2,
    retestMaxBars: 6,
    requireRetestConfirmationBar: true
  },
  exit: {
    stopLossMode: STOP_LOSS_MODES.OR_OPPOSITE,
    atrMultiplierSL: 1.5,
    swingLookbackBars: 5,
    targetMode: TARGET_MODES.FIXED_RR_1_5,
    riskRewardRatio: 1.5,
    squareOffTime: TIME_CONVENTIONS.DEFAULT_SQUARE_OFF,
    maxHoldingDurationBars: 36,
    gapThroughStopModel: 'WORST_PRICE'
  },
  risk: {
    accountCapital: 100000,
    riskPerTradePercent: 0.5,
    dailyMaxLossPercent: 1.0,
    maxTradesPerDay: 2,
    maxActivePositionsPerStock: 1,
    maxPortfolioExposurePercent: 100,
    leverageMultiplier: 1
  },
  specialSessions: SPECIAL_SESSION_MODES.SUPPRESS_ALL
};

/**
 * Variant A: Basic Opening Range Breakout (Pure Price Action)
 */
const VARIANT_A_CONFIG = StrategyConfigSchema.parse({
  ...BASE_STRATEGY_TEMPLATE,
  id: 'STRAT-ORB-VAR-A',
  name: 'Variant A: Basic Opening Range Breakout',
  description: 'Pure ORB strategy executing on 5-minute candle close beyond the 09:15-09:30 range with opposite range boundary stop loss.',
  variant: STRATEGY_VARIANTS.VARIANT_A,
  filters: {
    adxThreshold: 0,
    adxRequireRising: false,
    diDirectionalConfirm: false,
    rvolThreshold: 0
  }
});

/**
 * Variant B: ORB + VWAP Confirmation
 */
const VARIANT_B_CONFIG = StrategyConfigSchema.parse({
  ...BASE_STRATEGY_TEMPLATE,
  id: 'STRAT-ORB-VAR-B',
  name: 'Variant B: ORB with VWAP Filter',
  description: 'ORB strategy requiring breakout candle close to confirm above intraday VWAP for Longs and below VWAP for Shorts.',
  variant: STRATEGY_VARIANTS.VARIANT_B,
  filters: {
    adxThreshold: 0,
    adxRequireRising: false,
    diDirectionalConfirm: false,
    rvolThreshold: 0
  }
});

/**
 * Variant C: ORB + VWAP + EMA 20/50 Trend Filter
 */
const VARIANT_C_CONFIG = StrategyConfigSchema.parse({
  ...BASE_STRATEGY_TEMPLATE,
  id: 'STRAT-ORB-VAR-C',
  name: 'Variant C: ORB with VWAP and EMA 20/50',
  description: 'ORB strategy requiring VWAP alignment and moving average stack (EMA20 > EMA50 for Long, EMA20 < EMA50 for Short).',
  variant: STRATEGY_VARIANTS.VARIANT_C,
  filters: {
    adxThreshold: 0,
    adxRequireRising: false,
    diDirectionalConfirm: false,
    rvolThreshold: 0
  }
});

/**
 * Variant D: ORB + VWAP + EMA + ADX 14 & Directional Movement (+DI/-DI)
 */
const VARIANT_D_CONFIG = StrategyConfigSchema.parse({
  ...BASE_STRATEGY_TEMPLATE,
  id: 'STRAT-ORB-VAR-D',
  name: 'Variant D: ORB with VWAP, EMA and ADX/DI Filter',
  description: 'ORB strategy filtering out weak trends by enforcing ADX >= 20 with +DI > -DI confirmation for Longs and -DI > +DI for Shorts.',
  variant: STRATEGY_VARIANTS.VARIANT_D,
  filters: {
    adxThreshold: 20,
    adxRequireRising: false,
    diDirectionalConfirm: true,
    rvolThreshold: 0
  }
});

/**
 * Variant E: Full Trend Confirmation (ORB + VWAP + EMA + ADX + RVOL + Regime)
 */
const VARIANT_E_CONFIG = StrategyConfigSchema.parse({
  ...BASE_STRATEGY_TEMPLATE,
  id: 'STRAT-ORB-VAR-E',
  name: 'Variant E: Full Trend Confirmation Strategy',
  description: 'Multi-factor institutional trend setup requiring ORB breakout, VWAP alignment, EMA stack, ADX >= 25, RVOL >= 1.5, and non-choppy regime.',
  variant: STRATEGY_VARIANTS.VARIANT_E,
  filters: {
    adxThreshold: 25,
    adxRequireRising: true,
    diDirectionalConfirm: true,
    rvolThreshold: 1.5,
    choppinessMaxThreshold: 55,
    efficiencyRatioMin: 0.30
  }
});

/**
 * Canonical Single Active Strategy: EMA 9 / EMA 21 Crossover
 */
const EMA_9_21_CROSSOVER_CONFIG = EMA921StrategySchema.parse({
  id: 'ema_9_21_crossover',
  name: 'EMA 9/21 Crossover',
  version: '1.0.0',
  description: 'Intraday trend-following strategy buying when EMA 9 crosses above EMA 21 and closing when EMA 9 crosses below EMA 21. Long-only, no short positions, no stop loss, fixed share quantity.',
  strategyId: 'ema_9_21_crossover',
  variant: 'EMA_9_21_CROSSOVER',
  timeframe: '5minute',
  timezone: 'Asia/Kolkata',
  universe: DEFAULT_UNIVERSE,
  fastPeriod: 9,
  slowPeriod: 21,
  fastColor: '#00C853',
  slowColor: '#FF0000',
  direction: 'LONG_ONLY',
  fixedQuantity: 1,
  capital: 100000,
  squareOffTime: '15:15:00',
  entryCutoffTime: '15:00:00'
});
EMA_9_21_CROSSOVER_CONFIG.specialSessions = 'SUPPRESS_ALL';

/**
 * All Predefined Core Variants (5 historical research variants)
 */
const PREDEFINED_STRATEGIES = {
  [STRATEGY_VARIANTS.VARIANT_A]: VARIANT_A_CONFIG,
  [STRATEGY_VARIANTS.VARIANT_B]: VARIANT_B_CONFIG,
  [STRATEGY_VARIANTS.VARIANT_C]: VARIANT_C_CONFIG,
  [STRATEGY_VARIANTS.VARIANT_D]: VARIANT_D_CONFIG,
  [STRATEGY_VARIANTS.VARIANT_E]: VARIANT_E_CONFIG
};

const ACTIVE_STRATEGY_CONFIG = EMA_9_21_CROSSOVER_CONFIG;

/**
 * Systematic Research Parameter Matrix (Independent Evaluation Cohorts)
 * 36 Distinct Reproducible Configurations for Phase 6 Backtesting
 */
const PARAMETER_MATRIX_COHORTS = [
  // Cohort 1: Execution Mechanics (Breakout Close vs Retest Confirmation)
  {
    id: 'EXP-EXEC-001',
    cohort: 'Execution Mechanics',
    variant: STRATEGY_VARIANTS.VARIANT_B,
    entryType: ENTRY_TYPES.BREAKOUT_CLOSE,
    direction: DIRECTION_MODES.BOTH,
    stopLossMode: STOP_LOSS_MODES.OR_OPPOSITE,
    targetMode: TARGET_MODES.FIXED_RR_1_5,
    riskRewardRatio: 1.5,
    adxThreshold: 0,
    rvolThreshold: 0,
    maxTradesPerDay: 2
  },
  {
    id: 'EXP-EXEC-002',
    cohort: 'Execution Mechanics',
    variant: STRATEGY_VARIANTS.VARIANT_B,
    entryType: ENTRY_TYPES.RETEST_CONFIRMATION,
    direction: DIRECTION_MODES.BOTH,
    stopLossMode: STOP_LOSS_MODES.OR_OPPOSITE,
    targetMode: TARGET_MODES.FIXED_RR_1_5,
    riskRewardRatio: 1.5,
    adxThreshold: 0,
    rvolThreshold: 0,
    maxTradesPerDay: 2
  },
  // Cohort 2: Directional Symmetry (Both vs Long-Only vs Short-Only)
  {
    id: 'EXP-DIR-001',
    cohort: 'Directional Bias',
    variant: STRATEGY_VARIANTS.VARIANT_C,
    entryType: ENTRY_TYPES.BREAKOUT_CLOSE,
    direction: DIRECTION_MODES.BOTH,
    stopLossMode: STOP_LOSS_MODES.OR_OPPOSITE,
    targetMode: TARGET_MODES.FIXED_RR_1_5,
    riskRewardRatio: 1.5,
    adxThreshold: 0,
    rvolThreshold: 0,
    maxTradesPerDay: 2
  },
  {
    id: 'EXP-DIR-002',
    cohort: 'Directional Bias',
    variant: STRATEGY_VARIANTS.VARIANT_C,
    entryType: ENTRY_TYPES.BREAKOUT_CLOSE,
    direction: DIRECTION_MODES.LONG_ONLY,
    stopLossMode: STOP_LOSS_MODES.OR_OPPOSITE,
    targetMode: TARGET_MODES.FIXED_RR_1_5,
    riskRewardRatio: 1.5,
    adxThreshold: 0,
    rvolThreshold: 0,
    maxTradesPerDay: 2
  },
  {
    id: 'EXP-DIR-003',
    cohort: 'Directional Bias',
    variant: STRATEGY_VARIANTS.VARIANT_C,
    entryType: ENTRY_TYPES.BREAKOUT_CLOSE,
    direction: DIRECTION_MODES.SHORT_ONLY,
    stopLossMode: STOP_LOSS_MODES.OR_OPPOSITE,
    targetMode: TARGET_MODES.FIXED_RR_1_5,
    riskRewardRatio: 1.5,
    adxThreshold: 0,
    rvolThreshold: 0,
    maxTradesPerDay: 2
  },
  // Cohort 3: ADX Trend Strength Sensitivity (ADX 20 vs ADX 25)
  {
    id: 'EXP-ADX-001',
    cohort: 'ADX Filter Sensitivity',
    variant: STRATEGY_VARIANTS.VARIANT_D,
    entryType: ENTRY_TYPES.BREAKOUT_CLOSE,
    direction: DIRECTION_MODES.BOTH,
    stopLossMode: STOP_LOSS_MODES.OR_OPPOSITE,
    targetMode: TARGET_MODES.FIXED_RR_1_5,
    riskRewardRatio: 1.5,
    adxThreshold: 20,
    rvolThreshold: 0,
    maxTradesPerDay: 2
  },
  {
    id: 'EXP-ADX-002',
    cohort: 'ADX Filter Sensitivity',
    variant: STRATEGY_VARIANTS.VARIANT_D,
    entryType: ENTRY_TYPES.BREAKOUT_CLOSE,
    direction: DIRECTION_MODES.BOTH,
    stopLossMode: STOP_LOSS_MODES.OR_OPPOSITE,
    targetMode: TARGET_MODES.FIXED_RR_1_5,
    riskRewardRatio: 1.5,
    adxThreshold: 25,
    rvolThreshold: 0,
    maxTradesPerDay: 2
  },
  // Cohort 4: Volume Surge Filtering (RVOL 1.2 vs 1.5 vs 2.0)
  {
    id: 'EXP-RVOL-001',
    cohort: 'Volume Surge Sensitivity',
    variant: STRATEGY_VARIANTS.VARIANT_E,
    entryType: ENTRY_TYPES.BREAKOUT_CLOSE,
    direction: DIRECTION_MODES.BOTH,
    stopLossMode: STOP_LOSS_MODES.OR_OPPOSITE,
    targetMode: TARGET_MODES.FIXED_RR_1_5,
    riskRewardRatio: 1.5,
    adxThreshold: 20,
    rvolThreshold: 1.2,
    maxTradesPerDay: 2
  },
  {
    id: 'EXP-RVOL-002',
    cohort: 'Volume Surge Sensitivity',
    variant: STRATEGY_VARIANTS.VARIANT_E,
    entryType: ENTRY_TYPES.BREAKOUT_CLOSE,
    direction: DIRECTION_MODES.BOTH,
    stopLossMode: STOP_LOSS_MODES.OR_OPPOSITE,
    targetMode: TARGET_MODES.FIXED_RR_1_5,
    riskRewardRatio: 1.5,
    adxThreshold: 20,
    rvolThreshold: 1.5,
    maxTradesPerDay: 2
  },
  {
    id: 'EXP-RVOL-003',
    cohort: 'Volume Surge Sensitivity',
    variant: STRATEGY_VARIANTS.VARIANT_E,
    entryType: ENTRY_TYPES.BREAKOUT_CLOSE,
    direction: DIRECTION_MODES.BOTH,
    stopLossMode: STOP_LOSS_MODES.OR_OPPOSITE,
    targetMode: TARGET_MODES.FIXED_RR_1_5,
    riskRewardRatio: 1.5,
    adxThreshold: 20,
    rvolThreshold: 2.0,
    maxTradesPerDay: 2
  },
  // Cohort 5: Stop Loss Geometry (OR Opposite vs Swing Extreme vs ATR-based)
  {
    id: 'EXP-SL-001',
    cohort: 'Stop Loss Geometry',
    variant: STRATEGY_VARIANTS.VARIANT_C,
    entryType: ENTRY_TYPES.BREAKOUT_CLOSE,
    direction: DIRECTION_MODES.BOTH,
    stopLossMode: STOP_LOSS_MODES.OR_OPPOSITE,
    targetMode: TARGET_MODES.FIXED_RR_1_5,
    riskRewardRatio: 1.5,
    adxThreshold: 0,
    rvolThreshold: 0,
    maxTradesPerDay: 2
  },
  {
    id: 'EXP-SL-002',
    cohort: 'Stop Loss Geometry',
    variant: STRATEGY_VARIANTS.VARIANT_C,
    entryType: ENTRY_TYPES.BREAKOUT_CLOSE,
    direction: DIRECTION_MODES.BOTH,
    stopLossMode: STOP_LOSS_MODES.SWING_EXTREME,
    targetMode: TARGET_MODES.FIXED_RR_1_5,
    riskRewardRatio: 1.5,
    adxThreshold: 0,
    rvolThreshold: 0,
    maxTradesPerDay: 2
  },
  {
    id: 'EXP-SL-003',
    cohort: 'Stop Loss Geometry',
    variant: STRATEGY_VARIANTS.VARIANT_C,
    entryType: ENTRY_TYPES.BREAKOUT_CLOSE,
    direction: DIRECTION_MODES.BOTH,
    stopLossMode: STOP_LOSS_MODES.ATR_BASED,
    targetMode: TARGET_MODES.FIXED_RR_1_5,
    riskRewardRatio: 1.5,
    adxThreshold: 0,
    rvolThreshold: 0,
    maxTradesPerDay: 2
  },
  // Cohort 6: Risk/Reward Target Alternatives (1:1.5 vs 1:2.0)
  {
    id: 'EXP-RR-001',
    cohort: 'Risk/Reward Targets',
    variant: STRATEGY_VARIANTS.VARIANT_C,
    entryType: ENTRY_TYPES.BREAKOUT_CLOSE,
    direction: DIRECTION_MODES.BOTH,
    stopLossMode: STOP_LOSS_MODES.OR_OPPOSITE,
    targetMode: TARGET_MODES.FIXED_RR_1_5,
    riskRewardRatio: 1.5,
    adxThreshold: 0,
    rvolThreshold: 0,
    maxTradesPerDay: 2
  },
  {
    id: 'EXP-RR-002',
    cohort: 'Risk/Reward Targets',
    variant: STRATEGY_VARIANTS.VARIANT_C,
    entryType: ENTRY_TYPES.BREAKOUT_CLOSE,
    direction: DIRECTION_MODES.BOTH,
    stopLossMode: STOP_LOSS_MODES.OR_OPPOSITE,
    targetMode: TARGET_MODES.FIXED_RR_2_0,
    riskRewardRatio: 2.0,
    adxThreshold: 0,
    rvolThreshold: 0,
    maxTradesPerDay: 2
  },
  // Cohort 7: Daily Frequency Restrictions (Max Trades 1 vs 2 vs 3)
  {
    id: 'EXP-FREQ-001',
    cohort: 'Daily Trade Frequency',
    variant: STRATEGY_VARIANTS.VARIANT_C,
    entryType: ENTRY_TYPES.BREAKOUT_CLOSE,
    direction: DIRECTION_MODES.BOTH,
    stopLossMode: STOP_LOSS_MODES.OR_OPPOSITE,
    targetMode: TARGET_MODES.FIXED_RR_1_5,
    riskRewardRatio: 1.5,
    adxThreshold: 0,
    rvolThreshold: 0,
    maxTradesPerDay: 1
  },
  {
    id: 'EXP-FREQ-002',
    cohort: 'Daily Trade Frequency',
    variant: STRATEGY_VARIANTS.VARIANT_C,
    entryType: ENTRY_TYPES.BREAKOUT_CLOSE,
    direction: DIRECTION_MODES.BOTH,
    stopLossMode: STOP_LOSS_MODES.OR_OPPOSITE,
    targetMode: TARGET_MODES.FIXED_RR_1_5,
    riskRewardRatio: 1.5,
    adxThreshold: 0,
    rvolThreshold: 0,
    maxTradesPerDay: 2
  },
  {
    id: 'EXP-FREQ-003',
    cohort: 'Daily Trade Frequency',
    variant: STRATEGY_VARIANTS.VARIANT_C,
    entryType: ENTRY_TYPES.BREAKOUT_CLOSE,
    direction: DIRECTION_MODES.BOTH,
    stopLossMode: STOP_LOSS_MODES.OR_OPPOSITE,
    targetMode: TARGET_MODES.FIXED_RR_1_5,
    riskRewardRatio: 1.5,
    adxThreshold: 0,
    rvolThreshold: 0,
    maxTradesPerDay: 3
  }
];

module.exports = {
  ACTIVE_STRATEGY_CONFIG,
  EMA_9_21_CROSSOVER_CONFIG,
  BASE_STRATEGY_TEMPLATE,
  VARIANT_A_CONFIG,
  VARIANT_B_CONFIG,
  VARIANT_C_CONFIG,
  VARIANT_D_CONFIG,
  VARIANT_E_CONFIG,
  PREDEFINED_STRATEGIES,
  PARAMETER_MATRIX_COHORTS
};

