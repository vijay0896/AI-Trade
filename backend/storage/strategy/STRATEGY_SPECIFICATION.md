# Intraday Trend-Following Strategy Specification

**Document File:** `STRATEGY_SPECIFICATION.md`  
**Storage Path:** `backend/storage/strategy/STRATEGY_SPECIFICATION.md`  
**Strategy Name:** Opening Range Breakout (ORB) + VWAP + EMA Intraday System  
**Target Market:** Indian Equities (NSE Cash / Equity Segment)  
**Research Universe:** ICICIBANK, HDFCBANK, M&M, AXISBANK, BHARTIARTL  
**Primary Timeframe:** 5-minute continuous session candles  
**Market Timezone:** `Asia/Kolkata` (IST)  
**Strategy Version:** 1.0.0  
**Status:** Quantitative Research Specification (Pre-Backtest)  

---

> [!IMPORTANT]
> **Research Hypothesis Disclosure:**  
> This strategy is a structured, rule-based quantitative hypothesis formulated for historical backtesting and empirical study. It is **not** a verified profitable trading strategy, and it does **not** constitute financial advice, an investment recommendation, or a live trading guarantee. Past performance does not guarantee future results.

---

## 1. Strategy Objective & Theoretical Framework

The primary objective of this strategy is to capture directional intraday price expansion in liquid Indian equities following the morning price-discovery phase, while systematically avoiding choppy, sideways consolidation regimes.

### Core Quantitative Premises:
1. **Institutional Price Discovery:** The initial 15 minutes of trading (`09:15` to `09:30` IST) represent the absorption of overnight orders, global cues, and pre-market price discovery. The high and low boundaries of this period establish critical intraday supply and demand reference levels.
2. **Breakout Expansion:** A decisive break and close outside the opening range indicates strong institutional order flow seeking liquidity at higher or lower price levels.
3. **Multi-Factor Trend Confirmation:** Pure breakout systems suffer from severe whipsaws during choppy, range-bound days. By combining:
   - **VWAP (Volume-Weighted Average Price):** Ensures price is aligned with institutional fair value.
   - **EMA 20 & EMA 50 Stack:** Confirms short-to-medium intraday momentum alignment.
   - **ADX 14 & Directional Movement (+DI / -DI):** Validates that market strength is trending rather than oscillating.
   - **Relative Volume (RVOL 20):** Confirms that volume participation is elevated above normal baseline activity.

---

## 2. Opening Range Breakout (ORB) Mechanics

### 2.1 Timestamp Conventions & Bar Alignment
In our historical 5-minute dataset, candle timestamps represent the **start of the 5-minute interval**:

| Candle Index | Bar Start Timestamp | Bar Close / Completion Time | Function |
|---|---|---|---|
| **Bar 1** | `09:15:00` | `09:19:59` | Opening Range Formulation |
| **Bar 2** | `09:20:00` | `09:24:59` | Opening Range Formulation |
| **Bar 3** | `09:25:00` | `09:29:59` | Opening Range Formulation |
| **Bar 4** | `09:30:00` | `09:34:59` | **First Actionable Signal Bar** |

At `09:30:00` IST, Bar 3 completes, and the Opening Range is **mathematically locked** for the remainder of the trading day.

### 2.2 Mathematical Formulas for Opening Range
Let $H_i, L_i, C_i, V_i$ denote the High, Low, Close, and Volume for candle $i \in \{1, 2, 3\}$:

$$\text{Opening Range High (ORH)} = \max(H_1, H_2, H_3)$$

$$\text{Opening Range Low (ORL)} = \min(L_1, L_2, L_3)$$

$$\text{Opening Range Width} = \text{ORH} - \text{ORL}$$

$$\text{Opening Range Percentage (OR\%)} = \frac{\text{Opening Range Width}}{\text{ORL}} \times 100$$

$$\text{Opening Range Midpoint (ORM)} = \frac{\text{ORH} + \text{ORL}}{2}$$

### 2.3 Opening Range Validity & Anomaly Filters
- **Completeness Guard:** Exactly 3 regular continuous candles (`09:15`, `09:20`, `09:25`) must be present. If any candle is missing or malformed, the session's Opening Range is classified as `INVALID`, and no signals are generated for that day.
- **Minimum Width Guard:** If $\text{OR\%} < 0.10\%$, volatility is too compressed; breakout signals are suppressed to avoid spread drag.
- **Maximum Width Guard:** If $\text{OR\%} > 3.50\%$ (e.g. large overnight earnings shock or geopolitical event gap), the opening range is considered over-expanded; risk/reward is unfavorable, and trade signals are suppressed.

