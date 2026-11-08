import React from 'react';
import {
  Activity,
  ShieldCheck,
  AlertTriangle,
  Info,
  CheckCircle2,
  TrendingDown,
  Layers,
} from 'lucide-react';
import {
  useGetStrategyRobustnessQuery,
  useGetPeriodPerformanceQuery,
} from '../../../api/researchApi';

export const StatisticalValidityTab: React.FC = () => {
  const { data: robustnessData, isLoading: isRobustnessLoading } = useGetStrategyRobustnessQuery();
  const { data: periodData, isLoading: isPeriodLoading } = useGetPeriodPerformanceQuery();

  const runs = robustnessData?.data?.runs || [];
  const variantERuns = runs.filter((r) => r.variant === 'E_FULL_CONFIRMATION');
  const walkForwardRecords = periodData?.data?.walkForwardRecords || [];

  return (
    <div className="space-y-6">
      {/* Bootstrap Rigour & Methodology Disclosure */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 text-xs shadow-xs space-y-2">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-emerald-400" />
          <h4 className="font-bold text-sm text-white">
            Reproducible 10,000-Iteration Bootstrap Benchmark &amp; Permutation Diagnostics
          </h4>
        </div>
        <p className="text-slate-300 leading-relaxed">
          Resampling is executed across 10,000 iterations with replacement using a deterministic pseudo-random seed to establish true sampling distribution percentiles.
          Note: 10,000 simulation iterations increase <strong>numerical precision of the estimate</strong>, not the underlying independent trade sample size (which remains $N = 11$ in HDFCBANK).
          A 10-session block bootstrap acts as a small-sample sensitivity diagnostic to verify that intraday trade clustering does not distort loss probability.
        </p>
      </div>

      {/* Bootstrap Outcomes Table (Variant E) */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 flex-wrap gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Variant E Bootstrap Resampling Distributions (10,000 Iterations)
            </h3>
            <p className="text-xs text-slate-500">
              Evaluates the probability of incurring a net capital loss and the worst 5% (5th percentile) outcome.
            </p>
          </div>
          <span className="text-[11px] font-semibold text-slate-500 px-2.5 py-1 rounded bg-slate-100">
            Fixed Seed: 123456789
          </span>
        </div>

        {isRobustnessLoading ? (
          <div className="py-8 text-center text-xs text-slate-500">
            Loading bootstrap statistics...
          </div>
        ) : (
          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-xs text-left text-slate-700">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase tracking-wider font-semibold text-[10px]">
                <tr>
                  <th scope="col" className="px-3.5 py-3">Symbol</th>
                  <th scope="col" className="px-3.5 py-3 text-right">Historical Net P&amp;L</th>
                  <th scope="col" className="px-3.5 py-3 text-right">Bootstrap Median</th>
                  <th scope="col" className="px-3.5 py-3 text-right">5th Percentile (Worst 5%)</th>
                  <th scope="col" className="px-3.5 py-3 text-right">95th Percentile (Best 5%)</th>
                  <th scope="col" className="px-3.5 py-3 text-right">P(Net Loss) %</th>
                  <th scope="col" className="px-3.5 py-3 text-right">Standard Error</th>
                  <th scope="col" className="px-3.5 py-3">Statistical Assessment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {variantERuns.map((r) => {
                  const b = r.bootstrap;
                  const isHdfc = r.symbol === 'HDFCBANK';

                  return (
                    <tr
                      key={r.symbol}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isHdfc ? 'bg-amber-50/30' : ''
                      }`}
                    >
                      <td className="px-3.5 py-3 font-bold text-slate-900 flex items-center gap-1.5">
                        {r.symbol}
                        {isHdfc && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-bold border border-amber-200">
                            N=11
                          </span>
                        )}
                      </td>
                      <td
                        className={`px-3.5 py-3 text-right font-bold ${
                          r.netPnL > 0 ? 'text-emerald-700' : 'text-rose-700'
                        }`}
                      >
                        {r.netPnL > 0 ? `+₹${r.netPnL.toFixed(2)}` : `₹${r.netPnL.toFixed(2)}`}
                      </td>
                      <td className="px-3.5 py-3 text-right font-semibold text-slate-900">
                        ₹{b?.medianNetPnL?.toFixed(2) || '0.00'}
                      </td>
                      <td className="px-3.5 py-3 text-right font-semibold text-rose-700">
                        ₹{b?.percentile5NetPnL?.toFixed(2) || '0.00'}
                      </td>
                      <td className="px-3.5 py-3 text-right font-semibold text-emerald-700">
                        ₹{b?.percentile95NetPnL?.toFixed(2) || '0.00'}
                      </td>
                      <td className="px-3.5 py-3 text-right font-bold text-slate-900">
                        {b?.probabilityOfLossPercent}%
                      </td>
                      <td className="px-3.5 py-3 text-right text-slate-600 font-mono">
                        ±₹{b?.standardError?.toFixed(2) || '0.00'}
                      </td>
                      <td className="px-3.5 py-3">
                        {isHdfc ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                            EXPLORATORY (P(Loss)=14.8%)
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-900 border border-rose-200">
                            NEGATIVE EXPECTANCY
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Chronological Walk-Forward Diagnostics Table */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 flex-wrap gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Chronological Rolling Walk-Forward Diagnostics (24m Train &rarr; 12m Test)
            </h3>
            <p className="text-xs text-slate-500">
              Strict chronological window progression without look-ahead or candle shuffling.
            </p>
          </div>
          <span className="text-[11px] text-amber-800 bg-amber-100 px-2.5 py-1 rounded font-semibold border border-amber-200">
            Retrospective Diagnostic Folds
          </span>
        </div>

        {isPeriodLoading ? (
          <div className="py-8 text-center text-xs text-slate-500">
            Loading walk-forward diagnostics...
          </div>
        ) : walkForwardRecords.length > 0 ? (
          <div className="overflow-x-auto border border-slate-200 rounded-lg max-h-96">
            <table className="w-full text-xs text-left text-slate-700">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase tracking-wider font-semibold text-[10px] sticky top-0">
                <tr>
                  <th scope="col" className="px-3 py-2.5">Fold</th>
                  <th scope="col" className="px-3 py-2.5">Symbol</th>
                  <th scope="col" className="px-3 py-2.5">Train Period</th>
                  <th scope="col" className="px-3 py-2.5 text-right">Train Trades</th>
                  <th scope="col" className="px-3 py-2.5 text-right">Train Net P&amp;L</th>
                  <th scope="col" className="px-3 py-2.5">Test Period</th>
                  <th scope="col" className="px-3 py-2.5 text-right">Test Trades</th>
                  <th scope="col" className="px-3 py-2.5 text-right">Test Net P&amp;L</th>
                  <th scope="col" className="px-3 py-2.5">Stability Status</th>
                  <th scope="col" className="px-3 py-2.5">Diagnostic Evaluation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {walkForwardRecords.map((r, i) => {
                  let statusBadge = (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
                      {r.stabilityStatus}
                    </span>
                  );

                  if (r.stabilityStatus === 'INSUFFICIENT_SAMPLE' || r.stabilityStatus === 'NOT_EVALUABLE') {
                    statusBadge = (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                        {r.stabilityStatus}
                      </span>
                    );
                  } else if (r.stabilityStatus === 'POSITIVE_BUT_UNCERTAIN') {
                    statusBadge = (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-900 border border-blue-200">
                        {r.stabilityStatus}
                      </span>
                    );
                  } else if (r.stabilityStatus === 'DEGRADED' || r.stabilityStatus === 'NEGATIVE') {
                    statusBadge = (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-900 border border-rose-200">
                        {r.stabilityStatus}
                      </span>
                    );
                  }

                  return (
                    <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-3 py-2.5 font-bold text-slate-900">Fold {r.foldId}</td>
                      <td className="px-3 py-2.5 font-bold text-slate-900">{r.symbol}</td>
                      <td className="px-3 py-2.5 font-mono text-[11px] text-slate-600">{r.trainPeriod}</td>
                      <td className="px-3 py-2.5 text-right text-slate-900">{r.trainTrades}</td>
                      <td
                        className={`px-3 py-2.5 text-right font-medium ${
                          r.trainNetPnL > 0 ? 'text-emerald-700' : 'text-rose-700'
                        }`}
                      >
                        ₹{r.trainNetPnL.toFixed(2)}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-[11px] text-slate-600">{r.testPeriod}</td>
                      <td className="px-3 py-2.5 text-right text-slate-900 font-semibold">{r.testTrades}</td>
                      <td
                        className={`px-3 py-2.5 text-right font-bold ${
                          r.testNetPnL > 0 ? 'text-emerald-700' : 'text-rose-700'
                        }`}
                      >
                        ₹{r.testNetPnL.toFixed(2)}
                      </td>
                      <td className="px-3 py-2.5">{statusBadge}</td>
                      <td className="px-3 py-2.5 text-[11px] text-slate-600 max-w-xs truncate" title={r.diagnosticNote}>
                        {r.diagnosticNote || 'Standard evaluation'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>

      {/* Multiple-Testing & Experiment Registry Disclosure */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          Multiple Testing &amp; Data Snooping Disclosures (Holm-Bonferroni Audit)
        </h3>

        <div className="text-xs text-slate-700 space-y-2 leading-relaxed">
          <p>
            Across this 5-year study, a total of <strong>90 distinct parameter cohorts and slippage combinations</strong> were evaluated across the 5 candidates.
            When testing 90 hypotheses under a naive independent Bernoulli trial model, the probability of finding at least one false positive at $\alpha = 0.05$ is:
          </p>
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 font-mono text-center text-slate-900">
            P(At least 1 false positive) = 1 &minus; (1 &minus; 0.05)<sup>90</sup> &asymp; 99.1%
          </div>
          <p>
            Applying the family-wise Holm-Bonferroni step-down correction across all 25 canonical runs and 5 slippage stress tests confirms that
            <strong> zero variants achieve statistical significance at family-wise &alpha; = 0.05</strong>.
            This mathematically rules out claiming that any strategy variant has demonstrated a proven institutional trading edge.
          </p>
        </div>
      </div>
    </div>
  );
};

