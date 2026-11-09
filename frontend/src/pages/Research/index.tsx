import React from 'react';
import { Header } from '../../components/layout/Header';
import { BacktestExplorerTab } from './components/BacktestExplorerTab';

export default function BacktestPage() {
  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 min-h-full flex flex-col">
      <Header
        title="Historical Backtest Explorer"
        subtitle="Trade-by-trade journals, equity trajectories, underwater drawdown analysis, and statutory fee breakdowns across 5-minute historical candles."
      />

      <main className="p-4 md:p-6 space-y-6 max-w-7xl w-full mx-auto flex-1">
        <BacktestExplorerTab />
      </main>
    </div>
  );
}
