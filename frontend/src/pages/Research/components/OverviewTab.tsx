import React from 'react';
import {
  Database,
  Calendar,
  Layers,
  ShieldCheck,
  AlertTriangle,
  Info,
  CheckCircle2,
  FileText,
  BarChart2,
} from 'lucide-react';
import type { ResearchSummaryData } from '../../../api/researchApi';

interface OverviewTabProps {
  summaryData?: ResearchSummaryData;
  isLoading: boolean;
  onNavigateToTab: (tabId: string) => void;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
  summaryData,
  isLoading,
  onNavigateToTab,
}) => {
  if (isLoading) {
    return (
      <div className="p-8 text-center bg-white rounded-xl border border-slate-200">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-r-transparent" />
        <p className="mt-3 text-sm font-medium text-slate-600">Loading research summary telemetry...</p>
      </div>
    );
  }

  const metadata = summaryData?.metadata;
  const dataset = metadata?.dataset;

  return (
    <div className="space-y-6">
      {/* Permanent Live Trading Disabled Governance Banner */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shrink-0 mt-0.5">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm font-bold text-white tracking-wide">
                Institutional Quantitative Research & Audit Certification
              </h2>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Phase 7.1 Verified
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-300 leading-relaxed">
              Exhaustive 5-year quantitative study of 5 NSE equities (479,982 5-minute candles). Certified zero look-ahead bias, penny-level fee reconciliation, and strict statistical significance testing.
            </p>
          </div>
        </div>

        <div className="shrink-0 flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300">
          <AlertTriangle className="h-4 w-4 text-amber-400" />
          <span>Live Execution Prohibited</span>
        </div>
      </div>

      {/* Dataset Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Universe
            </span>
            <div className="p-1.5 rounded-lg bg-blue-50 text-blue-700">
              <Database className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">5 Stocks</div>
          <p className="mt-1 text-xs text-slate-500">
            ICICIBANK, HDFCBANK, M&M, AXISBANK, BHARTIARTL
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Historical Window
            </span>
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700">
              <Calendar className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">5 Full Years</div>
          <p className="mt-1 text-xs text-slate-500">
            {dataset?.startDate || '2021-11-08'} to {dataset?.endDate || '2026-11-06'}
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Intraday Data Points
            </span>
            <div className="p-1.5 rounded-lg bg-purple-50 text-purple-700">
              <Layers className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">
            {dataset?.totalCandles?.toLocaleString() || '479,982'}
          </div>
          <p className="mt-1 text-xs text-slate-500">
            5-Minute OHLCV + 8 Technical Indicators
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Regular Sessions
            </span>
            <div className="p-1.5 rounded-lg bg-teal-50 text-teal-700">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">6,159 Sessions</div>
          <p className="mt-1 text-xs text-slate-500">
            99.92% continuous market coverage (09:15-15:25)
          </p>
        </div>
      </div>

      {/* Primary Research Hypotheses & Conclusions */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <h3 className="text-sm font-bold text-slate-900 tracking-wide mb-3 flex items-center gap-2">
          <Info className="h-4 w-4 text-emerald-600" />
          Primary Quantitative Findings & Empirical Realities
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200/80 space-y-1.5">
            <div className="font-semibold text-slate-900 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              1. Non-Trending Intraday Regimes (82% to 85%)
            </div>
            <p className="text-slate-600 leading-relaxed">
              NSE large-cap equities spend 82.14% to 85.06% of regular continuous sessions in consolidating or mixed regimes (Sideways + Mixed/Unclear). 63% to 67% of days exhibit 5 or more VWAP crosses, and opening range breakouts fail within 15 minutes on 45% to 50% of days.
            </p>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200/80 space-y-1.5">
            <div className="font-semibold text-slate-900 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-rose-500" />
              2. Value Destruction in Unfiltered Breakouts (Variant A)
            </div>
            <p className="text-slate-600 leading-relaxed">
              Basic 15-minute Opening Range Breakout trading without indicators produces net capital losses across all 5 candidates (-0.43% to -8.69%). High trading frequency in choppy morning sessions causes catastrophic transaction fee drag and whipsaws.
            </p>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200/80 space-y-1.5">
            <div className="font-semibold text-slate-900 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-blue-500" />
              3. Dramatic False-Breakout Reduction (Variant E)
            </div>
            <p className="text-slate-600 leading-relaxed">
              Progressively stacking multi-indicator confirmation filters (VWAP alignment, EMA 20/50 hierarchy, ADX 14 &gt; 25, Choppiness &lt; 58) eliminates 70% to 80% of whipsaws and caps maximum drawdowns below 1.6% across the entire universe.
            </p>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200/80 space-y-1.5">
            <div className="font-semibold text-slate-900 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              4. Statistical Reality Check on Apparent "Winners"
            </div>
            <p className="text-slate-600 leading-relaxed">
              HDFCBANK Variant E returned +₹991.14 (+0.99%) but generated only 11 trades in 5 years (2.2 trades/year). Its 95% confidence interval spans [35.4%, 84.8%] with p = 0.5488 against a 50% null win rate. It is an exploratory finding, not an institutional edge.
            </p>
          </div>
        </div>
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          type="button"
          onClick={() => onNavigateToTab('stock-comparison')}
          className="p-4 rounded-xl bg-white border border-slate-200 text-left hover:border-emerald-300 hover:shadow-xs transition-all group focus-visible:outline-2 focus-visible:outline-emerald-500 cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900 group-hover:text-emerald-700">
              Dual Stock Rankings
            </span>
            <BarChart2 className="h-4 w-4 text-slate-400 group-hover:text-emerald-600" />
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Compare Ranking A (Price Behaviour) vs Ranking B (Strategy Performance) side-by-side.
          </p>
        </button>

        <button
          type="button"
          onClick={() => onNavigateToTab('strategy-robustness')}
          className="p-4 rounded-xl bg-white border border-slate-200 text-left hover:border-emerald-300 hover:shadow-xs transition-all group focus-visible:outline-2 focus-visible:outline-emerald-500 cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900 group-hover:text-emerald-700">
              Strategy Matrix (Variants A-E)
            </span>
            <Layers className="h-4 w-4 text-slate-400 group-hover:text-emerald-600" />
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Audit all 25 canonical backtest runs with Wilson score 95% confidence intervals.
          </p>
        </button>

        <button
          type="button"
          onClick={() => onNavigateToTab('backtest-explorer')}
          className="p-4 rounded-xl bg-white border border-slate-200 text-left hover:border-emerald-300 hover:shadow-xs transition-all group focus-visible:outline-2 focus-visible:outline-emerald-500 cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900 group-hover:text-emerald-700">
              Backtest Explorer & Equity Curve
            </span>
            <FileText className="h-4 w-4 text-slate-400 group-hover:text-emerald-600" />
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Examine trade-by-trade journals, slippage impact, and equity trajectory.
          </p>
        </button>
      </div>
    </div>
  );
};
