/**
 * @file strategy.schema.js
 * @description Zod validation schemas for Strategy Specifications and Configuration Presets.
 */

const { z } = require('zod');
const {
  STRATEGY_VARIANTS,
  DIRECTION_MODES,
  ENTRY_TYPES,
  STOP_LOSS_MODES,
  TARGET_MODES,
  SPECIAL_SESSION_MODES,
  GAP_THROUGH_STOP_MODES,
  DEFAULT_UNIVERSE,
  TIME_CONVENTIONS
} = require('./strategy.constants');

const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/;

/**
 * Opening Range Configuration Schema
 */
const OpeningRangeConfigSchema = z.object({
  startTime: z.string().regex(TIME_REGEX, 'startTime must be HH:MM:SS format').default(TIME_CONVENTIONS.OPENING_RANGE_START),
  endTime: z.string().regex(TIME_REGEX, 'endTime must be HH:MM:SS format').default(TIME_CONVENTIONS.OPENING_RANGE_END),
  candleInterval: z.enum(['5minute']).default('5minute'),
  expectedBars: z.number().int().min(1).max(12).default(3),
  minWidthPercent: z.number().nonnegative().default(0.1),
  maxWidthPercent: z.number().positive().default(3.5)
}).refine(
  (data) => data.startTime < data.endTime,
  { message: 'Opening range startTime must precede endTime', path: ['endTime'] }
).refine(
  (data) => data.minWidthPercent < data.maxWidthPercent,
  { message: 'minWidthPercent must be less than maxWidthPercent', path: ['maxWidthPercent'] }
);

/**
 * Technical Indicator Filters Schema
 */
const IndicatorFiltersSchema = z.object({
  adxThreshold: z.number().min(0).max(100).default(20),
  adxRequireRising: z.boolean().default(false),
  diDirectionalConfirm: z.boolean().default(true),
  rvolThreshold: z.number().min(0).max(20).default(1.2),
  choppinessMaxThreshold: z.number().min(0).max(100).optional().default(55),
  efficiencyRatioMin: z.number().min(0).max(1.0).optional().default(0.30),
  maxVwapCrossesInFirstHour: z.number().int().min(1).max(20).optional().default(4)
});

/**
 * Entry Execution Configuration Schema
 */
const EntryConfigSchema = z.object({
  entryType: z.enum([
    ENTRY_TYPES.BREAKOUT_CLOSE,
    ENTRY_TYPES.RETEST_CONFIRMATION
  ]).default(ENTRY_TYPES.BREAKOUT_CLOSE),
  direction: z.enum([
    DIRECTION_MODES.BOTH,
    DIRECTION_MODES.LONG_ONLY,
    DIRECTION_MODES.SHORT_ONLY
  ]).default(DIRECTION_MODES.BOTH),
  entryStartTime: z.string().regex(TIME_REGEX, 'entryStartTime must be HH:MM:SS format').default(TIME_CONVENTIONS.ENTRY_START_TIME),
  entryCutoffTime: z.string().regex(TIME_REGEX, 'entryCutoffTime must be HH:MM:SS format').default(TIME_CONVENTIONS.DEFAULT_ENTRY_CUTOFF),
  retestTolerancePercent: z.number().min(0).max(5).default(0.2),
  retestMaxBars: z.number().int().min(1).max(24).default(6),
  requireRetestConfirmationBar: z.boolean().default(true)
}).refine(
  (data) => data.entryStartTime <= data.entryCutoffTime,
  { message: 'entryStartTime must precede or equal entryCutoffTime', path: ['entryCutoffTime'] }
);

/**
 * Exit & Stop Loss Configuration Schema
 */
const ExitConfigSchema = z.object({
  stopLossMode: z.enum([
    STOP_LOSS_MODES.OR_OPPOSITE,
    STOP_LOSS_MODES.SWING_EXTREME,
    STOP_LOSS_MODES.ATR_BASED,
    STOP_LOSS_MODES.BREAKOUT_BAR_EXTREME
  ]).default(STOP_LOSS_MODES.OR_OPPOSITE),
  atrMultiplierSL: z.number().positive().max(10).default(1.5),
  swingLookbackBars: z.number().int().min(2).max(50).default(5),
  targetMode: z.enum([
    TARGET_MODES.FIXED_RR_1_5,
    TARGET_MODES.FIXED_RR_2_0,
    TARGET_MODES.TRAILING_ATR,
    TARGET_MODES.TRAILING_EMA20
  ]).default(TARGET_MODES.FIXED_RR_1_5),
  riskRewardRatio: z.number().positive().max(10).default(1.5),
  squareOffTime: z.string().regex(TIME_REGEX, 'squareOffTime must be HH:MM:SS format').default(TIME_CONVENTIONS.DEFAULT_SQUARE_OFF),
  maxHoldingDurationBars: z.number().int().min(1).max(75).default(36),
  gapThroughStopModel: z.enum([
    GAP_THROUGH_STOP_MODES.WORST_PRICE,
    GAP_THROUGH_STOP_MODES.STOP_PRICE
  ]).default(GAP_THROUGH_STOP_MODES.WORST_PRICE)
});

/**
 * Risk Management Configuration Schema
 */
