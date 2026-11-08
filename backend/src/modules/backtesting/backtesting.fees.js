/**
 * @file backtesting.fees.js
 * @description Groww & NSE Statutory Transaction Cost Calculation Engine for Cash Equity Intraday.
 */

const { FEE_SCHEDULES } = require('./backtesting.constants');

class BacktestFeeEngine {
  /**
   * Resolve appropriate fee schedule based on simulated trade date
   * @param {string} dateStr ISO date string or timestamp
   * @param {Object} [customSchedule] Optional override
   * @returns {Object}
   */
  static resolveFeeSchedule(dateStr, customSchedule = null) {
    if (customSchedule) {
      return customSchedule;
    }

    if (!dateStr) {
      return FEE_SCHEDULES.CURRENT_POST_OCT_2024;
    }

    const dateOnly = String(dateStr).split('T')[0];
    if (dateOnly >= '2024-10-01') {
      return FEE_SCHEDULES.CURRENT_POST_OCT_2024;
    }
    return FEE_SCHEDULES.HISTORICAL_PRE_OCT_2024;
  }

  /**
   * Calculate complete itemized transaction costs for an intraday trade
   * @param {Object} params
   * @param {'LONG'|'SHORT'} params.side
   * @param {number} params.quantity
   * @param {number} params.entryPrice
   * @param {number} params.exitPrice
   * @param {string} params.entryTimestamp
   * @param {string} params.exitTimestamp
   * @param {Object} [params.customSchedule]
   * @returns {Object}
   */
  static calculateTradeCosts(params) {
    const {
      side,
      quantity,
      entryPrice,
      exitPrice,
      entryTimestamp,
      exitTimestamp,
      customSchedule = null
    } = params;

    const schedule = this.resolveFeeSchedule(entryTimestamp || exitTimestamp, customSchedule);
    const qty = Math.floor(quantity);

    const entryTurnover = entryPrice * qty;
    const exitTurnover = exitPrice * qty;
    const totalTurnover = entryTurnover + exitTurnover;

    // 1. Entry Leg Calculations
    const entryBrokerage = Math.min(schedule.brokerageMaxPerOrder, entryTurnover * schedule.brokerageRate);
    const entryExchange = entryTurnover * schedule.exchangeTransactionRate;
    const entrySEBI = entryTurnover * schedule.sebiTurnoverRate;
    const entryIPFT = entryTurnover * schedule.ipftRate;
    
    // For Long: Entry is Buy; for Short: Entry is Sell
    const entrySTT = side === 'LONG' 
      ? entryTurnover * schedule.sttRateBuy 
      : entryTurnover * schedule.sttRateSell;
    const entryStampDuty = side === 'LONG'
      ? entryTurnover * schedule.stampDutyRateBuy
      : entryTurnover * schedule.stampDutyRateSell;

    const entryGstTaxable = entryBrokerage + entryExchange + entrySEBI + entryIPFT;
    const entryGST = entryGstTaxable * schedule.gstRate;
    const entryTotalFees = entryBrokerage + entrySTT + entryStampDuty + entryExchange + entrySEBI + entryIPFT + entryGST;

    // 2. Exit Leg Calculations
    const exitBrokerage = Math.min(schedule.brokerageMaxPerOrder, exitTurnover * schedule.brokerageRate);
    const exitExchange = exitTurnover * schedule.exchangeTransactionRate;
    const exitSEBI = exitTurnover * schedule.sebiTurnoverRate;
    const exitIPFT = exitTurnover * schedule.ipftRate;

    // For Long: Exit is Sell; for Short: Exit is Buy (Cover)
    const exitSTT = side === 'LONG'
      ? exitTurnover * schedule.sttRateSell
      : exitTurnover * schedule.sttRateBuy;
    const exitStampDuty = side === 'LONG'
      ? exitTurnover * schedule.stampDutyRateSell
      : exitTurnover * schedule.stampDutyRateBuy;

    const exitGstTaxable = exitBrokerage + exitExchange + exitSEBI + exitIPFT;
    const exitGST = exitGstTaxable * schedule.gstRate;
    const exitTotalFees = exitBrokerage + exitSTT + exitStampDuty + exitExchange + exitSEBI + exitIPFT + exitGST;

    // 3. Consolidated Totals
    const totalBrokerage = entryBrokerage + exitBrokerage;
    const totalSTT = entrySTT + exitSTT;
    const totalStampDuty = entryStampDuty + exitStampDuty;
    const totalExchange = entryExchange + exitExchange;
    const totalSEBI = entrySEBI + exitSEBI;
    const totalIPFT = entryIPFT + exitIPFT;
    const totalStatutory = totalSTT + totalStampDuty + totalExchange + totalSEBI + totalIPFT;
    const totalGST = entryGST + exitGST;
    const totalCharges = totalBrokerage + totalStatutory + totalGST;

    return {
      scheduleUsed: schedule.description,
      effectiveScheduleDate: schedule.effectiveFrom,
      entryTurnover: Number(entryTurnover.toFixed(2)),
      exitTurnover: Number(exitTurnover.toFixed(2)),
      totalTurnover: Number(totalTurnover.toFixed(2)),
      brokerage: Number(totalBrokerage.toFixed(2)),
      stt: Number(totalSTT.toFixed(2)),
      stampDuty: Number(totalStampDuty.toFixed(2)),
      exchangeCharges: Number(totalExchange.toFixed(2)),
      sebiCharges: Number(totalSEBI.toFixed(4)),
      ipftCharges: Number(totalIPFT.toFixed(4)),
      statutoryCharges: Number(totalStatutory.toFixed(2)),
      gst: Number(totalGST.toFixed(2)),
      totalCharges: Number(totalCharges.toFixed(2)),
      chargesPercentOfTurnover: Number(((totalCharges / totalTurnover) * 100).toFixed(4)),
      entryLeg: {
        turnover: Number(entryTurnover.toFixed(2)),
        brokerage: Number(entryBrokerage.toFixed(2)),
        stt: Number(entrySTT.toFixed(2)),
        stampDuty: Number(entryStampDuty.toFixed(2)),
        exchange: Number(entryExchange.toFixed(2)),
        gst: Number(entryGST.toFixed(2)),
        total: Number(entryTotalFees.toFixed(2))
      },
      exitLeg: {
        turnover: Number(exitTurnover.toFixed(2)),
        brokerage: Number(exitBrokerage.toFixed(2)),
        stt: Number(exitSTT.toFixed(2)),
        stampDuty: Number(exitStampDuty.toFixed(2)),
        exchange: Number(exitExchange.toFixed(2)),
        gst: Number(exitGST.toFixed(2)),
        total: Number(exitTotalFees.toFixed(2))
      }
    };
  }
}

module.exports = BacktestFeeEngine;
