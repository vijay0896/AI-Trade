/**
 * @file researchApi.ts
 * @description RTK Query endpoints for Phase 7 & Phase 7.1 Quantitative Research & Historical Backtests.
 */

import { baseApi } from './baseApi';
import { API_TAGS } from './apiTags';

export interface ResearchSummaryData {
  hasRun: boolean;
  metadata?: {
    pipeline: string;
    version: string;
    executedAt: string;
    durationMs: number;
    dataset: {
      universe: string[];
      startDate: string;
      endDate: string;
      totalCandles: number;
      regularMarketCoveragePercent: number;
    };
    feeSchedule: string;
    governanceVerdict: string;
  };
  rankings?: {
    rankingA: {
      baselineRanking: Array<{
        rank: number;
        symbol: string;
        compositeScore: number;
        rawMetrics: {
          trendPercent: number;
          efficiencyRatio: number;
          rangePercent: number;
          choppiness: number;
          vwapCrosses: number;
          tradedValueCrores: number;
        };
      }>;
      weightingSensitivity: {
        trendHeavy: Array<{ rank: number; symbol: string; compositeScore: number }>;
        volatilityHeavy: Array<{ rank: number; symbol: string; compositeScore: number }>;
      };
    };
    rankingB: {
      baselineRanking: Array<{
        rank: number;
        symbol: string;
        compositeScore: number;
        rawMetrics: {
          netExpectancy: number;
          profitFactor: number;
          maxDrawdownPercent: number;
          winRate: number;
          costDragRatio: number;
          totalTrades: number;
        };
      }>;
      weightingSensitivity: {
        capitalPreservation: Array<{ rank: number; symbol: string; compositeScore: number }>;
        returnFocused: Array<{ rank: number; symbol: string; compositeScore: number }>;
      };
    };
  };
  keyFindings?: Array<{
    id: string;
    title: string;
    finding: string;
    evidence: string;
    severity: 'CRITICAL' | 'WARNING' | 'NEUTRAL';
  }>;
}

export interface StockBehaviourMetrics {
  volatility: {
    averageDailyRange: number;
    medianDailyRange: number;
    averageDailyRangePercent: number;
    medianDailyRangePercent: number;
    stdDevDailyRangePercent: number;
    percentile25DailyRangePercent: number;
    percentile75DailyRangePercent: number;
    average5mAtr: number;
    median5mAtr: number;
    average5mAtrPercent: number;
    median5mAtrPercent: number;
  };
  directionalMovement: {
    averageSessionEfficiencyRatio: number;
    medianSessionEfficiencyRatio: number;
    stdDevSessionEfficiencyRatio: number;
    meanChoppinessIndex: number;
    medianChoppinessIndex: number;
    percentChoppinessAbove60: number;
    percentChoppinessBelow40: number;
    adxAbove20Percent: number;
    adxAbove25Percent: number;
    adxRisingPercent: number;
    emaBullishAlignmentPercent: number;
    emaBearishAlignmentPercent: number;
    totalSessionsAnalyzed: number;
    strongDirectionalSessionsCount: number;
    strongDirectionalSessionsPercent: number;
    weakDirectionalSessionsCount: number;
    weakDirectionalSessionsPercent: number;
  };
  sideways: {
    averageVwapCrossoversPerSession: number;
    medianVwapCrossoversPerSession: number;
    maxVwapCrossoversInSession: number;
    percentTimeAboveVwap: number;
    percentTimeBelowVwap: number;
    percentSessionsWithRepeatedCrossings: number;
    percentSessionsLowEfficiencyRatio: number;
    percentSessionsHighChoppiness: number;
  };
  openingRange: {
    averageOpeningRangeWidth: number;
    medianOpeningRangeWidth: number;
    averageOpeningRangePercent: number;
    medianOpeningRangePercent: number;
    breakoutFrequencyPercent: number;
    bullishBreakoutPercent: number;
    bearishBreakoutPercent: number;
    breakoutFollowThroughMeanMultiple: number;
    failedBreakoutFrequencyPercent: number;
    averageMinutesToFirstBreakout: number;
  };
  volumeLiquidity: {
    average5mVolume: number;
    median5mVolume: number;
    volumeCoefficientOfVariation: number;
    averageRvol: number;
    percentRvolAbove15: number;
    percentRvolAbove20: number;
    averageDailyTradedValueCrores: number;
    medianDailyTradedValueCrores: number;
  };
  classification: {
    totalSessions: number;
    eligibleSessions: number;
    regimePercentages: {
      STRONG_TREND_UP: number;
      STRONG_TREND_DOWN: number;
      WEAK_TREND: number;
      SIDEWAYS: number;
      MIXED_UNCLEAR: number;
      SPECIAL_SESSION?: number;
    };
  };
}

