# AI Trading System — Master Project Roadmap

**Project name:** AI Trading System  
**Primary broker/data provider:** Groww Trading API  
**Primary market:** Indian equities (NSE, cash/equity segment)  
**Primary research timeframe:** 5-minute candles  
**Initial universe:** ICICIBANK, HDFCBANK, M&M, AXISBANK, BHARTIARTL  
**Roadmap prepared:** 8 November 2026  
**Document purpose:** Single source of truth for project goals, architecture, implementation phases, acceptance criteria, and progress.  

> **How to use this file:** Keep this file in the repository root as `AI_TRADING_MASTER_README.md`. Give the Antigravity agent the instruction in **“Instructions for Antigravity”** below. The agent must read this document and `PROJECT_OVERVIEW.md` before every substantial task, inspect the real source code, work phase by phase, and update this file after completing each phase. Do not rely on this roadmap instead of inspecting the code: the repository is the source of truth for what is actually implemented.

---

## 1. Project vision

Build a research-first intraday trading and quantitative analysis platform for Indian stocks. The system will collect historical 5-minute market data from Groww, validate and store it, calculate technical indicators, evaluate intraday trend behaviour, backtest rule-based strategies, compare stocks, and display evidence-based results in the existing React dashboard.

The first research question is:

**Among the selected liquid NSE stocks, which have the most useful intraday directional movement on 5-minute candles, relatively less choppy/sideways behaviour, and sufficient liquidity for a realistic intraday strategy?**

The first strategy to evaluate is an **Opening Range Breakout (ORB) + VWAP + EMA trend-following strategy**, with ADX and volume as optional filters. This is a hypothesis to test, not a proven profitable strategy.

### Desired final outcome

At the end of the project, the application should be able to:

1. Connect to the existing Groww account through the already implemented backend authentication flow.
2. Download and maintain historical 5-minute OHLCV candles for the selected NSE stocks, subject to actual Groww account entitlements and API availability.
3. Validate data quality and identify missing, duplicate, malformed, or out-of-session candles.
4. Calculate indicators and objective measures of trend, volatility, and choppiness.
5. Backtest the proposed strategy without look-ahead bias and with realistic transaction costs and slippage assumptions.
6. Compare stocks using out-of-sample performance and risk metrics, not just raw returns or one good day.
7. Show stock-wise results, trades, equity curves, drawdowns, and data-quality reports in the existing React application.
8. Support paper-trading validation before any consideration of live execution.

## 2. Non-goals and safety boundaries

- This project is **research, historical analysis, backtesting, and paper trading first**.
- Do not place, modify, or cancel live orders as part of these phases.
- Do not enable automated live trading without a separate explicit decision and a dedicated risk/security review.
- Never promise or assume profitability. Historical performance does not guarantee future results.
- Do not fabricate candles, interpolate missing market data, silently discard bad records, or present simulated results as actual results.
- Do not expose Groww API keys, access tokens, TOTP values, TOTP QR secrets, account identifiers, or personal account data in frontend code, logs, screenshots, documentation, Git, or reports.
- Do not send broker credentials to an AI model, commit them, or put secrets in prompts. Keep them in the existing backend environment configuration.
- Do not replace the existing Groww authentication/session implementation unless a verified defect requires a narrowly scoped fix.
- Do not use Yahoo Finance fallback data as a substitute for Groww historical 5-minute candles. The existing Yahoo Finance fallback is only documented for live holding-price fallback; historical backtesting data must have a clearly identified source.

## 3. Existing project — baseline from the codebase audit

The original `PROJECT_OVERVIEW.md` audit describes an existing React + Node.js application with a layered Groww integration.

### Current technology stack

| Layer | Technology | Existing purpose |
|---|---|---|
| Frontend | React 19, TypeScript, Vite | Web application |
| UI styling | Tailwind CSS 4 | Styling |
| Routing | React Router DOM 7 | Client-side navigation |
| State/API cache | Redux Toolkit + RTK Query | Shared state and API requests |
| Backend | Node.js + Express 4 | REST API |
| Validation | Zod | Environment/input validation |
| Logging | Winston + Morgan | Application/request logs |
| Security middleware | Helmet, CORS, XSS middleware | Backend request protection |
| Groww authentication | Existing TOTP/token flow | Broker session creation and refresh |
| Storage | No database configured in original audit | Session is in memory; no persistent market-data storage at that time |

Versions and actual dependencies must be rechecked from the current `package.json` files before changing them.

### Existing Groww/backend structure from the audit

```text
backend/
├── app.js
├── server.js
└── src/
    ├── config/
    │   ├── cors.js
    │   ├── env.js
    │   └── logger.js
    ├── core/
    │   ├── middlewares/
    │   │   ├── error.js
    │   │   ├── requestId.js
    │   │   └── xss.js
    │   └── utils/
    │       ├── asyncHandler.js
    │       ├── response.utils.js
    │       └── totp.utils.js
    ├── modules/
    │   ├── groww/
    │   │   ├── groww.client.js
    │   │   ├── groww.controller.js
    │   │   ├── groww.formatter.js
    │   │   ├── groww.routes.js
    │   │   └── groww.service.js
    │   └── health/
    └── routes/Phase 2.2
        └── index.js
```

The original audit describes the following existing backend routes:

