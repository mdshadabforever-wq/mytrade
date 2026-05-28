<div align="center">

# ⚡ NEXUS ALPHA

### Institutional AI-Powered Intraday Trading Intelligence Terminal

[![Next.js](https://img.shields.io/badge/Next.js-14.2-black?style=for-the-badge&logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org)
[![Claude AI](https://img.shields.io/badge/Claude-AI%20Powered-orange?style=for-the-badge&logo=anthropic)](https://anthropic.com)
[![Telegram](https://img.shields.io/badge/Telegram-Alerts-26A5E4?style=for-the-badge&logo=telegram)](https://telegram.org)
[![License](https://img.shields.io/badge/License-Private-red?style=for-the-badge)](LICENSE)

<br/>

> **"A professional institutional trading desk, running locally on your machine."**
>
> Nexus Alpha is a full-stack AI trading intelligence system built for Indian equity and futures markets.
> It combines 6-agent quantitative confluence scoring, real-time market analysis, and automatic
> Telegram alerts with proper NSE futures lot sizing — all in one terminal.

<br/>

![Terminal Preview](https://img.shields.io/badge/Status-Production%20Ready-brightgreen?style=flat-square)
![Markets](https://img.shields.io/badge/Market-NSE%20%7C%20BSE%20%7C%20Nifty%2050-blue?style=flat-square)
![Alerts](https://img.shields.io/badge/Alerts-Telegram%20%7C%20Real--time-26A5E4?style=flat-square)

</div>

---

## 📌 What Is Nexus Alpha?

Nexus Alpha is a **personal institutional-grade AI trading terminal** that eliminates the need to sit in front of screens all day.

It continuously evaluates market conditions through **6 specialized quantitative agents**, generates high-conviction trade setups when conditions align, and sends **clean, disciplined alerts directly to your Telegram** — complete with correct NSE futures lot sizes, margin requirements, and realistic risk/reward calculations.

### The Core Problem It Solves

| Pain Point | How Nexus Alpha Solves It |
|---|---|
| Sitting at screen all day | Automatic alerts sent to Telegram when setups trigger |
| Emotional decision-making | Systematic 6-agent confluence scoring removes bias |
| Overleveraging futures | Exchange lot sizes + Zerodha-style margin calculations |
| Missing setups | Continuous background market scanning |
| Chasing low-quality trades | Only Grade A / A+ setups trigger alerts |
| Ignoring choppy markets | Mathematical No-Trade Engine blocks bad conditions |

---

## 🧠 The 6-Agent Confluence Framework

Every trade alert is only generated when **at least 5 of 6 agents** agree. No single-indicator guesswork.

```
┌─────────────────────────────────────────────────────────────┐
│                   NEXUS ALPHA — AGENT MATRIX                │
├────────────┬────────────────────────────────────────────────┤
│ Agent 1    │ Market Regime — Trending vs Ranging vs Choppy  │
│ Agent 2    │ Sector Rotation — Momentum acceleration        │
│ Agent 3    │ Stock Strength — Relative strength vs Nifty    │
│ Agent 4    │ Futures Positioning — Long/Short OI Buildup    │
│ Agent 5    │ SMC Price Structure — BOS, CHOCH, Order Blocks │
│ Agent 6    │ Risk Engine — VIX, Buffer Windows, Volatility  │
└────────────┴────────────────────────────────────────────────┘
```

**Confluence Grades:**

| Score | Grade | Action |
|---|---|---|
| 86–100 | 🏆 A+ | Full position — Premium Claude Opus analysis |
| 71–85 | ✅ A | Standard position — Claude Sonnet analysis |
| 51–70 | ⚡ B | Reduced position — Claude Haiku analysis |
| ≤50 | ❌ No Trade | Capital protection mode active |

---

## 📱 Telegram Alert Format

When a high-conviction setup triggers, you receive a clean, disciplined alert like this:

```
🚨 HIGH CONVICTION SETUP

RELIANCE FUT — LONG

━━━━━━━━━━

Entry:     ₹2,980
Stop Loss: ₹2,968
Target:    ₹3,008

Lot Size:              250
Lots Suggested:        1

Approx Margin Required: ₹1,19,200
Estimated Max Loss:     ₹3,000
Potential Reward:       ₹7,000

━━━━━━━━━━

Why this matters:

• Sector leadership confirmed
• Institutional participation visible
• Breakout structure intact
• Market regime supportive

Confidence: 84% (A+)

━━━━━━━━━━

Discipline Reminder:
Do not chase price outside entry zone.
```

> **No hype. No crypto-channel style. No spam.**
> Pure, calm, institutional intelligence.

---

## ⚙️ Core Features

### 🤖 AI Analysis Engine
- Powered by **Anthropic Claude** (Opus / Sonnet / Haiku — auto-routed by grade)
- Streaming real-time analysis via **Server-Sent Events (SSE)**
- Hybrid mode: works offline with high-fidelity mock analysis

### 📊 Market Intelligence Layer
- **India VIX** monitoring — locks trades when volatility spikes above threshold
- **FII/DII Institutional Flow** analysis — net cash and futures positioning
- **GIFT Nifty gap** detection — pre-market bias calculation
- **Sector rotation analysis** across 15 NSE sectors
- **Options chain intelligence** — PCR, Max Pain, Call/Put walls, IV percentile
- **SMC Structure** — BOS, CHOCH, Order Blocks, FVGs, Liquidity Sweeps

### 🛡️ Mathematical No-Trade Engine
The system automatically **blocks trade execution** in adverse conditions:
- VIX > 18 → High volatility lock
- Choppy / Ranging index regime → Consolidation lock
- Mixed sector dispersion → Weak rotation lock
- Flat FII/DII flows → Institutional apathy lock
- Opening bracket (9:15–9:30) → Buffer zone lock
- Closing bracket (15:15–15:30) → Liquidity risk lock

### 💰 Futures Position Sizing Engine
Real NSE exchange lot sizes for **all Nifty 50 constituents**:
- Calculates required margin (~16% of contract value — Zerodha SPAN approx.)
- Determines affordable lot count based on configured capital
- Flags if capital is insufficient for minimum lot — **prevents dangerous overleveraging**
- Always shows risk/reward even for educational reference

### 📡 Telegram Alert Gateway
- Automatic dispatch on AI analysis completion
- Grade A/A+ setups trigger full alerts
- Choppy market → sends professional **No-Trade advisory** card
- Configurable bot token and chat ID in settings

### 📈 Historical Backtesting Engine
- Walk-forward position-level backtesting
- Realistic friction simulation:
  - **0.05% slippage** on entries and exits
  - **₹20 flat brokerage** per order (₹40 round-trip)
  - **STT + GST** exchange taxes
- Sharpe ratio, max drawdown, win rate, profit factor metrics

### 🔄 Candle Replay Scrubber
- Step-by-step historical candle playback
- Recalculates SMC levels, confluence scores, and alerts at each time point
- Perfect for strategy validation and learning

### 🤝 Zerodha Kite MCP Integration
- Optional conversational Zerodha Kite broker assistant
- Natural language order management via MCP protocol

---

## 🚀 Getting Started

### Prerequisites

| Requirement | Version |
|---|---|
| Node.js | 18+ |
| npm | 9+ |
| Anthropic API Key | Optional (mock mode available) |
| Telegram Bot | Optional (for alerts) |

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/mdshadabforever-wq/mytrade.git
cd mytrade

# 2. Install dependencies
npm install

# 3. Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Configuration

Create a `settings.json` in the project root (**already gitignored — never committed**):

```json
{
  "anthropicKey": "sk-ant-your-key-here",
  "anthropicModel": "claude-3-opus-20240229",
  "anthropicToggle": true,

  "telegramBotToken": "YOUR_BOT_TOKEN",
  "telegramChatId": "YOUR_CHAT_ID",
  "telegramToggle": true,

  "tradingCapital": 500000,
  "maxRiskPercent": 1.0
}
```

> Or configure everything through the **Settings page** at `/settings` — no file editing required.

---

## 🏗️ Architecture

```
nexus-alpha/
├── app/
│   ├── page.tsx                    # Main trading dashboard
│   ├── settings/page.tsx           # Configuration & integrations
│   ├── login/page.tsx              # Session gatekeeper
│   └── api/
│       ├── analyze/route.ts        # 6-agent confluence + AI prompt builder
│       ├── stream-analysis/route.ts # Claude SSE stream + Telegram dispatch
│       ├── market-context/route.ts  # Live market data aggregator
│       ├── candles/route.ts        # Intraday candlestick feed
│       ├── india-vix/route.ts      # VIX monitoring endpoint
│       ├── option-chain/route.ts   # Options intelligence feed
│       ├── news/route.ts           # NSE news wire
│       ├── reports/route.ts        # Historical performance reports
│       └── settings/check/route.ts # Integration validation + test alerts
│
├── lib/
│   ├── confluence-scorer.ts        # 6-agent scoring engine
│   ├── smc-engine.ts               # Smart Money Concepts detector
│   ├── no-trade-engine.ts          # Capital protection logic
│   ├── position-sizing.ts          # NSE futures lot + margin calculator
│   ├── telegram-notifier.ts        # Institutional alert dispatcher
│   ├── chart-generator.ts          # Bloomberg-style chart generator
│   ├── claude-client.ts            # Anthropic streaming client
│   ├── confluence-scorer.ts        # Master 6-agent confluence engine
│   ├── market-context.ts           # Market data aggregation layer
│   ├── backtest-engine.ts          # Historical backtesting with friction
│   ├── report-engine.ts            # Daily/weekly/monthly reports
│   ├── futures-engine.ts           # OI buildup classifier
│   ├── option-intelligence.ts      # Options chain analysis
│   ├── news-fetcher.ts             # News wire + sentiment scoring
│   ├── nifty-sessions.ts           # Market session timing utilities
│   └── data-sources/
│       ├── mock-data.ts            # High-fidelity simulated data
│       ├── yfinance-client.ts      # Yahoo Finance live quotes
│       ├── nse-client.ts           # NSE FII/DII data fetcher
│       └── kite-client.ts          # Zerodha Kite API client
│
├── components/
│   └── Dashboard/
│       ├── AlertCard.tsx           # Trade alert display card
│       ├── AlertFeed.tsx           # Live alert stream panel
│       ├── SMCChartPanel.tsx       # Candlestick + SMC chart
│       ├── OptionIntelPanel.tsx    # Options chain visualization
│       ├── FIIDIIPanel.tsx         # Institutional flow display
│       ├── GlobalContextBar.tsx    # Market regime bar
│       ├── MarketMoodMeter.tsx     # Sentiment gauge
│       ├── NewsPanel.tsx           # News wire
│       ├── PriceHeader.tsx         # Live price ticker
│       └── SessionPanel.tsx        # NSE session clock
│
├── prisma/
│   └── schema.prisma               # AI alert history DB schema
│
└── settings.json                   # ⚠️ Your config (gitignored)
```

---

## 📋 Settings & Integrations

Access the Settings page at `/settings` to configure:

| Integration | Purpose | Required |
|---|---|---|
| **Anthropic Claude** | AI trade analysis | Optional (mock mode works) |
| **Telegram Bot** | Real-time trade alerts | Optional |
| **Zerodha Kite** | Live broker connectivity | Optional |
| **DhanHQ** | Alternative broker | Optional |
| **NewsAPI** | Live news sentiment | Optional |
| **Supabase** | Cloud alert storage | Optional |
| **Upstash Redis** | Session caching | Optional |

All integrations have a **Test Connection** button that validates credentials and dispatches a live test alert.

---

## 🔐 Security

- **`settings.json` is gitignored** — your API keys and bot tokens are never committed to source control
- Session-gated dashboard — configurable password protection
- No external cloud dependencies — runs 100% locally on your machine
- Telegram credentials stored locally, never logged or transmitted

---

## 📊 Supported NSE Futures Contracts

Nexus Alpha has built-in lot sizes for all major Nifty 50 constituents:

```
RELIANCE (250) | HDFCBANK (550) | ICICIBANK (700) | INFY (400)
TCS (175)      | SBIN (1500)    | AXISBANK (625)  | ITC (1600)
TATAMOTORS (1425) | BAJFINANCE (125) | MARUTI (100) | ...and more
```

Plus index futures: **NIFTY (25) | BANKNIFTY (15) | FINNIFTY (40)**

---

## 🧪 Running in Mock Mode

No API keys? No problem. The system runs fully in **high-fidelity mock mode**:

```bash
npm run dev
# No .env or settings.json required
# Opens at http://localhost:3000
```

Mock mode simulates:
- 100 candles with realistic bullish breakout patterns
- FII/DII institutional flows
- News sentiment headlines
- 6-agent confluence scoring
- Full Telegram alert formatting (without actual dispatch)

---

## 📈 Performance Backtesting

Access the backtester from the dashboard to:
- Test your confluence settings against historical candle data
- View net P&L after realistic brokerage, STT, and slippage
- Analyze win rate, average RR, Sharpe ratio, and max drawdown
- Export results as structured JSON reports

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 14 App Router |
| **Language** | TypeScript 5 |
| **AI** | Anthropic Claude (Opus / Sonnet / Haiku) |
| **Styling** | Tailwind CSS |
| **Database** | Prisma ORM + PostgreSQL (optional) |
| **Cache** | In-memory LRU + Upstash Redis (optional) |
| **Alerts** | Telegram Bot API |
| **Charts** | QuickChart.io (server-side Chart.js) |
| **Data** | Yahoo Finance / NSE / Zerodha Kite |
| **Deployment** | Vercel / Local |

---

## 📝 Daily Usage Guide

### As a trader, your daily workflow:

```
Morning (9:00 AM)
├── Open terminal at localhost:3000
├── Check Global Context Bar — GIFT Nifty gap, VIX level
├── Review Sector Rotation panel
└── Start monitoring — system scans automatically

During Session (9:30 AM – 3:15 PM)
├── System runs 6-agent analysis on each new setup
├── Grade A/A+ → Alert sent to your Telegram instantly
├── Choppy conditions → No-Trade advisory sent
└── You execute setups from your phone

End of Day (3:30 PM)
├── Review daily report in /reports
├── Check backtest results
└── System stops alerting (closing bracket lock active)
```

---

## ⚠️ Disclaimer

> This software is for **educational and informational purposes only**.
> It does **not** constitute financial advice. Trading futures and equities involves
> substantial risk of loss. Past performance does not guarantee future results.
> Always do your own research and consult a qualified financial advisor before trading.
> The authors are not responsible for any financial losses incurred using this software.

---

## 📄 License

This project is **privately owned**. All rights reserved.
Not for redistribution or commercial use without explicit written permission.

---

<div align="center">

**Built with discipline. Designed for clarity. Engineered for edge.**

⚡ *Nexus Alpha — Where Institutional Intelligence Meets Personal Capital*

</div>
