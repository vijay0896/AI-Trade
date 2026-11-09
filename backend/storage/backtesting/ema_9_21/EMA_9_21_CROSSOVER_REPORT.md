# Phase 9: EMA 9 / EMA 21 Crossover Strategy Specification & 5-Year Backtest Report

**Strategy ID**: `ema_9_21_crossover`  
**Strategy Name**: EMA 9/21 Crossover  
**Asset Class**: Indian Equities (NSE Cash Market)  
**Timeframe**: 5-Minute Continuous Candles  
**Historical Period**: 2021-11-08 to 2026-11-06 (5 Years, 1,234 Regular Trading Sessions)  
**Historical Candle Universe**: 479,982 Historical Candles across 5 NSE Blue-Chip Stocks  
**Execution Platform**: Node.js Deterministic Backtesting Engine with Effective-Dated Groww Statutory Fee Schedules  
**Trading Status**: Long-Only Intraday Trend-Following (Paper Trading & Backtesting only — Automated Live Execution Permanently Disabled)

---

## 1. Executive Summary & Strategy Replacement

As commanded in the Phase 9 strategy consolidation directive, the entire multi-variant Opening Range Breakout (ORB) suite (Variants A, B, C, D, and E with VWAP, EMA 20/50, ADX/DI, RVOL, Choppiness Index, and Efficiency Ratio) has been decommissioned from active production runtime.

All active strategy selectors, APIs, risk configuration defaults, and chart visualization dashboards now recognize and execute **ONE single canonical strategy**: **EMA 9 / EMA 21 Crossover**. Historical market data and prior research audit reports are safely preserved as immutable archival research records.

### Strategy Core Definition

| Parameter | Specification | Strict Rule Enforcement |
| :--- | :--- | :--- |
| **Strategy ID** | `ema_9_21_crossover` | Unique identifier used across API, backtester, and frontend |
| **Strategy Name** | `EMA 9/21 Crossover` | Intraday trend-following moving average crossover |
| **Fast Indicator** | **EMA 9** (Green `#00C853`) | Computed on candle close prices; $\alpha = \frac{2}{9 + 1} = 0.20$ |
| **Slow Indicator** | **EMA 21** (Red `#FF0000`) | Computed on candle close prices; $\alpha = \frac{2}{21 + 1} = \frac{2}{22} \approx 0.0909$ |
| **Timeframe** | 5-Minute | Evaluated on completed regular market session candles |
| **Direction** | **LONG ONLY** | Strictly buys on bullish cross; **no short positions opened** |
| **BUY Condition** | $EMA9_{t-1} \le EMA21_{t-1}$ AND $EMA9_{t} > EMA21_{t}$ | Bullish crossover on completed candle $t$ close |
| **BUY Execution** | Open of candle $t+1$ with 2.0 bps slippage | Causal execution, zero lookahead or intrabar repainting |
| **SELL Condition** | $EMA9_{t-1} \ge EMA21_{t-1}$ AND $EMA9_{t} < EMA21_{t}$ | Bearish crossunder on completed candle $t$ close |
| **SELL Execution** | Open of candle $t+1$ with 2.0 bps slippage | Closes existing long position; **flat state after exit** |
| **Duplicate Signals** | Blocked | No duplicate BUY while long; no duplicate SELL when flat |
| **Stop Loss** | **None** | No price-based or ATR stop-loss orders |
| **Profit Target** | **None** | No fixed risk-reward or trailing target orders |
| **Intraday Square-Off** | **15:15:00 IST** | Any open long position is forcibly closed at 15:15 open |
| **Entry Cutoff** | **15:00:00 IST** | No new entries initiated after 15:00 IST |
| **Position Sizing** | **Fixed 1 Share** | ₹100,000 capital ceiling enforced per stock |
| **Friction & Fees** | Groww Effective-Dated Schedule | Brokerage, STT, Exchange, SEBI, IPFT, GST, Stamp Duty |

---

## 2. Mathematical Formalization & Determinism

### 2.1 Continuous EMA Calculation

Both Exponential Moving Averages are initialized after a clean simple moving average (SMA) warm-up on continuous regular 5-minute candles:

$$\text{SMA}_{9} = \frac{1}{9}\sum_{i=1}^{9} C_i, \quad \text{SMA}_{21} = \frac{1}{21}\sum_{i=1}^{21} C_i$$

Following initialization, each subsequent candle close $C_t$ updates the moving average recursively:

$$EMA_{9,t} = C_t \times 0.20 + EMA_{9,t-1} \times 0.80$$

$$EMA_{21,t} = C_t \times \left(\frac{1}{11}\right) + EMA_{21,t-1} \times \left(\frac{10}{11}\right)$$

