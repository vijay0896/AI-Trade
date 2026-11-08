/**
 * @file backtesting.schema.js
 * @description Zod Validation Schemas for Backtest Execution Requests and Options.
 */

const { z } = require('zod');
const { DEFAULT_UNIVERSE } = require('../strategy/strategy.constants');
const { STRATEGY_VARIANTS, DIRECTION_MODES } = require('../strategy/strategy.constants');

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const BacktestRunRequestSchema = z.object({
  symbol: z.enum(DEFAULT_UNIVERSE, {
    errorMap: () => ({ message: `symbol must be one of: ${DEFAULT_UNIVERSE.join(', ')}` })
  }),
  variant: z.enum([
    STRATEGY_VARIANTS.VARIANT_A,
    STRATEGY_VARIANTS.VARIANT_B,
    STRATEGY_VARIANTS.VARIANT_C,
    STRATEGY_VARIANTS.VARIANT_D,
    STRATEGY_VARIANTS.VARIANT_E
  ]).default(STRATEGY_VARIANTS.VARIANT_A),
  capital: z.number().positive('capital must be greater than zero').default(100000),
  slippageBps: z.number().min(0, 'slippageBps cannot be negative').default(2.0),
  direction: z.enum([
    DIRECTION_MODES.BOTH,
    DIRECTION_MODES.LONG_ONLY,
    DIRECTION_MODES.SHORT_ONLY
  ]).default(DIRECTION_MODES.BOTH),
  startDate: z.string().regex(DATE_REGEX, 'startDate must be YYYY-MM-DD format').optional(),
  endDate: z.string().regex(DATE_REGEX, 'endDate must be YYYY-MM-DD format').optional(),
  saveResults: z.boolean().default(true),
  customConfig: z.record(z.any()).optional()
}).refine(
  (data) => !data.startDate || !data.endDate || data.startDate <= data.endDate,
  { message: 'startDate must precede or equal endDate', path: ['endDate'] }
);

module.exports = {
  BacktestRunRequestSchema
};