- `POST /api/v1/groww/connect`
- `GET /api/v1/groww/status`
- `GET /api/v1/groww/profile`
- `GET /api/v1/groww/funds`
- `GET /api/v1/groww/holdings`
- `GET /api/v1/groww/positions`
- Health/root endpoints described in `PROJECT_OVERVIEW.md`

The original audit also describes a React dashboard with Dashboard, Profile, Funds, Holdings, and Positions pages, using RTK Query for backend calls.

### Important existing architecture constraints

- Groww access-token/session state was documented as in-memory in the existing `GrowwService`; process restart can clear it and require reconnection.
- The original audit found no SQL/NoSQL database, ORM, migrations, or persistent trade-history storage.
- The original audit found duplicate `getHoldings()` and `formatHoldings()` method declarations. Treat these as known technical-debt findings; do not refactor them during market-data work unless a test shows they block the task.
- Existing Groww integration must be reused. Do not create a second independent Groww login/session implementation.

## 4. Current verified progress

This section records evidence already observed during this conversation. If the repository changes later, re-verify it and update this section.

### Phase 1 — Groww historical candle API proof of integration

**Status: COMPLETED — API returned HTTP 200.**

The backend endpoint below returned a successful response in the user's terminal:

`GET http://localhost:5001/api/v1/market-data/historical-candles`

Observed query parameters:

- `symbol=ICICIBANK`
- `start_time=2026-11-06 09:15:00`
- `end_time=2026-11-06 15:30:00`
- `candle_interval=5minute`

Observed response facts:

- `success: true`
- `statusCode: 200`
- message: `Historical candles fetched successfully`
- returned symbol: `NSE-ICICIBANK`
- returned interval: `5minute`
- returned candle count: **74**
- OHLCV fields were present in the visible response.

### Historical coverage spot-check

**Status: PASSED for one ICICIBANK date only; full five-year coverage is NOT yet established.**

A second successful request returned historical data for:

- `ICICIBANK`
- `2021-11-08 09:15:00` to `2021-11-08 15:30:00`
- `5minute`
- HTTP 200
- candle count: **76**
- OHLCV fields were present in the visible response.

The two sample requests show that the endpoint returned data for one recent date and one date in November 2021. They do **not** prove that all dates, all 5 stocks, or the entire five-year period are accessible. Test coverage at the beginning, middle, and end of the period for every symbol before starting a large download.

The two observed counts (74 and 76) differ. Do not hard-code an expected count such as 75. Inspect the actual timestamp list, endpoint candle timestamp convention, exchange session boundaries, market holidays/special sessions, and any missing intervals. Explain count differences in the data-quality report.

### Current next task

**Phase 2 — Build a safe, resumable historical downloader.** Before bulk download, run a coverage matrix for all five symbols at early, middle, and recent dates. If Groww returns an entitlement/retention/range error for any requested period, stop and report it; do not repeatedly retry a permanent 403 or pretend the full period is available.

## 5. Stock universe for initial research

The initial five candidates selected for investigation are:

| Priority for research | NSE trading symbol | Company |
|---:|---|---|
| 1 | `ICICIBANK` | ICICI Bank |
| 2 | `HDFCBANK` | HDFC Bank |
| 3 | `M&M` | Mahindra & Mahindra |
| 4 | `AXISBANK` | Axis Bank |
| 5 | `BHARTIARTL` | Bharti Airtel |

These are **candidates, not a verified ranking of the least-sideways or most-trending stocks**. The earlier selection was a liquidity-oriented shortlist. Only historical analysis can establish which are most suitable for the strategy.

For every symbol:

- Resolve the exact Groww `groww_symbol` and instrument identifier from the official Groww instrument master/CSV or current documentation.
- Do not assume that the exchange trading symbol is identical to the Groww API symbol.
- Treat `M&M` carefully in URLs, CSV paths, and filesystem names; use a stable internal slug such as `MM` while preserving the actual market symbol in data.
- Record symbol mapping source and date checked.

## 6. Historical data period and source

### Intended period

- Start: **2021-11-08**
- End: **2026-11-06** (last completed session available at the time this roadmap was prepared)
- Market timezone: `Asia/Kolkata`
- Exchange/segment: `NSE` / `CASH`
- Candle interval: `5minute`
- Fields: `timestamp, open, high, low, close, volume`

The actual downloadable period must be determined by successful API responses, not by the requested dates alone.

### Groww historical candles API

The observed integration uses the documented historical-candles API, with the current endpoint expected to be:

`GET https://api.groww.in/v1/historical/candles`

The existing local application endpoint observed in testing is:

`GET /api/v1/market-data/historical-candles`

Its observed query parameters are `symbol`, `start_time`, `end_time`, and `candle_interval`. Confirm exact request/response contracts from the current source code and current Groww documentation before implementation changes.

Groww documentation consulted in the previous work described historical candles/backtesting and a maximum request window. Use **no more than 28 calendar days per download chunk** as a conservative implementation setting, and verify the latest official limit rather than assuming it cannot change.

Official documentation references:

- https://groww.in/trade-api/docs/curl/backtesting
- https://groww.in/trade-api

### Subscription/access caveat

The first historical request returned HTTP 403 with an access-forbidden message before the user purchased a Groww API plan. After the user purchased a plan, the recent-date request and the 2021-11-08 spot-check both returned HTTP 200.

A successful old-date spot-check is encouraging but is not a blanket five-year entitlement guarantee. During Phase 2, validate every required symbol and multiple dates. If the API has a maximum retention window or returns a permanent access error, document the exact response and stop the affected download range. Never bypass access restrictions.

