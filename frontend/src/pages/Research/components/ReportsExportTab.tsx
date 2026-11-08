import React, { useState } from 'react';
import {
  FileText,
  Download,
  CheckCircle2,
  Copy,
  ShieldCheck,
  ExternalLink,
  Layers,
  Database,
} from 'lucide-react';
import { toast } from 'react-toastify';

export const ReportsExportTab: React.FC = () => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const deliverables = [
    {
      id: 'RESEARCH_COMPARISON_REPORT',
      title: 'Phase 7: Research Comparison & Robustness Report',
      format: 'Markdown (.md)',
      size: '22 KB',
      description: 'Comprehensive quantitative analysis, stock behaviour metrics, session classifications, dual rankings, and sample size disclosures.',
      path: 'backend/storage/research/RESEARCH_COMPARISON_REPORT.md',
    },
    {
      id: 'PHASE_7_1_AUDIT_REPORT',
      title: 'Phase 7.1: Statistical Integrity & Audit Certification',
      format: 'Markdown (.md)',
      size: '28 KB',
      description: 'Institutional audit report certifying zero look-ahead bias, trade-ledger reconciliation, reproducible 10k bootstrap, and Holm-Bonferroni corrections.',
      path: 'backend/storage/research/phase-7.1-audit/PHASE_7_1_AUDIT_REPORT.md',
    },
    {
      id: 'STOCK_BEHAVIOUR_METRICS',
      title: 'Stock Behaviour Metrics Dataset',
      format: 'CSV (.csv)',
      size: '5 KB',
      description: '55 granular metrics per stock across volatility, directional movement, sideways dynamics, opening range, and liquidity.',
      path: 'backend/storage/research/STOCK_BEHAVIOUR_METRICS.csv',
    },
    {
      id: 'DAILY_SESSION_CLASSIFICATION',
      title: 'Daily Session Classification Dataset',
      format: 'CSV (.csv)',
      size: '420 KB',
      description: '6,199 historical trading sessions classified into 5 mutually exclusive regimes with full rationale.',
      path: 'backend/storage/research/DAILY_SESSION_CLASSIFICATION.csv',
    },
    {
      id: 'STRATEGY_ROBUSTNESS',
      title: 'Strategy Robustness & Confidence Intervals',
      format: 'CSV (.csv)',
      size: '6 KB',
      description: '25 canonical backtest runs with Wilson-score 95% binomial confidence intervals, net return, fees, and bootstrap percentiles.',
      path: 'backend/storage/research/STRATEGY_ROBUSTNESS.csv',
    },
    {
      id: 'WALK_FORWARD_RESULTS',
      title: 'Chronological Walk-Forward Folds',
      format: 'CSV (.csv)',
      size: '7 KB',
      description: '30 chronological rolling folds (24m train / 12m test) with objective status evaluations.',
      path: 'backend/storage/research/WALK_FORWARD_RESULTS.csv',
    },
    {
      id: 'RESEARCH_OUTCOMES_JSON',
      title: 'Complete Research Outcomes Machine Payload',
      format: 'JSON (.json)',
      size: '34 KB',
      description: 'Full structured JSON schema payload backing all frontend dashboard analytics and visualizations.',
      path: 'backend/storage/research/RESEARCH_OUTCOMES.json',
    },
    {
      id: 'CANONICAL_TRADE_RECONCILIATION',
      title: 'Canonical Trade Reconciliation Audit Ledger',
      format: 'CSV (.csv)',
      size: '4 KB',
      description: 'Penny-level accounting reconciliation across all 25 runs (1,071 trades; 0 identity violations).',
      path: 'backend/storage/research/phase-7.1-audit/CANONICAL_TRADE_RECONCILIATION.csv',
    },
  ];

  const handleCopyPath = (id: string, path: string) => {
    navigator.clipboard.writeText(path);
    setCopiedId(id);
    toast.success(`Copied path: ${path}`);
    setTimeout(() => setCopiedId(null), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Overview Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-2">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-emerald-600" />
          <h3 className="text-sm font-bold text-slate-900">
            Audited Deliverables &amp; Research Artifacts Registry
          </h3>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed">
          All datasets, mathematical proofs, and reports generated in Phase 7 and Phase 7.1 are immutably persisted on disk under
          <code className="px-1.5 py-0.5 mx-1 bg-slate-100 rounded text-slate-800 font-mono text-[11px]">backend/storage/research/</code>.
          Inspect the raw files directly in your environment or copy the absolute paths below.
        </p>
      </div>

      {/* Deliverables List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {deliverables.map((item) => (
          <div
            key={item.id}
            className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-colors"
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-emerald-600 shrink-0" />
                  <h4 className="font-bold text-xs text-slate-900 leading-snug">{item.title}</h4>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600 shrink-0 font-medium">
                  {item.format}
                </span>
              </div>
              <p className="mt-2 text-xs text-slate-600 leading-relaxed">{item.description}</p>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-500 font-mono truncate max-w-xs" title={item.path}>
                {item.path}
              </span>
              <button
                type="button"
                onClick={() => handleCopyPath(item.id, item.path)}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer"
                title="Copy relative file path to clipboard"
              >
                {copiedId === item.id ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5 text-slate-500" />
                    <span>Copy Path</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

