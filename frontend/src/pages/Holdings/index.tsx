import React, { useState } from "react";
import { Header } from "../../components/layout/Header";
import { useGetGrowwHoldingsQuery } from "../../api/growwApi";
import {
  PieChart,
  Search,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import { toast } from "react-toastify";

export default function HoldingsPage() {
  const { data: holdingsData, isLoading, refetch } = useGetGrowwHoldingsQuery();
  const [searchTerm, setSearchTerm] = useState("");

  const holdingsPayload = holdingsData?.data;
  const list = holdingsPayload?.holdings || [];

  const filteredHoldings = list.filter(
    (item) =>
      item.tradingSymbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.isin.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleRefresh = async () => {
    try {
      await refetch();
      toast.success("Demat holdings synchronized with Groww!");
    } catch {
      toast.error("Failed to refresh holdings");
    }
  };

  const totalInvested = holdingsPayload?.totalInvested || 0;

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 min-h-full flex flex-col">
      <Header
        title="Demat Stock Holdings"
        subtitle="Long-term delivery equity assets, ETFs, and portfolio distribution."
      />

      <main className="p-4 md:p-6 space-y-6 max-w-7xl w-full mx-auto flex-1">
        {/* KPI Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Invested Capital
            </span>
            <p className="mt-2 text-2xl font-bold text-slate-900 font-mono">
              ₹{totalInvested.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </p>
            <span className="text-xs text-emerald-600 font-medium">In {list.length} Assets</span>
          </div>

          <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Assets in Demat
            </span>
            <p className="mt-2 text-2xl font-bold text-slate-900">
              {list.length} Holdings
            </p>
            <span className="text-xs text-slate-400">Equity & ETF Shares</span>
          </div>

          <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Demat Free Quantity
            </span>
            <p className="mt-2 text-2xl font-bold text-slate-900">
              {list.reduce((acc, h) => acc + h.dematFreeQuantity, 0).toLocaleString()} Shares
            </p>
            <span className="text-xs text-emerald-600 font-medium">100% Unencumbered</span>
          </div>
        </div>

        {/* Table & Search Header */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by Symbol (e.g. GROWW, ITBEES) or ISIN..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>

            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
              <span>Refresh Holdings</span>
            </button>
          </div>

          {/* Holdings Data Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-y border-slate-200">
                <tr>
                  <th className="py-3 px-4">Asset / Symbol</th>
                  <th className="py-3 px-4">ISIN</th>
                  <th className="py-3 px-4 text-right">Holding Qty</th>
                  <th className="py-3 px-4 text-right">Free Demat Qty</th>
                  <th className="py-3 px-4 text-right">Average Buy Price</th>
                  <th className="py-3 px-4 text-right">Invested Value</th>
                  <th className="py-3 px-4 text-center">Exchanges</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredHoldings.length > 0 ? (
                  filteredHoldings.map((holding) => (
                    <tr key={holding.isin} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900 text-sm">
                        {holding.tradingSymbol}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-500">
                        {holding.isin}
                      </td>
                      <td className="py-3.5 px-4 text-right font-semibold text-slate-900">
                        {holding.quantity.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 text-right text-emerald-700 font-semibold">
                        {holding.dematFreeQuantity.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-medium">
                        ₹{holding.averagePrice.toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                        ₹{holding.investedValue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {holding.tradableExchanges.map((ex) => (
                            <span
                              key={ex}
                              className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200"
                            >
                              {ex}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      {isLoading ? "Fetching holdings from Groww..." : "No matching holdings found."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}

