# Intraday Strategy Parameter Matrix & Experimental Cohorts

**Document File:** `STRATEGY_PARAMETER_MATRIX.md`  
**Storage Path:** `backend/storage/strategy/STRATEGY_PARAMETER_MATRIX.md`  
**Research Universe:** ICICIBANK, HDFCBANK, M&M, AXISBANK, BHARTIARTL  
**Primary Timeframe:** 5-minute continuous session candles (`09:15`–`15:25` IST)  
**Historical Period:** 2021-11-08 to 2026-11-06 (479,982 certified candles)  
**Execution Phase:** Preparation for Phase 6 Backtesting Engine  

---

## 1. Experimental Methodology & Architecture

In quantitative strategy research, testing a massive unguided combinatorial grid (e.g., $10 \times 10 \times 10$ parameters) inevitably results in **data-snooping bias** and **overfitting** to historical noise.

To ensure empirical validity, our research architecture divides parameters into **orthogonal experimental cohorts**. Each cohort varies exactly **one** operational dimension while keeping all other control variables fixed.

### Core Control Baseline (`BASE-ORB-VWAP-EMA`)
- **Base Variant:** Variant C (`C_ORB_VWAP_EMA`)
- **Opening Range:** 09:15 to 09:30 IST (3 completed 5-min bars: 09:15, 09:20, 09:25)
- **Entry Type:** Breakout close confirmation (`BREAKOUT_CLOSE`)
- **Direction:** Bidirectional (`BOTH`)
- **Stop Loss:** Opposite side of opening range (`OR_OPPOSITE`)
- **Profit Target:** Fixed 1:1.5 Risk/Reward (`FIXED_RR_1_5`)
- **Risk Budget:** 0.5% of capital per trade, max 1.0% daily loss
- **Max Trades Per Day:** 2 trades
- **Square-off Time:** 15:15 IST

---

