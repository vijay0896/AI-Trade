import React from 'react';
import {
  Layers,
  ShieldCheck,
  AlertTriangle,
  Info,
  CheckCircle2,
} from 'lucide-react';
import { useGetStockBehaviourQuery } from '../../../api/researchApi';

export const RegimesTab: React.FC = () => {
  const { data: behaviourData, isLoading } = useGetStockBehaviourQuery();

  // Regime definitions
  const regimeDescriptions = [
    {
      name: 'STRONG_TREND_UP',
      label: 'Strong Trend Up',
      color: 'bg-emerald-500',
      textColor: 'text-emerald-700',
      bgColor: 'bg-emerald-50',
      rule: 'Return >= +0.70%, ER >= 0.25, NCP >= 0.70, VWAP Crosses <= 3',
    },
    {
      name: 'STRONG_TREND_DOWN',
      label: 'Strong Trend Down',
      color: 'bg-rose-500',
      textColor: 'text-rose-700',
      bgColor: 'bg-rose-50',
      rule: 'Return <= -0.70%, ER >= 0.25, NCP <= 0.30, VWAP Crosses <= 3',
    },
    {
      name: 'WEAK_TREND',
      label: 'Weak Trend',
      color: 'bg-blue-500',
      textColor: 'text-blue-700',
      bgColor: 'bg-blue-50',
      rule: '|Return| >= 0.35%, ER >= 0.18, VWAP Crosses <= 4 (if not Strong)',
    },
    {
      name: 'SIDEWAYS',
      label: 'Sideways Consolidation',
      color: 'bg-amber-500',
      textColor: 'text-amber-700',
      bgColor: 'bg-amber-50',
      rule: '(ER <= 0.20 or Chop >= 58.0) and VWAP Crosses >= 5 and |Return| < 0.50%',
    },
    {
      name: 'MIXED_UNCLEAR',
      label: 'Mixed / Unclear',
      color: 'bg-slate-400',
      textColor: 'text-slate-700',
      bgColor: 'bg-slate-100',
      rule: 'Residual unclassified sessions with conflicting intraday signals',
    },
  ];

  const sensitivityGrid = [
    {
      grid: 'Tight',
      trendCriteria: 'Return >= 1.0%, ER >= 0.35, VWAP <= 2',
      sidewaysCriteria: 'Chop >= 61.8, VWAP >= 6, ER <= 0.18',
      strong: '2.60%',
      weak: '5.99%',
      sideways: '20.51%',
      mixed: '70.90%',
    },
    {
      grid: 'Baseline',
      trendCriteria: 'Return >= 0.7%, ER >= 0.25, VWAP <= 3',
      sidewaysCriteria: 'Chop >= 58.0, VWAP >= 5, ER <= 0.20',
      strong: '7.57%',
      weak: '9.11%',
      sideways: '29.01%',
      mixed: '54.31%',
    },
    {
      grid: 'Loose',
      trendCriteria: 'Return >= 0.5%, ER >= 0.20, VWAP <= 4',
      sidewaysCriteria: 'Chop >= 55.0, VWAP >= 4, ER <= 0.25',
      strong: '15.29%',
      weak: '8.07%',
      sideways: '35.86%',
      mixed: '40.77%',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Causal Isolation Warning Badge */}
      <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200 text-amber-950 text-xs shadow-xs">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold">Retrospective Classification Disclosure:</span>
            <p className="text-amber-900 leading-relaxed">
              These 5 regimes are calculated <strong>ex-post at session close (15:30 IST)</strong> for descriptive research purposes only.
              Full-day variables (Session Efficiency Ratio, full-day return %, Normalized Close Position) contain whole-session information and are
              <strong> strictly isolated</strong> from the backtesting engine. The execution engine never consumes these retrospective features.
            </p>
          </div>
        </div>
      </div>

      {/* High-Level Non-Trending Key Takeaway Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 flex-wrap gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Layers className="h-4 w-4 text-emerald-600" />
              Pervasive Non-Trending Market Structure (82.14% to 85.06%)
            </h3>
            <span className="text-xs text-slate-500">
              Across all 6,159 eligible regular sessions, trend-following strategies face hostile conditions on more than 4 out of 5 days.
            </span>
          </div>

          <div className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs">
            Universe Mean: 83.33% Non-Trending
          </div>
        </div>

        {/* Stacked Visual Bar per Stock */}
        {isLoading ? (
          <div className="py-8 text-center text-xs text-slate-500">
            Loading regime distributions...
          </div>
        ) : behaviourData?.data ? (
          <div className="mt-4 space-y-4">
            {Object.entries(behaviourData.data).map(([sym, b]) => {
              const p = b.classification.regimePercentages;
              const nonTrendingTotal = ((p.SIDEWAYS || 0) + (p.MIXED_UNCLEAR || 0)).toFixed(2);
              return (
                <div key={sym} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-900">{sym}</span>
                    <span className="text-slate-600 font-medium">
                      Non-Trending: <strong className="text-amber-700">{nonTrendingTotal}%</strong> (Sideways: {p.SIDEWAYS}%, Mixed: {p.MIXED_UNCLEAR}%)
                    </span>
                  </div>

                  {/* Multi-Segment Stacked Progress Bar */}
                  <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
                    <div
                      style={{ width: `${p.STRONG_TREND_UP}%` }}
                      title={`Strong Trend Up: ${p.STRONG_TREND_UP}%`}
                      className="bg-emerald-500 hover:opacity-90 transition-opacity"
                    />
                    <div
                      style={{ width: `${p.STRONG_TREND_DOWN}%` }}
                      title={`Strong Trend Down: ${p.STRONG_TREND_DOWN}%`}
                      className="bg-rose-500 hover:opacity-90 transition-opacity"
                    />
                    <div
                      style={{ width: `${p.WEAK_TREND}%` }}
                      title={`Weak Trend: ${p.WEAK_TREND}%`}
                      className="bg-blue-500 hover:opacity-90 transition-opacity"
                    />
                    <div
                      style={{ width: `${p.SIDEWAYS}%` }}
                      title={`Sideways: ${p.SIDEWAYS}%`}
                      className="bg-amber-500 hover:opacity-90 transition-opacity"
                    />
                    <div
                      style={{ width: `${p.MIXED_UNCLEAR}%` }}
                      title={`Mixed/Unclear: ${p.MIXED_UNCLEAR}%`}
                      className="bg-slate-400 hover:opacity-90 transition-opacity"
                    />
                  </div>
                </div>
              );
            })}

            {/* Legend */}
            <div className="pt-3 border-t border-slate-100 flex flex-wrap gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full bg-emerald-500" />
                <span className="text-slate-700">Strong Up</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full bg-rose-500" />
                <span className="text-slate-700">Strong Down</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full bg-blue-500" />
                <span className="text-slate-700">Weak Trend</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full bg-amber-500" />
                <span className="text-slate-700">Sideways</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full bg-slate-400" />
                <span className="text-slate-700">Mixed / Unclear</span>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* Regime Definitions Cards */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
        <h3 className="text-sm font-bold text-slate-900">
          Mutually Exclusive Multi-Factor Classification Criteria
        </h3>
        <p className="text-xs text-slate-500">
          Every regular continuous trading session belongs to exactly one regime (summing to 100.00% without overlaps).
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
          {regimeDescriptions.map((r) => (
            <div
              key={r.name}
              className={`p-3 rounded-lg border border-slate-200/80 ${r.bgColor} space-y-1.5`}
            >
              <div className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${r.color}`} />
                <span className={`font-bold text-xs ${r.textColor}`}>{r.label}</span>
              </div>
              <p className="text-[11px] text-slate-700 font-mono leading-relaxed bg-white/70 p-2 rounded border border-slate-200/50">
                {r.rule}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Threshold Sensitivity Grid */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
        <h3 className="text-sm font-bold text-slate-900">
          Threshold Sensitivity Analysis (Tight vs Baseline vs Loose)
        </h3>
        <p className="text-xs text-slate-500">
          Demonstrates that threshold shifts scale smoothly without creating artificial step discontinuities or regime instability.
        </p>

        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="w-full text-xs text-left text-slate-700">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase tracking-wider font-semibold text-[10px]">
              <tr>
                <th scope="col" className="px-3.5 py-2.5">Grid Parameter</th>
                <th scope="col" className="px-3.5 py-2.5">Strong Trend Criteria</th>
                <th scope="col" className="px-3.5 py-2.5">Sideways Criteria</th>
                <th scope="col" className="px-3.5 py-2.5">Strong Trend %</th>
                <th scope="col" className="px-3.5 py-2.5">Weak Trend %</th>
                <th scope="col" className="px-3.5 py-2.5">Sideways %</th>
                <th scope="col" className="px-3.5 py-2.5">Mixed / Unclear %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sensitivityGrid.map((row) => (
                <tr key={row.grid} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-3.5 py-2.5 font-bold text-slate-900">{row.grid}</td>
                  <td className="px-3.5 py-2.5 font-mono text-[11px] text-slate-600">{row.trendCriteria}</td>
                  <td className="px-3.5 py-2.5 font-mono text-[11px] text-slate-600">{row.sidewaysCriteria}</td>
                  <td className="px-3.5 py-2.5 font-semibold text-emerald-700">{row.strong}</td>
                  <td className="px-3.5 py-2.5 text-blue-700">{row.weak}</td>
                  <td className="px-3.5 py-2.5 font-semibold text-amber-700">{row.sideways}</td>
                  <td className="px-3.5 py-2.5 text-slate-600">{row.mixed}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