## 7. Target architecture

Extend the existing layered backend and React application; do not replace the current architecture.

```text
React 19 + TypeScript + RTK Query
        |
        | /api/v1/...
        v
Node.js + Express backend
        |
        +-- Existing Groww module
        |      - Existing TOTP/token/session flow
        |      - Existing authenticated API client
        |
        +-- Market Data module
        |      - Historical candle API integration
        |      - Symbol/instrument resolution
        |      - Download orchestration
        |      - Validation and normalization
        |
        +-- Historical Data Storage
        |      - CSV/parquet files initially (CSV is the first implementation target)
        |      - Download manifest and checkpoints
        |
        +-- Indicator Engine
        |      - EMA, VWAP, ADX, ATR, volume metrics
        |      - Choppiness Index and Efficiency Ratio
        |
        +-- Strategy Engine
        |      - ORB + VWAP + EMA trend-following rules
        |      - Configurable filters and risk settings
        |
        +-- Backtesting Engine
        |      - Signals, fills, exits, costs, performance metrics
        |
        v
React Research Dashboard
       - Data coverage and quality
       - Indicator/price charts
       - Stock comparison
       - Backtest trades and statistics
       - Equity curve and drawdown
       - CSV report export
```

### Suggested module layout

Follow the established `modules/<feature>/client|controller|formatter|routes|service` conventions already used in the repository. Suggested modules (adapt to actual code rules and avoid unnecessary files):

```text
backend/src/modules/
├── groww/                 # Existing; reuse
├── market-data/           # Historical market-data access/download
├── indicators/            # Indicator calculations
├── strategy/              # Strategy rules/configuration
├── backtesting/           # Historical simulation and metrics
└── research/              # Aggregated stock analysis/report APIs (if needed)

backend/storage/
└── historical-data/       # Local historical datasets; never expose publicly
    ├── ICICIBANK/
    ├── HDFCBANK/
    ├── MM/
    ├── AXISBANK/
    └── BHARTIARTL/
```

Do not create every suggested folder at once. Create only what the active phase needs.

## 8. Phase-by-phase delivery plan

The agent must complete phases in order. A phase is complete only when its acceptance criteria are met with evidence. Do not mark work complete merely because code was written.

### Phase 0 — Repository baseline and safety

**Status: BASELINE DOCUMENTED; re-verify before implementation.**

Tasks:

1. Read `PROJECT_OVERVIEW.md`, this roadmap, `.agents/codeRules.md`, root/backend/frontend `package.json`, and the relevant source files.
2. Inspect current Git status and preserve unrelated user changes.
3. Confirm the current market-data module and route that produced the successful local API response.
4. Confirm existing Groww session reuse, token refresh, error handling, and response conventions.
5. Confirm secrets are only read on the backend and data storage paths are not publicly served.
6. Do not print `.env` values or personal account identifiers.

Acceptance criteria:

- A concise baseline report is added to this file.
- No existing user changes are overwritten.
- Exact current market-data route and file paths are recorded.

### Phase 1 — Historical API proof of integration

**Status: COMPLETED (HTTP 200 observed for two ICICIBANK sample dates).**

Completed evidence:

- Recent sample: 2026-11-06, 5-minute, 74 candles, HTTP 200.
- Older sample: 2021-11-08, 5-minute, 76 candles, HTTP 200.

Follow-up validation still needed in Phase 2: check timestamp ordering, duplicates, interval spacing, first/last records, and the reason for differing candle counts.

### Phase 2 — Coverage matrix and historical downloader

**Status: COMPLETED (5-Year Historical Candles Downloaded Across 5 NSE Stocks).**

Completed evidence:
- Total records: **479,982 rows** across 305 monthly CSV files (`2021-11-08` to `2026-11-06`).
- Downloaded symbols: `ICICIBANK`, `HDFCBANK`, `M&M`, `AXISBANK`, `BHARTIARTL`.
- Checkpoints and download summary: `backend/storage/historical-data/.checkpoint.json` and `download_summary.json`.
- Zero HTTP 429 errors or API crashes encountered.

### Phase 3 — Dataset audit and research-ready dataset

**Status: COMPLETED (Session Calendar Corrections & Quality Certification Certified).**