---

## 3. Strategy Variants (A through E)

The system defines five hierarchically layered variants to systematically isolate the edge contributed by each filter during Phase 6 backtesting.

```
Variant A: Pure ORB Breakout
     │  (+ Close > ORH / Close < ORL)
     ▼
Variant B: ORB + VWAP Confirmation
     │  (+ Close > VWAP for Long, Close < VWAP for Short)
     ▼
Variant C: ORB + VWAP + EMA 20/50 Stack
     │  (+ EMA20 > EMA50 for Long, EMA20 < EMA50 for Short)
     ▼
Variant D: ORB + VWAP + EMA + ADX 14 & (+DI / -DI)
     │  (+ ADX >= 20/25, +DI > -DI for Long, -DI > +DI for Short)
     ▼
Variant E: Full Trend Confirmation (+ RVOL 20 >= 1.5, Choppiness < 55, ER > 0.30)
```

---

### Detailed Variant Decision Rules

#### Variant A: Basic ORB (Pure Price Action)
- **Long Entry Signal:** A regular 5-minute candle $t$ (where $t \ge \text{09:30:00}$) closes above $\text{ORH}$ ($C_t > \text{ORH}$).
- **Short Entry Signal:** A regular 5-minute candle $t$ closes below $\text{ORL}$ ($C_t < \text{ORL}$).
- **Stop Loss:** Opposite range boundary ($\text{SL}_{\text{Long}} = \text{ORL}$, $\text{SL}_{\text{Short}} = \text{ORH}$).
- **Target:** Fixed 1:1.5 Risk/Reward.

#### Variant B: ORB + VWAP Filter
- **Long Entry Signal:**
  1. $C_t > \text{ORH}$ (ORB bullish breakout)
  2. $C_t > \text{VWAP}_t$ (Price is above session volume-weighted fair value)
- **Short Entry Signal:**
  1. $C_t < \text{ORL}$ (ORB bearish breakout)
  2. $C_t < \text{VWAP}_t$ (Price is below session volume-weighted fair value)
- **Stop Loss:** Opposite range boundary or Intraday VWAP.

#### Variant C: ORB + VWAP + EMA 20/50 Stack
- **Long Entry Signal:**
  1. $C_t > \text{ORH}$
  2. $C_t > \text{VWAP}_t$
  3. $\text{EMA20}_t > \text{EMA50}_t$ (Fast moving average stacked above slow moving average)
- **Short Entry Signal:**
  1. $C_t < \text{ORL}$
  2. $C_t < \text{VWAP}_t$
  3. $\text{EMA20}_t < \text{EMA50}_t$ (Fast moving average stacked below slow moving average)

#### Variant D: ORB + VWAP + EMA + ADX 14 & Directional Movement
- **Long Entry Signal:**
  1. $C_t > \text{ORH}$
  2. $C_t > \text{VWAP}_t$
  3. $\text{EMA20}_t > \text{EMA50}_t$
  4. $\text{ADX}_{14, t} \ge \text{ADX}_{\text{threshold}}$ (where threshold is 20 or 25)
  5. $+\text{DI}_{14, t} > -\text{DI}_{14, t}$ (Positive directional movement dominates)
  6. *(Optional)* $\text{ADX}_t > \text{ADX}_{t-1}$ (Rising ADX confirmation)
- **Short Entry Signal:**
  1. $C_t < \text{ORL}$
  2. $C_t < \text{VWAP}_t$
  3. $\text{EMA20}_t < \text{EMA50}_t$
  4. $\text{ADX}_{14, t} \ge \text{ADX}_{\text{threshold}}$
  5. $-\text{DI}_{14, t} > +\text{DI}_{14, t}$ (Negative directional movement dominates)
  6. *(Optional)* $\text{ADX}_t > \text{ADX}_{t-1}$

#### Variant E: Full Trend Confirmation (Multi-Regime Institutional Setup)
- **Long Entry Signal:**
  1. All conditions of Variant D satisfied ($\text{ADX} \ge 25$, $+\text{DI} > -\text{DI}$).
  2. $\text{RVOL}_{20, t} \ge 1.5$ (Breakout volume is $\ge 150\%$ of 20-bar rolling average volume).
  3. $\text{CHOP}_{14, t} < 55.0$ (Market is not in a sideways consolidation regime).
  4. $\text{ER}_{14, t} \ge 0.30$ (Kaufman Efficiency Ratio indicates strong directional displacement).
