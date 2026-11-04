import React from "react";
import { Header } from "../../components/layout/Header";
import {
  useGetGrowwProfileQuery,
  useGetGrowwStatusQuery,
  useConnectGrowwMutation,
} from "../../api/growwApi";
import {
  UserCheck,
  ShieldCheck,
  KeyRound,
  CheckCircle2,
  RefreshCw,
  Server,
  Layers,
  Clock,
  Check,
  X,
} from "lucide-react";
import { toast } from "react-toastify";

export default function ProfilePage() {
  const { data: profileData, isLoading: isProfileLoading, refetch } = useGetGrowwProfileQuery();
  const { data: statusData } = useGetGrowwStatusQuery();
  const [connectGroww, { isLoading: isConnecting }] = useConnectGrowwMutation();

  const profile = profileData?.data;
  const session = statusData?.data;

  const handleReconnect = async () => {
    try {
      await connectGroww().unwrap();
      await refetch();
      toast.success("Profile synchronized with Groww broker!");
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to reconnect Groww");
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 min-h-full flex flex-col">
      <Header
        title="Broker Account Profile"
        subtitle="Verified Groww account credentials, exchange enablement, and trading permissions."
      />

      <main className="p-4 md:p-6 space-y-6 max-w-5xl w-full mx-auto flex-1">
        {/* Main Profile Card */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-5 md:p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
            <div className="flex items-center gap-3.5">
              <div className="h-12 w-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 flex items-center justify-center font-bold text-lg">
                <UserCheck className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-base md:text-lg font-bold text-slate-900 flex items-center gap-2">
                  <span>Groww Trading Account</span>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                    Verified
                  </span>
                </h2>
                <p className="text-xs text-slate-500">
                  UCC: <span className="font-mono font-bold text-slate-800">{profile?.ucc || "Loading..."}</span>
                </p>
              </div>
            </div>

            <button
              onClick={handleReconnect}
              disabled={isConnecting}
              className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isConnecting ? "animate-spin" : ""}`} />
              <span>{isConnecting ? "Syncing..." : "Sync Profile"}</span>
            </button>
          </div>

          {/* Account Attributes Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-slate-50/80 border border-slate-100 space-y-1">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Unique Client Code (UCC)
              </span>
              <p className="text-sm font-mono font-bold text-slate-900">
                {profile?.ucc || "N/A"}
              </p>
            </div>

            <div className="p-4 rounded-lg bg-slate-50/80 border border-slate-100 space-y-1">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Vendor User ID
              </span>
              <p className="text-xs font-mono font-medium text-slate-700 break-all">
                {profile?.vendorUserId || "N/A"}
              </p>
            </div>

            <div className="p-4 rounded-lg bg-slate-50/80 border border-slate-100 space-y-1">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                DDPI (Demat Debit and Pledge Instruction)
              </span>
              <p className="text-xs font-medium text-slate-700 flex items-center gap-1.5">
                {profile?.ddpiEnabled ? (
                  <span className="text-emerald-700 font-semibold flex items-center gap-1">
                    <Check className="h-3.5 w-3.5 text-emerald-600" /> Enabled
                  </span>
                ) : (
                  <span className="text-slate-600 flex items-center gap-1">
                    <X className="h-3.5 w-3.5 text-slate-400" /> Disabled (Standard E-DIS authorization required)
                  </span>
                )}
              </p>
            </div>

            <div className="p-4 rounded-lg bg-slate-50/80 border border-slate-100 space-y-1">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Session Active Status
              </span>
              <p className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                {session?.active ? "Active & Authorized" : "Active"}
              </p>
            </div>
          </div>

          {/* Exchanges Section */}
          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Exchange Trading Permissions
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3.5 rounded-lg border border-slate-200/80 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="h-7 w-7 rounded bg-blue-50 text-blue-700 font-bold text-xs flex items-center justify-center">
                    NSE
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">National Stock Exchange</p>
                    <p className="text-[11px] text-slate-400">Equity & Derivatives</p>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${profile?.nseEnabled ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-slate-100 text-slate-500"}`}>
                  {profile?.nseEnabled ? "Enabled" : "Disabled"}
                </span>
              </div>

              <div className="p-3.5 rounded-lg border border-slate-200/80 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="h-7 w-7 rounded bg-indigo-50 text-indigo-700 font-bold text-xs flex items-center justify-center">
                    BSE
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">Bombay Stock Exchange</p>
                    <p className="text-[11px] text-slate-400">Equity Segments</p>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${profile?.bseEnabled ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-slate-100 text-slate-500"}`}>
                  {profile?.bseEnabled ? "Enabled" : "Disabled"}
                </span>
              </div>
            </div>
          </div>

          {/* Active Segments Section */}
          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Active Trading Segments
            </h3>
            <div className="flex flex-wrap gap-2.5">
              {profile?.activeSegments && profile.activeSegments.length > 0 ? (
                profile.activeSegments.map((segment) => (
                  <div
                    key={segment}
                    className="px-3.5 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 font-semibold text-xs flex items-center gap-2"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    <span>{segment}</span>
                  </div>
                ))
              ) : (
                <span className="text-xs text-slate-400">No segments enabled</span>
              )}
            </div>
          </div>
        </div>

        {/* Security & Authentication Info */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5">
            <KeyRound className="h-5 w-5 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900">
              Authentication Architecture (TOTP RFC 6238)
            </h3>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Your AI Trading System utilizes Groww's official TOTP-based authentication API. A 6-digit Time-based One-Time Password is generated mathematically on the server using your configured <code className="bg-slate-100 text-emerald-800 px-1 py-0.5 rounded font-mono">TOTPQR</code> secret key. The daily session token automatically refreshes when required.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-xs">
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
              <span className="text-slate-400 block text-[11px]">API Host</span>
              <span className="font-mono font-medium text-slate-800">api.groww.in</span>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
              <span className="text-slate-400 block text-[11px]">API Version</span>
              <span className="font-mono font-medium text-slate-800">v1 (X-API-VERSION: 1.0)</span>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
              <span className="text-slate-400 block text-[11px]">Token Lifetime</span>
              <span className="font-medium text-slate-800">Refreshed daily at 06:00 AM</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

