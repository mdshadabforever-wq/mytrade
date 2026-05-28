# NEXUS ALPHA — Institutional Intraday stock & Futures Trading Desk

An institutional-grade AI-powered intraday trading intelligence platform focused exclusively on Nifty 50 underlying stocks, futures buildup, and sector indices. Engineered with the **Bloomberg Terminal** aesthetic (dense layout, deep `#050508` backgrounds, amber/gold primary matrices, green bullish/red bearish breakouts), **NEXUS ALPHA** consolidates a **6-Agent multi-AI system** to deliver trade setup alerts under high-confluence criteria.

---

## 🏛️ Project Vision & Strict Market Scope

**NEXUS ALPHA** exists solely for high-frequency intraday momentum and smart money tracking inside the Indian NSE/BSE markets. 
* **Scope**: Nifty 50 stocks, Nifty Futures, Stock Futures, 15 Sector Indices.
* **Excluded**: Options, Penny Stocks, Forex, Crypto, US/International equities, Retail mutual funds.

### Sector Indices Monitored (15 Sectors)
* NIFTY BANK / IT / FIN SERVICE / AUTO / FMCG / PHARMA / METAL / ENERGY / PSU BANK / REALTY / MEDIA / INFRA / CONSUMPTION / OIL & GAS / HEALTHCARE

---

## ⚙️ Core Engines & Algorithms

### 1. Futures OI Buildup Classifier (`lib/futures-engine.ts`)
Decodes Price-Volume-Open Interest (OI) correlations to categorize stocks in real-time:
* **Long Buildup**: Price Up + OI Up (Institutional Accumulation)
* **Short Buildup**: Price Down + OI Up (Institutional Distribution/Shorting)
* **Long Unwinding**: Price Down + OI Down (Long Liquidations/Profit Booking)
* **Short Covering**: Price Up + OI Down (Short squeeze liquidations)

### 2. Relative Strength Indexing (`lib/relative-strength.ts`)
Compares stock performance relative to the index return:
$$\text{Relative Strength} = \Delta\text{StockPrice (\%)} - \Delta\text{IndexPrice (\%)}$$
Ranks all 50 underlying assets instantly to map momentum leaders and laggards.

### 3. Backtesting Replay Simulator (`lib/backtest-engine.ts`)
Ingests historical index candles and plays them candle-by-candle to execute simulated setups (Opening Range Breakouts - ORB, and SMC OB retests).
Calculates and renders performance analytics inside the terminal:
* Win Rate (%) & Profit Factor (Gross Profits / Gross Losses)
* Maximum Drawdown Points
* Annualized Sharpe Ratio expectations

---

## 🤖 6-Agent Multi-AI Confluence System

Confluences are computed by interlinked sub-agent layers:
1. **Market Regime Agent**: Defines trend bias (Trending Up, Trending Down, Ranging, Choppy).
2. **Sector Rotation Agent**: Isolates strongest/weakest sectors and maps rotation speeds.
3. **Stock Strength Agent**: Pinpoints index leaders by volume and relative strength.
4. **Futures Positioning Agent**: Classifies Price-Volume-OI trends to confirm position build.
5. **SMC Intelligence Agent**: Traces CHOCH, BOS, sweeps, and unmitigated order blocks.
6. **Risk Engine Agent**: Blocks or scales down setups during buffer windows (opening/closing 15 min), high VIX ($>25$), or chop.

**Alert triggers only when Confluence Score $\ge 71$ (High Conviction or A+ Institutional Setup).**

---

## 📚 PostgreSQL Database Ledger (`prisma/schema.prisma`)

Structured Prisma schemas support trading desk auditing:
* `Trade`: Log of executed/simulated intraday setups.
* `AiAlert`: Generated 6-agent alerts.
* `MarketSession`: Active NSE session times log.
* `SectorStrength`: Snapshot of sector indices.
* `FuturesActivity`: Intraday OI buildup statistics.
* `SmartMoneyEvent`: Structure breaks (BOS/CHOCH/Sweeps).
* `AiDecision`: Sub-agent classification logs.
* `PerformanceMetric`: Backtesting drawdown and win rate performance logs.

---

## 🚀 Setup & Execution

### 1. Installation
```bash
npm install --legacy-peer-deps
npx prisma generate
```

### 2. Configure Environment (`.env.local`)
```env
ANTHROPIC_API_KEY=your-claude-api-key-here
DATABASE_URL=postgresql://user:password@localhost:5429/nexus_alpha
NEXT_PUBLIC_DATA_SOURCE=MOCK
```

### 3. Local Execution
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) inside your browser.

---

## 🎯 Intraday Terminal Layout Panels

1. **Market Regime Monitor**: Bias, regime classification, and confidence meter.
2. **Sector Rotation Heatmap**: 15 sectors sorted by % change, highlighting leaders.
3. **Nifty 50 RS Table**: Dense relative strength ranks, volume spikes, and buildup classifications.
4. **Interactive SMC SVG Chart**: Candle wicks, OB zones, FVG blocks, and support/resistance lines.
5. **Backtesting Console**: Replay strategies (ORB/SMC) and track metrics.
6. **AI Alerts Feed**: Expand cards to stream live typewriter Claude Opus quantitative reports.
7. **Diagnostics Terminal**: Performance logs, countdown triggers, and manual scan triggers.
