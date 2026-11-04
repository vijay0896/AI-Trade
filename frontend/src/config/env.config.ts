
/**
 * Application Environment Configuration Module.
 */
export const ENV = {
  BACKEND_URL: import.meta.env.VITE_APP_BACKEND_URL || "http://localhost:5001",
  APP_TITLE: import.meta.env.VITE_APP_TITLE || "AI Trading System | Groww Broker",
  APP_ENV: import.meta.env.VITE_APP_ENV || "development",
  IS_DEV: import.meta.env.DEV,
  IS_PROD: import.meta.env.PROD,
} as const;