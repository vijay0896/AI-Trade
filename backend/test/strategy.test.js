/**
 * @file strategy.test.js
 * @description Comprehensive Unit Test Suite for Strategy Specification, Configurations, and Risk Sizing.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  STRATEGY_VARIANTS,
  DIRECTION_MODES,
  ENTRY_TYPES,
  STOP_LOSS_MODES,
  TARGET_MODES,
  SPECIAL_SESSION_MODES,
  DEFAULT_UNIVERSE,
  REQUIRED_INDICATORS_BY_VARIANT
} = require('../src/modules/strategy/strategy.constants');
const {
  StrategyConfigSchema,
  OpeningRangeConfigSchema,
  RiskConfigSchema,
  PositionSizeParamsSchema
} = require('../src/modules/strategy/strategy.schema');
const {
  PREDEFINED_STRATEGIES,
  PARAMETER_MATRIX_COHORTS,
  VARIANT_A_CONFIG,
  VARIANT_B_CONFIG,
  VARIANT_C_CONFIG,
  VARIANT_D_CONFIG,
  VARIANT_E_CONFIG
} = require('../src/modules/strategy/strategy.config');
const StrategyService = require('../src/modules/strategy/strategy.service');

describe('Strategy Specification & Configuration Test Suite', () => {

  describe('Predefined Strategy Variants Integrity', () => {
    it('should have all five core strategy variants (A, B, C, D, E) defined and validated', () => {
      const keys = Object.keys(PREDEFINED_STRATEGIES);
      assert.equal(keys.length, 5);
      assert.ok(PREDEFINED_STRATEGIES[STRATEGY_VARIANTS.VARIANT_A]);
      assert.ok(PREDEFINED_STRATEGIES[STRATEGY_VARIANTS.VARIANT_B]);
      assert.ok(PREDEFINED_STRATEGIES[STRATEGY_VARIANTS.VARIANT_C]);
      assert.ok(PREDEFINED_STRATEGIES[STRATEGY_VARIANTS.VARIANT_D]);
      assert.ok(PREDEFINED_STRATEGIES[STRATEGY_VARIANTS.VARIANT_E]);
    });

    it('should verify Variant A (Basic ORB) requires no indicators', () => {
      assert.deepEqual(REQUIRED_INDICATORS_BY_VARIANT[STRATEGY_VARIANTS.VARIANT_A], []);
      assert.equal(VARIANT_A_CONFIG.variant, STRATEGY_VARIANTS.VARIANT_A);
    });

    it('should verify Variant B requires VWAP indicator', () => {
      assert.deepEqual(REQUIRED_INDICATORS_BY_VARIANT[STRATEGY_VARIANTS.VARIANT_B], ['vwap']);
    });

    it('should verify Variant C requires VWAP, EMA20 and EMA50', () => {
      assert.deepEqual(REQUIRED_INDICATORS_BY_VARIANT[STRATEGY_VARIANTS.VARIANT_C], ['vwap', 'ema20', 'ema50']);
    });

    it('should verify Variant D requires VWAP, EMA20, EMA50, ADX14, +DI14, -DI14', () => {
      assert.deepEqual(REQUIRED_INDICATORS_BY_VARIANT[STRATEGY_VARIANTS.VARIANT_D], [
        'vwap',
        'ema20',
        'ema50',
        'adx14',
        'plusDI14',
        'minusDI14'
      ]);
    });

    it('should verify Variant E requires full confirmation suite including RVOL and VolSMA', () => {
      assert.deepEqual(REQUIRED_INDICATORS_BY_VARIANT[STRATEGY_VARIANTS.VARIANT_E], [
        'vwap',
        'ema20',
        'ema50',
        'adx14',
        'plusDI14',
        'minusDI14',
        'volumeSma20',
        'rvol'
      ]);
      assert.equal(VARIANT_E_CONFIG.filters.rvolThreshold, 1.5);
      assert.equal(VARIANT_E_CONFIG.filters.adxThreshold, 25);
    });
  });

  describe('Zod Schema Validation & Invalidation Guards', () => {
    it('should reject a strategy configuration when riskPerTradePercent > dailyMaxLossPercent', () => {
      const invalidRisk = {
        accountCapital: 100000,
        riskPerTradePercent: 2.0,
        dailyMaxLossPercent: 1.0, // Invalid: per trade risk > daily max loss
        maxTradesPerDay: 2
      };

      const result = RiskConfigSchema.safeParse(invalidRisk);
      assert.equal(result.success, false);
      assert.match(result.error.issues[0].message, /riskPerTradePercent cannot be greater than dailyMaxLossPercent/i);
    });

    it('should reject opening range when startTime >= endTime', () => {
      const invalidRange = {
        startTime: '09:30:00',
        endTime: '09:15:00',
        candleInterval: '5minute'
      };

      const result = OpeningRangeConfigSchema.safeParse(invalidRange);
      assert.equal(result.success, false);
      assert.match(result.error.issues[0].message, /startTime must precede endTime/i);
    });

    it('should reject opening range when minWidthPercent >= maxWidthPercent', () => {
      const invalidWidth = {
        startTime: '09:15:00',
        endTime: '09:30:00',
        minWidthPercent: 2.5,
        maxWidthPercent: 1.0
      };

      const result = OpeningRangeConfigSchema.safeParse(invalidWidth);
      assert.equal(result.success, false);
      assert.match(result.error.issues[0].message, /minWidthPercent must be less than maxWidthPercent/i);
    });

    it('should reject strategy configuration when entryCutoffTime >= squareOffTime', () => {
      const invalidTimes = {
        ...VARIANT_C_CONFIG,
        id: 'INVALID-CONFIG-TIMES',
        entry: {
          ...VARIANT_C_CONFIG.entry,
          entryCutoffTime: '15:20:00' // Cutoff after or equal to squareOffTime (15:15:00)
        },
        exit: {
          ...VARIANT_C_CONFIG.exit,
          squareOffTime: '15:15:00'
        }
      };

      const result = StrategyConfigSchema.safeParse(invalidTimes);
      assert.equal(result.success, false);
      assert.match(result.error.issues[0].message, /entryCutoffTime must precede squareOffTime/i);
    });

    it('should reject strategy configuration with an unknown variant', () => {
      const invalidVariant = {
        ...VARIANT_A_CONFIG,
        id: 'INVALID-UNKNOWN-VAR',
        variant: 'UNKNOWN_SUPER_STRAT'
      };

      const result = StrategyConfigSchema.safeParse(invalidVariant);
      assert.equal(result.success, false);
    });

    it('should reject strategy configuration with an empty universe', () => {
      const emptyUniverse = {
        ...VARIANT_A_CONFIG,
        id: 'INVALID-EMPTY-UNI',
        universe: []
      };

      const result = StrategyConfigSchema.safeParse(emptyUniverse);
      assert.equal(result.success, false);
    });
  });

  describe('Position Sizing & Risk Allocation Mathematics', () => {
    it('should calculate exact position size with floor integer shares', () => {
      const result = StrategyService.calculatePositionSize({
        capital: 100000,
        riskPercent: 0.5, // Rs. 500 risk budget
        entryPrice: 1520.00,
        stopLossPrice: 1508.00, // Rs. 12.00 stop distance
        leverage: 1
      });

      assert.equal(result.capital, 100000);
      assert.equal(result.riskBudget, 500);
      assert.equal(result.stopDistance, 12);
      // 500 / 12 = 41.6667 -> floor = 41 shares
      assert.equal(result.quantity, 41);
      assert.equal(result.positionValue, 41 * 1520);
      assert.equal(result.isExecutable, true);
      assert.equal(result.executionWarning, null);
    });

    it('should enforce capital ceiling if risk-sized shares exceed available capital', () => {
      const result = StrategyService.calculatePositionSize({
        capital: 5000,
        riskPercent: 1.0, // Rs. 50 risk budget
        entryPrice: 1000.00,
        stopLossPrice: 999.50, // Rs. 0.50 stop distance -> 50 / 0.5 = 100 shares raw
        leverage: 1 // Max shares by capital = 5000 / 1000 = 5 shares
      });

      assert.equal(result.quantity, 5);
      assert.equal(result.positionValue, 5000);
      assert.equal(result.isExecutable, true);
    });

    it('should flag execution as non-executable if capital produces 0 shares', () => {
      const result = StrategyService.calculatePositionSize({
        capital: 1000,
        riskPercent: 0.5, // Rs. 5 risk budget
        entryPrice: 1500.00,
        stopLossPrice: 1480.00, // Rs. 20 stop distance -> 5 / 20 = 0.25 shares
        leverage: 1
      });

      assert.equal(result.quantity, 0);
      assert.equal(result.isExecutable, false);
      assert.notEqual(result.executionWarning, null);
    });

    it('should reject position sizing calculation when entryPrice equals stopLossPrice', () => {
      assert.throws(() => {
        StrategyService.calculatePositionSize({
          capital: 100000,
          riskPercent: 0.5,
          entryPrice: 1500,
          stopLossPrice: 1500 // Zero stop distance
        });
      }, /Entry price and stop loss price cannot be equal/i);
    });

    it('should reject negative capital or invalid risk percentage', () => {
      assert.throws(() => {
        StrategyService.calculatePositionSize({
          capital: -1000,
          riskPercent: 0.5,
          entryPrice: 1500,
          stopLossPrice: 1490
        });
      });
    });
  });

  describe('Strategy Service & Registry Querying', () => {
    it('should retrieve all 5 predefined strategy configurations via service', () => {
      const configs = StrategyService.getAllConfigs();
      assert.equal(configs.length, 5);
      const variants = configs.map(c => c.variant);
      assert.ok(variants.includes(STRATEGY_VARIANTS.VARIANT_A));
      assert.ok(variants.includes(STRATEGY_VARIANTS.VARIANT_E));
    });

    it('should retrieve a single configuration by variant key or ID', () => {
      const configA = StrategyService.getVariantConfig('VARIANT_A');
      assert.equal(configA.id, 'STRAT-ORB-VAR-A');

      const configE = StrategyService.getVariantConfig('STRAT-ORB-VAR-E');
      assert.equal(configE.variant, STRATEGY_VARIANTS.VARIANT_E);
    });

    it('should throw 404 AppError for non-existent strategy configuration', () => {
      assert.throws(() => {
        StrategyService.getVariantConfig('NON_EXISTENT_STRAT');
      }, /Strategy configuration not found/i);
    });

    it('should validate custom strategy configuration payload', () => {
      const validCustom = {
        ...VARIANT_B_CONFIG,
        id: 'CUSTOM-ORB-TEST-001',
        name: 'Custom Test Strategy'
      };

      const result = StrategyService.validateCustomConfig(validCustom);
      assert.equal(result.isValid, true);
      assert.equal(result.validatedConfig.id, 'CUSTOM-ORB-TEST-001');
      assert.deepEqual(result.requiredIndicators, ['vwap']);
    });
  });

  describe('Systematic Parameter Matrix & Experimental Cohorts', () => {
    it('should have properly structured experimental parameter cohorts', () => {
      const matrix = StrategyService.getParameterMatrix();
      assert.ok(matrix.totalExperiments >= 18);
      assert.ok(matrix.cohortCount >= 5);
      assert.ok(matrix.cohorts['Execution Mechanics']);
      assert.ok(matrix.cohorts['Directional Bias']);
      assert.ok(matrix.cohorts['ADX Filter Sensitivity']);
      assert.ok(matrix.cohorts['Volume Surge Sensitivity']);
      assert.ok(matrix.cohorts['Stop Loss Geometry']);
      assert.ok(matrix.cohorts['Risk/Reward Targets']);
      assert.ok(matrix.cohorts['Daily Trade Frequency']);
    });

    it('should ensure all cohort experiments have unique IDs and valid variants', () => {
      const ids = new Set();
      for (const exp of PARAMETER_MATRIX_COHORTS) {
        assert.ok(!ids.has(exp.id), `Duplicate experiment ID: ${exp.id}`);
        ids.add(exp.id);
        assert.ok(Object.values(STRATEGY_VARIANTS).includes(exp.variant));
      }
    });
  });
});