- **Short Entry Signal:**
  1. All conditions of Variant D satisfied ($\text{ADX} \ge 25$, $-\text{DI} > +\text{DI}$).
  2. $\text{RVOL}_{20, t} \ge 1.5$.
  3. $\text{CHOP}_{14, t} < 55.0$.
  4. $\text{ER}_{14, t} \ge 0.30$.

---

## 4. Entry Execution Mechanics

Two independent entry execution models are supported:

### 4.1 Type 1: Breakout Candle Close Confirmation (Next Bar Open Entry)
- **Trigger:** Candle $t$ closes satisfying all variant criteria at timestamp $T_t$.
- **Execution:** Order is simulated/filled at the **Open price of the immediate next candle** $t+1$ ($O_{t+1}$) at timestamp $T_{t+1}$.
- **No Look-Ahead:** The close of bar $t$ is strictly finalized before placing the trade at bar $t+1$ open.

### 4.2 Type 2: Breakout Followed by Retest & Confirmation Entry
- **Breakout Phase:** Candle $t_{\text{break}}$ closes above $\text{ORH}$ (for Long) or below $\text{ORL}$ (for Short).
- **Retest Zone:**
  - Long Retest Zone: $[\text{ORH} \times (1 - \text{tol}), \text{ORH} \times (1 + \text{tol})]$, where $\text{tol} = 0.20\%$.
  - Short Retest Zone: $[\text{ORL} \times (1 - \text{tol}), \text{ORL} \times (1 + \text{tol})]$.
- **Retest Window:** Retest must occur within $N_{\text{retest}} \le 6$ bars (30 minutes) after breakout.
- **Confirmation Trigger:**
  - For Long: Candle low enters the Retest Zone, doesn't close below Opening Range Midpoint ($\text{ORM}$), and a subsequent candle closes green ($C > O$) and higher than previous bar's high.
  - Entry occurs at the Open of the bar following the confirmation candle.
- **Expiration:** If no retest occurs within 6 bars, or if price closes back inside the range across the midpoint, the breakout setup is invalidated.

---

## 5. Exit & Stop Loss Architecture

### 5.1 Stop Loss Placement Alternatives
1. **Opposite Range Boundary (`OR_OPPOSITE`):**
   - Long SL: $\text{ORL}$
   - Short SL: $\text{ORH}$
   - *Characteristic:* Wide structural stop; lowest whipsaw frequency, larger stop distance.
2. **Recent Swing Extreme (`SWING_EXTREME`):**
   - Long SL: Lowest Low of the last 5 bars prior to entry ($\min_{i=0..4}(L_{t-i})$).
   - Short SL: Highest High of the last 5 bars prior to entry ($\max_{i=0..4}(H_{t-i})$).
   - *Characteristic:* Tighter structural stop; allows larger position sizes.
3. **ATR-Based Volatility Stop (`ATR_BASED`):**
   - Long SL: $\text{Entry Price} - (1.5 \times \text{ATR}_{14, t})$
   - Short SL: $\text{Entry Price} + (1.5 \times \text{ATR}_{14, t})$
   - *Characteristic:* Dynamic volatility-adapted distance.
4. **Breakout Bar Extreme (`BREAKOUT_BAR_EXTREME`):**
   - Long SL: Low of the breakout bar ($L_{t_{\text{break}}}$).
   - Short SL: High of the breakout bar ($H_{t_{\text{break}}}$).

### 5.2 Profit Target Alternatives
1. **Fixed Risk/Reward 1:1.5 (`FIXED_RR_1_5`):**
   - Target Distance $= 1.5 \times |\text{Entry} - \text{SL}|$.
   - Long Target: $\text{Entry} + \text{Target Distance}$.
   - Short Target: $\text{Entry} - \text{Target Distance}$.
2. **Fixed Risk/Reward 1:2.0 (`FIXED_RR_2_0`):**
   - Target Distance $= 2.0 \times |\text{Entry} - \text{SL}|$.
3. **Trailing Stop (`TRAILING_ATR` or `TRAILING_EMA20`):**
   - After price reaches 1:1.0 Risk/Reward, Stop Loss is moved to Breakeven ($\text{Entry Price}$).
   - Further profit is trailed at $1.5 \times \text{ATR}$ or trailed candle-by-candle behind the EMA 20 value.

