/**
 * Type definitions for Groww Broker API responses.
 */

export interface ApiResponse<T> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
  timestamp: string;
}

export interface GrowwSession {
  isConnected: boolean;
  active: boolean;
  sessionName: string | null;
  tokenRefId: string | null;
  expiresAt: string | null;
  expiresInMinutes: number;
}

export interface GrowwProfile {
  vendorUserId: string;
  ucc: string;
  nseEnabled: boolean;
  bseEnabled: boolean;
  ddpiEnabled: boolean;
  activeSegments: string[];
  status: string;
}

export interface GrowwFunds {
  summary: {
    clearCash: number;
    netMarginUsed: number;
    collateralAvailable: number;
    collateralUsed: number;
    totalAvailableBalance: number;
    brokerageAndCharges: number;
    adhocMargin: number;
  };
  equity: {
    cncBalanceAvailable: number;
    misBalanceAvailable: number;
    cncMarginUsed: number;
    misMarginUsed: number;
    netEquityMarginUsed: number;
  };
  fno: {
    futureBalanceAvailable: number;
    optionBuyBalanceAvailable: number;
    optionSellBalanceAvailable: number;
    spanMarginUsed: number;
    exposureMarginUsed: number;
    netFnoMarginUsed: number;
  };
  commodity: {
    spanMargin: number;
    exposureMargin: number;
    unrealisedM2m: number;
    realisedM2m: number;
  };
}

export interface HoldingItem {
  isin: string;
  tradingSymbol: string;
  quantity: number;
  dematFreeQuantity: number;
  averagePrice: number;
  investedValue: number;
  ltp: number;
  currentValue: number;
  pnl: number;
  pnlPercentage: number;
  dayChange: number;
  dayChangePercentage: number;
  tradableExchanges: string[];
}

export interface GrowwHoldings {
  totalHoldingsCount: number;
  totalInvested: number;
  totalCurrentValue: number;
  totalPnl: number;
  totalPnlPercentage: number;
  holdings: HoldingItem[];
}

export interface PositionItem {
  tradingSymbol: string;
  segment: string;
  product: string;
  netQuantity: number;
  buyQuantity: number;
  sellQuantity: number;
  realisedPnl: number;
  unrealisedPnl: number;
}

export interface GrowwPositions {
  totalPositionsCount: number;
  positions: PositionItem[];
}

export interface BacktestRequest {
  symbols: string[];
  startDate: string;
  endDate: string;
  capitalPerTrade?: number;
  enableMultiTimeframe?: boolean;
  enableNR4Filter?: boolean;
}

export interface BacktestSummary {
  symbol: string;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  breakevenTrades: number;
  winRatePct: number;
  netPnL: number;
  profitFactor: number;
  expectancyR: number;
  maxDrawdownPct: number;
  avgRiskReward: number;
  morningWindowWinRate: number;
  afternoonWindowWinRate: number;
  compressionSetupWinRate: number;
  bestSetupTag: string;
}

export interface StockBacktestMetrics {
  symbol: string;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  breakevenTrades: number;
  winRatePct: number;
  netPnL: number;
  profitFactor: number;
  expectancyR: number;
  maxDrawdownPct: number;
  avgRiskReward: number;
  morningWindowWinRate: number;
  afternoonWindowWinRate: number;
  compressionSetupWinRate: number;
  bestSetupTag: string;
}

export interface BacktestTradeLog {
  tradeId: string;
  symbol: string;
  direction: 'LONG' | 'SHORT';
  entryTimeIST: string;
  entryTimestamp: string;
  exitTimestamp: string;
  sessionWindow: string;
  patternTags: string[];
  entryPrice: number;
  initialSL: number;
  t1Hit: boolean;
  t2Hit: boolean;
  exitPrice: number;
  exitReason: string;
  quantity: number;
  rMultiple: number;
  netPnL: number;
}

export interface BacktestResponseData {
  summary: BacktestSummary;
  stockBreakdown: StockBacktestMetrics[];
  tradeLog: BacktestTradeLog[];
}