const RiskConfigSchema = z.object({
  accountCapital: z.number().positive('accountCapital must be greater than 0').default(100000),
  riskPerTradePercent: z.number().positive().max(5, 'riskPerTradePercent cannot exceed 5%').default(0.5),
  dailyMaxLossPercent: z.number().positive().max(10, 'dailyMaxLossPercent cannot exceed 10%').default(1.0),
  maxTradesPerDay: z.number().int().min(1).max(10).default(2),
  maxActivePositionsPerStock: z.number().int().min(1).max(1).default(1),
  maxPortfolioExposurePercent: z.number().positive().max(500).default(100),
  leverageMultiplier: z.number().min(1).max(5).default(1)
}).refine(
  (data) => data.riskPerTradePercent <= data.dailyMaxLossPercent,
  { message: 'riskPerTradePercent cannot be greater than dailyMaxLossPercent', path: ['riskPerTradePercent'] }
);

/**
 * Master Strategy Specification Schema (Legacy ORB Schema)
 */
const LegacyStrategyConfigSchema = z.object({
  id: z.string().min(3).max(64),
  name: z.string().min(3).max(128),
  version: z.string().default('1.0.0'),
  description: z.string().min(5).max(512),
  variant: z.enum([
    STRATEGY_VARIANTS.VARIANT_A,
    STRATEGY_VARIANTS.VARIANT_B,
    STRATEGY_VARIANTS.VARIANT_C,
    STRATEGY_VARIANTS.VARIANT_D,
    STRATEGY_VARIANTS.VARIANT_E
  ]),
  universe: z.array(z.string().min(1)).min(1).default(DEFAULT_UNIVERSE),
  timeframe: z.enum(['5minute']).default('5minute'),
  timezone: z.enum(['Asia/Kolkata']).default('Asia/Kolkata'),
  openingRange: OpeningRangeConfigSchema.default({}),
  entry: EntryConfigSchema.default({}),
  exit: ExitConfigSchema.default({}),
  filters: IndicatorFiltersSchema.default({}),
  risk: RiskConfigSchema.default({}),
  specialSessions: z.enum([
    SPECIAL_SESSION_MODES.SUPPRESS_ALL,
    SPECIAL_SESSION_MODES.ALLOW_REGULAR_ONLY
  ]).default(SPECIAL_SESSION_MODES.SUPPRESS_ALL)
}).refine(
  (data) => data.openingRange.endTime <= data.entry.entryStartTime,
  { message: 'Opening range endTime must precede or equal entryStartTime', path: ['entry', 'entryStartTime'] }
).refine(
  (data) => data.entry.entryCutoffTime < data.exit.squareOffTime,
  { message: 'entryCutoffTime must precede squareOffTime', path: ['entry', 'entryCutoffTime'] }
);

/**
 * EMA 9/21 Crossover Strategy Configuration Schema (Single Active Strategy)
 */
const EMA921StrategySchema = z.object({
  id: z.literal('ema_9_21_crossover'),
  name: z.string().default('EMA 9/21 Crossover'),
  version: z.string().default('1.0.0'),
  description: z.string().default('Intraday trend-following strategy buying when EMA 9 crosses above EMA 21 and closing when EMA 9 crosses below EMA 21. Long-only, no short positions, no stop loss, fixed share quantity.'),
  strategyId: z.literal('ema_9_21_crossover').default('ema_9_21_crossover'),
  variant: z.literal('EMA_9_21_CROSSOVER'),
  timeframe: z.enum(['5minute']).default('5minute'),
  timezone: z.enum(['Asia/Kolkata']).default('Asia/Kolkata'),
  universe: z.array(z.string().min(1)).min(1).default(DEFAULT_UNIVERSE),
  fastPeriod: z.number().int().min(2).max(50).default(9),
  slowPeriod: z.number().int().min(2).max(200).default(21),
  fastColor: z.string().default('#00C853'),
  slowColor: z.string().default('#FF0000'),
  direction: z.literal('LONG_ONLY').default('LONG_ONLY'),
  fixedQuantity: z.number().int().positive().default(1),
  capital: z.number().positive().default(100000),
  squareOffTime: z.string().regex(TIME_REGEX, 'squareOffTime must be HH:MM:SS format').default('15:15:00'),
  entryCutoffTime: z.string().regex(TIME_REGEX, 'entryCutoffTime must be HH:MM:SS format').default('15:00:00')
}).refine(
  (data) => data.fastPeriod < data.slowPeriod,
  { message: 'fastPeriod must be less than slowPeriod', path: ['slowPeriod'] }
).refine(
  (data) => data.entryCutoffTime < data.squareOffTime,
  { message: 'entryCutoffTime must precede squareOffTime', path: ['entryCutoffTime'] }
);

// StrategyConfigSchema is the unified validator (evaluates Legacy first if variant is known or EMA 9/21)
const StrategyConfigSchema = z.union([LegacyStrategyConfigSchema, EMA921StrategySchema]);

/**
 * Position Size Calculation Parameter Schema
 */
const PositionSizeParamsSchema = z.object({
  capital: z.number().positive('Capital must be positive'),
  riskPercent: z.number().positive().max(10, 'Risk percent must be <= 10%'),
  entryPrice: z.number().positive('Entry price must be positive'),
  stopLossPrice: z.number().positive('Stop loss price must be positive'),
  leverage: z.number().min(1).max(5).default(1)
}).refine(
  (data) => Math.abs(data.entryPrice - data.stopLossPrice) > 0,
  { message: 'Entry price and stop loss price cannot be equal', path: ['stopLossPrice'] }
);

module.exports = {
  OpeningRangeConfigSchema,
  IndicatorFiltersSchema,
  EntryConfigSchema,
  ExitConfigSchema,
  RiskConfigSchema,
  StrategyConfigSchema,
  LegacyStrategyConfigSchema,
  EMA921StrategySchema,
  PositionSizeParamsSchema
};

