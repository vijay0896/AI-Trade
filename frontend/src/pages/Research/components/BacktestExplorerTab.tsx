import React, { useState, useMemo } from 'react';
import {
  FileText,
  TrendingUp,
  TrendingDown,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  Filter,
  Info,
} from 'lucide-react';
import {
  useGetBacktestRunsQuery,
  useGetBacktestRunDetailsQuery,
  useGetBacktestRunTradesQuery,
} from '../../../api/researchApi';
import type { BacktestTrade } from '../../../api/researchApi';

export const BacktestExplorerTab: React.FC = () => {
  const [selectedSymbol, setSelectedSymbol] = useState<string>('ALL');
  const [selectedVariant, setSelectedVariant] = useState<string>('ALL');
  const [selectedRunId, setSelectedRunId] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 10;

  const { data: runsData, isLoading: isRunsLoading } = useGetBacktestRunsQuery();
  const allRuns = runsData?.data?.runs || [];

  // Filter runs (prefer canonical runs)
  const canonicalRuns = useMemo(() => {
    return allRuns.filter((r) => r.isCanonical);
  }, [allRuns]);

  const filteredRuns = useMemo(() => {
    return canonicalRuns.filter((r) => {
      if (selectedSymbol !== 'ALL' && r.symbol !== selectedSymbol) return false;
      if (selectedVariant !== 'ALL' && r.variant !== selectedVariant) return false;
      return true;
    });
  }, [canonicalRuns, selectedSymbol, selectedVariant]);

  // Set initial selected run if none chosen
  React.useEffect(() => {
    if (!selectedRunId && filteredRuns.length > 0) {
      // Default to HDFCBANK Variant E or first run
      const hdfcE = filteredRuns.find(
        (r) => r.symbol === 'HDFCBANK' && r.variant === 'E_FULL_CONFIRMATION'
      );
      setSelectedRunId(hdfcE ? hdfcE.runId : filteredRuns[0].runId);
    }
  }, [filteredRuns, selectedRunId]);

  // Load selected run details & trades
  const { data: runDetailsData, isLoading: isDetailsLoading } = useGetBacktestRunDetailsQuery(
    selectedRunId,
    { skip: !selectedRunId }
  );

  const { data: runTradesData, isLoading: isTradesLoading } = useGetBacktestRunTradesQuery(
    selectedRunId,
    { skip: !selectedRunId }
  );

  const selectedRun = canonicalRuns.find((r) => r.runId === selectedRunId);
  const trades = runTradesData?.data?.trades || [];

  // Compute equity curve data points
  const equityPoints = useMemo(() => {
    let runningCapital = 100000;
    const points: Array<{ tradeNum: number; date: string; equity: number; netPnL: number; peak: number; ddPercent: number }> = [
      { tradeNum: 0, date: 'Start', equity: 100000, netPnL: 0, peak: 100000, ddPercent: 0 },
    ];
    let peak = 100000;

    trades.forEach((t, idx) => {
      const pnl = Number(t.netPnL) || 0;
      runningCapital += pnl;
      if (runningCapital > peak) peak = runningCapital;
      const dd = peak > 0 ? ((peak - runningCapital) / peak) * 100 : 0;
      points.push({
        tradeNum: idx + 1,
        date: t.exitTimestamp ? t.exitTimestamp.split('T')[0] : `T${idx + 1}`,
        equity: runningCapital,
        netPnL: pnl,
        peak,
        ddPercent: Number(dd.toFixed(2)),
      });
    });

    return points;
  }, [trades]);

  // Pagination
  const totalPages = Math.ceil(trades.length / pageSize) || 1;
  const paginatedTrades = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return trades.slice(start, start + pageSize);
  }, [trades, currentPage, pageSize]);

  return (
    <div className="space-y-6">
      {/* Run Selection & Filter Toolbar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Filter className="h-4 w-4 text-slate-500" />
            <label htmlFor="explorer-symbol" className="text-xs font-bold text-slate-800">
              Stock:
            </label>
            <select
              id="explorer-symbol"
              value={selectedSymbol}
              onChange={(e) => {
                setSelectedSymbol(e.target.value);
                setCurrentPage(1);
              }}
              className="text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="ALL">All Stocks</option>
              <option value="ICICIBANK">ICICIBANK</option>
              <option value="HDFCBANK">HDFCBANK</option>
              <option value="M&M">M&amp;M</option>
              <option value="AXISBANK">AXISBANK</option>
              <option value="BHARTIARTL">BHARTIARTL</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <label htmlFor="explorer-variant" className="text-xs font-bold text-slate-800">
              Variant:
            </label>
            <select
              id="explorer-variant"
              value={selectedVariant}
              onChange={(e) => {
                setSelectedVariant(e.target.value);
                setCurrentPage(1);
              }}
              className="text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="ALL">All Variants</option>
              <option value="A_BASIC_ORB">Variant A</option>
              <option value="B_ORB_VWAP">Variant B</option>
              <option value="C_ORB_VWAP_EMA">Variant C</option>
              <option value="D_ORB_VWAP_EMA_ADX">Variant D</option>
              <option value="E_FULL_CONFIRMATION">Variant E</option>
            </select>
          </div>
        </div>

        {/* Canonical Run Selector Dropdown */}
        <div className="flex items-center gap-2">
          <label htmlFor="run-select" className="text-xs font-bold text-slate-800 shrink-0">
            Select Run:
          </label>
          <select
            id="run-select"
            value={selectedRunId}
            onChange={(e) => {
              setSelectedRunId(e.target.value);
              setCurrentPage(1);
            }}
            className="text-xs font-mono font-medium bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 max-w-xs md:max-w-md truncate cursor-pointer"
          >
            {filteredRuns.map((r) => (
              <option key={r.runId} value={r.runId}>
                {r.symbol} &bull; {r.variant} &bull; Net: {r.netPnL >= 0 ? '+' : ''}₹{r.netPnL.toFixed(0)} ({r.totalTrades}t)
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Selected Run Details Summary Cards */}
      {selectedRun && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  {selectedRun.runId}
                </span>
                <span className="text-sm font-bold text-slate-900">
                  {selectedRun.symbol} &mdash; {selectedRun.variant}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Period: {selectedRun.startDate} to {selectedRun.endDate} &bull; Direction: {selectedRun.direction}
              </p>
            </div>

            <div className="text-right">
              <span
                className={`text-xl font-bold ${
                  selectedRun.netPnL > 0 ? 'text-emerald-700' : 'text-rose-700'
                }`}
              >
                {selectedRun.netPnL > 0 ? `+₹${selectedRun.netPnL.toFixed(2)}` : `₹${selectedRun.netPnL.toFixed(2)}`}
              </span>
              <span className="text-xs text-slate-500 block">
                Net Return: {selectedRun.netReturnPercent.toFixed(2)}%
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-4 text-xs">
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
              <span className="text-slate-500 block text-[10px] uppercase font-semibold">Total Trades</span>
              <span className="text-base font-bold text-slate-900">{selectedRun.totalTrades}</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
              <span className="text-slate-500 block text-[10px] uppercase font-semibold">Win Rate</span>
              <span className="text-base font-bold text-slate-900">{selectedRun.winRate}%</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
              <span className="text-slate-500 block text-[10px] uppercase font-semibold">Gross P&amp;L</span>
              <span className="text-base font-bold text-slate-900">₹{selectedRun.grossRealizedPnL.toFixed(1)}</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
              <span className="text-slate-500 block text-[10px] uppercase font-semibold">Slippage Drag</span>
              <span className="text-base font-bold text-slate-700">₹{selectedRun.slippageCost.toFixed(1)}</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
              <span className="text-slate-500 block text-[10px] uppercase font-semibold">Total Charges</span>
              <span className="text-base font-bold text-slate-700">₹{selectedRun.totalCharges.toFixed(1)}</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
              <span className="text-slate-500 block text-[10px] uppercase font-semibold">Profit Factor</span>
              <span className="text-base font-bold text-slate-900">{selectedRun.profitFactor.toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Equity Curve & Drawdown Interactive SVG Charts */}
      {equityPoints.length > 1 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Equity Curve SVG Chart */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Closed-Trade Cumulative Equity Trajectory (₹)
              </h4>
              <span className="text-[11px] font-medium text-slate-500">
                Start: ₹100,000 &bull; Final: ₹{equityPoints[equityPoints.length - 1].equity.toFixed(2)}
              </span>
            </div>

            {/* SVG Render */}
            <div className="h-48 w-full bg-slate-50 rounded-lg p-2 border border-slate-100 relative">
              {(() => {
                const equities = equityPoints.map((p) => p.equity);
                const minEq = Math.min(...equities) * 0.998;
                const maxEq = Math.max(...equities) * 1.002;
                const range = maxEq - minEq || 1;
                const width = 500;
                const height = 160;

                const polyPoints = equityPoints
                  .map((p, idx) => {
                    const x = (idx / (equityPoints.length - 1)) * width;
                    const y = height - ((p.equity - minEq) / range) * (height - 20) - 10;
                    return `${x},${y}`;
                  })
                  .join(' ');

                const baselineY = height - ((100000 - minEq) / range) * (height - 20) - 10;

                return (
                  <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
                    {/* Baseline Line ₹100,000 */}
                    <line
                      x1="0"
                      y1={baselineY}
                      x2={width}
                      y2={baselineY}
                      stroke="#94a3b8"
                      strokeDasharray="4 4"
                      strokeWidth="1"
                    />

                    {/* Stepped Equity Polyline */}
                    <polyline
                      fill="none"
                      stroke={selectedRun && selectedRun.netPnL >= 0 ? '#059669' : '#dc2626'}
                      strokeWidth="2.5"
                      points={polyPoints}
                    />

                    {/* Markers */}
                    {equityPoints.map((p, idx) => {
                      const x = (idx / (equityPoints.length - 1)) * width;
                      const y = height - ((p.equity - minEq) / range) * (height - 20) - 10;
                      return (
                        <circle
                          key={idx}
                          cx={x}
                          cy={y}
                          r="3"
                          className={`${
                            p.equity >= 100000 ? 'fill-emerald-600' : 'fill-rose-600'
                          } hover:r-5 transition-all`}
                        >
                          <title>
                            Trade #{p.tradeNum}: ₹{p.equity.toFixed(2)} ({p.date})
                          </title>
                        </circle>
                      );
                    })}
                  </svg>
                );
              })()}
            </div>
          </div>

          {/* Drawdown SVG Chart */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Underwater Drawdown Trajectory (%)
              </h4>
              <span className="text-[11px] font-medium text-slate-500">
                Max DD: {selectedRun?.maxDrawdownPercent.toFixed(2)}%
              </span>
            </div>

            {/* SVG Render */}
            <div className="h-48 w-full bg-slate-50 rounded-lg p-2 border border-slate-100 relative">
              {(() => {
                const maxDD = Math.max(...equityPoints.map((p) => p.ddPercent), 0.5) * 1.1;
                const width = 500;
                const height = 160;

                const polyPoints = equityPoints
                  .map((p, idx) => {
                    const x = (idx / (equityPoints.length - 1)) * width;
                    const y = 10 + (p.ddPercent / maxDD) * (height - 20);
                    return `${x},${y}`;
                  })
                  .join(' ');

                return (
                  <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
                    {/* Zero Drawdown line */}
                    <line x1="0" y1="10" x2={width} y2="10" stroke="#94a3b8" strokeWidth="1" />

                    {/* Area fill */}
                    <polygon
                      points={`0,10 ${polyPoints} ${width},10`}
                      fill="#fee2e2"
                      opacity="0.6"
                    />

                    {/* Drawdown line */}
                    <polyline fill="none" stroke="#dc2626" strokeWidth="2" points={polyPoints} />

                    {/* Markers */}
                    {equityPoints.map((p, idx) => {
                      const x = (idx / (equityPoints.length - 1)) * width;
                      const y = 10 + (p.ddPercent / maxDD) * (height - 20);
                      return (
                        <circle key={idx} cx={x} cy={y} r="2.5" fill="#dc2626">
                          <title>
                            Trade #{p.tradeNum}: -{p.ddPercent}% ({p.date})
                          </title>
                        </circle>
                      );
                    })}
                  </svg>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Trade Journal Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Trade-by-Trade Execution Journal ({trades.length} Total Trades)
            </h3>
            <p className="text-xs text-slate-500">
              Entry and exit timestamps, filled execution prices, slippage cost, and transaction fees.
            </p>
          </div>
        </div>

        {isTradesLoading ? (
          <div className="p-8 text-center text-xs text-slate-500">
            Loading trade journal...
          </div>
        ) : trades.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left text-slate-700">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase tracking-wider font-semibold text-[10px]">
                  <tr>
                    <th scope="col" className="px-3 py-2.5">Trade ID</th>
                    <th scope="col" className="px-3 py-2.5">Side</th>
                    <th scope="col" className="px-3 py-2.5">Entry Time</th>
                    <th scope="col" className="px-3 py-2.5">Exit Time</th>
                    <th scope="col" className="px-3 py-2.5 text-right">Entry Price</th>
                    <th scope="col" className="px-3 py-2.5 text-right">Exit Price</th>
                    <th scope="col" className="px-3 py-2.5 text-right">Qty</th>
                    <th scope="col" className="px-3 py-2.5 text-right">Slippage</th>
                    <th scope="col" className="px-3 py-2.5 text-right">Charges</th>
                    <th scope="col" className="px-3 py-2.5 text-right">Net P&amp;L</th>
                    <th scope="col" className="px-3 py-2.5">Exit Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedTrades.map((t) => {
                    const netPnL = Number(t.netPnL) || 0;
                    const isWin = netPnL > 0;
                    return (
                      <tr key={t.tradeId} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-3 py-2.5 font-mono text-[11px] font-bold text-slate-900">
                          {t.tradeId}
                        </td>
                        <td className="px-3 py-2.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              t.side === 'LONG'
                                ? 'bg-blue-100 text-blue-900 border border-blue-200'
                                : 'bg-purple-100 text-purple-900 border border-purple-200'
                            }`}
                          >
                            {t.side}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                          {t.entryTimestamp?.replace('T', ' ')}
                        </td>
                        <td className="px-3 py-2.5 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                          {t.exitTimestamp?.replace('T', ' ')}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono text-slate-900">
                          ₹{Number(t.entryPrice).toFixed(2)}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono text-slate-900">
                          ₹{Number(t.exitPrice).toFixed(2)}
                        </td>
                        <td className="px-3 py-2.5 text-right text-slate-900">{t.quantity}</td>
                        <td className="px-3 py-2.5 text-right text-slate-600">
                          ₹{Number(t.slippageCost).toFixed(2)}
                        </td>
                        <td className="px-3 py-2.5 text-right text-slate-600">
                          ₹{Number(t.totalCharges).toFixed(2)}
                        </td>
                        <td
                          className={`px-3 py-2.5 text-right font-bold ${
                            isWin ? 'text-emerald-700' : 'text-rose-700'
                          }`}
                        >
                          {isWin ? `+₹${netPnL.toFixed(2)}` : `₹${netPnL.toFixed(2)}`}
                        </td>
                        <td className="px-3 py-2.5 text-[11px] text-slate-600">
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 text-[10px]">
                            {t.exitReason || 'REGULAR'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="p-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500">
                  Showing {(currentPage - 1) * pageSize + 1} to{' '}
                  {Math.min(currentPage * pageSize, trades.length)} of {trades.length} trades
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="h-4 w-4 text-slate-600" />
                  </button>
                  <span className="px-2 font-medium text-slate-700">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    aria-label="Next page"
                  >
                    <ChevronRight className="h-4 w-4 text-slate-600" />
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="p-8 text-center text-xs text-slate-500">
            No trades executed for this backtest run.
          </div>
        )}
      </div>
    </div>
  );
};
