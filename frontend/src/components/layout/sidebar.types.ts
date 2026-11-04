import React from "react";
import {
  LayoutDashboard,
  UserCheck,
  Wallet,
  PieChart,
  TrendingUp,
  Sliders,
} from "lucide-react";

export interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export const TRADING_NAV_SECTIONS: NavSection[] = [
  {
    title: "OVERVIEW",
    items: [
      {
        name: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
      },
      {
        name: "Account Profile",
        href: "/profile",
        icon: UserCheck,
      },
    ],
  },
  {
    title: "PORTFOLIO & FUNDS",
    items: [
      {
        name: "Funds & Margins",
        href: "/funds",
        icon: Wallet,
      },
      {
        name: "Demat Holdings",
        href: "/holdings",
        icon: PieChart,
      },
      {
        name: "Live Positions",
        href: "/positions",
        icon: TrendingUp,
      },
    ],
  },
];