EMAs stream continuously across trading days without artificial daily resets, matching the exact behavior of TradingView charts.

### 2.2 Signal Generation & Non-Repainting Invariants

1. **Bullish Crossover (BUY)**:
   A BUY signal triggers strictly at the close of candle $t$ when:
   $$\text{Signal}_t = \text{BUY} \iff EMA_{9,t-1} \le EMA_{21,t-1} \quad \land \quad EMA_{9,t} > EMA_{21,t}$$
   If the trading engine is currently flat (`activeTrade == null`) and $Time_t \le 15:00:00$, a pending BUY order is queued.

2. **Execution at Candle $t+1$ Open**:
   $$\text{ExecEntryPrice} = Open_{t+1} \times (1.0 + \text{SlippageFraction})$$
   where $\text{SlippageFraction} = \frac{2.0}{10000} = 0.0002$ (2 basis points).

3. **Bearish Crossunder (SELL)**:
   A SELL signal triggers strictly at the close of candle $t$ when:
   $$\text{Signal}_t = \text{SELL} \iff EMA_{9,t-1} \ge EMA_{21,t-1} \quad \land \quad EMA_{9,t} < EMA_{21,t}$$
   If an active long trade exists, a pending SELL order is queued to close the long position. No short positions are ever opened.

4. **Execution at Candle $t+1$ Open**:
   $$\text{ExecExitPrice} = Open_{t+1} \times (1.0 - \text{SlippageFraction})$$
   $$\text{ExitReason} = \text{BEARISH\_CROSSOVER}$$

5. **Mandatory 15:15 IST Square-Off**:
   If an active long trade remains open when the 15:15:00 candle arrives, it is immediately closed at the 15:15 open:
   $$\text{ExecExitPrice} = Open_{15:15} \times (1.0 - \text{SlippageFraction})$$
   $$\text{ExitReason} = \text{INTRADAY\_SQUARE\_OFF}$$

---

## 3. Comprehensive 5-Year Backtest Results (2021-2026)

The backtest was executed over the full 5-year historical dataset comprising 479,982 five-minute candles across 1,234 regular trading sessions.

### 3.1 5-Stock Performance & Combined Portfolio Summary

| Metric | ICICIBANK | HDFCBANK | M&M | AXISBANK | BHARTIARTL | Combined Portfolio |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Initial Capital** | ₹100,000.00 | ₹100,000.00 | ₹100,000.00 | ₹100,000.00 | ₹100,000.00 | **₹500,000.00** |
| **Ending Capital** | ₹85,916.55 | ₹85,637.88 | ₹84,814.33 | ₹86,595.15 | ₹85,607.21 | **₹428,571.12** |
| **Total BUY Signals** | 2,077 | 2,045 | 1,984 | 2,035 | 2,099 | **10,240** |
| **Total SELL Signals** | 2,089 | 2,046 | 1,982 | 2,026 | 2,091 | **10,234** |
| **Total Completed Trades** | 1,883 | 1,855 | 1,816 | 1,828 | 1,882 | **9,264** |
| **Winning Trades** | 172 | 210 | 320 | 202 | 195 | **1,099** |
| **Losing Trades** | 1,710 | 1,645 | 1,496 | 1,626 | 1,687 | **8,164** |
| **Scratch Trades** | 1 | 0 | 0 | 0 | 0 | **1** |
| **Win Rate %** | **9.13%** | **11.32%** | **17.62%** | **11.05%** | **10.36%** | **11.86%** |
| **Theoretical Gross P&L** | ₹85.45 | -₹8.60 | ₹850.85 | ₹284.15 | ₹65.60 | **₹1,277.45** |
| **Slippage Cost (2 bps)** | ₹836.61 | ₹1,062.39 | ₹1,607.45 | ₹761.43 | ₹992.53 | **₹5,260.41** |
| **Gross Realized P&L** | -₹751.16 | -₹1,070.99 | -₹756.60 | -₹477.28 | -₹926.93 | **-₹3,982.96** |
| **Brokerage (Groww)** | ₹10,664.00 | ₹10,612.00 | ₹11,399.03 | ₹10,282.00 | ₹10,212.00 | **₹53,169.03** |
| **STT (Securities Tax)** | ₹522.97 | ₹663.99 | ₹1,004.66 | ₹475.90 | ₹620.33 | **₹3,286.62** |
| **Stamp Duty** | ₹62.82 | ₹79.77 | ₹120.67 | ₹57.17 | ₹74.50 | **₹395.46** |
| **Exchange Turnover Fee** | ₹129.46 | ₹164.39 | ₹248.66 | ₹117.81 | ₹153.53 | **₹815.30** |
| **SEBI Turnover Fee** | ₹4.18 | ₹5.31 | ₹8.03 | ₹3.81 | ₹4.96 | **₹26.30** |
| **IPFT Charges** | ₹4.18 | ₹5.31 | ₹8.03 | ₹3.81 | ₹4.96 | **₹26.30** |
| **GST (18% on fees)** | ₹1,944.52 | ₹1,960.36 | ₹2,239.99 | ₹1,887.07 | ₹1,895.58 | **₹9,725.30** |
| **Total Transaction Charges** | ₹13,332.29 | ₹13,291.13 | ₹14,429.07 | ₹12,927.57 | ₹13,465.86 | **₹67,445.92** |
| **Net Realized P&L** | **-₹14,083.45** | **-₹14,362.12** | **-₹15,185.67** | **-₹13,404.85** | **-₹14,392.79** | **-₹71,428.88** |
| **Net Return on Capital** | -14.08% | -14.36% | -15.19% | -13.40% | -14.39% | **-14.29%** |
| **Profit Factor** | 0.07 | 0.09 | 0.25 | 0.09 | 0.09 | **0.12** |
| **Max Drawdown (₹)** | ₹14,083.45 | ₹14,377.43 | ₹15,213.71 | ₹13,429.96 | ₹14,392.79 | **₹71,428.88** |
| **Max Drawdown %** | 14.08% | 14.38% | 15.21% | 13.43% | 14.39% | **14.29%** |
| **Average Win** | ₹5.81 | ₹6.99 | ₹15.56 | ₹6.22 | ₹7.46 | **₹8.41** |
| **Average Loss** | ₹8.82 | ₹9.62 | ₹13.48 | ₹9.02 | ₹9.39 | **₹10.07** |
| **Net Trade Expectancy** | -₹7.48 | -₹7.74 | -₹8.36 | -₹7.34 | -₹7.64 | **-₹7.71** |

