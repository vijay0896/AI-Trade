import React, { useState, useMemo, useEffect } from 'react';
import {
  Play,
  TrendingUp,
  TrendingDown,
  Clock,
  Target,
  ShieldAlert,
  Layers,
  Filter,
  Calendar,
  DollarSign,
  CheckCircle2,
  XCircle,
  Download,
  ChevronLeft,
  ChevronRight,
  Search,
  Zap,
  BarChart3,
  RefreshCw,
  Sparkles,
  ArrowUpDown,
} from 'lucide-react';
import { Header } from '../../components/layout/Header';
import { StatCard } from '../../components/common/StatCard';
import { useRunBacktestMutation } from '../../api/growwApi';
import type {
  BacktestRequest,
  BacktestResponseData,
  StockBacktestMetrics,
  BacktestTradeLog,
} from '../../types/groww.types';
import { toast } from 'react-toastify';

const HIGH_BETA_CORE = ['BAJFINANCE', 'TATAMOTORS', 'SBIN', 'ADANIPORTS', 'MCX', 'ICICIBANK'];
const BREAKOUT_WATCHLIST = ['TECHM', 'JSWSTEEL', 'DIVISLAB', 'BPCL'];
const ALL_UNIVERSE = [...HIGH_BETA_CORE, ...BREAKOUT_WATCHLIST];