export interface StrategyRunMetrics {
  symbol: string;
  variant: string;
  runId: string;
  totalTrades: number;
  tradesPerYear: number;
  winRate: number;
  confidenceInterval: {
    ciLowerPercent: number;
    ciUpperPercent: number;
    marginOfErrorPercent: number;
    isStatisticallyFragile: boolean;
  };
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
  netExpectancy: number;
  maxDrawdownPercent: number;
  longTradesCount: number;
  longWinRate: number;
  longNetPnL: number;
  shortTradesCount: number;
  shortWinRate: number;
  shortNetPnL: number;
  falseBreakoutRate: number;
  bootstrap: {
    iterations: number;
    medianNetPnL: number;
    percentile5NetPnL: number;
    percentile95NetPnL: number;
    probabilityOfLossPercent: number;
    standardError: number;
  };
  periodBreakdown?: {
    yearly: Record<string, { trades: number; netPnL: number; winRate: number }>;
    monthlyConsistencyPercent: number;
  };
}

export interface WalkForwardRecord {
  foldId: number;
  symbol: string;
  variant: string;
  trainPeriod: string;
  trainTrades: number;
  trainWinRate: number;
  trainNetPnL: number;
  trainProfitFactor: number;
  testPeriod: string;
  testTrades: number;
  testWinRate: number;
  testNetPnL: number;
  testProfitFactor: number;
  stabilityStatus: string;
  diagnosticNote: string;
}

export interface ParameterSensitivityRecord {
  testCategory: string;
  parameterName: string;
  parameterValue: string | number;
  symbol: string;
  variant: string;
  trades: number;
  winRate: number;
  theoreticalGrossPnL: number;
  slippageCost: number;
  totalCharges: number;
  netPnL: number;
  profitFactor: number;
  maxDrawdownPercent: number;
  notes?: string;
}

export interface BacktestRunSummary {
  runId: string;
  symbol: string;
  variant: string;
  direction: string;
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
  slippageCost: string | number;
  grossRealizedPnL: string | number;
  brokerage: string | number;
  statutoryCharges: string | number;
  gst: string | number;
  totalCharges: string | number;
  netPnL: string | number;
  returnPercent: string | number;
  exitReason: string;
  barsHeld: string | number;
}

export const researchApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getResearchSummary: builder.query<{ success: boolean; data: ResearchSummaryData }, void>({
      query: () => '/research/summary',
      providesTags: [API_TAGS.RESEARCH],
    }),

    getResearchStocks: builder.query<{ success: boolean; data: { stocks: string[] } }, void>({
      query: () => '/research/stocks',
      providesTags: [API_TAGS.RESEARCH],
    }),

    getStockBehaviour: builder.query<{ success: boolean; data: Record<string, StockBehaviourMetrics> }, { symbol?: string } | void>({
      query: (params) => ({
        url: '/research/stock-behaviour',
        params: params?.symbol ? { symbol: params.symbol } : undefined,
      }),
      providesTags: [API_TAGS.RESEARCH],
    }),

    getStrategyRobustness: builder.query<{ success: boolean; data: { runs: StrategyRunMetrics[] } }, void>({
      query: () => '/research/strategy-robustness',
      providesTags: [API_TAGS.RESEARCH],
    }),

    getPeriodPerformance: builder.query<{
      success: boolean;
      data: {
        walkForwardRecords: WalkForwardRecord[];
        parameterSensitivityRecords: ParameterSensitivityRecord[];
      };
    }, void>({
      query: () => '/research/period-performance',
      providesTags: [API_TAGS.RESEARCH],
    }),

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
  useGetResearchSummaryQuery,
  useGetResearchStocksQuery,
  useGetStockBehaviourQuery,
  useGetStrategyRobustnessQuery,
  useGetPeriodPerformanceQuery,
  useGetBacktestRunsQuery,
  useGetBacktestRunDetailsQuery,
  useGetBacktestRunTradesQuery,
} = researchApi;

