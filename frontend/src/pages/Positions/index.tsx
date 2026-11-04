import React from "react";
import { Header } from "../../components/layout/Header";
import { useGetGrowwPositionsQuery } from "../../api/growwApi";
import { TrendingUp, RefreshCw, Layers } from "lucide-react";
import { toast } from "react-toastify";

export default function PositionsPage() {
  const { data: positionsData, isLoading, refetch } = useGetGrowwPositionsQuery();
  const positionsPayload = positionsData?.data;
  const positions = positionsPayload?.positions || [];

  const handleRefresh = async () => {
    try {
      await refetch();
      toast.success("Live positions refreshed!");
    } catch {
      toast.error("Failed to refresh positions");
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 min-h-full flex flex-col">
      <Header
        title="Live Trading Positions"
        subtitle="Open intraday (MIS) and derivatives (F&O) contracts currently active in the market."
      />

      <main className="p-4 md:p-6 space-y-6 max-w-7xl w-full mx-auto flex-1">
        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Active Positions ({positions.length})
              </h3>
              <p className="text-xs text-slate-500">
                Positions are updated in real-time as orders fill during market hours.
              </p>
            </div>

            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
              <span>Refresh Positions</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-y border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Symbol</th>
                  <th className="py-2.5 px-3">Segment</th>
                  <th className="py-2.5 px-3">Product</th>
                  <th className="py-2.5 px-3 text-right">Net Qty</th>
                  <th className="py-2.5 px-3 text-right">Buy Qty</th>
                  <th className="py-2.5 px-3 text-right">Sell Qty</th>
                  <th className="py-2.5 px-3 text-right">Realised P&L</th>
                  <th className="py-2.5 px-3 text-right">Unrealised P&L</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {positions.length > 0 ? (
                  positions.map((pos, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3 font-bold text-slate-900">
                        {pos.tradingSymbol}
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700">
                          {pos.segment}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-semibold text-slate-600">{pos.product}</td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                        {pos.netQuantity}
                      </td>
                      <td className="py-3 px-3 text-right font-mono">{pos.buyQuantity}</td>
                      <td className="py-3 px-3 text-right font-mono">{pos.sellQuantity}</td>
                      <td className={`py-3 px-3 text-right font-mono font-semibold ${pos.realisedPnl >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                        ₹{pos.realisedPnl.toFixed(2)}
                      </td>
                      <td className={`py-3 px-3 text-right font-mono font-semibold ${pos.unrealisedPnl >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                        ₹{pos.unrealisedPnl.toFixed(2)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      <div className="max-w-xs mx-auto space-y-2">
                        <TrendingUp className="h-8 w-8 text-slate-300 mx-auto" />
                        <p className="text-xs font-semibold text-slate-600">No Open Positions</p>
                        <p className="text-[11px] text-slate-400">
                          You currently have no open intraday (MIS) or F&O positions in this account.
                        </p>
                      </div>
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