---

## 4. Key Quantitative Insights & Financial Accounting Invariants

### 4.1 Strict Financial Invariant Reconciliation

For every stock and for the combined portfolio, the exact financial identity holds without rounding errors:

$$\text{Theoretical Gross P&L} - \text{Slippage Cost} = \text{Gross Realized P&L}$$
$$\text{Gross Realized P&L} - \text{Total Statutory Charges} = \text{Net Realized P&L}$$

Portfolio Proof:
$$₹1,277.45 - ₹5,260.41 = -₹3,982.96$$
$$-₹3,982.96 - ₹67,445.92 = -₹71,428.88$$

### 4.2 Why Pure EMA 9/21 Crossover Has a Negative Net Expectancy

1. **Whipsaws in Intraday Consolidations**:
   Indian cash equity markets spend roughly 82–85% of regular sessions in non-trending or range-bound conditions (as proven in Phase 7 research). Because EMA 9 and EMA 21 are rapid, responsive moving averages, sideways markets produce frequent false breakouts (whipsaws). Over 5 years, the strategy executed 9,264 trades (~1.5 trades per stock per day), but only 1,099 were winners (11.86% win rate).

2. **The Friction Tax**:
   While the raw price action generated a marginally positive theoretical gross return of ₹1,277.45, transaction frictions completely overwhelmed the returns:
   - Slippage cost: ₹5,260.41
   - Total Groww brokerage + statutory charges: ₹67,445.92
   - Total friction drag: **₹72,706.33**

3. **Absence of Stop Loss & Profit Target**:
   Because the strategy relies strictly on the opposite crossunder to exit, winning trades often give back substantial open profits before EMA 9 manages to cross below EMA 21.

---

## 5. Architectural Deliverables & Storage Index

The backtest outputs, full trade journals, and metrics have been written to the persistent storage directory:

- Master Report: `backend/storage/backtesting/ema_9_21/EMA_9_21_CROSSOVER_REPORT.md`
- Master Portfolio JSON: `backend/storage/backtesting/ema_9_21/portfolio_summary.json`
- `ICICIBANK`: `backend/storage/backtesting/ema_9_21/ICICIBANK/summary.json` & `trades.csv` (1,883 trades)
- `HDFCBANK`: `backend/storage/backtesting/ema_9_21/HDFCBANK/summary.json` & `trades.csv` (1,855 trades)
- `M&M`: `backend/storage/backtesting/ema_9_21/M&M/summary.json` & `trades.csv` (1,816 trades)
- `AXISBANK`: `backend/storage/backtesting/ema_9_21/AXISBANK/summary.json` & `trades.csv` (1,828 trades)
- `BHARTIARTL`: `backend/storage/backtesting/ema_9_21/BHARTIARTL/summary.json` & `trades.csv` (1,882 trades)
- Total trade records in journal: **9,264 reconciled trades**.

