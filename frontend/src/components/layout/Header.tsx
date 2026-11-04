import { Menu, RefreshCw, ShieldCheck, AlertCircle } from "lucide-react";
import { useLayout } from "../../context/LayoutContext";
import {
  useGetGrowwStatusQuery,
  useConnectGrowwMutation,
  useGetGrowwProfileQuery,
} from "../../api/growwApi";
import { toast } from "react-toastify";

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export function Header({ title, subtitle }: HeaderProps) {
  const { toggleMobileMenu } = useLayout();
  const { data: statusData, isLoading: isStatusLoading } = useGetGrowwStatusQuery(
    undefined,
    { pollingInterval: 15000 }
  );
  const { data: profileData } = useGetGrowwProfileQuery();
  const [connectGroww, { isLoading: isConnecting }] = useConnectGrowwMutation();

  const session = statusData?.data;
  const isConnected = session?.isConnected;
  const profile = profileData?.data;

  const handleReconnect = async () => {
    try {
      await connectGroww().unwrap();
      toast.success("Groww account reconnected successfully!");
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to connect Groww account");
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200/80 px-4 md:px-6 flex items-center justify-between shrink-0 sticky top-0 z-20">
      {/* Title & Mobile Hamburger */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={toggleMobileMenu}
          className="p-2 -ml-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="min-w-0">
          <h1 className="text-base md:text-lg font-bold text-slate-900 tracking-tight truncate">
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs text-slate-500 truncate hidden sm:block">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Right Actions: Status Badge & Reconnect */}
      <div className="flex items-center gap-2 md:gap-3">
        {/* Status Badge */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border bg-slate-50">
          {isConnected ? (
            <>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-emerald-700 font-semibold hidden sm:inline">
                Groww Active
              </span>
              {session?.expiresInMinutes ? (
                <span className="text-slate-500 text-[11px] hidden md:inline">
                  (Expires in {Math.round(session.expiresInMinutes / 60)}h)
                </span>
              ) : null}
            </>
          ) : (
            <>
              <AlertCircle className="h-3.5 w-3.5 text-rose-500" />
              <span className="text-rose-700 font-semibold">Disconnected</span>
            </>
          )}
        </div>

        {/* User UCC Badge */}
        {profile?.ucc && (
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-xs font-mono font-medium text-slate-700 border border-slate-200">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            <span>UCC: {profile.ucc}</span>
          </div>
        )}

        {/* Reconnect / Sync Button */}
        <button
          onClick={handleReconnect}
          disabled={isConnecting}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all disabled:opacity-50"
          title="Reconnect or refresh token using TOTP"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isConnecting ? "animate-spin" : ""}`} />
          <span className="hidden sm:inline">
            {isConnecting ? "Connecting..." : "Sync / Reconnect"}
          </span>
        </button>
      </div>
    </header>
  );
}

