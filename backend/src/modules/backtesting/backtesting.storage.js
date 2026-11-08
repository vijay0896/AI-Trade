/**
 * @file backtesting.storage.js
 * @description Local file storage and indexing manager for historical backtest run outputs.
 */

const fs = require('fs');
const path = require('path');
const { BACKTEST_STORAGE_PATHS } = require('./backtesting.constants');

class BacktestStorageManager {
  /**
   * Persist complete backtest run results to partitioned disk storage
   * @param {Object} runResult Result object returned by BacktestEngine.run()
   * @returns {string} Directory path where results were saved
   */
  static saveRun(runResult) {
    const { runMetadata, strategyConfig, metrics, trades, dailyPerformance, excludedSessions } = runResult;
    const runId = runMetadata.runId;
    const runDir = path.join(BACKTEST_STORAGE_PATHS.RUNS_DIR, runId);

    if (!fs.existsSync(runDir)) {
      fs.mkdirSync(runDir, { recursive: true });
    }

    // 1. Save config.json
    fs.writeFileSync(
      path.join(runDir, 'config.json'),
      JSON.stringify(strategyConfig, null, 2),
      'utf-8'
    );

    // 2. Save run_metadata.json
    fs.writeFileSync(
      path.join(runDir, 'run_metadata.json'),
      JSON.stringify(runMetadata, null, 2),
      'utf-8'
    );

    // 3. Save summary.json
    fs.writeFileSync(
      path.join(runDir, 'summary.json'),
      JSON.stringify(metrics, null, 2),
      'utf-8'
    );

    // 4. Save trades.csv
    this.saveTradesCsv(path.join(runDir, 'trades.csv'), trades);

    // 5. Save equity_curve.csv
    this.saveEquityCurveCsv(path.join(runDir, 'equity_curve.csv'), dailyPerformance);

    // 6. Save excluded_sessions.csv
    this.saveExcludedSessionsCsv(path.join(runDir, 'excluded_sessions.csv'), excludedSessions);

    // 7. Update master runs index
    this.updateRunsIndex(runMetadata, metrics);

    return runDir;
  }

  /**
   * Write trades to CSV
   */
  static saveTradesCsv(filePath, trades) {
    const headers = [
      'tradeId',
      'symbol',
      'side',
      'entryTimestamp',
      'exitTimestamp',
      'nominalEntryPrice',
      'entryPrice',
      'nominalExitPrice',
      'exitPrice',
      'quantity',
      'positionValue',
      'initialStopLoss',
      'targetPrice',
      'exitReason',
      'barsHeld',
      'theoreticalGrossPnL',
      'entrySlippageCost',
      'exitSlippageCost',
      'totalSlippageCost',
      'grossPnL',
      'brokerage',
      'stt',
      'stampDuty',
      'exchangeCharges',
      'sebiCharges',
      'ipftCharges',
      'statutoryCharges',
      'gst',
      'totalCharges',
      'netPnL',
      'isAmbiguous'
    ];

    const rows = [headers.join(',')];
    for (const t of trades) {
      rows.push([
        t.tradeId,
        t.symbol,
        t.side,
        t.entryTimestamp,
        t.exitTimestamp,
        t.nominalEntryPrice,
        t.entryPrice,
        t.nominalExitPrice,
        t.exitPrice,
        t.quantity,
        t.positionValue,
        t.initialStopLoss,
        t.targetPrice,
        t.exitReason,
        t.barsHeld,
        t.theoreticalGrossPnL !== undefined ? t.theoreticalGrossPnL : t.grossPnL,
        t.entrySlippageCost,
        t.exitSlippageCost,
        t.totalSlippageCost !== undefined ? t.totalSlippageCost : (Number(t.entrySlippageCost || 0) + Number(t.exitSlippageCost || 0)),
        t.grossPnL,
        t.brokerage,
        t.stt !== undefined ? t.stt : 0,
        t.stampDuty !== undefined ? t.stampDuty : 0,
        t.exchangeCharges !== undefined ? t.exchangeCharges : 0,
        t.sebiCharges !== undefined ? t.sebiCharges : 0,
        t.ipftCharges !== undefined ? t.ipftCharges : 0,
        t.statutoryCharges,
        t.gst,
        t.totalCharges,
        t.netPnL,
        t.isAmbiguous
      ].join(','));
    }

    fs.writeFileSync(filePath, rows.join('\n'), 'utf-8');
  }

  /**
   * Write daily equity curve to CSV
   */
  static saveEquityCurveCsv(filePath, dailyRecords) {
    const headers = ['date', 'startingCapital', 'endingCapital', 'dailyRealizedPnL', 'tradesCount', 'isCircuitBreakerTripped'];
    const rows = [headers.join(',')];
    for (const d of dailyRecords) {
      rows.push([
        d.date,
        d.startingCapital,
        d.endingCapital,
        d.dailyRealizedPnL,
        d.tradesCount,
        d.isCircuitBreakerTripped
      ].join(','));
    }
    fs.writeFileSync(filePath, rows.join('\n'), 'utf-8');
  }