### 5.3 Time-Based and Session Exits
- **Entry Cutoff Time:** `14:30:00` IST. No new positions may be entered after this timestamp.
- **Mandatory Intraday Square-Off Time:** `15:15:00` IST. Any active position is unconditionally closed at market open of the `15:15:00` candle (or latest available tick prior to the `15:25:00` regular continuous close).
- **Maximum Holding Duration:** 36 bars (3 hours). If neither Stop Loss nor Target has been reached within 36 bars, the trade is liquidated at market.
- **Gap-Through-Stop Model:** If an intraday halt or adverse tick gaps through the Stop Loss price, the execution model applies **worst-case filling** (executed at actual bar Open or Low/High extreme, never at the theoretical stop price).
- **Special Session Handling:** On special sessions (e.g., Diwali Muhurat trading, Saturday Disaster Recovery sessions), all new entries are **suppressed** (`SUPPRESS_ALL`).

---

## 6. Risk Management & Position Sizing Framework

### 6.1 Position Sizing Formula
Position sizing is strictly risk-budgeted based on allocated account capital $C$:

$$\text{Risk Budget} = C \times \left(\frac{\text{Risk Per Trade \%}}{100}\right)$$

$$\text{Stop Distance} = |\text{Entry Price} - \text{Stop Loss Price}|$$

$$\text{Raw Quantity} = \frac{\text{Risk Budget}}{\text{Stop Distance}}$$

$$\text{Capital-Constrained Max Shares} = \left\lfloor \frac{C \times \text{Leverage}}{\text{Entry Price}} \right\rfloor$$

$$\text{Executable Quantity} = \min\left(\lfloor \text{Raw Quantity} \rfloor, \text{Capital-Constrained Max Shares}\right)$$

### 6.2 Strict Capital Protection Rules
1. **Integer Share Quantities:** Fractional shares are prohibited in Indian equity cash segments. The quantity is always rounded down using `Math.floor()`.
2. **Zero-Share Minimum Guard:** If $\text{Executable Quantity} < 1$, the trade is automatically rejected (insufficient capital for the required stop loss distance).
3. **Daily Maximum Loss Circuit Breaker:**
   $$\text{Daily Cumulative Realized Loss} \ge C \times \left(\frac{\text{Daily Max Loss \%}}{100}\right)$$
   Once this threshold is hit (default: 1.0% of capital), the risk engine trips: all open positions are liquidated immediately, and no further trades are permitted for that trading day.
4. **Maximum Trades Per Day:** Configurable limit of 1, 2, or 3 trades per symbol per day.
5. **No Pyramiding:** Maximum of 1 active position per stock at any time.

---

## 7. Sideways Market Avoidance (Regime Filters)

Intraday trend-following strategies experience severe drawdowns during consolidation regimes. The following quantitative filters are parameterized to detect and reject non-trending environments:

| Filter Metric | Threshold / Condition | Quantitative Purpose |
|---|---|---|
| **ADX 14** | $\text{ADX}_{14} \ge 20$ or $25$ | Rejects low-volatility drift and sideways consolidation. |
| **Rising ADX** | $\text{ADX}_{14, t} > \text{ADX}_{14, t-1}$ | Ensures directional momentum is actively expanding. |
| **Directional Movement** | $+\text{DI}_{14} > -\text{DI}_{14}$ (Long) | Confirms upward directional bias exceeds downward bias. |
| **Choppiness Index 14** | $\text{CHOP}_{14} < 55.0$ | $\text{CHOP} > 61.8$ indicates pure fractal noise; $< 55$ indicates trend phase. |
| **Efficiency Ratio 14** | $\text{ER}_{14} \ge 0.30$ | Measures net price change relative to cumulative path length; eliminates churn. |
| **Relative Volume (RVOL)** | $\text{RVOL}_{20} \ge 1.5$ | Confirms institutional volume participation at the breakout bar. |
| **VWAP Cross Count** | $\le 4$ crosses in first 60 min | More than 4 VWAP crosses indicates aggressive whipsaw / mean-reversion. |

---

## 8. Concrete Trade Setup Walkthroughs

### Walkthrough 1: Valid Bullish Setup (ICICIBANK — Long Trade)
- **Date:** 2026-11-06
- **Opening Range (09:15 to 09:25 IST):**
  - Bar 1 (`09:15`): High = 1518.10, Low = 1505.20, Close = 1507.20
  - Bar 2 (`09:20`): High = 1510.40, Low = 1506.00, Close = 1509.80
  - Bar 3 (`09:25`): High = 1512.00, Low = 1508.30, Close = 1511.50
  - **Locked Range:** $\text{ORH} = 1518.10$, $\text{ORL} = 1505.20$, $\text{Width} = 12.90$ ($\text{OR\%} = 0.86\%$, Valid).