## 2. Experimental Research Cohorts

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Master Parameter Matrix                         │
├───────────────────────────────┬────────────────────────────────────────┤
│ Cohort 1: Execution Mechanics │ Breakout Close vs. Retest Confirmation │
│ Cohort 2: Directional Bias    │ Both vs. Long-Only vs. Short-Only      │
│ Cohort 3: ADX Trend Strength  │ ADX 20 vs. ADX 25 vs. Rising ADX       │
│ Cohort 4: Volume Surge (RVOL) │ RVOL 1.2 vs. 1.5 vs. 2.0               │
│ Cohort 5: Stop Loss Geometry  │ OR Opposite vs. Swing vs. ATR-based    │
│ Cohort 6: Target Multipliers  │ 1:1.5 RR vs. 1:2.0 RR                  │
│ Cohort 7: Frequency Limits    │ Max Trades 1 vs. 2 vs. 3 per day       │
└───────────────────────────────┴────────────────────────────────────────┘
```

---

### Cohort 1: Execution Mechanics (Breakout Close vs Retest Confirmation)
*Objective:* Measure whether waiting for a price retest of the broken opening range boundary eliminates false breakout whipsaws or causes missed winners due to strong momentum runners.

| Experiment ID | Base Variant | Entry Type | Retest Tolerance | Retest Max Bars | Stop Loss Mode | Target RR |
|---|---|---|---|---|---|---|
| `EXP-EXEC-001` | `B_ORB_VWAP` | `BREAKOUT_CLOSE` | N/A | N/A | `OR_OPPOSITE` | 1:1.5 |
| `EXP-EXEC-002` | `B_ORB_VWAP` | `RETEST_CONFIRMATION` | 0.20% | 6 bars (30 min) | `OR_OPPOSITE` | 1:1.5 |
| `EXP-EXEC-003` | `C_ORB_VWAP_EMA` | `BREAKOUT_CLOSE` | N/A | N/A | `OR_OPPOSITE` | 1:1.5 |
| `EXP-EXEC-004` | `C_ORB_VWAP_EMA` | `RETEST_CONFIRMATION` | 0.20% | 6 bars (30 min) | `OR_OPPOSITE` | 1:1.5 |

---

### Cohort 2: Directional Bias (Long vs Short Asymmetry)
*Objective:* Indian cash equity and index components frequently exhibit macro upward drift and structural differences between bull rallies and panic selloffs. This cohort quantifies long-side vs short-side edge independently.

| Experiment ID | Base Variant | Allowed Direction | Entry Type | Stop Loss Mode | Target RR | Max Trades/Day |
|---|---|---|---|---|---|---|
| `EXP-DIR-001` | `C_ORB_VWAP_EMA` | `BOTH` | `BREAKOUT_CLOSE` | `OR_OPPOSITE` | 1:1.5 | 2 |
| `EXP-DIR-002` | `C_ORB_VWAP_EMA` | `LONG_ONLY` | `BREAKOUT_CLOSE` | `OR_OPPOSITE` | 1:1.5 | 2 |
| `EXP-DIR-003` | `C_ORB_VWAP_EMA` | `SHORT_ONLY` | `BREAKOUT_CLOSE` | `OR_OPPOSITE` | 1:1.5 | 2 |
| `EXP-DIR-004` | `D_ORB_VWAP_EMA_ADX` | `BOTH` | `BREAKOUT_CLOSE` | `OR_OPPOSITE` | 1:1.5 | 2 |
| `EXP-DIR-005` | `D_ORB_VWAP_EMA_ADX` | `LONG_ONLY` | `BREAKOUT_CLOSE` | `OR_OPPOSITE` | 1:1.5 | 2 |
| `EXP-DIR-006` | `D_ORB_VWAP_EMA_ADX` | `SHORT_ONLY` | `BREAKOUT_CLOSE` | `OR_OPPOSITE` | 1:1.5 | 2 |

---

### Cohort 3: Trend Strength Sensitivity (ADX 20 vs ADX 25 vs Rising ADX)
*Objective:* Determine whether higher ADX thresholds prevent churn in range-bound environments or cause delayed entries where the majority of the intraday move has already completed.

| Experiment ID | Base Variant | ADX Threshold | ADX Rising Required? | +DI / -DI Confirm | RVOL Filter | Target RR |
|---|---|---|---|---|---|---|
| `EXP-ADX-001` | `D_ORB_VWAP_EMA_ADX` | 20 | No | Yes | 0 | 1:1.5 |
| `EXP-ADX-002` | `D_ORB_VWAP_EMA_ADX` | 25 | No | Yes | 0 | 1:1.5 |
| `EXP-ADX-003` | `D_ORB_VWAP_EMA_ADX` | 20 | Yes ($ADX_t > ADX_{t-1}$) | Yes | 0 | 1:1.5 |
| `EXP-ADX-004` | `D_ORB_VWAP_EMA_ADX` | 25 | Yes ($ADX_t > ADX_{t-1}$) | Yes | 0 | 1:1.5 |

---

### Cohort 4: Volume Surge Filtering (RVOL 1.2 vs 1.5 vs 2.0)
*Objective:* Test whether relative volume expansion at breakout confirms institutional participation and reduces failure rates.

| Experiment ID | Base Variant | RVOL Threshold | Volume SMA Period | ADX Threshold | Stop Loss Mode | Target RR |
|---|---|---|---|---|---|---|
| `EXP-RVOL-001` | `E_FULL_CONFIRMATION` | 1.2 | 20 bars | 20 | `OR_OPPOSITE` | 1:1.5 |
| `EXP-RVOL-002` | `E_FULL_CONFIRMATION` | 1.5 | 20 bars | 20 | `OR_OPPOSITE` | 1:1.5 |
| `EXP-RVOL-003` | `E_FULL_CONFIRMATION` | 2.0 | 20 bars | 20 | `OR_OPPOSITE` | 1:1.5 |
| `EXP-RVOL-004` | `E_FULL_CONFIRMATION` | 1.5 | 20 bars | 25 | `OR_OPPOSITE` | 1:1.5 |

---

### Cohort 5: Stop Loss Geometry (OR Opposite vs Swing Extreme vs ATR-based)
*Objective:* Evaluate how different stop placement geometries alter win rate, average risk-to-reward ratio, and trade drawdown.

| Experiment ID | Base Variant | Stop Loss Mode | ATR Multiplier | Swing Lookback | Target RR |
|---|---|---|---|---|---|
| `EXP-SL-001` | `C_ORB_VWAP_EMA` | `OR_OPPOSITE` | N/A | N/A | 1:1.5 |
| `EXP-SL-002` | `C_ORB_VWAP_EMA` | `SWING_EXTREME` | N/A | 5 bars | 1:1.5 |
| `EXP-SL-003` | `C_ORB_VWAP_EMA` | `ATR_BASED` | 1.5x ATR14 | N/A | 1:1.5 |
| `EXP-SL-004` | `C_ORB_VWAP_EMA` | `BREAKOUT_BAR_EXTREME` | N/A | 1 bar | 1:1.5 |
| `EXP-SL-005` | `D_ORB_VWAP_EMA_ADX` | `ATR_BASED` | 1.0x ATR14 | N/A | 1:1.5 |
| `EXP-SL-006` | `D_ORB_VWAP_EMA_ADX` | `ATR_BASED` | 2.0x ATR14 | N/A | 1:1.5 |

---

### Cohort 6: Risk/Reward Target Geometry (1:1.5 vs 1:2.0 vs Trailing)
*Objective:* Compare fixed profit targets against dynamic volatility trailing exits.

| Experiment ID | Base Variant | Target Mode | Risk/Reward Ratio | Trailing Engine | Stop Loss Mode |
|---|---|---|---|---|---|
| `EXP-RR-001` | `C_ORB_VWAP_EMA` | `FIXED_RR_1_5` | 1:1.5 | None | `OR_OPPOSITE` |
| `EXP-RR-002` | `C_ORB_VWAP_EMA` | `FIXED_RR_2_0` | 1:2.0 | None | `OR_OPPOSITE` |
| `EXP-RR-003` | `C_ORB_VWAP_EMA` | `TRAILING_ATR` | 1:1.0 Initial | 1.5x ATR Trailing | `OR_OPPOSITE` |
| `EXP-RR-004` | `C_ORB_VWAP_EMA` | `TRAILING_EMA20` | 1:1.0 Initial | EMA20 Close Cross | `OR_OPPOSITE` |

---

### Cohort 7: Daily Trade Frequency Restrictions (Max Trades 1 vs 2 vs 3)
*Objective:* Measure whether allowing re-entries after a stop-out captures secondary trend moves or simply compounds daily churn and transaction costs.

| Experiment ID | Base Variant | Max Trades/Day | Max Daily Loss % | Risk Per Trade % | Target RR |
|---|---|---|---|---|---|
| `EXP-FREQ-001` | `C_ORB_VWAP_EMA` | 1 | 0.5% | 0.5% | 1:1.5 |
| `EXP-FREQ-002` | `C_ORB_VWAP_EMA` | 2 | 1.0% | 0.5% | 1:1.5 |
| `EXP-FREQ-003` | `C_ORB_VWAP_EMA` | 3 | 1.5% | 0.5% | 1:1.5 |
| `EXP-FREQ-004` | `D_ORB_VWAP_EMA_ADX` | 1 | 0.5% | 0.5% | 1:1.5 |
| `EXP-FREQ-005` | `D_ORB_VWAP_EMA_ADX` | 2 | 1.0% | 0.5% | 1:1.5 |

---

## 3. Walk-Forward Testing Protocol (Phase 6 Guidelines)

To prevent overfitting across the full five-year dataset (November 2021 to November 2026), backtesting must follow a strict **chronological train/validation/test split**:

1. **In-Sample Optimization & Parameter Screening:**
   - Period: November 8, 2021 to November 7, 2024 (3 years, ~60% of data).
   - Cohort matrix runs to identify factor stability.
2. **Out-of-Sample Validation:**
   - Period: November 8, 2024 to November 7, 2025 (1 year, ~20% of data).
   - Verifies whether parameters hold across unseen regime shifts.
3. **Blind Forward Test:**
   - Period: November 8, 2025 to November 6, 2026 (1 year, ~20% of data).
   - Locked configuration run without further tuning.

> [!IMPORTANT]
> **No Universal Optimizer:** The purpose of this parameter matrix is to scientifically observe the trade-offs between filter tightness, trade frequency, expectancy, and slippage sensitivity—not to declare a single "magic" set of parameters.

