import React, { useState } from 'react';
import {
  TrendingUp,
  Activity,
  Layers,
  BarChart3,
  Sliders,
  DollarSign,
  Info,
} from 'lucide-react';
import {
  useGetStockBehaviourQuery,
} from '../../../api/researchApi';
import type { ResearchSummaryData } from '../../../api/researchApi';

interface StockComparisonTabProps {
  summaryData?: ResearchSummaryData;
}

export const StockComparisonTab: React.FC<StockComparisonTabProps> = ({
  summaryData,
}) => {
  const [rankingAMode, setRankingAMode] = useState<'baseline' | 'trend' | 'volatility'>('baseline');
  const [rankingBMode, setRankingBMode] = useState<'baseline' | 'capital' | 'return'>('baseline');
  const [selectedStock, setSelectedStock] = useState<string>('ALL');

  const { data: behaviourData, isLoading: isBehaviourLoading } = useGetStockBehaviourQuery(
    selectedStock !== 'ALL' ? { symbol: selectedStock } : undefined
  );

  const rankings = summaryData?.rankings;
  const rankingA = rankings?.rankingA;
  const rankingB = rankings?.rankingB;

  // Determine Ranking A items based on selected weight
  const getRankingAItems = () => {
    if (!rankingA) return [];
    if (rankingAMode === 'trend') return rankingA.weightingSensitivity.trendHeavy;
    if (rankingAMode === 'volatility') return rankingA.weightingSensitivity.volatilityHeavy;
    return rankingA.baselineRanking;
  };

  // Determine Ranking B items based on selected weight
  const getRankingBItems = () => {
    if (!rankingB) return [];
    if (rankingBMode === 'capital') return rankingB.weightingSensitivity.capitalPreservation;
    if (rankingBMode === 'return') return rankingB.weightingSensitivity.returnFocused;
    return rankingB.baselineRanking;
  };

  const characteristicsMap: Record<string, string> = {
    'M&M': 'Highest relative volatility (2.44% range), highest ER (0.136), lowest chop (49.09), highest follow-through',
    'HDFCBANK': 'Highest market turnover liquidity (₹2,324 Cr/day), lowest intraday range (1.64%), lowest ATR % (0.180%)',
    'BHARTIARTL': 'High directional efficiency (0.130 ER), high ADX persistence (44.95% >= 25), balanced volatility (2.00%)',
    'AXISBANK': 'Moderate volatility (2.04% range), lower trend persistence (0.121 ER), frequent VWAP mean-reversion',
    'ICICIBANK': 'Lowest directional efficiency (0.122 ER), lowest strong trend proportion (6.50%), high VWAP oscillation',
  };

  const verdictMap: Record<string, { verdict: string; isPositive: boolean }> = {
    'HDFCBANK': { verdict: 'Exploratory positive return (+₹991.14); extreme sample fragility (N=11)', isPositive: true },
    'AXISBANK': { verdict: 'Net negative (-₹282.82); moderate capital preservation, negative expectancy (-₹15.71)', isPositive: false },
    'BHARTIARTL': { verdict: 'Net negative (-₹634.14); fee drag erosion, negative expectancy (-₹35.23)', isPositive: false },
    'M&M': { verdict: 'Net negative (-₹1,022.65); poor trend capture, negative expectancy (-₹53.82)', isPositive: false },
    'ICICIBANK': { verdict: 'Net negative (-₹2,075.51); severe directional whipsaw, negative expectancy (-₹115.31)', isPositive: false },
  };

  return (
    <div className="space-y-6">
      {/* Methodological Introduction Note */}
      <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200 text-blue-900 text-xs shadow-xs">
        <div className="flex items-start gap-2.5">
          <Info className="h-4 w-4 text-blue-700 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold">Dual Ranking Methodology:</span>
            <p className="text-blue-800 leading-relaxed">
              Price behaviour and trading strategy performance are completely separated into two distinct multi-factor frameworks.
              <strong> Ranking A</strong> measures intrinsic price characteristics (volatility, directional efficiency, VWAP crossing frequency) without applying any strategy.
              <strong> Ranking B</strong> evaluates the empirical performance of the canonical trend-following model (Variant E) after transaction costs and slippage.
            </p>
          </div>
        </div>
      </div>

      {/* Side-by-Side Dual Rankings Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ranking A Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 flex-wrap gap-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Activity className="h-4 w-4 text-blue-600" />
                  Ranking A: Intraday Price Behaviour
                </h3>
                <span className="text-[11px] text-slate-500">
                  Strategy-independent intrinsic price movement properties
                </span>
              </div>

              {/* Weighting Selector */}
              <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50 text-[11px]">
                <button
                  type="button"
                  onClick={() => setRankingAMode('baseline')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                    rankingAMode === 'baseline'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Baseline
                </button>
                <button
                  type="button"
                  onClick={() => setRankingAMode('trend')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                    rankingAMode === 'trend'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Trend-Heavy
                </button>
                <button
                  type="button"
                  onClick={() => setRankingAMode('volatility')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                    rankingAMode === 'volatility'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Vol-Heavy
                </button>
              </div>
            </div>

            {/* Ranking A List */}
            <div className="mt-4 space-y-3">
              {getRankingAItems().map((item, idx) => (
                <div
                  key={item.symbol}
                  className="p-3 rounded-lg bg-slate-50 border border-slate-200/80 hover:border-slate-300 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="h-6 w-6 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center">
                        #{idx + 1}
                      </span>
                      <span className="font-bold text-sm text-slate-900">{item.symbol}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-blue-700">
                        {item.compositeScore.toFixed(2)}
                      </span>
                      <span className="text-[10px] text-slate-500 block">Score / 100</span>
                    </div>
                  </div>
                  <p className="mt-2 text-[11px] text-slate-600 leading-snug">
                    {characteristicsMap[item.symbol] || 'Intrinsic characteristics'}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500">
            Winner: <strong>M&amp;M</strong> exhibits the highest intrinsic trend efficiency and daily price swing magnitude.
          </div>
        </div>

        {/* Ranking B Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 flex-wrap gap-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-emerald-600" />
                  Ranking B: Strategy Performance (Variant E)
                </h3>
                <span className="text-[11px] text-slate-500">
                  Trend-following backtest outcomes after transaction costs
                </span>
              </div>

              {/* Weighting Selector */}
              <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50 text-[11px]">
                <button
                  type="button"
                  onClick={() => setRankingBMode('baseline')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                    rankingBMode === 'baseline'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Baseline
                </button>
                <button
                  type="button"
                  onClick={() => setRankingBMode('capital')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                    rankingBMode === 'capital'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Capital Pres.
                </button>
                <button
                  type="button"
                  onClick={() => setRankingBMode('return')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                    rankingBMode === 'return'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Return-Focus
                </button>
              </div>
            </div>

            {/* Ranking B List */}
            <div className="mt-4 space-y-3">
              {getRankingBItems().map((item, idx) => {
                const info = verdictMap[item.symbol] || { verdict: 'Backtest result', isPositive: false };
                return (
                  <div
                    key={item.symbol}
                    className="p-3 rounded-lg bg-slate-50 border border-slate-200/80 hover:border-slate-300 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="h-6 w-6 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center">
                          #{idx + 1}
                        </span>
                        <span className="font-bold text-sm text-slate-900">{item.symbol}</span>
                      </div>
                      <div className="text-right">
                        <span
                          className={`text-sm font-bold ${
                            info.isPositive ? 'text-emerald-700' : 'text-slate-700'
                          }`}
                        >
                          {item.compositeScore.toFixed(2)}
                        </span>
                        <span className="text-[10px] text-slate-500 block">Score / 100</span>
                      </div>
                    </div>
                    <p
                      className={`mt-2 text-[11px] leading-snug font-medium ${
                        info.isPositive ? 'text-emerald-800' : 'text-slate-600'
                      }`}
                    >
                      {info.verdict}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500">
            Reality Check: Only <strong>HDFCBANK</strong> posted positive net P&amp;L, but on only 11 trades over 5 years.
          </div>
        </div>
      </div>

      {/* Granular Stock Behaviour Metrics Matrix */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Granular Intraday Behaviour Characteristics (5-Stock Cross-Section)
            </h3>
            <p className="text-xs text-slate-500">
              Evaluated across all 6,159 eligible regular market sessions (09:15-15:25 IST)
            </p>
          </div>

          {/* Symbol Filter */}
          <div className="flex items-center gap-2">
            <label htmlFor="stock-filter" className="text-xs font-medium text-slate-600">
              Stock Filter:
            </label>
            <select
              id="stock-filter"
              value={selectedStock}
              onChange={(e) => setSelectedStock(e.target.value)}
              className="text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="ALL">All 5 Stocks</option>
              <option value="ICICIBANK">ICICIBANK</option>
              <option value="HDFCBANK">HDFCBANK</option>
              <option value="M&M">M&amp;M</option>
              <option value="AXISBANK">AXISBANK</option>
              <option value="BHARTIARTL">BHARTIARTL</option>
            </select>
          </div>
        </div>

        {isBehaviourLoading ? (
          <div className="p-8 text-center text-xs text-slate-500">
            Loading behaviour metrics...
          </div>
        ) : behaviourData?.data ? (
          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-xs text-left text-slate-700">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase tracking-wider font-semibold text-[10px]">
                <tr>
                  <th scope="col" className="px-3.5 py-3">Symbol</th>
                  <th scope="col" className="px-3.5 py-3">Mean Daily Range</th>
                  <th scope="col" className="px-3.5 py-3">Session ER</th>
                  <th scope="col" className="px-3.5 py-3">Mean Chop</th>
                  <th scope="col" className="px-3.5 py-3">VWAP Crosses/Day</th>
                  <th scope="col" className="px-3.5 py-3">15m OR Breakout %</th>
                  <th scope="col" className="px-3.5 py-3">Breakout Fail Rate</th>
                  <th scope="col" className="px-3.5 py-3">Traded Value / Day</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {Object.entries(behaviourData.data).map(([sym, b]) => (
                  <tr key={sym} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-3.5 py-3 font-bold text-slate-900">{sym}</td>
                    <td className="px-3.5 py-3">
                      ₹{b.volatility.averageDailyRange}{' '}
                      <span className="text-slate-400">({b.volatility.averageDailyRangePercent}%)</span>
                    </td>
                    <td className="px-3.5 py-3 font-semibold text-blue-700">
                      {b.directionalMovement.averageSessionEfficiencyRatio}
                    </td>
                    <td className="px-3.5 py-3">
                      {b.directionalMovement.meanChoppinessIndex}
                    </td>
                    <td className="px-3.5 py-3 font-medium text-slate-900">
                      {b.sideways.averageVwapCrossoversPerSession}
                    </td>
                    <td className="px-3.5 py-3">
                      {b.openingRange.breakoutFrequencyPercent}%
                    </td>
                    <td className="px-3.5 py-3 font-medium text-amber-700">
                      {b.openingRange.failedBreakoutFrequencyPercent}%
                    </td>
                    <td className="px-3.5 py-3 font-semibold text-slate-900">
                      ₹{b.volumeLiquidity.averageDailyTradedValueCrores} Cr
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6 text-center text-xs text-slate-500 bg-slate-50 rounded-lg">
            No stock behaviour metrics available.
          </div>
        )}
      </div>
    </div>
  );
};
