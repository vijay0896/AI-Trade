/**
 * @file strategyApi.ts
 * @description RTK Query endpoints for Single Active Strategy (EMA 9/21 Crossover)
 * including TradingView-style candlestick chart data, continuous EMA series,
 * and 5-year empirical backtest metrics.
 */

import { baseApi } from './baseApi';
import { API_TAGS } from './apiTags';

export interface ChartCandle {
  timestamp: string;
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  ema9: number | null;
  ema21: number | null;
  signal: 'BUY' | 'SELL' | null;
}

export interface StrategyChartData {
  symbol: string;
  date: string;
  availableDates: string[];
  totalAvailableDates: number;
  currentEMA9: number | null;
  currentEMA21: number | null;
  currentPrice: number | null;
  currentSignal: 'BUY' | 'SELL' | 'HOLD';
  strategy: {
    id: string;
    name: string;
    fastPeriod: number;
    slowPeriod: number;
    fastColor: string;
    slowColor: string;
    timeframe: string;
  };
  candles: ChartCandle[];
}

export interface StockBacktestMetrics {
  buySignals: number;
  sellSignals: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  scratchTrades: number;
  winRatePercent: number;
  theoreticalGrossPnL: number;
  slippageCost: number;
  grossRealizedPnL: number;
  totalCharges: number;
  netPnL: number;
  profitFactor: number;
  maxDrawdown: number;
  maxDrawdownPercent: number;
  averageWin: number;
  averageLoss: number;
  expectancy: number;
}

export interface EMA921BacktestSummary {
  strategyId: string;
  strategyName: string;
  timeframe: string;
  startDate: string;
  endDate: string;
  universe: string[];
  portfolioMetrics: {
    initialCapital: number;
    endingCapital: number;
    netPnL: number;
    netReturnPercent: number;
    totalBuySignals: number;
    totalSellSignals: number;
    totalTrades: number;
    winningTrades: number;
    losingTrades: number;
    scratchTrades: number;
    winRatePercent: number;
    theoreticalGrossPnL: number;
    slippageCost: number;
    grossRealizedPnL: number;
    totalCharges: number;
    chargesBreakdown: {
      brokerage: number;
      stt: number;
      stampDuty: number;
      exchangeCharges: number;
      sebiCharges: number;
      ipftCharges: number;
      gst: number;
    };
  };
  stocks: Record<string, StockBacktestMetrics>;
}

export interface ActiveStrategyConfig {
  id: string;
  name: string;
  version: string;
  variant: string;
  strategyId: string;
  description: string;
  universe: string[];
  timeframe: string;
  timezone: string;
  fastPeriod: number;
  slowPeriod: number;
  fastColor: string;
  slowColor: string;
  direction: string;
  fixedQuantity: number;
  capital: number;
  squareOffTime: string;
  entryCutoffTime: string;
}

export const strategyApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getActiveStrategy: builder.query<ActiveStrategyConfig, void>({
      query: () => '/strategy/active',
      transformResponse: (response: { success: boolean; data: ActiveStrategyConfig }) => response.data,
      providesTags: [API_TAGS.STRATEGY],
    }),

    getStrategyChartData: builder.query<StrategyChartData, { symbol: string; date?: string }>({
      query: ({ symbol, date }) => {
        let url = `/strategy/chart/${symbol}`;
        if (date) url += `?date=${encodeURIComponent(date)}`;
        return url;
      },
      transformResponse: (response: { success: boolean; data: StrategyChartData }) => response.data,
      providesTags: [API_TAGS.STRATEGY],
    }),

    getEMA921BacktestSummary: builder.query<EMA921BacktestSummary, void>({
      query: () => '/backtesting/ema9-21/summary',
      transformResponse: (response: { success: boolean; data: EMA921BacktestSummary }) => response.data,
      providesTags: [API_TAGS.BACKTESTING],
    }),
  }),
});

export const {
  useGetActiveStrategyQuery,
  useGetStrategyChartDataQuery,
  useGetEMA921BacktestSummaryQuery,
} = strategyApi;