Completed evidence:
- Master audit certified in [`DATA_QUALITY_AUDIT.md`](file:///Users/vijaychoudhary/AI-TRADING/backend/storage/historical-data/DATA_QUALITY_AUDIT.md).
- Status: **`PASS` across all 5 stocks**.
- Zero OHLC mathematical violations, zero duplicate timestamps, zero corrupted CSV rows.
- Certified NSE session boundaries:
  - October 21, 2025: Scheduled Diwali Muhurat trading (`MUHURAT_SPECIAL`, Circular `NSE/CMTR/70319`).
  - March 2, 2024 & May 18, 2024: Primary to Disaster Recovery split sessions (`DR_SPLIT`).
  - September 26, 2025: Post-14:45 close classified as `UNVERIFIED`.
  - Regular continuous market: `09:15:00` to `15:25:00` (`REGULAR`).
- Continuous regular session completeness: **99.92%** (only 70 to 74 missing 5-min bars across the entire 5 years per stock).

### Phase 4 — Indicator and intraday-behaviour engine

**Status: COMPLETED (Streaming Causal Indicator Engine & Derived Datasets Generated).**

Completed evidence:
- Module implemented in `backend/src/modules/indicators/` (calculator, validator, service, controller, routes).
- Endpoints: `GET /api/v1/indicators/status` and `GET /api/v1/indicators/latest`.
- Calculated 11 indicators across all 479,982 candles: EMA 20, EMA 50, VWAP, ATR 14, ADX 14, +DI 14, -DI 14, Choppiness Index 14, Efficiency Ratio 14, Volume SMA 20, Relative Volume 20 (RVOL).
- Execution runtime: **2.24 seconds** for all ~480k candles.
- Derived datasets stored in `backend/storage/derived/indicators/{SYMBOL}/{YEAR}/{SYMBOL}_{YEAR}_{MM}.csv`.
- Master report: `backend/storage/derived/indicators/INDICATOR_ENGINE_REPORT.md` and `indicator_summary.json`.
- Unit tests: 21 tests pass with 0 failures (`backend/test/indicators.test.js`).

### Phase 5 — Strategy specification and configuration

**Status: COMPLETED (Comprehensive Specification, Zod Schemas & Parameter Matrix Created).**

Completed evidence:
- Module implemented in `backend/src/modules/strategy/` (`strategy.constants.js`, `strategy.schema.js`, `strategy.config.js`, `strategy.formatter.js`, `strategy.service.js`, `strategy.controller.js`, `strategy.routes.js`).
- REST Endpoints mounted under `/api/v1/strategy/*`:
  - `GET /api/v1/strategy/configs`: Returns all predefined core variants.
  - `GET /api/v1/strategy/configs/:variantId`: Returns single variant configuration.
  - `POST /api/v1/strategy/validate`: Validates custom strategy payloads against strict Zod schema.
  - `POST /api/v1/strategy/position-size`: Computes risk-budgeted position sizing with integer shares and capital guards.
  - `GET /api/v1/strategy/matrix`: Retrieves the experimental parameter matrix cohorts.
- Defined 5 Strategy Variants:
  - Variant A: Basic ORB (Breakout close beyond 09:15–09:30 range).
  - Variant B: ORB + VWAP confirmation.
  - Variant C: ORB + VWAP + EMA 20/50 stack.
  - Variant D: ORB + VWAP + EMA + ADX 14 strength & +DI/-DI confirmation.
  - Variant E: Full Trend Confirmation (ADX >= 25, RVOL >= 1.5, Choppiness < 55, ER >= 0.30).
- Entry Execution Models: Breakout Candle Close Confirmation (Next Bar Open) and Retest & Confirmation Entry.
- Stop Loss & Exit Architecture: Opposite range boundary, recent swing extreme, ATR-based stop, breakout bar extreme; 1:1.5 & 1:2.0 RR targets; 14:30 entry cutoff, 15:15 mandatory square-off.
- Risk Management: Configurable risk % (0.25%, 0.5%, 1.0%), max daily loss circuit breaker, integer share rounding, capital constraints.
- Storage Deliverables:
  - [`STRATEGY_SPECIFICATION.md`](file:///Users/vijaychoudhary/AI-TRADING/backend/storage/strategy/STRATEGY_SPECIFICATION.md)
  - [`STRATEGY_CONFIGURATIONS.json`](file:///Users/vijaychoudhary/AI-TRADING/backend/storage/strategy/STRATEGY_CONFIGURATIONS.json)
  - [`STRATEGY_PARAMETER_MATRIX.md`](file:///Users/vijaychoudhary/AI-TRADING/backend/storage/strategy/STRATEGY_PARAMETER_MATRIX.md)
- Test Suite: 44 tests pass with 0 failures (`backend/test/strategy.test.js` & `backend/test/indicators.test.js`).
- Strictly non-optimistic: No historical strategy profitability claimed.

### Phase 6 — Backtesting engine

**Status: COMPLETED (Deterministic Event-Driven Engine, Full Groww Fee Model & 25-Run Matrix Executed).**

Completed evidence:
- Module implemented in `backend/src/modules/backtesting/` (`backtesting.constants.js`, `backtesting.fees.js`, `backtesting.execution.js`, `backtesting.risk.js`, `backtesting.metrics.js`, `backtesting.engine.js`, `backtesting.storage.js`, `backtesting.schema.js`, `backtesting.service.js`, `backtesting.controller.js`, `backtesting.routes.js`).
- REST Endpoints mounted under `/api/v1/backtesting/*`:
  - `GET /api/v1/backtesting/runs`: Returns list of past backtest runs and summary statistics.
  - `GET /api/v1/backtesting/runs/:runId`: Detailed run overview with configurations and metrics.
  - `GET /api/v1/backtesting/runs/:runId/trades`: Returns granular trade journal for a specific run.
  - `POST /api/v1/backtesting/run`: Triggers a synchronous or asynchronous backtest run.
- Standalone CLI Runner: `backend/src/scripts/runBacktest.js` supporting `--symbol`, `--variant`, `--capital`, `--slippage`, `--direction`, and `--batch` (executed all 25 pairs across 5 years in 5.92 seconds).
- Full batch evaluation across 5 stocks × 5 variants (479,982 candles, 5 years):
  - Verified causal execution: Signal evaluated strictly on candle close $t$; fill executed at candle open $t+1$ with slippage.
  - Intrabar ambiguity resolution: Conservative worst-case stop loss assumed on simultaneous intrabar touches.
  - Gap-through-stop handling: Executed at actual candle open rather than theoretical stop.
  - Full Groww transaction fee schedules: Brokerage ($\min(₹20, 0.05\%)$), STT (0.025% on sell turnover), Stamp Duty (0.003% on buy turnover), NSE exchange charges (pre-Oct 2024: 0.00325%, post-Oct 2024: 0.00297%), SEBI/IPFT (₹10/crore), GST (18%), and configurable slippage (default 2 bps).
  - Risk controls: 0.5% risk budgeting per trade, integer share rounding, max 2 trades/day, daily loss circuit breaker (1.0%), and mandatory 15:15 IST square-off.
- Master Report: [`BACKTEST_ENGINE_REPORT.md`](file:///Users/vijaychoudhary/AI-TRADING/backend/storage/backtesting/BACKTEST_ENGINE_REPORT.md).
- Run artifacts persisted under `backend/storage/backtesting/runs/{RUN_ID}/` containing `trades.csv`, `equity_curve.csv`, `excluded_sessions.csv`, `summary.json`, `run_metadata.json`, and `config.json`.
- Test Suite: 57 passing unit tests across 21 suites (`backend/test/backtesting.test.js`, `backend/test/strategy.test.js`, and `backend/test/indicators.test.js`).
- Strictly non-optimistic: No live trading claims; demonstrates how basic ORB is value-destroying after costs, while progressive multi-indicator filtering (Variant E) compresses drawdown and reduces churn by ~70%.

### Phase 6.1 — Backtest reconciliation and financial accuracy audit

**Status: COMPLETED (Financial Reconciliation Certified, Effective-Dated Groww Fees & Ledger Invariant Verified).**

Completed evidence:
- Financial Reconciliation Certified: Eliminated discrepancy between theoretical gross P&L, slippage cost, and realized gross P&L.
- Invariant Accounting Identity Enforced:
  $$\text{Net P\&L} = \text{Theoretical Gross P\&L} - \text{Total Slippage Cost} - \text{Total Charges}$$
  Every trade in `trades.csv` and every run in `summary.json` satisfies this identity with zero discrepancy across all 25 runs.
- Audited Groww Brokerage Schedule:
  - Base rate: 0.1% or max ₹20 per executed order leg.
  - Effective-dated minimum floor: ₹2 per order pre-21 June 2025; ₹5 per order effective 21 June 2025.
  - SEBI ceiling guard: Minimum fee capped at 2.5% of order turnover.
- Audited NSE & Statutory Charges:
  - NSE Cash Market: ₹2.97 per lakh (0.00297%) post-Oct 1, 2024 (NSE Circular `NSE/FA/64232`); 0.00325% retail baseline pass-through pre-Oct 2024.
  - STT: 0.025% on sell side only.
  - Stamp Duty: 0.003% on buy side only.
  - SEBI & IPFT: ₹10 per crore (0.0001%) on both legs.
  - GST: 18% strictly on service fees (Brokerage + Exchange + SEBI + IPFT), excluding STT and Stamp Duty.
- Run Registry Reconciled:
  - Classified exactly 25 canonical batch runs (`isCanonical: true`, `runType: 'CANONICAL'`).
  - Superseded initial test runs preserved with `isCanonical: false`.
- Slippage Sensitivity Stress Test Completed: Tested across 0, 1, 2, 3, and 5 bps per side. HDFCBANK Variant E remains net profitable across all slippage scenarios up to 5 bps (+1.19% at 0 bps down to +0.67% at 5 bps).
- Master Reconciliation Report: [`BACKTEST_RECONCILIATION_REPORT.md`](file:///Users/vijaychoudhary/AI-TRADING/backend/storage/backtesting/BACKTEST_RECONCILIATION_REPORT.md).
- Reconciled Outputs: Regenerated `BACKTEST_ENGINE_REPORT.md`, `BACKTEST_OUTCOMES_CHATGPT.json`, and `runs_index.json`.
- Test Suite: 61 tests passing across 21 test suites (`backend/test/backtesting.test.js`, `backend/test/strategy.test.js`, and `backend/test/indicators.test.js`).

### Phase 7 — Research comparison, ranking, and robustness

**Status: NOT STARTED / NEXT.**

Build a deterministic event-driven or candle-driven backtester that supports the defined strategy without look-ahead bias.

Requirements:

1. Process candles chronologically and independently by symbol/session.
2. Signals become actionable only after a candle closes; choose and document the fill model (for example, next candle open or a conservative executable price).
3. Never enter using information from a future candle.
4. Define how gaps, opening gaps, missing candles, trading halts, and partial sessions are handled.
5. If stop loss and target are both touched within the same 5-minute candle and intrabar sequence is unknowable, use a conservative/worst-case assumption or mark the trade ambiguous; do not assume the favourable order.
6. Include slippage, brokerage, STT, exchange transaction charges, GST, SEBI charges, stamp duty, and any applicable fees through a configurable fee model. Verify current Groww/NSE fee schedules at implementation time; do not hard-code unverified rates.
7. Do not double-count costs. Report gross and net P&L separately.
8. Use integer quantity and capital-aware position sizing; account for lot/quantity constraints where applicable.
9. Support long and short simulations separately and together, with a configurable restriction on simultaneous positions.
10. Prevent duplicate signals/trades and enforce max trades/day and daily loss limits.
11. Persist reproducible trades and backtest configuration/results to local files initially; database can be considered later.

#### Required performance metrics

- Total trades and trades per month.
- Win rate.
- Gross P&L and net P&L after costs.
- Average win, average loss, expectancy per trade.
- Profit factor.
- Average realized risk/reward.
- Maximum drawdown and drawdown duration.
- Largest win/loss and consecutive wins/losses.
- Exposure/time in market.
- Monthly/yearly P&L.
- Long vs short performance.
- Performance by stock and market regime.
- False breakout rate.
- Trend-day vs sideways-day performance.
- Slippage/cost sensitivity.

### Phase 6 acceptance criteria

- Unit tests for signal, entry, stop, target, position sizing, fees, and exits.
- Tests for missing bars, ambiguous same-candle stop/target, and session boundaries.
- A small manually inspectable sample backtest whose trades can be traced candle by candle.
- Repeat run with the same data/config gives identical results.
- Net results include realistic costs and documented fill assumptions.

### Phase 7 — Research comparison, ranking, and robustness

**Status: NOT STARTED.**

The objective is to compare all five stocks objectively, not to force a winner.

#### Stock ranking dimensions

- Liquidity/traded value and volume consistency (where data is available from an identified source).
- Daily and intraday volatility.
- Directional efficiency.
- Choppiness/sideways frequency.
- Trend-session frequency.
- Breakout follow-through and false-breakout rate.
- Strategy net expectancy and profit factor.
- Maximum drawdown and risk-adjusted performance.
- Trading costs and slippage sensitivity.

Do not equate high volatility with a good trend or high liquidity with low sideways movement.

#### Train/validation/test discipline

- Use chronological splits; never randomly shuffle time-series candles.
- Keep the final test period untouched while tuning parameters.
- Prefer walk-forward validation (for example, train on earlier periods and test on the next period, then roll forward).
- Compare a simple baseline (e.g., ORB alone or VWAP/EMA without ADX filter) against the full strategy to establish whether filters add value.
- Run parameter sensitivity analysis; avoid choosing one narrow parameter combination solely because it maximizes historical profit.
- Report performance by year and market regime to expose instability.
- Note survivorship/universe-selection bias: the five stocks were selected today, not from a historical point-in-time universe.

Final ranking should show the raw metrics and methodology. It may conclude that no candidate is suitable.

### Phase 8 — React research dashboard

**Status: NOT STARTED.**

Extend the existing React 19 + TypeScript + RTK Query application without breaking existing Dashboard/Profile/Funds/Holdings/Positions pages.

Suggested new pages/sections:

1. **Research Overview:** current phase, dataset coverage, latest download status, and quality warnings.
2. **Historical Data:** symbol/date filters, candle counts, gaps, duplicates, download manifest, and download/resume controls (backend-protected).
3. **Stock Comparison:** side-by-side trend, choppiness, volatility, liquidity, and strategy statistics.
4. **Chart Analysis:** 5-minute OHLC candles with VWAP, EMA 20/50, ORH/ORL, volume, and optional ADX/ATR panels.
5. **Backtest Results:** configuration, trades table, equity curve, monthly/yearly P&L, drawdown, and fee breakdown.
6. **Reports:** export CSV/JSON summaries with data version, source, date range, and configuration.

UI requirements:

- Clearly label historical/backtest data vs live market data.
- Show data timestamps and last-updated time.
- Show partial data and quality warnings prominently.
- No fake/demo performance numbers in production UI.
- Use existing RTK Query patterns, types, styling, and reusable components.
- Backend must enforce validation; never trust only frontend input.

### Phase 9 — Paper trading and operational hardening

**Status: NOT STARTED.**

Before any live order functionality:

1. Run the strategy in paper-trading mode on live or delayed market data whose source and latency are shown.
2. Record every signal, hypothetical order, fill assumption, exit, and reason.
3. Compare paper fills with backtest assumptions.
4. Track latency, missing ticks/candles, API errors, and session expiry.
5. Verify risk limits and daily stop conditions.
6. Run for a meaningful period and across different market regimes; define the period and success criteria before the test starts.
7. Review results and risks manually.

No live order execution is allowed in this roadmap. If the user later requests it, treat it as a new scope requiring explicit approval, broker API permission checks, secure order controls, kill switch, audit logs, and independent risk review.

### Phase 10 — Persistence/production improvements (optional, only when justified)

**Status: NOT STARTED.**

After the CSV research workflow is reliable, evaluate whether MySQL or PostgreSQL is needed for metadata, download jobs, trades, strategy configurations, and reports. Keep large immutable candle history in a storage format appropriate to measured scale (CSV initially; consider Parquet or a database only after benchmarking and documenting the trade-offs).

Potential work:

- Database schema/migrations and repository layer.
- Job queue for downloads and longer-running backtests.
- Multi-user authentication and authorization if required.
- Production deployment, monitoring, backups, retention, and recovery.
- Secure token/session handling across process restarts and multiple instances.

Do not add infrastructure just because it is listed here; justify it with actual requirements.

## 9. Required API and service conventions

- Reuse the existing Express middleware, response envelope, error handler, logger, environment validation, and Groww session service.
- Follow `.agents/codeRules.md` and the existing controller → service → client/formatter architecture.
- Validate all input server-side (symbol allow-list, interval allow-list, valid dates, maximum request window, and safe range).
- Use a bounded timeout and consistent error mapping for upstream Groww failures.
- Treat 401/403 as authentication/permission failures; do not retry them indefinitely.
- Treat 429 and transient 5xx separately with bounded backoff and respect any provider `Retry-After` header.
- Never log authorization headers, token bodies, TOTP values, or secrets.
- Keep expensive downloads/backtests off normal request-response paths if they become long-running; use job status/progress endpoints in a later phase if needed.
- Version API contracts and add tests for them.

## 10. Data definitions and formulas — document before coding

Before implementing an indicator or metric, add its formula, parameter, reset behaviour, warm-up period, and test reference to the relevant module documentation.

Definitions to make explicit:

- **Trend day:** objective threshold/rule based on a combination of directional efficiency, ADX, range expansion, and/or close location; do not label by intuition.
- **Sideways/choppy day:** objective rule, potentially based on low efficiency, high Choppiness Index, low/flat ADX, and repeated VWAP crossings; validate thresholds.
- **Intraday range %:** `(session_high - session_low) / reference_price * 100`; define reference price explicitly (e.g., previous close or session open).
- **Efficiency Ratio:** absolute net price change divided by the sum of absolute bar-to-bar changes over the chosen lookback; define the lookback and session handling.
- **Relative volume:** current bar volume compared with a documented baseline; account for time-of-day seasonality if enough data is available.
- **VWAP:** reset at each session; define whether typical price or close is used and ensure volume is correct.

Keep metric definitions stable across stocks and backtest runs so comparisons are fair.

## 11. Testing and quality requirements for every phase

Every phase must include:

- Unit tests for new calculation/business logic.
- Integration tests for new API routes where practical.
- Input validation and error-path tests.
- A manual verification command or reproducible script.
- A report of files created/modified.
- A report of commands/tests actually run and their real result.
- A note about limitations, data gaps, and unverified behaviour.

Do not state “tested successfully” unless the test command or real API request was run and the evidence was observed. If credentials, subscription rights, network access, or user action blocks a test, report the exact blocker and leave the phase incomplete.

## 12. Progress tracker

Update this table whenever a phase changes. Add the completion date and evidence in the phase notes below.

| Phase | Description | Status | Completion evidence |
|---:|---|---|---|
| 0 | Repository baseline and safety | COMPLETED | Architecture and repository baseline established in `PROJECT_OVERVIEW.md` |
| 1 | Historical API proof of integration | COMPLETED | HTTP 200 for ICICIBANK on 2026-11-06 (74 candles) and 2021-11-08 (76 candles) |
| 2 | Coverage matrix + resumable 5-year downloader | COMPLETED | 479,982 5-min candles across 5 stocks (2021-11-08 to 2026-11-06) downloaded to partitioned CSVs with 0 API failures |
| 3 | Dataset audit and session calendar correction | COMPLETED | Session classifications corrected (Muhurat, DR split, post-market); certified PASS in `DATA_QUALITY_AUDIT.md` |
| 4 | Indicator and intraday-behaviour engine | COMPLETED | Production-grade indicator engine (EMA20/50, VWAP, ATR14, ADX14, Chop14, ER14, VolSMA20, RVOL) implemented; 21 unit tests pass; derived CSVs generated |
| 5 | Strategy specification and configuration | NEXT | Ready to commence (Opening Range Breakout + VWAP + EMA strategy) |
| 6 | Backtesting engine | NOT STARTED | Not started |
| 7 | Research comparison and robustness | NOT STARTED | Not started |
| 8 | React research dashboard | NOT STARTED | Not started |
| 9 | Paper trading and operational hardening | NOT STARTED | Not started |
| 10 | Optional persistence/production improvements | NOT STARTED | Not started |

### Phase completion notes

- **2026-11-08 — Phase 1:** User tested the local historical-candles endpoint. Recent ICICIBANK sample returned HTTP 200 and 74 candles for 2026-11-06. Older ICICIBANK sample returned HTTP 200 and 76 candles for 2021-11-08.
- **2026-11-08 — Phase 2:** Full 5-year historical coverage validated for all 5 stocks back to November 2021. Resumable downloader executed across 305 monthly chunks (61 months × 5 stocks), successfully storing 479,982 candles in `backend/storage/historical-data/` with zero HTTP failures and zero duplicates.
- **2026-11-08 — Phase 3 (Session Calendar Correction & Audit):** Session classifications updated with official exchange circulars (2025-10-21 classified as MUHURAT_SPECIAL per Circular NSE/CMTR/70319; 2024-03-02 and 2024-05-18 classified as DR_SPLIT; 2025-09-26 classified as UNVERIFIED). Confirmed 99.92% regular continuous completeness (09:15–15:25) across all 5 stocks in `DATA_QUALITY_AUDIT.md`.
- **2026-11-08 — Phase 4 (Technical Indicator Engine):** Modular Indicator Engine built (`backend/src/modules/indicators/`). Implemented EMA20, EMA50, VWAP, ATR14, ADX14, +DI14, -DI14, Choppiness Index 14, Kaufman Efficiency Ratio 14, Volume SMA 20, and Relative Volume 20. Zero look-ahead bias, SMA warm-up initialization, daily session VWAP resets, and non-bridging of special sessions. 21 automated unit tests pass in 71ms. Full dataset of 479,982 candles processed and saved to `backend/storage/derived/indicators/` in 2.24s with full report at `INDICATOR_ENGINE_REPORT.md`.
- **Next action:** Proceed to Phase 5 (Strategy specification and configuration — ORB + VWAP + EMA trend-following rules with risk parameters).

## 13. Instructions for Antigravity — master operating prompt

Paste this prompt into Antigravity after adding this file to the repository root:

```text
You are the senior engineer responsible for completing this AI Trading System.

Before doing any work, read these files:
1. AI_TRADING_MASTER_README.md (this is the master project goal, phase plan, safety rules, and progress tracker)
2. PROJECT_OVERVIEW.md (existing architecture audit)
3. .agents/codeRules.md (mandatory repository coding standards)
4. The actual source files relevant to the active phase.

Your job is to execute the roadmap phase by phase, starting with the earliest incomplete phase. The repository source code and executed tests are the source of truth; never assume a feature exists merely because this roadmap describes it.

Operating rules:
- Do not ask the user to return to ChatGPT for routine engineering decisions. Make sensible, conservative choices that fit the existing architecture and document them.
- Do not skip phases or mark a phase complete without satisfying its acceptance criteria and showing evidence.
- Continue to the next phase automatically only when the previous phase passes its acceptance criteria and no external user decision/permission is required.
- If a provider permission, account subscription, credential, or user-only action blocks work, stop only the blocked part, explain the exact blocker, and continue independent safe work where possible.
- Preserve existing features and unrelated working-tree changes. Inspect `git status` before edits.
- Reuse the existing Groww auth/session implementation. Do not create duplicate login/token systems.
- Never expose or print secrets, API tokens, TOTP values, personal account identifiers, or .env values.
- Do not place live orders or implement live automated execution. Historical research and paper trading only.
- Never fabricate market data, test outputs, metrics, or screenshots. Keep missing data explicit.
- Follow .agents/codeRules.md, existing module conventions, and current dependency choices. Avoid unnecessary new packages and architecture rewrites.
- Keep market data and generated reports out of Git unless explicitly requested; update .gitignore safely where required.
- Add tests and run them. Report commands that were actually run and their real outcomes.

At the end of each phase:
1. Update the phase status in AI_TRADING_MASTER_README.md.
2. Add dated completion notes and evidence.
3. Update PROJECT_OVERVIEW.md to describe actual current implementation, endpoints, files, and limitations.
4. List created and modified files.
5. List tests/commands run and results.
6. List unresolved issues and the exact next task.
7. Do not claim full five-year/five-stock coverage until the manifest and data-quality reports prove it.

Begin now with Phase 0 re-verification and Phase 2A coverage validation, since Phase 1 API proof is already recorded as completed. The 2021 and 2026 single-date ICICIBANK requests succeeded, but that does not establish full coverage for all stocks or dates. Validate ICICIBANK, HDFCBANK, M&M, AXISBANK, and BHARTIARTL at representative early, middle, and recent valid trading dates. If coverage is confirmed, proceed with the resumable downloader in Phase 2. If a date/symbol is unavailable, document it truthfully and do not fabricate data.
```

## 14. Final project acceptance checklist

The project is considered research-ready only when all applicable items below are satisfied:

- [ ] Groww authentication is reused securely and does not expose secrets.
- [ ] Exact symbol mapping is verified for all five stocks.
- [ ] Historical coverage is tested for every stock at early, middle, and recent dates.
- [ ] Downloaded date range is reported from actual records, not requested dates.
- [ ] Downloader is resumable, rate-limit-aware, and does not duplicate completed chunks.
- [ ] All raw gaps, duplicates, malformed candles, and unavailable ranges are reported.
- [ ] Data source, timezone, interval, symbol mapping, retrieval time, and dataset version are recorded.
- [ ] Indicator calculations are tested and documented.
- [ ] Trend/sideways definitions are objective and parameterized.
- [ ] Strategy has no look-ahead bias and has explicit entry/exit/fill assumptions.
- [ ] Fees, taxes, slippage, and other trading costs are included with verified configurable rates.
- [ ] Backtest is repeatable and has unit/integration tests.
- [ ] Results include drawdown, expectancy, profit factor, yearly/monthly stability, and out-of-sample results.
- [ ] Stock ranking is based on disclosed metrics and can conclude no stock/strategy is suitable.
- [ ] React dashboard clearly distinguishes historical, simulated, paper, and live data.
- [ ] Paper trading has been evaluated before any discussion of real execution.
- [ ] No live order execution has been enabled by this roadmap.

---

## 15. Important project decision log

| Decision | Current choice | Reason / note |
|---|---|---|
| Existing project | Extend current React + Node.js project | Avoid duplicating working Groww account integration |
| Broker/data source | Groww Trading API | User already has Groww integration and has purchased a plan |
| Initial timeframe | 5-minute candles | Matches the user's intraday research requirement |
| Initial stock universe | ICICIBANK, HDFCBANK, M&M, AXISBANK, BHARTIARTL | Initial liquid-stock research candidates; ranking is not proven |
| Initial historical period | 2021-11-08 to 2026-11-06 | Intended five-year research window; actual availability must be measured |
| Initial storage | Local CSV + manifest | No database existed in the original audit; simplest auditable first stage |
| First strategy hypothesis | ORB + VWAP + EMA 20/50; optional ADX/volume | Candidate trend-following setup to evaluate, not a guaranteed edge |
| Execution mode | Historical backtest, then paper trading | Avoid live financial risk during development |
| Live orders | Out of scope | Requires separate explicit approval and risk/security review |

## 16. Change log

| Date | Change |
|---|---|
| 2026-11-08 | Created master roadmap from the existing project audit and the Groww historical-candle integration/testing work. Recorded two successful ICICIBANK historical sample requests and defined phased next steps. |

