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
  AMBIGUOUS_SAME_BAR: 'AMBIGUOUS_SAME_BAR'
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
  // Current Schedule (Effective October 1, 2024 to Present)
  // Reflects NSE revised uniform transaction charges of 0.00297%
  CURRENT_POST_OCT_2024: {
    effectiveFrom: '2024-10-01',
    effectiveTo: 'PRESENT',
    description: 'Groww Intraday + NSE Uniform Exchange Fee (Post-Oct 2024)',
    source: 'https://groww.in/pricing & NSE Circular NSE/INVG/64010',
    brokerageRate: 0.0005, // 0.05%
    brokerageMaxPerOrder: 20.0, // Flat Rs. 20 cap per executed order
    sttRateSell: 0.00025, // 0.025% on Sell side turnover
    sttRateBuy: 0.0, // 0% on Buy side for intraday
    stampDutyRateBuy: 0.00003, // 0.003% (Rs. 300/crore) on Buy side
    stampDutyRateSell: 0.0,
    exchangeTransactionRate: 0.0000297, // 0.00297% on both sides
    sebiTurnoverRate: 0.000001, // Rs. 10 per crore (0.0001%) on both sides
    ipftRate: 0.000001, // Investor Protection Fund: Rs. 10 per crore on both sides
    gstRate: 0.18 // 18% GST on (Brokerage + Exchange + SEBI + IPFT)
  },

  // Historical Schedule (November 2021 to September 30, 2024)
  // Reflects standard legacy NSE cash equity transaction charge of 0.00325%
  HISTORICAL_PRE_OCT_2024: {
    effectiveFrom: '2021-11-08',
    effectiveTo: '2024-09-30',
    description: 'Groww Intraday + Standard NSE Tiered/Baseline Fee (Pre-Oct 2024)',
    source: 'NSE Circular Historical Master Schedule',
    brokerageRate: 0.0005,
    brokerageMaxPerOrder: 20.0,
    sttRateSell: 0.00025,
    sttRateBuy: 0.0,
    stampDutyRateBuy: 0.00003,
    stampDutyRateSell: 0.0,
    exchangeTransactionRate: 0.0000325, // 0.00325% on both sides
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

