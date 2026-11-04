import React from "react";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBgColor?: string;
  iconColor?: string;
  badge?: string;
  badgeColor?: string;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconBgColor = "bg-emerald-50",
  iconColor = "text-emerald-600",
  badge,
  badgeColor = "bg-emerald-100 text-emerald-800",
}: StatCardProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200/80 p-4 md:p-5 shadow-xs hover:shadow-sm transition-shadow">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider truncate">
          {title}
        </span>
        <div className={`p-2 rounded-lg ${iconBgColor} shrink-0`}>
          <Icon className={`h-4 w-4 ${iconColor}`} />
        </div>
      </div>

      <div className="mt-3 flex items-baseline justify-between gap-2">
        <span className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
          {value}
        </span>
        {badge && (
          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${badgeColor}`}>
            {badge}
          </span>
        )}
      </div>

      {subtitle && (
        <p className="mt-1 text-xs text-slate-500 truncate">{subtitle}</p>
      )}
    </div>
  );
}