  /**
   * Write excluded sessions to CSV
   */
  static saveExcludedSessionsCsv(filePath, excluded) {
    const headers = ['date', 'symbol', 'reason', 'candlesCount', 'orWidthPercent'];
    const rows = [headers.join(',')];
    for (const e of excluded) {
      rows.push([
        e.date,
        e.symbol,
        e.reason,
        e.candlesCount || '',
        e.orWidthPercent || ''
      ].join(','));
    }
    fs.writeFileSync(filePath, rows.join('\n'), 'utf-8');
  }

  /**
   * Update master runs index JSON file with canonical classification and reconciliation metrics
   */
  static updateRunsIndex(meta, metrics) {
    const indexPath = path.join(BACKTEST_STORAGE_PATHS.RUNS_DIR, 'runs_index.json');
    let index = [];
    if (fs.existsSync(indexPath)) {
      try {
        index = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
      } catch (err) {
        index = [];
      }
    }

    // Remove existing entry with exact same runId if present
    index = index.filter(item => item.runId !== meta.runId);

    // Any existing entry for the same (symbol, variant, direction) is marked as non-canonical
    for (const item of index) {
      if (item.symbol === meta.symbol && item.variant === meta.variant && item.direction === meta.direction) {
        item.isCanonical = false;
        item.runType = item.runType === 'CANONICAL' ? 'SUPERSEDED' : (item.runType || 'SUPERSEDED');
      }
    }

    index.unshift({
      runId: meta.runId,
      symbol: meta.symbol,
      variant: meta.variant,
      direction: meta.direction,
      isCanonical: true,
      runType: 'CANONICAL',
      startDate: meta.startDate,
      endDate: meta.endDate,
      totalTrades: metrics.tradingPerformance.totalTrades,
      winRate: metrics.tradingPerformance.winRate,
      theoreticalGrossPnL: metrics.overview.theoreticalGrossPnL !== undefined ? metrics.overview.theoreticalGrossPnL : null,
      slippageCost: metrics.overview.slippageCost !== undefined ? metrics.overview.slippageCost : null,
      grossRealizedPnL: metrics.overview.grossRealizedPnL !== undefined ? metrics.overview.grossRealizedPnL : metrics.overview.grossPnL,
      totalCharges: metrics.overview.totalCharges,
      brokerage: metrics.overview.brokerage,
      statutoryCharges: metrics.overview.statutoryCharges,
      gst: metrics.overview.gst,
      netPnL: metrics.overview.netPnL,
      netReturnPercent: metrics.overview.netReturnPercent,
      maxDrawdownPercent: metrics.riskPerformance.maxDrawdownPercent,
      profitFactor: metrics.tradingPerformance.profitFactor,
      executedAt: meta.executedAt
    });

    fs.writeFileSync(indexPath, JSON.stringify(index, null, 2), 'utf-8');
  }

  /**
   * Get all past runs from index
   * @returns {Array<Object>}
   */
  static getPastRuns() {
    const indexPath = path.join(BACKTEST_STORAGE_PATHS.RUNS_DIR, 'runs_index.json');
    if (!fs.existsSync(indexPath)) return [];
    try {
      return JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
    } catch {
      return [];
    }
  }

  /**
   * Load single run details
   * @param {string} runId
   * @returns {Object|null}
   */
  static loadRunDetails(runId) {
    const runDir = path.join(BACKTEST_STORAGE_PATHS.RUNS_DIR, runId);
    if (!fs.existsSync(runDir)) return null;

    try {
      const meta = JSON.parse(fs.readFileSync(path.join(runDir, 'run_metadata.json'), 'utf-8'));
      const summary = JSON.parse(fs.readFileSync(path.join(runDir, 'summary.json'), 'utf-8'));
      const config = JSON.parse(fs.readFileSync(path.join(runDir, 'config.json'), 'utf-8'));
      return { runMetadata: meta, summary, config };
    } catch {
      return null;
    }
  }

  /**
   * Load trades for a run
   * @param {string} runId
   * @returns {Array<Object>|null}
   */
  static loadRunTrades(runId) {
    const tradesPath = path.join(BACKTEST_STORAGE_PATHS.RUNS_DIR, runId, 'trades.csv');
    if (!fs.existsSync(tradesPath)) return null;

    const content = fs.readFileSync(tradesPath, 'utf-8');
    const lines = content.split('\n').filter(l => l.trim().length > 0);
    if (lines.length <= 1) return [];

    const headers = lines[0].split(',');
    const trades = [];
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(',');
      const item = {};
      for (let h = 0; h < headers.length; h++) {
        item[headers[h]] = parts[h];
      }
      trades.push(item);
    }
    return trades;
  }
}

module.exports = BacktestStorageManager;

