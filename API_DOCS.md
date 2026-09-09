# 📘 MarketPulse AI - Full API & Agent Integration Documentation (`API_DOCS.md`)

This document provides complete documentation for the **MarketPulse AI** financial data API, authentication setup, data sources map, and autonomous AI Agent integrations (OpenClaw, Harness, Model Context Protocol).

---

## 🔑 Authentication & API Keys

MarketPulse AI supports dual-mode authentication across all endpoints.

### 1. Supported Authentication Methods
- **X-API-Key Header:** `X-API-Key: fin_live_master_2026_a8f9c2d1e4`
- **Authorization Bearer Header:** `Authorization: Bearer fin_live_master_2026_a8f9c2d1e4`
- **Query Parameter:** `?api_key=fin_live_master_2026_a8f9c2d1e4`

### 2. Default Live API Keys
| Key Name | API Key String | Tier | Rate Limit |
| :--- | :--- | :--- | :--- |
| **Master Production Key** | `fin_live_master_2026_a8f9c2d1e4` | MASTER | 10,000 req/min |
| **Pro Developer Key** | `fin_live_pro_2026_b7c8d9e0f1` | PRO | 1,000 req/min |
| **Public Agent Key** | `fin_live_agent_2026_c3d4e5f6a7` | PRO | 600 req/min |

New API keys can also be created via `POST /api/v1/admin/api-keys`.

---

## 📊 Data Sources & Coverage Architecture

| Data Category | External Source / Adapter | Internal Service | Scope & Details |
| :--- | :--- | :--- | :--- |
| **BIST Stocks** | Yahoo Finance (`.IS`), Borsa İstanbul | `BistUniverseService` | 625+ BIST stocks real-time quotes, P/E, Market Cap |
| **5Y OHLCV History** | Yahoo Finance, İş Yatırım, BIST Archive | `FiveYearSyncService` | 5 Years daily Open, High, Low, Close, Adjusted Close, Volume |
| **TEFAS Funds** | Takasbank / TEFAS Official | `TEFASAdapter`, `TefasHoldingsService` | 1,063+ TEFAS funds, NAVs, returns, risk levels |
| **Fund Holdings (PDR)** | KAP (Public Disclosure Platform) | `KapFundScraperService` | Fund portfolio breakdowns & stock holding percentages |
| **US Markets & ETFs** | Yahoo Finance US, SEC EDGAR | `UsUniverseService`, `UsEtfService` | US Top 1,000 Companies & ETFs (SPY, QQQ, VOO) |
| **KAP Disclosures** | KAP (kap.org.tr) | `KAPAdapter`, `KapCompanyService` | Real-time company announcements & AI summaries |
| **Macro Indicators** | TCMB EVDS, FRED | `TCMBAdapter`, `FREDAdapter` | USD/TRY, EUR/TRY, Inflation, Policy Rates, US 10Y |
| **Crypto Assets** | Binance API, IntoTheBlock | `CryptoAdapter`, `CryptoService` | BTC, ETH & 500+ pairs, 15m/1h/1d candles & On-Chain |
| **IPOs (Halka Arz)** | SPK Bulletins, Gedik Yatırım | `IpoScraperService` | Draft, approved, trading IPOs, ceiling streaks |
| **Analyst Reports** | Institutional Research Houses | `AnalystCommentaryService` | Consensus target prices, BUY/SELL ratings & AI synthesis |

---

## 🚀 1. REST API Endpoints Reference (`/api/v1/`)

### 🏢 A. Borsa İstanbul (BIST 625+ Stocks)

#### `GET /api/v1/bist/stocks`
- **Description:** Returns all 625+ BIST stocks with live prices, market caps, P/E ratios, volumes, and 52-week ranges.
- **Query Params:** `search`, `page` (default 1), `limit` (default 50), `sortBy` (`marketCap` | `price` | `changePct` | `volume` | `peRatio` | `ticker`), `order` (`asc` | `desc`).
- **Example:** `/api/v1/bist/stocks?search=THYAO&limit=10&sortBy=marketCap&order=desc`

#### `GET /api/v1/bist/stock/:ticker`
- **Description:** Details and history metadata for a single BIST stock (e.g. `THYAO`, `GARAN`).

#### `GET /api/v1/bist/stock/:ticker/history`
- **Description:** Returns 5-year daily OHLCV bar series for the given ticker.
- **Query Params:** `limit` (default 1500).

#### `GET /api/v1/bist/stock/:ticker/indicators`
- **Description:** Calculated technical indicators: RSI(14), SMA20, SMA50, SMA200, Bollinger Bands, and Trend Signal.

---

### 📊 B. TEFAS Mutual Funds (1,063+ Funds)

#### `GET /api/v1/tefas/funds`
- **Description:** List of 1,063+ TEFAS funds with NAV prices, 1M/1Y/5Y returns, risk values, and categories.
- **Query Params:** `search`, `category`, `page`, `limit`.

#### `GET /api/v1/tefas/fund/:code`
- **Description:** Detailed profile and asset class breakdown (% Equities, % Bonds, % Eurobond, % Gold).