- **Signal Bar (`09:45` IST):**
  - Close = 1519.80 ($C > \text{ORH} \implies \text{Breakout}$).
  - $\text{VWAP} = 1512.40$ ($C > \text{VWAP} \implies \text{Aligned}$).
  - $\text{EMA20} = 1513.10 > \text{EMA50} = 1510.50$ ($\implies \text{Aligned}$).
  - $\text{ADX14} = 26.40 \ge 25$, $+\text{DI14} = 28.50 > -\text{DI14} = 14.20$.
  - $\text{RVOL20} = 1.82 \ge 1.5$.
- **Execution (`09:50` Open):**
  - Entry Price: `1520.00`
  - Stop Loss (`SWING_EXTREME`): `1508.30` (5-bar swing low).
  - Stop Distance $= 1520.00 - 1508.30 = 11.70$.
  - Capital $= ₹100,000$, Risk $= 0.5\% \implies ₹500$.
  - Quantity $= \lfloor 500 / 11.70 \rfloor = 42\text{ shares}$.
  - Target (1:1.5 RR): $1520.00 + (1.5 \times 11.70) = \mathbf{1537.55}$.

---

### Walkthrough 2: Valid Bearish Setup (HDFCBANK — Short Trade)
- **Opening Range:** $\text{ORH} = 1445.00$, $\text{ORL} = 1432.00$, $\text{Width} = 13.00$ ($\text{OR\%} = 0.91\%$).
- **Signal Bar (`10:15` IST):**
  - Close = 1429.50 ($C < \text{ORL} \implies \text{Breakdown}$).
  - $\text{VWAP} = 1438.20$ ($C < \text{VWAP} \implies \text{Aligned}$).
  - $\text{EMA20} = 1435.00 < \text{EMA50} = 1440.00$ ($\implies \text{Aligned}$).
  - $\text{ADX14} = 27.10 \ge 25$, $-\text{DI14} = 31.20 > +\text{DI14} = 12.80$.
  - $\text{RVOL20} = 1.65 \ge 1.5$.
- **Execution (`10:20` Open):**
  - Entry Price: `1429.00`
  - Stop Loss (`OR_OPPOSITE`): `1445.00` (Opening Range High).
  - Stop Distance $= 1445.00 - 1429.00 = 16.00$.
  - Capital $= ₹100,000$, Risk $= 0.5\% \implies ₹500$.
  - Quantity $= \lfloor 500 / 16.00 \rfloor = 31\text{ shares}$.
  - Target (1:1.5 RR): $1429.00 - (1.5 \times 16.00) = \mathbf{1405.00}$.

---

### Walkthrough 3: Rejection / No-Trade Session (Sideways Consolidation)
- **Opening Range:** $\text{ORH} = 1040.00$, $\text{ORL} = 1032.00$.
- **Candidate Breakout Bar (`10:45` IST):**
  - Close = 1041.50 ($C > \text{ORH}$ — Price breaks out).
- **Filter Evaluation:**
  - $\text{VWAP} = 1039.80$ ($C > \text{VWAP}$ — Passed).
  - $\text{EMA20} = 1037.00 < \text{EMA50} = 1038.50$ (**FAILED** — Moving averages not aligned).
  - $\text{ADX14} = 16.40 < 20.00$ (**FAILED** — Trend strength insufficient).
  - $\text{CHOP14} = 64.20 > 55.00$ (**FAILED** — Choppiness Index indicates sideways fractal noise).
  - $\text{RVOL20} = 0.85 < 1.20$ (**FAILED** — Low volume participation).
- **System Action:** **NO TRADE**. Signal is suppressed. Avoids entering a false breakout bull trap.

---

## 9. Edge Cases & Boundary Conditions

| Scenario | System Handling |
|---|---|
| **Missing Bar during 09:15–09:30** | Opening Range invalidated; no trade signals allowed all day. |
| **OR Width < 0.10% or > 3.50%** | Opening Range flagged as out-of-bounds; all trades suppressed. |
| **Signal triggered after 14:30 IST** | Order rejected due to entry cutoff restriction. |
| **Position active at 15:15 IST** | Unconditional market exit (Square-off). |
| **Simultaneous SL & Target Touch** | Worst-case assumption: Stop Loss assumed triggered first. |
| **Overnight Gap / Special Session** | Diwalled/DR sessions suppressed; no overnight carryover allowed. |
| **Calculated Shares < 1** | Order rejected due to insufficient capital. |

