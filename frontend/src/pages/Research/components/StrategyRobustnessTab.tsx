import React, { useState } from 'react';
import {
  Layers,
  ShieldCheck,
  AlertTriangle,
  Info,
  TrendingUp,
  Filter,
  CheckCircle2,
} from 'lucide-react';
import {
  useGetStrategyRobustnessQuery,
} from '../../../api/researchApi';
import type { StrategyRunMetrics } from '../../../api/researchApi';

export const StrategyRobustnessTab: React.FC = () => {
  const [selectedVariant, setSelectedVariant] = useState<string>('ALL');
  const [selectedSymbol, setSelectedSymbol] = useState<string>('ALL');

  const { data: robustnessData, isLoading } = useGetStrategyRobustnessQuery();

  const runs = robustnessData?.data?.runs || [];

  const filteredRuns = runs.filter((r) => {
    if (selectedVariant !== 'ALL' && r.variant !== selectedVariant) return false;
    if (selectedSymbol !== 'ALL' && r.symbol !== selectedSymbol) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Archival Research Notice */}
      <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 text-xs flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <Info className="h-4 w-4 text-indigo-400 shrink-0" />
          <span>
            <strong>Archival Research Record:</strong> The ORB Variants A–E displayed below are preserved historical research benchmarks. Under Phase 9, the single active production strategy is <strong>EMA 9/21 Crossover</strong>.
          </span>
        </div>
        <a
          href="/strategy"
          className="shrink-0 px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-semibold transition-colors"
        >
          View Active EMA 9/21 Strategy
        </a>
      </div>

      {/* Prominent HDFCBANK Variant E Reality Check & Disclaimer Banner */}
      <div className="p-4 rounded-xl bg-amber-50 border-2 border-amber-300 text-amber-950 text-xs shadow-xs">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-bold text-sm text-amber-950">
                Critical Governance Disclaimer: HDFCBANK Variant E Is An Exploratory Positive Finding
              </h4>
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-200 text-amber-900 border border-amber-300">
                Sample Size N = 11 Trades Only
              </span>
            </div>
            <p className="text-amber-900 leading-relaxed">
              While HDFCBANK Variant E generated a net backtest profit of <strong>+₹991.14 (+0.99% net return, 63.64% win rate, 2.18 profit factor)</strong>, this was achieved on <strong>only 11 historical trades across 5 entire years (~2.2 trades per year)</strong>.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-[11px] font-mono text-amber-950">
              <div className="bg-white/80 p-2 rounded border border-amber-200">
                <strong>Wilson 95% CI:</strong> [35.4%, 84.8%]
                <span className="block text-slate-500 text-[10px]">Margin of error ±24.7%</span>
              </div>
              <div className="bg-white/80 p-2 rounded border border-amber-200">
                <strong>Null Test (H₀: p=0.5):</strong> p = 0.5488
                <span className="block text-slate-500 text-[10px]">Indistinguishable from coin-flip</span>
              </div>
              <div className="bg-white/80 p-2 rounded border border-amber-200">
                <strong>Bootstrap Loss Risk:</strong> 14.8% P(Loss)
                <span className="block text-slate-500 text-[10px]">5th percentile: -₹560.61</span>
              </div>
            </div>
            <p className="text-[11px] text-amber-900 pt-1 font-semibold">
              Conclusion: Under no circumstances does this small-sample exploratory result constitute statistical proof of an institutional edge. Automated live execution remains permanently prohibited.
            </p>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-500" />
          <span className="text-xs font-bold text-slate-800">Filter Canonical Runs:</span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Variant Filter */}
          <div className="flex items-center gap-1.5">
            <label htmlFor="variant-select" className="text-xs font-medium text-slate-600">
              Variant:
            </label>
            <select
              id="variant-select"
              value={selectedVariant}
              onChange={(e) => setSelectedVariant(e.target.value)}
              className="text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="ALL">All 5 Variants (A–E)</option>
              <option value="A_BASIC_ORB">Variant A (Basic ORB)</option>
              <option value="B_ORB_VWAP">Variant B (+ VWAP Filter)</option>
              <option value="C_ORB_VWAP_EMA">Variant C (+ EMA 20/50 Hierarchy)</option>
              <option value="D_ORB_VWAP_EMA_ADX">Variant D (+ ADX 14 Trend Strength)</option>
              <option value="E_FULL_CONFIRMATION">Variant E (+ Choppiness &amp; RVOL)</option>
            </select>
          </div>

          {/* Symbol Filter */}
          <div className="flex items-center gap-1.5">
            <label htmlFor="symbol-select" className="text-xs font-medium text-slate-600">
              Stock:
            </label>
            <select
              id="symbol-select"
              value={selectedSymbol}
              onChange={(e) => setSelectedSymbol(e.target.value)}
              className="text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="ALL">All 5 Stocks</option>
              <option value="ICICIBANK">ICICIBANK</option>
              <option value="HDFCBANK">HDFCBANK</option>
              <option value="M&M">M&amp;M</option>
              <option value="AXISBANK">AXISBANK</option>
              <option value="BHARTIARTL">BHARTIARTL</option>
            </select>
          </div>

          <span className="text-xs text-slate-500 font-medium pl-2">
            Showing {filteredRuns.length} of {runs.length} runs
          </span>
        </div>
      </div>

      {/* 25 Canonical Runs Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Canonical Backtest Performance Matrix (5-Year Audited Ledger)
            </h3>
            <p className="text-xs text-slate-500">
              Starting capital ₹100,000 | 0.5% risk per trade | Effective-dated Groww fees | 2.0 bps default slippage
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-xs text-slate-500">
            Loading strategy performance metrics...
          </div>
        ) : filteredRuns.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left text-slate-700">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase tracking-wider font-semibold text-[10px]">
                <tr>
                  <th scope="col" className="px-3.5 py-3">Symbol</th>
                  <th scope="col" className="px-3.5 py-3">Variant</th>
                  <th scope="col" className="px-3.5 py-3 text-right">Trades</th>
                  <th scope="col" className="px-3.5 py-3 text-right">Win Rate</th>
                  <th scope="col" className="px-3.5 py-3">Wilson 95% CI</th>
                  <th scope="col" className="px-3.5 py-3">Sample Adequacy</th>
                  <th scope="col" className="px-3.5 py-3 text-right">Gross P&amp;L</th>
                  <th scope="col" className="px-3.5 py-3 text-right">Charges</th>
                  <th scope="col" className="px-3.5 py-3 text-right">Net P&amp;L</th>
                  <th scope="col" className="px-3.5 py-3 text-right">Profit Factor</th>
                  <th scope="col" className="px-3.5 py-3 text-right">Max DD %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRuns.map((r) => {
                  const isPositive = r.netPnL > 0;
                  const ci = r.confidenceInterval;
                  const isFragile = ci?.isStatisticallyFragile || r.totalTrades < 30;

                  return (
                    <tr key={`${r.symbol}-${r.variant}`} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-3.5 py-3 font-bold text-slate-900">{r.symbol}</td>
                      <td className="px-3.5 py-3 font-mono text-[11px] text-slate-700">{r.variant}</td>
                      <td className="px-3.5 py-3 text-right font-medium text-slate-900">{r.totalTrades}</td>
                      <td className="px-3.5 py-3 text-right font-semibold text-slate-900">{r.winRate}%</td>
                      <td className="px-3.5 py-3 font-mono text-[11px] text-slate-600">
                        [{ci?.ciLowerPercent || 0}%, {ci?.ciUpperPercent || 0}%]
                      </td>
                      <td className="px-3.5 py-3">
                        {isFragile ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                            FRAGILE (N &lt; 30)
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-200">
                            ADEQUATE (N &ge; 30)
                          </span>
                        )}
                      </td>
                      <td className="px-3.5 py-3 text-right text-slate-700">₹{r.grossRealizedPnL.toFixed(2)}</td>
                      <td className="px-3.5 py-3 text-right text-slate-600">₹{r.totalCharges.toFixed(2)}</td>
                      <td
                        className={`px-3.5 py-3 text-right font-bold ${
                          isPositive ? 'text-emerald-700' : 'text-rose-700'
                        }`}
                      >
                        {isPositive ? `+₹${r.netPnL.toFixed(2)}` : `₹${r.netPnL.toFixed(2)}`}
                        <span className="text-[10px] text-slate-500 block font-normal">
                          ({r.netReturnPercent.toFixed(2)}%)
                        </span>
                      </td>
                      <td className="px-3.5 py-3 text-right font-semibold text-slate-900">
                        {r.profitFactor.toFixed(2)}
                      </td>
                      <td className="px-3.5 py-3 text-right text-slate-700 font-medium">
                        {r.maxDrawdownPercent.toFixed(2)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-xs text-slate-500">
            No backtest runs match the selected filters.
          </div>
        )}
      </div>

      {/* Long vs Short Directional Breakdown (Variant E) */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
        <h3 className="text-sm font-bold text-slate-900">
          Directional Breakdown: Long vs Short Asymmetry (Variant E)
        </h3>
        <p className="text-xs text-slate-500">
          Highlights directional trade bias, win rate differentials, and net P&amp;L by side.
        </p>

        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="w-full text-xs text-left text-slate-700">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase tracking-wider font-semibold text-[10px]">
              <tr>
                <th scope="col" className="px-3.5 py-2.5">Symbol</th>
                <th scope="col" className="px-3.5 py-2.5 text-right">Long Trades</th>
                <th scope="col" className="px-3.5 py-2.5 text-right">Long Win Rate</th>
                <th scope="col" className="px-3.5 py-2.5 text-right">Long Net P&amp;L</th>
                <th scope="col" className="px-3.5 py-2.5 text-right">Short Trades</th>
                <th scope="col" className="px-3.5 py-2.5 text-right">Short Win Rate</th>
                <th scope="col" className="px-3.5 py-2.5 text-right">Short Net P&amp;L</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {runs
                .filter((r) => r.variant === 'E_FULL_CONFIRMATION')
                .map((r) => (
                  <tr key={r.symbol} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-3.5 py-2.5 font-bold text-slate-900">{r.symbol}</td>
                    <td className="px-3.5 py-2.5 text-right text-slate-900">{r.longTradesCount}</td>
                    <td className="px-3.5 py-2.5 text-right text-slate-700">{r.longWinRate}%</td>
                    <td
                      className={`px-3.5 py-2.5 text-right font-medium ${
                        r.longNetPnL > 0 ? 'text-emerald-700' : 'text-rose-700'
                      }`}
                    >
                      ₹{r.longNetPnL.toFixed(2)}
                    </td>
                    <td className="px-3.5 py-2.5 text-right text-slate-900">{r.shortTradesCount}</td>
                    <td className="px-3.5 py-2.5 text-right text-slate-700">{r.shortWinRate}%</td>
                    <td
                      className={`px-3.5 py-2.5 text-right font-medium ${
                        r.shortNetPnL > 0 ? 'text-emerald-700' : 'text-rose-700'
                      }`}
                    >
                      ₹{r.shortNetPnL.toFixed(2)}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