#### `GET /api/v1/tefas/fund/:code/holdings`
- **Description:** Individual BIST stock holdings inside the fund with weight percentages from official KAP disclosures.

#### `GET /api/v1/tefas/stock/:ticker/in-funds`
- **Description:** Reverse search: All TEFAS funds holding a specific BIST stock (e.g., `THYAO`).

---

### 🇺🇸 C. US Markets & Global ETFs

#### `GET /api/v1/us-stocks`
- **Description:** Top 1,000 US companies (S&P 500, Nasdaq 100) with live quotes, P/E, Market Cap, and Sector filters.

#### `GET /api/v1/us-etfs`
- **Description:** US ETFs (SPY, QQQ, VOO, SCHD, etc.) with expense ratios, AUM, and returns.

#### `GET /api/v1/us-history/:type/:ticker`
- **Description:** 5-Year OHLCV, CAGR, and Maximum Drawdown analysis for US stocks and ETFs.
- **Path Params:** `type` (`stock` | `etf`), `ticker` (e.g. `NVDA`).

---

### 📰 D. KAP Disclosures, IPOs & Analyst Consensus

#### `GET /api/v1/kap/disclosures`
- **Description:** Real-time stream of KAP announcements with sentiment tags and AI summaries.

#### `GET /api/v1/ipos`
- **Description:** BIST IPO pipeline (Draft, Approved, Demand Gathering, Trading) and ceiling streak tracker.

#### `GET /api/v1/analyst-reports`
- **Description:** Institutional analyst research reports, target price consensus, and AI synthesis.

---

### 🌐 E. 360° Unified Asset Hub & Sector Analytics

#### `GET /api/v1/assets/profile/:code`
- **Description:** 360° asset profile combining price, technicals, funds holding it, KAP disclosures, and analyst consensus.

#### `GET /api/v1/sectors/overview`
- **Description:** Sector performance, capital flows, and valuation metrics.

#### `GET /api/v1/health`
- **Description:** API & Database health, record counts, and background sync status.

#### `GET /api/v1/openapi.json`
- **Description:** OpenAPI 3.0 (Swagger) specification schema.

---

## 🤖 2. Autonomous AI Agent Integration Protocol (OpenClaw, Harness, MCP)

MarketPulse AI exposes dedicated agent interfaces allowing AI frameworks (OpenClaw, Harness, CrewAI, LangChain, Anthropic MCP) to autonomously query financial data.

### 🔌 Agent Endpoints
- **`GET /api/v1/agent/tools`**: Returns JSON schema of all available tools/functions.
- **`GET /api/v1/agent/openclaw`**: OpenClaw agent manifest and capability profile.
- **`GET /api/v1/agent/harness`**: Harness workflow plugin manifest.
- **`POST /api/v1/agent/execute`**: RPC execution endpoint for running agent tools.
- **`POST /api/v1/agent/mcp`**: Model Context Protocol (JSON-RPC 2.0) endpoint.

### 🛠️ Available Agent Tools (Function Calling)

1. `bist_get_stocks` (Search & list 625+ BIST stocks)
2. `bist_get_stock_detail` (Get single stock detail & metrics)
3. `bist_get_stock_history` (Fetch 5-year daily OHLCV bars)
4. `bist_get_indicators` (RSI, MACD, SMA, Bollinger indicators)
5. `tefas_get_funds` (List 1,063+ TEFAS funds and returns)
6. `tefas_get_fund_holdings` (Get stock holdings inside a fund)
7. `tefas_find_funds_by_stock` (Find all funds holding a stock)
8. `us_get_stocks` (List US top 1,000 stocks & ETFs)
9. `us_get_history` (5-year US historical performance)
10. `get_kap_disclosures` (KAP disclosures feed)
11. `get_analyst_reports` (Institutional research & consensus)
12. `get_crypto_prices` (Live crypto quotes & OHLCV candles)
13. `get_macro_data` (TCMB & FRED macro indicators)
14. `get_asset_360_profile` (360° unified asset profile)

---

## 💻 3. Code Integration Examples

### Python Example
```python
import requests

API_URL = "http://localhost:3000/api/v1/bist/stocks?search=THYAO"
HEADERS = {
    "X-API-Key": "fin_live_master_2026_a8f9c2d1e4",
    "Accept": "application/json"
}

response = requests.get(API_URL, headers=HEADERS)
data = response.json()
print(data)
```

### Node.js / JavaScript Example
```javascript
async function executeAgentTool() {
  const response = await fetch("http://localhost:3000/api/v1/agent/execute", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": "fin_live_master_2026_a8f9c2d1e4"
    },
    body: JSON.stringify({
      tool: "bist_get_stock_detail",
      parameters: { ticker: "THYAO" }
    })
  });

  const result = await response.json();
  console.log("Agent Execution Result:", result);
}

executeAgentTool();
```

### cURL Example
```bash
curl -X POST "http://localhost:3000/api/v1/agent/execute" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: fin_live_master_2026_a8f9c2d1e4" \
  -d '{"tool": "tefas_get_fund_holdings", "parameters": {"code": "TCD"}}'
```