export default function BacktestPage() {
  // Config state (defaults to High-Beta Intraday Core universe)
  const [selectedStocks, setSelectedStocks] = useState<string[]>(HIGH_BETA_CORE);
  const [startDate, setStartDate] = useState<string>('2024-01-01');
  const [endDate, setEndDate] = useState<string>('2024-03-31');
  const [capitalPerTrade, setCapitalPerTrade] = useState<number>(100000);
  const [enableMultiTimeframe, setEnableMultiTimeframe] = useState<boolean>(true);
  const [enableNR4Filter, setEnableNR4Filter] = useState<boolean>(false);

  // Table filters & pagination state
  const [tradeSearch, setTradeSearch] = useState<string>('');
  const [tradeDirectionFilter, setTradeDirectionFilter] = useState<'ALL' | 'LONG' | 'SHORT'>('ALL');
  const [tradeExitReasonFilter, setTradeExitReasonFilter] = useState<string>('ALL');
  const [selectedStockFilter, setSelectedStockFilter] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 15;

  // Sorting state for stock table
  const [stockSortField, setStockSortField] = useState<keyof StockBacktestMetrics>('winRatePct');
  const [stockSortAsc, setStockSortAsc] = useState<boolean>(false);

  // RTK Query Mutation
  const [runBacktestMutation, { data: backtestResponse, isLoading, isError, error }] = useRunBacktestMutation();

  const results: BacktestResponseData | null = backtestResponse?.data || null;

  // Run backtest once on mount with default high-beta core universe
  const hasMountedRef = React.useRef(false);
  useEffect(() => {
    if (hasMountedRef.current) return;
    hasMountedRef.current = true;

    runBacktestMutation({
      symbols: HIGH_BETA_CORE,
      startDate: '2024-01-01',
      endDate: '2024-03-31',
      capitalPerTrade: 100000,
      enableMultiTimeframe: true,
      enableNR4Filter: false,
    });
  }, [runBacktestMutation]);

  const handleRunBacktest = async () => {
    if (selectedStocks.length === 0) {
      toast.warn('Please select at least one stock to backtest');
      return;
    }
    if (!startDate || !endDate || startDate > endDate) {
      toast.warn('Please provide a valid date range (Start Date <= End Date)');
      return;
    }

    try {
      await runBacktestMutation({
        symbols: selectedStocks,
        startDate,
        endDate,
        capitalPerTrade: Number(capitalPerTrade) || 100000,
        enableMultiTimeframe,
        enableNR4Filter,
      }).unwrap();
      toast.success('15m Intraday Backtest executed successfully!');
      setCurrentPage(1);
    } catch (err: any) {
      toast.error(err?.data?.message || 'Failed to execute backtest');
    }
  };

  // Stock selection helpers
  const toggleStock = (sym: string) => {
    setSelectedStocks((prev) =>
      prev.includes(sym) ? prev.filter((s) => s !== sym) : [...prev, sym]
    );
  };

  const selectPreset = (type: 'ALL' | 'CLEAR' | 'CORE' | 'WATCHLIST') => {
    if (type === 'ALL') setSelectedStocks(ALL_UNIVERSE);
    else if (type === 'CLEAR') setSelectedStocks([]);
    else if (type === 'CORE') setSelectedStocks(HIGH_BETA_CORE);
    else if (type === 'WATCHLIST') setSelectedStocks(BREAKOUT_WATCHLIST);
  };

  // Sort stock breakdown table
  const sortedStockBreakdown = useMemo(() => {
    if (!results?.stockBreakdown) return [];
    return [...results.stockBreakdown].sort((a, b) => {
      const valA = a[stockSortField];
      const valB = b[stockSortField];
      if (typeof valA === 'number' && typeof valB === 'number') {
        return stockSortAsc ? valA - valB : valB - valA;
      }
      return stockSortAsc
        ? String(valA).localeCompare(String(valB))
        : String(valB).localeCompare(String(valA));
    });
  }, [results?.stockBreakdown, stockSortField, stockSortAsc]);

  const handleSortStock = (field: keyof StockBacktestMetrics) => {
    if (stockSortField === field) {
      setStockSortAsc(!stockSortAsc);
    } else {
      setStockSortField(field);
      setStockSortAsc(false);
    }
  };

  // Filter trade logs
  const filteredTrades = useMemo(() => {
    if (!results?.tradeLog) return [];
    return results.tradeLog.filter((t) => {
      if (selectedStockFilter !== 'ALL' && t.symbol !== selectedStockFilter) return false;
      if (tradeDirectionFilter !== 'ALL' && t.direction !== tradeDirectionFilter) return false;
      if (tradeExitReasonFilter !== 'ALL' && t.exitReason !== tradeExitReasonFilter) return false;
      if (tradeSearch) {
        const query = tradeSearch.toUpperCase();
        return t.symbol.includes(query) || t.tradeId.includes(query);
      }
      return true;
    });
  }, [results?.tradeLog, selectedStockFilter, tradeDirectionFilter, tradeExitReasonFilter, tradeSearch]);

  const totalPages = Math.ceil(filteredTrades.length / pageSize) || 1;
  const paginatedTrades = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredTrades.slice(start, start + pageSize);
  }, [filteredTrades, currentPage, pageSize]);

  // Export CSV
  const handleExportCSV = () => {
    if (!filteredTrades || filteredTrades.length === 0) return;
    const headers = [
      'Trade ID',
      'Symbol',
      'Direction',
      'Entry Time IST',
      'Session Window',
      'Entry Price',
      'Initial SL',
      'T1 Hit',
      'Exit Price',
      'Exit Reason',
      'Quantity',
      'R-Multiple',
      'Net PnL',
      'Pattern Tags',
    ];
    const rows = filteredTrades.map((t) => [
      t.tradeId,
      t.symbol,
      t.direction,
      t.entryTimeIST,
      t.sessionWindow,
      t.entryPrice,
      t.initialSL,
      t.t1Hit ? 'YES' : 'NO',
      t.exitPrice,
      t.exitReason,
      t.quantity,
      t.rMultiple,
      t.netPnL,
      t.patternTags?.join(';') || '',
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `15m_ema_crossover_trades_${startDate}_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const summary = results?.summary;

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 min-h-full flex flex-col">
      <Header
        title="15-Minute 9/21 EMA Intraday Backtesting Engine"
        subtitle="Multi-timeframe trend alignment, confirmation entry stops, 1:1 risk-lock, and volatility compression setups."
      />

      <main className="p-4 md:p-6 space-y-6 max-w-7xl w-full mx-auto flex-1">
        {/* ========================================================= */}
        {/* 1. STRATEGY CONFIGURATION & CONTROLS CARD                */}
        {/* ========================================================= */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
                  <Zap className="h-4 w-4" />
                </span>
                <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                  Strategy Parameters & Universe Selection
                </h2>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Configure backtest timeframe (15m), entry windows (09:30-11:00 & 13:45-14:45 IST), and risk filters.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleRunBacktest}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-all disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>Simulating Backtest...</span>
                  </>
                ) : (
                  <>
                    <Play className="h-3.5 w-3.5 fill-current" />
                    <span>Run Backtest</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Stock Universe Chips */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Select Stock Universe ({selectedStocks.length} Selected)
              </label>
              <div className="flex items-center gap-2 text-[11px]">
                <button
                  type="button"
                  onClick={() => selectPreset('CORE')}
                  className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium cursor-pointer"
                >
                  High-Beta Core (6)
                </button>
                <button
                  type="button"
                  onClick={() => selectPreset('WATCHLIST')}
                  className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium cursor-pointer"
                >
                  Watchlist (4)
                </button>
                <button
                  type="button"
                  onClick={() => selectPreset('ALL')}
                  className="px-2 py-0.5 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-medium cursor-pointer"
                >
                  Select All
                </button>
                <button
                  type="button"
                  onClick={() => selectPreset('CLEAR')}
                  className="px-2 py-0.5 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 font-medium cursor-pointer"
                >
                  Clear
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              {ALL_UNIVERSE.map((sym) => {
                const isSelected = selectedStocks.includes(sym);
                const isCore = HIGH_BETA_CORE.includes(sym);
                return (
                  <button
                    key={sym}
                    type="button"
                    onClick={() => toggleStock(sym)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1.5 cursor-pointer ${
                      isSelected
                        ? 'bg-slate-900 border-slate-900 text-white shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span>{sym}</span>
                    {isCore && (
                      <span
                        className={`text-[9px] px-1 rounded ${
                          isSelected ? 'bg-slate-800 text-emerald-400' : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        CORE
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date, Capital, and Rule Toggles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Start Date (IST)
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full text-xs font-medium border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-emerald-500 bg-white"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                End Date (IST)
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full text-xs font-medium border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-emerald-500 bg-white"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Capital per Trade (₹)
              </label>
              <input
                type="number"
                step="10000"
                min="10000"
                value={capitalPerTrade}
                onChange={(e) => setCapitalPerTrade(Number(e.target.value))}
                className="w-full text-xs font-medium border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-emerald-500 bg-white font-mono"
              />
            </div>

            <div className="flex flex-col justify-end space-y-2">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-800 select-none">
                <input
                  type="checkbox"
                  checked={enableMultiTimeframe}
                  onChange={(e) => setEnableMultiTimeframe(e.target.checked)}
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                />
                <span>Daily 20-EMA Trend Filter</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-800 select-none">
                <input
                  type="checkbox"
                  checked={enableNR4Filter}
                  onChange={(e) => setEnableNR4Filter(e.target.checked)}
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                />
                <span>NR4 / Inside Bar Setup Priority</span>
              </label>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 2. TOP KPI SUMMARY GRID                                   */}
        {/* ========================================================= */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard
            title="Win Rate %"
            value={summary ? `${summary.winRatePct}%` : '—'}
            subtitle={summary ? `${summary.winningTrades} W / ${summary.losingTrades} L (${summary.totalTrades} Total)` : 'Run simulation'}
            icon={Target}
            iconBgColor={summary && summary.winRatePct >= 50 ? 'bg-emerald-50' : 'bg-slate-100'}
            iconColor={summary && summary.winRatePct >= 50 ? 'text-emerald-600' : 'text-slate-700'}
            badge={summary ? (summary.winRatePct >= 50 ? 'Edge Verified' : 'Consolidating') : undefined}
            badgeColor={summary && summary.winRatePct >= 50 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'}
          />

          <StatCard
            title="Net Realized PnL"
            value={summary ? `₹${summary.netPnL.toLocaleString('en-IN')}` : '—'}
            subtitle={summary ? `Total Net Returns` : 'Run simulation'}
            icon={DollarSign}
            iconBgColor={summary && summary.netPnL >= 0 ? 'bg-emerald-50' : 'bg-rose-50'}
            iconColor={summary && summary.netPnL >= 0 ? 'text-emerald-600' : 'text-rose-600'}
            badge={summary ? (summary.netPnL >= 0 ? '+PROFIT' : '-LOSS') : undefined}
            badgeColor={summary && summary.netPnL >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}
          />

          <StatCard
            title="Profit Factor"
            value={summary ? summary.profitFactor.toFixed(2) : '—'}
            subtitle={summary ? `Gross Profit / Gross Loss` : 'Run simulation'}
            icon={TrendingUp}
            iconBgColor="bg-blue-50"
            iconColor="text-blue-600"
            badge="Risk-Adjusted"
            badgeColor="bg-blue-100 text-blue-800"
          />

          <StatCard
            title="Morning (9:30-11:00) WR"
            value={summary ? `${summary.morningWindowWinRate}%` : '—'}
            subtitle={summary ? `Afternoon: ${summary.afternoonWindowWinRate}%` : 'Run simulation'}
            icon={Clock}
            iconBgColor="bg-indigo-50"
            iconColor="text-indigo-600"
            badge="Session Split"
            badgeColor="bg-indigo-100 text-indigo-800"
          />

          <StatCard
            title="Expectancy (R) / Max DD"
            value={summary ? `${summary.expectancyR > 0 ? '+' : ''}${summary.expectancyR}R` : '—'}
            subtitle={summary ? `Max Drawdown: ${summary.maxDrawdownPct}%` : 'Run simulation'}
            icon={ShieldAlert}
            iconBgColor="bg-amber-50"
            iconColor="text-amber-600"
            badge="R-Multiple"
            badgeColor="bg-amber-100 text-amber-800"
          />
        </div>

        {/* ========================================================= */}
        {/* 3. STOCK-WISE PERFORMANCE TABLE                           */}
        {/* ========================================================= */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
                <BarChart3 className="h-4 w-4" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                  Stock-Wise Performance Matrix
                </h3>
                <p className="text-xs text-slate-500">
                  Individual stock metrics under 15m 9/21 EMA crossover with 1:1 T1 and trail.
                </p>
              </div>
            </div>

            {selectedStockFilter !== 'ALL' && (
              <button
                type="button"
                onClick={() => setSelectedStockFilter('ALL')}
                className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold cursor-pointer"
              >
                Reset Stock Filter ({selectedStockFilter})
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left text-slate-700">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase tracking-wider font-semibold text-[10px]">
                <tr>
                  <th
                    scope="col"
                    className="px-3.5 py-3 cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={() => handleSortStock('symbol')}
                  >
                    <div className="flex items-center gap-1">
                      <span>Stock Symbol</span>
                      <ArrowUpDown className="h-3 w-3 text-slate-400" />
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-3.5 py-3 text-right cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={() => handleSortStock('totalTrades')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Trades</span>
                      <ArrowUpDown className="h-3 w-3 text-slate-400" />
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-3.5 py-3 text-right cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={() => handleSortStock('winRatePct')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Win Rate %</span>
                      <ArrowUpDown className="h-3 w-3 text-slate-400" />
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-3.5 py-3 text-right cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={() => handleSortStock('profitFactor')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Profit Factor</span>
                      <ArrowUpDown className="h-3 w-3 text-slate-400" />
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-3.5 py-3 text-right cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={() => handleSortStock('expectancyR')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Avg R</span>
                      <ArrowUpDown className="h-3 w-3 text-slate-400" />
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-3.5 py-3 text-right cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={() => handleSortStock('morningWindowWinRate')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Morning WR%</span>
                      <ArrowUpDown className="h-3 w-3 text-slate-400" />
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-3.5 py-3 text-right cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={() => handleSortStock('afternoonWindowWinRate')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Afternoon WR%</span>
                      <ArrowUpDown className="h-3 w-3 text-slate-400" />
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-3.5 py-3 text-right cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={() => handleSortStock('netPnL')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Net Realized PnL (₹)</span>
                      <ArrowUpDown className="h-3 w-3 text-slate-400" />
                    </div>
                  </th>
                  <th scope="col" className="px-3.5 py-3 text-center">
                    Best Setup Tag
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedStockBreakdown.map((s) => {
                  const isFiltered = selectedStockFilter === s.symbol;
                  return (
                    <tr
                      key={s.symbol}
                      onClick={() => setSelectedStockFilter(isFiltered ? 'ALL' : s.symbol)}
                      className={`cursor-pointer transition-colors ${
                        isFiltered
                          ? 'bg-emerald-50/70 font-semibold'
                          : 'hover:bg-slate-50/80'
                      }`}
                    >
                      <td className="px-3.5 py-3 font-bold text-slate-900 flex items-center gap-2">
                        <span>{s.symbol}</span>
                        {isFiltered && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-600 text-white font-medium">
                            Active
                          </span>
                        )}
                      </td>
                      <td className="px-3.5 py-3 text-right font-mono text-slate-700">
                        {s.totalTrades}
                      </td>
                      <td className="px-3.5 py-3 text-right font-mono font-bold">
                        <span
                          className={
                            s.winRatePct >= 50
                              ? 'text-emerald-700'
                              : s.winRatePct >= 40
                              ? 'text-slate-800'
                              : 'text-rose-700'
                          }
                        >
                          {s.winRatePct}%
                        </span>
                      </td>
                      <td className="px-3.5 py-3 text-right font-mono text-slate-800">
                        {s.profitFactor.toFixed(2)}
                      </td>
                      <td className="px-3.5 py-3 text-right font-mono">
                        <span
                          className={
                            s.expectancyR > 0
                              ? 'text-emerald-700 font-semibold'
                              : 'text-slate-600'
                          }
                        >
                          {s.expectancyR > 0 ? '+' : ''}
                          {s.expectancyR}R
                        </span>
                      </td>
                      <td className="px-3.5 py-3 text-right font-mono text-slate-700">
                        {s.morningWindowWinRate}%
                      </td>
                      <td className="px-3.5 py-3 text-right font-mono text-slate-700">
                        {s.afternoonWindowWinRate}%
                      </td>
                      <td
                        className={`px-3.5 py-3 text-right font-mono font-bold ${
                          s.netPnL >= 0 ? 'text-emerald-700' : 'text-rose-700'
                        }`}
                      >
                        {s.netPnL >= 0 ? `+₹${s.netPnL.toLocaleString('en-IN')}` : `₹${s.netPnL.toLocaleString('en-IN')}`}
                      </td>
                      <td className="px-3.5 py-3 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                          {s.bestSetupTag}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 4. TRADE EXECUTION LOG & AUDIT JOURNAL                    */}
        {/* ========================================================= */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
                <Layers className="h-4 w-4" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                  Trade Execution Log ({filteredTrades.length} Trades)
                </h3>
                <p className="text-xs text-slate-500">
                  Granular trade-by-trade simulated entries, confirmation triggers, T1/T2 outcomes, and R-multiples.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportCSV}
                disabled={filteredTrades.length === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold shadow-xs disabled:opacity-50 cursor-pointer"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          {/* Trade Filter Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200/70">
            <div>
              <div className="relative">
                <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Search trade ID or symbol..."
                  value={tradeSearch}
                  onChange={(e) => {
                    setTradeSearch(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full text-xs pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-emerald-500"
                />
              </div>
            </div>

            <div>
              <select
                value={selectedStockFilter}
                onChange={(e) => {
                  setSelectedStockFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full text-xs px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-emerald-500 font-medium"
              >
                <option value="ALL">All Stocks</option>
                {ALL_UNIVERSE.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <select
                value={tradeDirectionFilter}
                onChange={(e) => {
                  setTradeDirectionFilter(e.target.value as any);
                  setCurrentPage(1);
                }}
                className="w-full text-xs px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-emerald-500 font-medium"
              >
                <option value="ALL">All Directions</option>
                <option value="LONG">LONG Only</option>
                <option value="SHORT">SHORT Only</option>
              </select>
            </div>

            <div>
              <select
                value={tradeExitReasonFilter}
                onChange={(e) => {
                  setTradeExitReasonFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full text-xs px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-emerald-500 font-medium"
              >
                <option value="ALL">All Exit Reasons</option>
                <option value="T2_TARGET">T2 Target Hit</option>
                <option value="T1_PLUS_TRAIL">T1 Hit + 9 EMA Trail</option>
                <option value="INITIAL_SL">Initial SL Hit</option>
                <option value="EOD_1515">15:15 IST Square-off</option>
              </select>
            </div>
          </div>

          {/* Trade Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left text-slate-700">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase tracking-wider font-semibold text-[10px]">
                <tr>
                  <th scope="col" className="px-3 py-2.5">Trade ID</th>
                  <th scope="col" className="px-3 py-2.5">Symbol</th>
                  <th scope="col" className="px-3 py-2.5">Side</th>
                  <th scope="col" className="px-3 py-2.5">Entry Time (IST)</th>
                  <th scope="col" className="px-3 py-2.5">Session Window</th>
                  <th scope="col" className="px-3 py-2.5">Pattern</th>
                  <th scope="col" className="px-3 py-2.5 text-right">Entry (₹)</th>
                  <th scope="col" className="px-3 py-2.5 text-right">SL (₹)</th>
                  <th scope="col" className="px-3 py-2.5 text-center">T1 Hit</th>
                  <th scope="col" className="px-3 py-2.5 text-right">Exit (₹)</th>
                  <th scope="col" className="px-3 py-2.5">Exit Reason</th>
                  <th scope="col" className="px-3 py-2.5 text-right">Qty</th>
                  <th scope="col" className="px-3 py-2.5 text-right">R-Mult</th>
                  <th scope="col" className="px-3 py-2.5 text-right">Net PnL (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                {paginatedTrades.length === 0 ? (
                  <tr>
                    <td colSpan={14} className="px-4 py-8 text-center text-slate-400 font-sans text-xs">
                      No trades found matching current filter criteria.
                    </td>
                  </tr>
                ) : (
                  paginatedTrades.map((t) => {
                    const isWin = t.netPnL > 0;
                    return (
                      <tr key={t.tradeId} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-3 py-2.5 font-bold text-slate-900">{t.tradeId}</td>
                        <td className="px-3 py-2.5 font-sans font-bold text-slate-800">{t.symbol}</td>
                        <td className="px-3 py-2.5 font-sans">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              t.direction === 'LONG'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}
                          >
                            {t.direction}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-slate-600 whitespace-nowrap">
                          {t.entryTimeIST}
                        </td>
                        <td className="px-3 py-2.5 font-sans text-[11px]">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                              t.sessionWindow?.includes('Morning')
                                ? 'bg-indigo-50 text-indigo-700'
                                : 'bg-amber-50 text-amber-700'
                            }`}
                          >
                            {t.sessionWindow?.includes('Morning') ? 'Morning 9:30-11:00' : 'Afternoon 1:45-2:45'}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 font-sans text-[10px]">
                          <div className="flex flex-wrap gap-1">
                            {t.patternTags?.map((tag) => (
                              <span
                                key={tag}
                                className={`px-1.5 py-0.2 rounded font-medium ${
                                  tag === 'NR4'
                                    ? 'bg-purple-100 text-purple-800'
                                    : tag === 'InsideBar'
                                    ? 'bg-blue-100 text-blue-800'
                                    : tag === 'Engulfing'
                                    ? 'bg-cyan-100 text-cyan-800'
                                    : 'bg-slate-100 text-slate-700'
                                }`}
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-right font-bold text-slate-900">
                          ₹{t.entryPrice.toFixed(2)}
                        </td>
                        <td className="px-3 py-2.5 text-right text-slate-600">
                          ₹{t.initialSL.toFixed(2)}
                        </td>
                        <td className="px-3 py-2.5 text-center font-sans">
                          {t.t1Hit ? (
                            <span className="inline-flex items-center text-emerald-600 font-bold text-[10px]">
                              <CheckCircle2 className="h-3 w-3 mr-0.5" /> 1:1
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[10px]">No</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-right text-slate-800">
                          ₹{t.exitPrice.toFixed(2)}
                        </td>
                        <td className="px-3 py-2.5 font-sans">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                              t.exitReason === 'T2_TARGET'
                                ? 'bg-emerald-100 text-emerald-800'
                                : t.exitReason === 'T1_PLUS_TRAIL'
                                ? 'bg-blue-100 text-blue-800'
                                : t.exitReason === 'INITIAL_SL'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {t.exitReason}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-right text-slate-700">{t.quantity}</td>
                        <td
                          className={`px-3 py-2.5 text-right font-bold ${
                            t.rMultiple > 0 ? 'text-emerald-700' : 'text-rose-700'
                          }`}
                        >
                          {t.rMultiple > 0 ? `+${t.rMultiple}R` : `${t.rMultiple}R`}
                        </td>
                        <td
                          className={`px-3 py-2.5 text-right font-bold ${
                            isWin ? 'text-emerald-700' : 'text-rose-700'
                          }`}
                        >
                          {isWin ? `+₹${t.netPnL.toFixed(2)}` : `₹${t.netPnL.toFixed(2)}`}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
            <span className="text-slate-500 font-medium">
              Showing {filteredTrades.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} to{' '}
              {Math.min(currentPage * pageSize, filteredTrades.length)} of {filteredTrades.length} trades
            </span>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="px-3 py-1 font-semibold text-slate-700">
                Page {currentPage} of {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 disabled:opacity-40 cursor-pointer"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

