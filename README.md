# AI Trading System — Groww Broker Integration

An enterprise-grade, high-performance algorithmic trading foundation and monitoring dashboard integrated with **Groww Trading API v1** using **TOTP Sign-In Authentication (RFC 6238)**.

---

## 🏛️ System Architecture

Built following senior engineering standards, strict layered architecture, and matching the design paradigms of `NEOIN-ADMIN-BACKEND` and `NEOIN-ADMIN`.

```
AI-TRADING/
├── .env                               # Protected credentials (TOTP, TOTPQR, PORT, etc.)
├── .agents/
│   └── codeRules.md                   # Engineering standards & guidelines
├── package.json                       # Root workspace launcher (concurrently)
├── backend/                           # Node.js + Express REST API
│   ├── server.js                      # HTTP server & graceful shutdown
│   ├── app.js                         # Security middlewares, logging & routing
│   └── src/
│       ├── config/                    # Zod validated env, CORS, Winston logger
│       ├── core/
│       │   ├── middlewares/           # Request tracking, XSS, centralized error handling
│       │   └── utils/                 # RFC 6238 TOTP generator, ApiResponse envelope
│       ├── modules/
│       │   ├── groww/                 # Routes, Controller, Service, Formatter & HTTP Client
│       │   └── health/                # System & broker health checks
│       └── routes/                    # Master router (/api/v1)
└── frontend/                          # React 19 + TypeScript + Vite + Tailwind CSS
    ├── vite.config.ts                 # Dev server with reverse proxy (/api -> 5001)
    └── src/
        ├── api/                       # RTK Query (baseApi, growwApi)
        ├── components/                # Sleek Sidebar, Header & Stat Cards
        ├── pages/
        │   ├── Dashboard/             # Live connection radar, KPI strip & holdings preview
        │   ├── Profile/               # Verified UCC, vendor ID, exchanges & segments
        │   ├── Funds/                 # Cash balance, margins (Equity, F&O, Commodity)
        │   ├── Holdings/              # Demat stocks, free quantities & invested valuation
        │   └── Positions/             # Real-time intraday & derivatives positions
        └── store/                     # Redux Toolkit store
```

---

## 🔐 Groww TOTP Sign-in Workflow

Groww requires daily access token generation expiring at 06:00 AM. This system handles this automatically:

1. **TOTP Generation:** Decodes your base32 `TOTPQR` key and generates a cryptographic 6-digit Time-based One-Time Password using Node's native `crypto.createHmac('sha1')`.
2. **Access Token Exchange:** Calls `POST https://api.groww.in/v1/token/api/access` with `key_type: "totp"`.
3. **Session Caching & Auto-Refresh:** Stores session in-memory (`AI-Trade`). If token expires or is within 60s of expiration, `GrowwService.ensureValidToken()` automatically re-authenticates silently.

---

## 🚀 Running the Project

### 1. Start Both Backend & Frontend Simultaneously (Recommended)
From the project root:
```bash
cd /Users/vijaychoudhary/AI-TRADING
npm run dev
```

- **Frontend Web UI:** [http://localhost:5173](http://localhost:5173)
- **Backend API:** [http://localhost:5001](http://localhost:5001)

### 2. Run Backend Only
```bash
npm run dev:backend
```

### 3. Run Frontend Only
```bash
npm run dev:frontend
```

---

## 📡 API Endpoints Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | System uptime & broker connectivity status |
| `POST` | `/api/v1/groww/connect` | Force re-authentication with Groww via TOTP |
| `GET` | `/api/v1/groww/status` | Current session state and token time remaining |
| `GET` | `/api/v1/groww/profile` | Client UCC, exchange flags (NSE/BSE), and active segments |
| `GET` | `/api/v1/groww/funds` | Cash ledger, margin breakdown (Equity, F&O, Commodity) |
| `GET` | `/api/v1/groww/holdings` | Demat holdings list, quantities, average prices & totals |
| `GET` | `/api/v1/groww/positions` | Live intraday (MIS) and open positions |

---

## 🛡️ Security & Environment Best Practices
- Secret keys (`TOTP`, `TOTPQR`) are kept strictly inside `.env` at the root and never exposed to the client.
- The React frontend connects via Vite reverse proxy `/api` or through authenticated backend REST endpoints.
- Request correlation IDs (`X-Request-Id`) track every request through structured Winston logs.

