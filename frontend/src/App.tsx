import React, { Suspense } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import Sidebar from "./components/layout/Sidebar";
import { LayoutProvider, useLayout } from "./context/LayoutContext";
import DashboardPage from "./pages/Dashboard";
import ProfilePage from "./pages/Profile";
import FundsPage from "./pages/Funds";
import HoldingsPage from "./pages/Holdings";
import PositionsPage from "./pages/Positions";
import ResearchPage from "./pages/Research";

function AppContent() {
  const { collapsed, setCollapsed, mobileOpen, setMobileOpen, isMobile } = useLayout();
  const location = useLocation();

  return (
    <div className="flex h-screen w-screen overflow-hidden font-sans relative bg-slate-50 text-slate-900">
      {/* Sidebar Component */}
      <Sidebar
        collapsed={collapsed}
        onCollapseChange={setCollapsed}
        mobile={isMobile}
        isOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden relative z-10">
        <div key={location.pathname} className="animate-fade-in flex-1 flex flex-col h-full min-h-0 min-w-0 overflow-hidden">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/funds" element={<FundsPage />} />
            <Route path="/holdings" element={<HoldingsPage />} />
            <Route path="/positions" element={<PositionsPage />} />
            <Route path="/research" element={<ResearchPage />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <LayoutProvider>
      <AppContent />
    </LayoutProvider>
  );
}

