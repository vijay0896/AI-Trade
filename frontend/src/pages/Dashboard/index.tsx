import React from "react";
import { Link } from "react-router-dom";
import {
  Wallet,
  PieChart,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Server,
  Layers,
  Clock,
  RefreshCw,
} from "lucide-react";
import { Header } from "../../components/layout/Header";
import { StatCard } from "../../components/common/StatCard";
import {
  useGetGrowwStatusQuery,
  useGetGrowwProfileQuery,
  useGetGrowwFundsQuery,
  useGetGrowwHoldingsQuery,
  useConnectGrowwMutation,
} from "../../api/growwApi";
import { toast } from "react-toastify";

export default function DashboardPage() {
  const { data: statusData, isLoading: isStatusLoading } = useGetGrowwStatusQuery();
  const { data: profileData, isLoading: isProfileLoading } = useGetGrowwProfileQuery();
  const { data: fundsData, isLoading: isFundsLoading } = useGetGrowwFundsQuery();
  const { data: holdingsData, isLoading: isHoldingsLoading } = useGetGrowwHoldingsQuery();
  const [connectGroww, { isLoading: isConnecting }] = useConnectGrowwMutation();

  const session = statusData?.data;
  const profile = profileData?.data;
  const funds = fundsData?.data;
  const holdings = holdingsData?.data;

  const handleReconnect = async () => {
    try {
      await connectGroww().unwrap();
      toast.success("Groww account reconnected successfully!");
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to connect Groww account");
    }
  };

  const isConnected = session?.isConnected;

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 min-h-full flex flex-col">
      <Header
        title="Trading Overview & Account Dashboard"
        subtitle="Real-time Groww account connection, portfolio valuation, and margin surveillance."
      />

      <main className="p-4 md:p-6 space-y-6 max-w-7xl w-full mx-auto flex-1">
        {/* Connection Alert Banner if Disconnected */}
        {!isConnected && !isStatusLoading && (
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-amber-900">
                  Groww Broker API Not Connected
                </p>
                <p className="text-xs text-amber-700">
                  Click connect to generate a TOTP token and establish real-time session.
                </p>
              </div>
            </div>
            <button
              onClick={handleReconnect}
              disabled={isConnecting}
              className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-xs disabled:opacity-50"
            >
              {isConnecting ? "Connecting..." : "Connect Now"}
            </button>
          </div>
        )}

        {/* 1. TOP EXECUTIVE KPI BANNER STRIP */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Demat Invested"
            value={`₹${(holdings?.totalInvested || 0).toLocaleString("en-IN", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`}
            subtitle={`${holdings?.totalHoldingsCount || 0} Assets in Portfolio`}
            icon={PieChart}
            iconBgColor="bg-emerald-50"
            iconColor="text-emerald-600"
            badge="Holdings"
            badgeColor="bg-emerald-100 text-emerald-800"
          />

          <StatCard
            title="Available Clear Cash"
            value={`₹${(funds?.summary?.clearCash || 0).toLocaleString("en-IN", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`}
            subtitle={`Collateral: ₹${funds?.summary?.collateralAvailable || 0}`}
            icon={Wallet}
            iconBgColor="bg-blue-50"
            iconColor="text-blue-600"
            badge="Cash Balance"
            badgeColor="bg-blue-100 text-blue-800"
          />

          <StatCard
            title="Net Margin Used"
            value={`₹${(funds?.summary?.netMarginUsed || 0).toLocaleString("en-IN", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`}
            subtitle="Equity & F&O Utilized"
            icon={TrendingUp}
            iconBgColor="bg-violet-50"
            iconColor="text-violet-600"
            badge="0.00% Utilized"
            badgeColor="bg-slate-100 text-slate-700"
          />

          <StatCard
            title="Groww Session Status"
            value={isConnected ? "Active & Syncing" : "Disconnected"}
            subtitle={
              session?.expiresInMinutes
                ? `Daily Token: ${Math.round(session.expiresInMinutes / 60)}h remaining`
                : "Needs TOTP login"
            }
            icon={ShieldCheck}
            iconBgColor={isConnected ? "bg-emerald-50" : "bg-rose-50"}
            iconColor={isConnected ? "text-emerald-600" : "text-rose-600"}
            badge={isConnected ? "Connected" : "Inactive"}
            badgeColor={isConnected ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}
          />
        </div>

        {/* 2. SPLIT SECTION: CONNECTION RADAR & PROFILE SUMMARY */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Groww Connection Details Card (2 Cols) */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xs">
                  GRW
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Groww Broker Integration Hub
                  </h3>
                  <p className="text-xs text-slate-500">
                    Automated TOTP session authentication & API synchronization
                  </p>
                </div>
              </div>

              <button
                onClick={handleReconnect}
                disabled={isConnecting}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`h-3 w-3 ${isConnecting ? "animate-spin" : ""}`} />
                <span>{isConnecting ? "Refreshing..." : "Force Refresh"}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-[11px] font-medium text-slate-500 block">Session Name</span>
                <span className="text-xs font-bold text-slate-900">{session?.sessionName || "AI-Trade"}</span>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-[11px] font-medium text-slate-500 block">Auth Method</span>
                <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3 text-emerald-600 inline" />
                  TOTP (RFC 6238)
                </span>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-[11px] font-medium text-slate-500 block">Token Ref ID</span>
                <span className="text-xs font-mono font-medium text-slate-700 truncate block" title={session?.tokenRefId || ""}>
                  {session?.tokenRefId ? `${session.tokenRefId.slice(0, 14)}...` : "N/A"}
                </span>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-[11px] font-medium text-slate-500 block">Account UCC</span>
                <span className="text-xs font-bold text-slate-900">{profile?.ucc || "N/A"}</span>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-[11px] font-medium text-slate-500 block">Daily Expiry</span>
                <span className="text-xs font-medium text-slate-700 flex items-center gap-1">
                  <Clock className="h-3 w-3 text-slate-400" />
                  {session?.expiresAt ? new Date(session.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "06:00 AM"}
                </span>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-[11px] font-medium text-slate-500 block">DDPI Status</span>
                <span className="text-xs font-medium text-slate-700">
                  {profile?.ddpiEnabled ? "Enabled" : "Disabled (Standard)"}
                </span>
              </div>
            </div>

            {/* Segment Chips */}
            <div className="pt-2 flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">Active Segments:</span>
              {profile?.activeSegments && profile.activeSegments.length > 0 ? (
                profile.activeSegments.map((segment) => (
                  <span
                    key={segment}
                    className="px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200"
                  >
                    {segment}
                  </span>
                ))
              ) : (
                <span className="text-xs text-slate-400">Loading segments...</span>
              )}

              <span className="ml-auto text-xs font-semibold text-slate-500">Exchanges:</span>
              <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${profile?.nseEnabled ? "bg-blue-50 text-blue-700 border border-blue-200" : "bg-slate-100 text-slate-400"}`}>
                NSE {profile?.nseEnabled ? "✓" : "✗"}
              </span>
              <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${profile?.bseEnabled ? "bg-indigo-50 text-indigo-700 border border-indigo-200" : "bg-slate-100 text-slate-400"}`}>
                BSE {profile?.bseEnabled ? "✓" : "✗"}
              </span>
            </div>
          </div>

          {/* Right: Quick Navigation & Profile Card (1 Col) */}
          <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">Trading Quick Links</h3>
                <Server className="h-4 w-4 text-slate-400" />
              </div>
              <p className="text-xs text-slate-500">
                Direct access to account balances, demat holdings, and broker profile details.
              </p>

              <div className="space-y-2 pt-1">
                <Link
                  to="/funds"
                  className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/30 transition-all text-xs font-semibold text-slate-700 hover:text-emerald-700 group"
                >
                  <div className="flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-slate-400 group-hover:text-emerald-600" />
                    <span>View Margins & Cash</span>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                </Link>

                <Link
                  to="/holdings"
                  className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/30 transition-all text-xs font-semibold text-slate-700 hover:text-emerald-700 group"
                >
                  <div className="flex items-center gap-2">
                    <PieChart className="h-4 w-4 text-slate-400 group-hover:text-emerald-600" />
                    <span>Demat Holdings ({holdings?.totalHoldingsCount || 0})</span>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                </Link>

                <Link
                  to="/profile"
                  className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/30 transition-all text-xs font-semibold text-slate-700 hover:text-emerald-700 group"
                >
                  <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4 text-slate-400 group-hover:text-emerald-600" />
                    <span>Profile & Security Details</span>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 mt-4 text-[11px] text-slate-400 flex items-center justify-between">
              <span>Environment: Local Node.js</span>
              <span className="font-mono text-emerald-600 font-medium">Port 5001</span>
            </div>
          </div>
        </div>

        {/* 3. DEMAT HOLDINGS SNAPSHOT TABLE */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Demat Holdings Snapshot
              </h3>
              <p className="text-xs text-slate-500">
                Stocks and ETFs stored in your linked Demat repository
              </p>
            </div>
            <Link
              to="/holdings"
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-y border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Symbol</th>
                  <th className="py-2.5 px-3">Quantity</th>
                  <th className="py-2.5 px-3">Average Price</th>
                  <th className="py-2.5 px-3">Invested Value</th>
                  <th className="py-2.5 px-3">Tradable Exchanges</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {holdings?.holdings && holdings.holdings.length > 0 ? (
                  holdings.holdings.map((holding) => (
                    <tr key={holding.isin} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900">{holding.tradingSymbol}</div>
                        <div className="text-[10px] font-mono text-slate-400">{holding.isin}</div>
                      </td>
                      <td className="py-3 px-3 font-semibold">{holding.quantity}</td>
                      <td className="py-3 px-3 font-mono">₹{holding.averagePrice.toFixed(2)}</td>
                      <td className="py-3 px-3 font-mono font-bold text-slate-900">
                        ₹{holding.investedValue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1">
                          {holding.tradableExchanges.map((ex) => (
                            <span
                              key={ex}
                              className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200"
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
                    <td colSpan={5} className="py-6 text-center text-slate-400">
                      {isHoldingsLoading ? "Loading holdings from Groww API..." : "No holdings found."}
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

