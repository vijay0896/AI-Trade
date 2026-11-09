import React, { useState } from "react";
import {
  Activity,
  Calendar,
  Layers,
  ShieldAlert,
  TrendingUp,
  BarChart3,
  CheckCircle2,
  AlertTriangle,
  Info,
  DollarSign,
  ArrowRight,
  TrendingDown,
} from "lucide-react";
import TradingViewChart from "./components/TradingViewChart";
import {
  useGetStrategyChartDataQuery,
  useGetEMA921BacktestSummaryQuery,
} from "../../api/strategyApi";

const STOCKS = ["ICICIBANK", "HDFCBANK", "M&M", "AXISBANK", "BHARTIARTL"];

export default function StrategyPage() {
  const [selectedStock, setSelectedStock] = useState<string>("ICICIBANK");
  const [selectedDate, setSelectedDate] = useState<string | undefined>(undefined);

  // Fetch chart data
  const {
    data: chartData,
    isLoading: isChartLoading,
    isError: isChartError,
  } = useGetStrategyChartDataQuery({
    symbol: selectedStock,
    date: selectedDate,
  });

  // Fetch 5-year empirical backtest summary
  const {
    data: backtestSummary,
    isLoading: isBacktestLoading,
  } = useGetEMA921BacktestSummaryQuery();

  const handleStockChange = (sym: string) => {
    setSelectedStock(sym);
    setSelectedDate(undefined); // Reset to latest date for the newly selected stock
  };

  const currentDate = chartData?.date || selectedDate || "2026-11-06";
  const availableDates = chartData?.availableDates || [];

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 bg-slate-950 text-slate-100 overflow-y-auto">
      {/* Page Header */}
      <div className="px-6 py-5 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md sticky top-0 z-30 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-400" />
              EMA 9 / EMA 21 Crossover Strategy
            </h1>
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-700/60 uppercase tracking-wide">
              Single Active Strategy
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Sole active systematic trading strategy in production. High-frequency 5-minute moving average crossover for Indian equities.
          </p>
        </div>

        {/* Safety & Mode Notice */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-950/40 border border-amber-800/50 text-amber-300 text-xs font-medium">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Research & Paper Trading Only — Automated Live Orders Disabled</span>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6 max-w-7xl mx-auto w-full">
        {/* Controls Bar: Stock Selector & Date Picker */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-3.5 bg-slate-900/90 border border-slate-800 rounded-xl">
          {/* Stock Pills */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-slate-400 mr-1 flex items-center gap-1.5">
              <BarChart3 className="w-3.5 h-3.5" /> Stock:
            </span>
            {STOCKS.map((sym) => (
              <button
                key={sym}
                onClick={() => handleStockChange(sym)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  selectedStock === sym
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30 border border-indigo-500"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700/60"
                }`}
              >
                {sym}
              </button>
            ))}
          </div>

          {/* Date Selector */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <Calendar className="w-3.5 h-3.5 text-indigo-400" />
              <span className="font-medium text-slate-400">Session Date:</span>
            </div>
            <select
              value={currentDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-slate-800 text-slate-200 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              {availableDates.map((d) => (
                <option key={d} value={d}>
                  {d} {d === availableDates[availableDates.length - 1] ? "(Latest)" : ""}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* TradingView Chart Container */}
        <div>
          {isChartLoading ? (
            <div className="h-[480px] bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-center">
              <div className="flex flex-col items-center gap-2 text-slate-400">
                <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs font-mono">Loading continuous 5m candlestick chart...</span>
              </div>
            </div>
          ) : isChartError || !chartData ? (
            <div className="h-[480px] bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-center p-6 text-center">
              <div className="max-w-md space-y-2">
                <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto" />
                <div className="text-sm font-bold text-white">Market Data Unavailable</div>
                <div className="text-xs text-slate-400">
                  Could not retrieve candle series for {selectedStock} on {currentDate}. Please select another date.
                </div>
              </div>
            </div>
          ) : (
            <TradingViewChart
              candles={chartData.candles}
              symbol={chartData.symbol}
              date={chartData.date}
              currentEMA9={chartData.currentEMA9}
              currentEMA21={chartData.currentEMA21}
              currentPrice={chartData.currentPrice}
              currentSignal={chartData.currentSignal}
            />
          )}
        </div>

        {/* Strategy Specification & Formal Rules Card */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* BUY & Long Entry Specification */}
          <div className="p-4 bg-slate-900/80 border border-emerald-950/80 rounded-xl">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm mb-2.5">
              <TrendingUp className="w-4 h-4 text-[#00C853]" />
              <span>BUY Condition (Long Entry Only)</span>
            </div>
            <ul className="text-xs text-slate-300 space-y-2">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#00C853] shrink-0 mt-0.5" />
                <span>
                  <strong>Trigger</strong>: Candle $t-1$ has $EMA9 \le EMA21$, and completed candle $t$ close has{" "}
                  <strong className="text-[#00C853]">$EMA9 &gt; EMA21$</strong> (Bullish Crossover).
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#00C853] shrink-0 mt-0.5" />
                <span>
                  <strong>Execution</strong>: Executed at the Open of candle $t+1$ with 2.0 basis points slippage.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#00C853] shrink-0 mt-0.5" />
                <span>
                  <strong>Single Position Protection</strong>: No duplicate BUY orders generated while long position is already active.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#00C853] shrink-0 mt-0.5" />
                <span>
                  <strong>Entry Cutoff</strong>: 15:00:00 IST (no new entries initiated within 15 minutes of square-off).
                </span>
              </li>
            </ul>
          </div>

          {/* SELL & Long Exit Specification */}
          <div className="p-4 bg-slate-900/80 border border-rose-950/80 rounded-xl">
            <div className="flex items-center gap-2 text-rose-400 font-bold text-sm mb-2.5">
              <TrendingDown className="w-4 h-4 text-[#FF0000]" />
              <span>SELL Condition (Long Exit Only — No Shorting)</span>
            </div>
            <ul className="text-xs text-slate-300 space-y-2">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#FF0000] shrink-0 mt-0.5" />
                <span>
                  <strong>Trigger</strong>: Candle $t-1$ has $EMA9 \ge EMA21$, and completed candle $t$ close has{" "}
                  <strong className="text-[#FF0000]">$EMA9 &lt; EMA21$</strong> (Bearish Crossunder).
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#FF0000] shrink-0 mt-0.5" />
                <span>
                  <strong>Execution</strong>: Closes open long position at the Open of candle $t+1$ with 2.0 basis points slippage.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#FF0000] shrink-0 mt-0.5" />
                <span>
                  <strong>Strictly Long-Only</strong>: Bearish crossunder NEVER opens a short trade. Engine remains flat after exit.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#FF0000] shrink-0 mt-0.5" />
                <span>
                  <strong>Mandatory Square-Off</strong>: 15:15:00 IST. Any trade still open is closed at 15:15 candle open.
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Strict Prohibitions Banner */}
        <div className="p-3.5 bg-slate-900/90 border border-slate-800 rounded-xl flex items-start gap-3">
          <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
          <div className="text-xs text-slate-300 leading-relaxed">
            <strong className="text-slate-100">Strict Elimination of Secondary Indicators & Filters:</strong> Under Phase 9, all ORB range bounds, VWAP levels, EMA 20/50 filters, ADX/DI trend gates, RVOL, Choppiness Index, and Efficiency Ratio conditions are permanently removed from active runtime. <strong>There are zero stop-loss or profit-target orders</strong>; trades exit exclusively upon opposite crossunder or 15:15 square-off.
          </div>
        </div>

        {/* 5-Year Empirical Historical Backtest Results */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-400" />
                5-Year Historical Backtest Audit (2021-2026)
              </h2>
              <p className="text-xs text-slate-400">
                Deterministic candle-by-candle simulation over 479,982 bars with effective-dated Groww brokerage & statutory charges.
              </p>
            </div>
            <span className="text-xs font-mono bg-slate-800 text-slate-300 px-2.5 py-1 rounded border border-slate-700">
              Fixed 1 Share Sizing
            </span>
          </div>

          {/* Top Metric Cards */}
          {backtestSummary?.portfolioMetrics && (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
              <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-lg">
                <div className="text-[11px] text-slate-400">Total Signals</div>
                <div className="text-base font-bold text-slate-100 font-mono mt-0.5">
                  {backtestSummary.portfolioMetrics.totalBuySignals.toLocaleString("en-IN")}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">Buy & Sell Crossovers</div>
              </div>

              <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-lg">
                <div className="text-[11px] text-slate-400">Completed Trades</div>
                <div className="text-base font-bold text-slate-100 font-mono mt-0.5">
                  {backtestSummary.portfolioMetrics.totalTrades.toLocaleString("en-IN")}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">Across 5 Stocks</div>
              </div>

              <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-lg">
                <div className="text-[11px] text-slate-400">Win Rate %</div>
                <div className="text-base font-bold text-amber-400 font-mono mt-0.5">
                  {backtestSummary.portfolioMetrics.winRatePercent}%
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  {backtestSummary.portfolioMetrics.winningTrades}W / {backtestSummary.portfolioMetrics.losingTrades}L
                </div>
              </div>

              <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-lg">
                <div className="text-[11px] text-slate-400">Theoretical Gross</div>
                <div className="text-base font-bold text-emerald-400 font-mono mt-0.5">
                  +₹{backtestSummary.portfolioMetrics.theoreticalGrossPnL.toLocaleString("en-IN")}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">Before Slippage</div>
              </div>

              <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-lg">
                <div className="text-[11px] text-slate-400">Slippage (2 bps)</div>
                <div className="text-base font-bold text-rose-400 font-mono mt-0.5">
                  -₹{backtestSummary.portfolioMetrics.slippageCost.toLocaleString("en-IN")}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">Entry + Exit Drag</div>
              </div>

              <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-lg">
                <div className="text-[11px] text-slate-400">Total Charges</div>
                <div className="text-base font-bold text-rose-400 font-mono mt-0.5">
                  -₹{backtestSummary.portfolioMetrics.totalCharges.toLocaleString("en-IN")}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">Groww Fee Schedule</div>
              </div>

              <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-lg">
                <div className="text-[11px] text-slate-400">Net Realized P&L</div>
                <div className="text-base font-bold text-rose-400 font-mono mt-0.5">
                  -₹{Math.abs(backtestSummary.portfolioMetrics.netPnL).toLocaleString("en-IN")}
                </div>
                <div className="text-[10px] text-rose-500 mt-0.5 font-bold">
                  {backtestSummary.portfolioMetrics.netReturnPercent}%
                </div>
              </div>
            </div>
          )}

          {/* 5-Stock Detailed Performance Table */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider text-[11px] border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Stock</th>
                    <th className="py-3 px-4 text-right">BUY Signals</th>
                    <th className="py-3 px-4 text-right">Trades</th>
                    <th className="py-3 px-4 text-right">Win Rate %</th>
                    <th className="py-3 px-4 text-right">Gross P&L</th>
                    <th className="py-3 px-4 text-right">Charges</th>
                    <th className="py-3 px-4 text-right">Net P&L</th>
                    <th className="py-3 px-4 text-right">Profit Factor</th>
                    <th className="py-3 px-4 text-right">Max Drawdown</th>
                    <th className="py-3 px-4 text-right">Avg Win/Loss</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 font-mono">
                  {backtestSummary &&
                    Object.entries(backtestSummary.stocks).map(([sym, data]) => (
                      <tr key={sym} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-2.5 px-4 font-bold text-white font-sans">{sym}</td>
                        <td className="py-2.5 px-4 text-right text-slate-300">{data.buySignals}</td>
                        <td className="py-2.5 px-4 text-right text-slate-300">{data.totalTrades}</td>
                        <td className="py-2.5 px-4 text-right">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[11px] font-bold ${
                              data.winRatePercent >= 15
                                ? "bg-amber-950 text-amber-300"
                                : "bg-slate-800 text-slate-400"
                            }`}
                          >
                            {data.winRatePercent.toFixed(2)}%
                          </span>
                        </td>
                        <td
                          className={`py-2.5 px-4 text-right font-medium ${
                            data.grossRealizedPnL >= 0 ? "text-emerald-400" : "text-rose-400"
                          }`}
                        >
                          ₹{data.grossRealizedPnL.toFixed(2)}
                        </td>
                        <td className="py-2.5 px-4 text-right text-slate-400">
                          ₹{data.totalCharges.toFixed(2)}
                        </td>
                        <td className="py-2.5 px-4 text-right font-bold text-rose-400">
                          -₹{Math.abs(data.netPnL).toFixed(2)}
                        </td>
                        <td className="py-2.5 px-4 text-right text-slate-300">
                          {data.profitFactor.toFixed(2)}
                        </td>
                        <td className="py-2.5 px-4 text-right text-slate-400">
                          ₹{data.maxDrawdown.toFixed(2)} ({data.maxDrawdownPercent.toFixed(2)}%)
                        </td>
                        <td className="py-2.5 px-4 text-right text-slate-400">
                          +₹{data.averageWin.toFixed(2)} / -₹{data.averageLoss.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

