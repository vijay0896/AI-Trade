import React, { createContext, useContext, useState, useEffect } from "react";

interface LayoutContextType {
  mobileOpen: boolean;
  setMobileOpen: React.Dispatch<React.SetStateAction<boolean>>;
  collapsed: boolean;
  setCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  isMobile: boolean;
  toggleMobileMenu: () => void;
}

export const LayoutContext = createContext<LayoutContextType>({
  mobileOpen: false,
  setMobileOpen: () => {},
  collapsed: false,
  setCollapsed: () => {},
  isMobile: false,
  toggleMobileMenu: () => {},
});

export const useLayout = () => useContext(LayoutContext);

export const LayoutProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("ai_trading_sidebar_collapsed");
      return saved !== null ? saved === "1" : false;
    } catch {
      return false;
    }
  });

  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem("ai_trading_sidebar_collapsed", collapsed ? "1" : "0");
    } catch {}
  }, [collapsed]);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const toggleMobileMenu = () => setMobileOpen((prev) => !prev);

  return (
    <LayoutContext.Provider
      value={{
        mobileOpen,
        setMobileOpen,
        collapsed,
        setCollapsed,
        isMobile,
        toggleMobileMenu,
      }}
    >
      {children}
    </LayoutContext.Provider>
  );
};

