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

