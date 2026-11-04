import React from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronLeft, ChevronRight, Activity, ShieldCheck, X } from "lucide-react";
import { TRADING_NAV_SECTIONS } from "./sidebar.types";
import { useGetGrowwStatusQuery } from "../../api/growwApi";

interface SidebarProps {
  collapsed: boolean;
  onCollapseChange: (collapsed: boolean) => void;
  mobile: boolean;
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({
  collapsed,
  onCollapseChange,
  mobile,
  isOpen,
  onClose,
}: SidebarProps) {
  const location = useLocation();
  const { data: statusData } = useGetGrowwStatusQuery(undefined, {
    pollingInterval: 15000,
  });

  const isConnected = statusData?.data?.isConnected;

  const sidebarContent = (
    <aside
      className={`h-full flex flex-col bg-slate-900 text-slate-200 transition-all duration-300 border-r border-slate-800 ${
        collapsed && !mobile ? "w-20" : "w-64"
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800/80">
        <Link to="/dashboard" className="flex items-center gap-3 overflow-hidden">
          <div className="h-9 w-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shrink-0">
            <Activity className="h-5 w-5 text-emerald-400" />
          </div>
          {(!collapsed || mobile) && (
            <div className="flex flex-col">
              <span className="font-bold text-sm tracking-wide text-white">AI-TRADING</span>
              <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                GROWW BROKER
              </span>
            </div>
          )}
        </Link>

        {mobile ? (
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        ) : (
          <button
            onClick={() => onCollapseChange(!collapsed)}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 hidden lg:block"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        )}
      </div>

      {/* Nav Items */}
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
        {TRADING_NAV_SECTIONS.map((section, idx) => (
          <div key={idx} className="space-y-1">
            {(!collapsed || mobile) && (
              <p className="px-3 text-[11px] font-semibold text-slate-400 tracking-wider">
                {section.title}
              </p>
            )}
            <div className="space-y-1 pt-1">
              {section.items.map((item) => {
                const isActive =
                  location.pathname === item.href ||
                  (item.href === "/dashboard" && location.pathname === "/");
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    onClick={() => mobile && onClose()}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                      isActive
                        ? "bg-emerald-500/15 text-emerald-300 font-semibold border-l-2 border-emerald-400 shadow-sm"
                        : "text-slate-300 hover:bg-slate-800 hover:text-white"
                    } ${collapsed && !mobile ? "justify-center" : ""}`}
                    title={collapsed && !mobile ? item.name : undefined}
                  >
                    <Icon className={`h-4 w-4 shrink-0 ${isActive ? "text-emerald-400" : "text-slate-400"}`} />
                    {(!collapsed || mobile) && <span>{item.name}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer Connection Pill */}
      <div className="p-3 border-t border-slate-800">
        <div
          className={`p-2.5 rounded-lg bg-slate-800/60 border border-slate-700/50 flex items-center gap-2.5 ${
            collapsed && !mobile ? "justify-center" : ""
          }`}
        >
          <div
            className={`h-2.5 w-2.5 rounded-full shrink-0 ${
              isConnected ? "bg-emerald-400 shadow-sm shadow-emerald-400/50" : "bg-rose-400 shadow-sm shadow-rose-400/50"
            }`}
          />
          {(!collapsed || mobile) && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-200 truncate">
                {isConnected ? "Broker Connected" : "Disconnected"}
              </p>
              <p className="text-[10px] text-slate-400 truncate flex items-center gap-1">
                <ShieldCheck className="h-3 w-3 text-emerald-400 inline" />
                TOTP Auth Active
              </p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );

  if (mobile) {
    if (!isOpen) return null;
    return (
      <div className="fixed inset-0 z-50 flex">
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
        <div className="relative z-10">{sidebarContent}</div>
      </div>
    );
  }

  return sidebarContent;
}

