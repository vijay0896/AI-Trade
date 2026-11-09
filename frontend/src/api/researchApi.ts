/**
 * @file researchApi.ts
 * @description RTK Query endpoints for Historical Backtest Runs, Equity Trajectories, and Trade Journals.
 */

import { baseApi } from './baseApi';
import { API_TAGS } from './apiTags';

export interface BacktestRunSummary {
  runId: string;
  symbol: string;
  variant: string;
  direction: 'BOTH' | 'LONG_ONLY' | 'SHORT_ONLY';
  isCanonical: boolean;
  runType: string;
  startDate: string;
  endDate: string;
  totalTrades: number;
  winRate: number;
  theoreticalGrossPnL: number;
  slippageCost: number;
  grossRealizedPnL: number;
  totalCharges: number;
  brokerage: number;
  statutoryCharges: number;
  gst: number;
  netPnL: number;
  netReturnPercent: number;
  profitFactor: number;
  maxDrawdownPercent: number;
  executedAt: string;
}

export interface BacktestTrade {
  tradeId: string;
  symbol: string;
  side: 'LONG' | 'SHORT';
  entryTimestamp: string;
  exitTimestamp: string;
  nominalEntryPrice: string | number;
  entryPrice: string | number;
  nominalExitPrice: string | number;
  exitPrice: string | number;
  quantity: string | number;
  positionValue: string | number;
  theoreticalGrossPnL: string | number;
  entrySlippageCost?: string | number;
  exitSlippageCost?: string | number;
  totalSlippageCost?: string | number;
  slippageCost?: string | number;
  grossPnL?: string | number;
  grossRealizedPnL: string | number;
  brokerage: string | number;
  stt?: string | number;
  stampDuty?: string | number;
  exchangeCharges?: string | number;
  sebiCharges?: string | number;
  ipftCharges?: string | number;
  statutoryCharges: string | number;
  gst: string | number;
  totalCharges: string | number;
  netPnL: string | number;
  returnPercent?: string | number;
  exitReason: string;
  barsHeld: string | number;
  isAmbiguous?: string | boolean;
}

export const researchApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getBacktestRuns: builder.query<{
      success: boolean;
      data: { totalRuns: number; runs: BacktestRunSummary[] };
    }, void>({
      query: () => '/backtesting/runs',
      providesTags: [API_TAGS.BACKTESTING],
    }),

    getBacktestRunDetails: builder.query<{
      success: boolean;
      data: { runId: string; metadata: any; config: any; summary: any };
    }, string>({
      query: (runId) => `/backtesting/runs/${runId}`,
      providesTags: [API_TAGS.BACKTESTING],
    }),

    getBacktestRunTrades: builder.query<{
      success: boolean;
      data: { runId: string; totalTrades: number; trades: BacktestTrade[] };
    }, string>({
      query: (runId) => `/backtesting/runs/${runId}/trades`,
      providesTags: [API_TAGS.BACKTESTING],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetBacktestRunsQuery,
  useGetBacktestRunDetailsQuery,
  useGetBacktestRunTradesQuery,
} = researchApi;
