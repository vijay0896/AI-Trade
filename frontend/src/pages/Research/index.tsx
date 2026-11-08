import React, { useState } from 'react';
import {
  FlaskConical,
  BarChart3,
  Layers,
  TrendingUp,
  Activity,
  FileText,
  ShieldCheck,
  Download,
  AlertTriangle,
} from 'lucide-react';
import { Header } from '../../components/layout/Header';
import { useGetResearchSummaryQuery } from '../../api/researchApi';
import { OverviewTab } from './components/OverviewTab';
import { StockComparisonTab } from './components/StockComparisonTab';
import { RegimesTab } from './components/RegimesTab';
import { StrategyRobustnessTab } from './components/StrategyRobustnessTab';
import { StatisticalValidityTab } from './components/StatisticalValidityTab';
import { BacktestExplorerTab } from './components/BacktestExplorerTab';
import { ReportsExportTab } from './components/ReportsExportTab';

type TabKey =
  | 'overview'
  | 'stock-comparison'
  | 'market-regimes'
  | 'strategy-robustness'
  | 'statistical-validity'
  | 'backtest-explorer'
  | 'reports-export';

interface TabDefinition {
  id: TabKey;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const TABS: TabDefinition[] = [
  { id: 'overview', label: 'Overview', icon: FlaskConical },
  { id: 'stock-comparison', label: 'Stock Behaviour & Rankings', icon: BarChart3 },
  { id: 'market-regimes', label: 'Market Regimes', icon: Layers },
  { id: 'strategy-robustness', label: 'Strategy Matrix (Variants A-E)', icon: TrendingUp },
  { id: 'statistical-validity', label: 'Statistical Rigour & Walk-Forward', icon: Activity },
  { id: 'backtest-explorer', label: 'Backtest Journal & Explorer', icon: FileText },
  { id: 'reports-export', label: 'Audited Deliverables', icon: Download },
];

export default function ResearchPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const { data: summaryResponse, isLoading, isError, refetch } = useGetResearchSummaryQuery();

  const summaryData = summaryResponse?.data;

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 min-h-full flex flex-col">
      <Header
        title="Quantitative Research & Strategy Robustness"
        subtitle="Intraday price behaviour analysis, 5-regime classification, backtesting audit, and statistical validity checks across 5 NSE equities."
      />

      <main className="p-4 md:p-6 space-y-6 max-w-7xl w-full mx-auto flex-1">
        {/* Error Alert if Pipeline Failed to Load */}
        {isError && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 flex items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0" />
              <div>
                <p className="text-sm font-semibold">Failed to Load Research Telemetry</p>
                <p className="text-xs text-rose-700">
                  Ensure the backend Express server is running and research deliverables have been generated.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => refetch()}
              className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {/* Tab Navigation Bar */}
        <div className="border-b border-slate-200 bg-white rounded-xl shadow-xs px-2 pt-2">
          <nav className="flex space-x-1 overflow-x-auto pb-2" aria-label="Research Dashboard Tabs">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-lg whitespace-nowrap transition-all cursor-pointer ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Active Tab Content Area */}
        <div className="min-h-[400px]">
          {activeTab === 'overview' && (
            <OverviewTab
              summaryData={summaryData}
              isLoading={isLoading}
              onNavigateToTab={(tabId) => setActiveTab(tabId as TabKey)}
            />
          )}

          {activeTab === 'stock-comparison' && (
            <StockComparisonTab summaryData={summaryData} />
          )}

          {activeTab === 'market-regimes' && <RegimesTab />}

          {activeTab === 'strategy-robustness' && <StrategyRobustnessTab />}

          {activeTab === 'statistical-validity' && <StatisticalValidityTab />}

          {activeTab === 'backtest-explorer' && <BacktestExplorerTab />}

          {activeTab === 'reports-export' && <ReportsExportTab />}
        </div>
      </main>
    </div>
  );
}

