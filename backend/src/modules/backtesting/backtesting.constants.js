/**
 * @file backtesting.constants.js
 * @description Constants, Enums, Fee Schedules, and Configuration Defaults for the Historical Backtesting Engine.
 */

const path = require('path');

const BACKTEST_STATUS = {
  PENDING: 'PENDING',
  RUNNING: 'RUNNING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED'
};

const EXIT_REASONS = {
  STOP_LOSS: 'STOP_LOSS',
  PROFIT_TARGET: 'PROFIT_TARGET',
  TRAILING_STOP: 'TRAILING_STOP',
  MAX_HOLDING_TIME: 'MAX_HOLDING_TIME',
  SQUARE_OFF: 'SQUARE_OFF',
  CIRCUIT_BREAKER: 'CIRCUIT_BREAKER',
  AMBIGUOUS_SAME_BAR: 'AMBIGUOUS_SAME_BAR',
  BEARISH_CROSSOVER: 'BEARISH_CROSSOVER'
};

const AMBIGUITY_RESOLUTIONS = {
  WORST_CASE_STOP: 'WORST_CASE_STOP', // Assume Stop Loss triggered first (conservative standard)
  AMBIGUOUS_SKIP: 'AMBIGUOUS_SKIP'     // Mark trade as ambiguous and exclude from directional P&L
};

const DEFAULT_SIMULATION_PARAMS = {
  DEFAULT_CAPITAL: 100000,
  DEFAULT_SLIPPAGE_BPS: 2.0, // 2 basis points (0.02% of price) per side
  DEFAULT_RISK_PER_TRADE_PCT: 0.5,
  DEFAULT_DAILY_MAX_LOSS_PCT: 1.0,
  DEFAULT_MAX_TRADES_PER_DAY: 2,
  DEFAULT_MAX_ACTIVE_POSITIONS: 1,
  DEFAULT_LEVERAGE: 1
};

/**
 * Historical & Current Statutory Fee Schedules for NSE Cash Equity Intraday
 * Primary Broker: Groww (https://groww.in/pricing)
 * Regulatory Authorities: SEBI, NSE, Ministry of Finance (Stamp Duty & STT)
 */
const FEE_SCHEDULES = {
  // Current Schedule (Effective June 21, 2025 to Present)
  // Reflects Groww minimum brokerage increase from Rs. 2 to Rs. 5 and NSE uniform transaction charge of 0.00297%
  CURRENT_POST_JUNE_2025: {
    effectiveFrom: '2025-06-21',
    effectiveTo: 'PRESENT',
    description: 'Groww Intraday (0.1% or max ₹20, min ₹5) + NSE Uniform Fee (0.00297%)',
    source: 'Groww Pricing Notice (21 June 2025 revision) & NSE Circular NSE/FA/64232',
    brokerageRate: 0.0010, // 0.1% of order value
    brokerageMaxPerOrder: 20.0, // Rs. 20 cap per executed order leg
    brokerageMinPerOrder: 5.0, // Minimum Rs. 5 floor per executed order leg
    brokerageMinPercentCap: 0.025, // 2.5% of trade value ceiling on min fee (SEBI limit)
    sttRateSell: 0.00025, // 0.025% on Sell side turnover
    sttRateBuy: 0.0, // 0% on Buy side for intraday
    stampDutyRateBuy: 0.00003, // 0.003% (Rs. 300/crore) on Buy side
    stampDutyRateSell: 0.0,
    exchangeTransactionRate: 0.0000297, // 0.00297% (Rs. 2.97/lakh) on both sides (NSE Circular FA64232)
    exchangeScheduleLabel: 'NSE_UNIFORM_CIRCULAR_FA64232',
    sebiTurnoverRate: 0.000001, // Rs. 10 per crore (0.0001%) on both sides
    ipftRate: 0.000001, // Investor Protection Fund: Rs. 10 per crore (0.0001%) on both sides
    gstRate: 0.18 // 18% GST on (Brokerage + Exchange + SEBI + IPFT)
  },

  // Intermediate Schedule (October 1, 2024 to June 20, 2025)
  // Reflects NSE revised uniform transaction charges of 0.00297% and Groww legacy minimum fee of Rs. 2
  INTERMEDIATE_POST_OCT_2024_PRE_JUNE_2025: {
    effectiveFrom: '2024-10-01',
    effectiveTo: '2025-06-20',
    description: 'Groww Intraday (0.1% or max ₹20, min ₹2) + NSE Revised Uniform Fee (0.00297%)',
    source: 'Groww Pricing Archive & NSE Circular NSE/FA/64232',
    brokerageRate: 0.0010, // 0.1%
    brokerageMaxPerOrder: 20.0,
    brokerageMinPerOrder: 2.0, // Legacy minimum Rs. 2 floor
    brokerageMinPercentCap: 0.025,
    sttRateSell: 0.00025,
    sttRateBuy: 0.0,
    stampDutyRateBuy: 0.00003,
    stampDutyRateSell: 0.0,
    exchangeTransactionRate: 0.0000297, // Uniform 0.00297%
    exchangeScheduleLabel: 'NSE_UNIFORM_CIRCULAR_FA64232',
    sebiTurnoverRate: 0.000001,
    ipftRate: 0.000001,
    gstRate: 0.18
  },

  // Historical Schedule (November 8, 2021 to September 30, 2024)
  // Reflects standard legacy retail pass-through baseline NSE cash equity transaction charge of 0.00325%
  HISTORICAL_PRE_OCT_2024: {
    effectiveFrom: '2021-11-08',
    effectiveTo: '2024-09-30',
    description: 'Groww Intraday (0.1% or max ₹20, min ₹2) + NSE Retail Baseline Pass-Through (0.00325%)',
    source: 'Groww Pricing Archive & NSE Historical Tier 1 Slab Schedule',
    brokerageRate: 0.0010, // 0.1%
    brokerageMaxPerOrder: 20.0,
    brokerageMinPerOrder: 2.0,
    brokerageMinPercentCap: 0.025,
    sttRateSell: 0.00025,
    sttRateBuy: 0.0,
    stampDutyRateBuy: 0.00003,
    stampDutyRateSell: 0.0,
    exchangeTransactionRate: 0.0000325, // 0.00325% (Rs. 3.25/lakh baseline retail pass-through)
    exchangeScheduleLabel: 'RETAIL_PASSTHROUGH_CONSERVATIVE (Tier 1 slab <= 1250 Cr)',
    sebiTurnoverRate: 0.000001,
    ipftRate: 0.000001,
    gstRate: 0.18
  }
};

const BACKTEST_STORAGE_PATHS = {
  BASE_STORAGE_DIR: path.resolve(__dirname, '../../../storage/backtesting'),
  RUNS_DIR: path.resolve(__dirname, '../../../storage/backtesting/runs'),
  DERIVED_INDICATORS_DIR: path.resolve(__dirname, '../../../storage/derived/indicators')
};

module.exports = {
  BACKTEST_STATUS,
  EXIT_REASONS,
  AMBIGUITY_RESOLUTIONS,
  DEFAULT_SIMULATION_PARAMS,
  FEE_SCHEDULES,
  BACKTEST_STORAGE_PATHS
};

