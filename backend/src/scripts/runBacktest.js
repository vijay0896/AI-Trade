#!/usr/bin/env node

/**
 * @file runBacktest.js
 * @description Standalone CLI runner for historical backtests on 5-minute NSE candles.
 * 
 * Usage:
 *   node src/scripts/runBacktest.js --symbol ICICIBANK --variant A_BASIC_ORB
 *   node src/scripts/runBacktest.js --symbol ALL --variant A_BASIC_ORB
 *   node src/scripts/runBacktest.js --batch
 */

const BacktestService = require('../modules/backtesting/backtesting.service');
const { DEFAULT_UNIVERSE, STRATEGY_VARIANTS } = require('../modules/strategy/strategy.constants');
const logger = require('../config/logger');

function parseArgs() {
  const args = process.argv.slice(2);
  const params = {
    symbol: 'ICICIBANK',
    variant: STRATEGY_VARIANTS.VARIANT_A,
    capital: 100000,
    slippageBps: 2.0,
    direction: 'BOTH',
    batch: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--symbol' && args[i + 1]) {
      params.symbol = args[++i].trim().toUpperCase();
    } else if (arg === '--variant' && args[i + 1]) {
      params.variant = args[++i].trim();
    } else if (arg === '--capital' && args[i + 1]) {
      params.capital = parseFloat(args[++i]);
    } else if (arg === '--slippage' && args[i + 1]) {
      params.slippageBps = parseFloat(args[++i]);
    } else if (arg === '--direction' && args[i + 1]) {
      params.direction = args[++i].trim().toUpperCase();
    } else if (arg === '--start-date' && args[i + 1]) {
      params.startDate = args[++i].trim();
    } else if (arg === '--end-date' && args[i + 1]) {
      params.endDate = args[++i].trim();
    } else if (arg === '--batch') {
      params.batch = true;
    }
  }

  return params;
}

async function main() {
  const args = parseArgs();
  console.log('\n===============================================================');
  console.log('       AI TRADING SYSTEM — HISTORICAL BACKTESTING CLI          ');
  console.log('===============================================================\n');

  try {
    if (args.batch) {
      console.log('Executing Full Batch Evaluation Across 5 Stocks and 5 Variants...\n');
      const allVariants = Object.values(STRATEGY_VARIANTS);
      const batchResult = await BacktestService.runBatchEvaluation({
        symbols: DEFAULT_UNIVERSE,
        variants: allVariants,
        capital: args.capital,
        slippageBps: args.slippageBps,
        direction: args.direction
      });

      console.log('\n---------------------------------------------------------------');
      console.log(` Batch Execution Completed: ${batchResult.totalRuns} runs in ${(batchResult.elapsedMs / 1000).toFixed(2)}s`);
      console.log('---------------------------------------------------------------\n');
      console.table(batchResult.results);
      return;
    }

    const symbolsToRun = args.symbol === 'ALL' ? DEFAULT_UNIVERSE : [args.symbol];
    const variantsToRun = args.variant === 'ALL' ? Object.values(STRATEGY_VARIANTS) : [args.variant];

    for (const sym of symbolsToRun) {
      for (const v of variantsToRun) {
        console.log(`\n>>> Running Backtest: ${sym} | Variant: ${v} | Direction: ${args.direction} ...`);
        const result = await BacktestService.runBacktest({
          symbol: sym,
          variant: v,
          capital: args.capital,
          slippageBps: args.slippageBps,
          direction: args.direction,
          startDate: args.startDate,
          endDate: args.endDate,
          saveResults: true
        });

        const m = result.metrics;
        console.log(`\n[Run Completed: ${result.runMetadata.runId}]`);
        console.log(`Runtime: ${(result.runMetadata.runtimeMs / 1000).toFixed(2)}s | Saved at: ${result.savedDirectory}`);
        console.log('\n--- PERFORMANCE SUMMARY ---');
        console.log(`Total Trades:       ${m.tradingPerformance.totalTrades}`);
        console.log(`Win Rate:           ${m.tradingPerformance.winRate}% (${m.tradingPerformance.winningTrades} W / ${m.tradingPerformance.losingTrades} L)`);
        console.log(`Gross P&L:          Rs. ${m.overview.grossPnL.toLocaleString('en-IN')}`);
        console.log(`Total Charges:      Rs. ${m.overview.totalCharges.toLocaleString('en-IN')} (Brokerage: ${m.overview.brokerage}, Statutory: ${m.overview.statutoryCharges}, GST: ${m.overview.gst})`);
        console.log(`Slippage Cost:      Rs. ${m.overview.slippageCost.toLocaleString('en-IN')}`);
        console.log(`Net Realized P&L:   Rs. ${m.overview.netPnL.toLocaleString('en-IN')} (${m.overview.netReturnPercent}%)`);
        console.log(`Profit Factor:      ${m.tradingPerformance.profitFactor}`);
        console.log(`Expectancy/Trade:   Rs. ${m.tradingPerformance.expectancy}`);
        console.log(`Max Drawdown:       Rs. ${m.riskPerformance.maxDrawdown} (${m.riskPerformance.maxDrawdownPercent}%)`);
        console.log(`Max Win Streak:     ${m.riskPerformance.maxConsecutiveWins} | Max Loss Streak: ${m.riskPerformance.maxConsecutiveLosses}`);

        if (result.trades.length > 0) {
          console.log('\n--- FIRST 3 TRADES SAMPLE ---');
          console.table(result.trades.slice(0, 3).map(t => ({
            ID: t.tradeId,
            Side: t.side,
            Entry: `${t.entryTimestamp} @ ${t.entryPrice}`,
            Exit: `${t.exitTimestamp} @ ${t.exitPrice}`,
            Reason: t.exitReason,
            NetPnL: t.netPnL,
            Charges: t.totalCharges
          })));
        }
      }
    }
  } catch (err) {
    logger.error(`Backtest CLI execution failed: ${err.message}`);
    console.error(`\nError: ${err.message}\n`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

