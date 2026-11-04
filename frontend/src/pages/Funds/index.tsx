import React from "react";
import { Header } from "../../components/layout/Header";
import { useGetGrowwFundsQuery } from "../../api/growwApi";
import {
  Wallet,
  Coins,
  TrendingDown,
  Layers,
  ShieldCheck,
  RefreshCw,
  Info,
} from "lucide-react";
import { toast } from "react-toastify";

export default function FundsPage() {
  const { data: fundsData, isLoading, refetch } = useGetGrowwFundsQuery();
  const funds = fundsData?.data;

  const handleRefresh = async () => {
    try {
      await refetch();
      toast.success("Funds & Margin balance refreshed!");
    } catch {
      toast.error("Failed to refresh margin balance");
    }
  };

  const formatCurrency = (val?: number) => {
    return `₹${(val || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 min-h-full flex flex-col">
      <Header
        title="Funds & Trading Margins"
        subtitle="Real-time cash ledger, collateral limits, and segment-wise margin limits."
      />

      <main className="p-4 md:p-6 space-y-6 max-w-6xl w-full mx-auto flex-1">
        {/* Top Summary Header */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Total Available Trading Capital
              </span>
              <p className="text-2xl font-bold text-slate-900">
                {formatCurrency(funds?.summary?.totalAvailableBalance)}
              </p>
            </div>
          </div>

          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span>Refresh Funds</span>
          </button>
        </div>

        {/* Four Key Margin Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase">Clear Cash</span>
              <Coins className="h-4 w-4 text-emerald-600" />
            </div>
            <p className="mt-2 text-xl font-bold text-slate-900">
              {formatCurrency(funds?.summary?.clearCash)}
            </p>
            <span className="text-[11px] text-slate-400">Direct trading balance</span>
          </div>

          <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase">Net Margin Used</span>
              <TrendingDown className="h-4 w-4 text-rose-500" />
            </div>
            <p className="mt-2 text-xl font-bold text-slate-900">
              {formatCurrency(funds?.summary?.netMarginUsed)}
            </p>
            <span className="text-[11px] text-slate-400">Utilized across all orders</span>
          </div>

          <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase">Collateral Available</span>
              <ShieldCheck className="h-4 w-4 text-blue-600" />
            </div>
            <p className="mt-2 text-xl font-bold text-slate-900">
              {formatCurrency(funds?.summary?.collateralAvailable)}
            </p>
            <span className="text-[11px] text-slate-400">From pledged holdings</span>
          </div>

          <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase">Charges & Brokerage</span>
              <Info className="h-4 w-4 text-slate-400" />
            </div>
            <p className="mt-2 text-xl font-bold text-slate-900">
              {formatCurrency(funds?.summary?.brokerageAndCharges)}
            </p>
            <span className="text-[11px] text-slate-400">Accrued daily fees</span>
          </div>
        </div>

        {/* Detailed Breakdown Grids: Equity & FNO */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Equity Margins Card */}
          <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900">Equity Margin Details</h3>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700">
                CASH SEGMENT
              </span>
            </div>

            <div className="divide-y divide-slate-100 text-xs">
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-slate-600">CNC Balance Available (Delivery)</span>
                <span className="font-mono font-bold text-slate-900">
                  {formatCurrency(funds?.equity?.cncBalanceAvailable)}
                </span>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-slate-600">MIS Balance Available (Intraday)</span>
                <span className="font-mono font-bold text-slate-900">
                  {formatCurrency(funds?.equity?.misBalanceAvailable)}
                </span>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-slate-600">CNC Margin Used</span>
                <span className="font-mono font-medium text-slate-700">
                  {formatCurrency(funds?.equity?.cncMarginUsed)}
                </span>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-slate-600">MIS Margin Used</span>
                <span className="font-mono font-medium text-slate-700">
                  {formatCurrency(funds?.equity?.misMarginUsed)}
                </span>
              </div>
              <div className="py-2.5 flex items-center justify-between font-semibold">
                <span className="text-slate-900">Net Equity Margin Used</span>
                <span className="font-mono text-emerald-700">
                  {formatCurrency(funds?.equity?.netEquityMarginUsed)}
                </span>
              </div>
            </div>
          </div>

          {/* F&O Margins Card */}
          <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">F&O Derivatives Margins</h3>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700">
                F&O SEGMENT
              </span>
            </div>

            <div className="divide-y divide-slate-100 text-xs">
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-slate-600">Futures Balance Available</span>
                <span className="font-mono font-bold text-slate-900">
                  {formatCurrency(funds?.fno?.futureBalanceAvailable)}
                </span>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-slate-600">Option Buy Balance Available</span>
                <span className="font-mono font-bold text-slate-900">
                  {formatCurrency(funds?.fno?.optionBuyBalanceAvailable)}
                </span>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-slate-600">Option Sell Balance Available</span>
                <span className="font-mono font-bold text-slate-900">
                  {formatCurrency(funds?.fno?.optionSellBalanceAvailable)}
                </span>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-slate-600">Span Margin Used</span>
                <span className="font-mono font-medium text-slate-700">
                  {formatCurrency(funds?.fno?.spanMarginUsed)}
                </span>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-slate-600">Exposure Margin Used</span>
                <span className="font-mono font-medium text-slate-700">
                  {formatCurrency(funds?.fno?.exposureMarginUsed)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Commodity Margin Card */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900">Commodity Segment Margins</h3>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700">
              COMMODITY
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-slate-400 block">Span Margin</span>
              <span className="font-mono font-bold text-slate-800">
                {formatCurrency(funds?.commodity?.spanMargin)}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block">Exposure Margin</span>
              <span className="font-mono font-bold text-slate-800">
                {formatCurrency(funds?.commodity?.exposureMargin)}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block">Unrealised M2M</span>
              <span className="font-mono font-bold text-slate-800">
                {formatCurrency(funds?.commodity?.unrealisedM2m)}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block">Realised M2M</span>
              <span className="font-mono font-bold text-slate-800">
                {formatCurrency(funds?.commodity?.realisedM2m)}
              </span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

