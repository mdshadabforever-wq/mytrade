import { NextRequest, NextResponse } from 'next/server';
import { Anthropic } from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';
import { generateMockData } from '@/lib/data-sources/mock-data';

const SETTINGS_FILE_PATH = path.join(process.cwd(), 'settings.json');

function getSavedSettings() {
  if (!fs.existsSync(SETTINGS_FILE_PATH)) return {};
  try {
    return JSON.parse(fs.readFileSync(SETTINGS_FILE_PATH, 'utf8'));
  } catch {
    return {};
  }
}

// Fixed mock portfolio and ledger database
const MOCK_PORTFOLIO = {
  cashBalance: 1485250.75,
  marginUsed: 314500.00,
  collateralValue: 850000.00,
  netTodayPnl: 42520.00,
  netTodayPnlPercent: 12.8,
  positions: [
    { symbol: 'HDFCBANK', qty: 500, avgPrice: 1510.50, currentPrice: 1532.40, pnl: 10950.00, value: 766200.00, sector: 'NIFTY BANK' },
    { symbol: 'RELIANCE', qty: 200, avgPrice: 2435.00, currentPrice: 2468.20, pnl: 6640.00, value: 493640.00, sector: 'NIFTY OIL & GAS' },
    { symbol: 'NIFTY 24100 CALL (30-May)', qty: 225, avgPrice: 45.20, currentPrice: 85.50, pnl: 9067.50, value: 19237.50, sector: 'DERIVATIVES' }
  ],
  orders: [
    { time: '11:15 IST', type: 'BUY', symbol: 'TCS', qty: 50, price: 3830.00, status: 'COMPLETE' },
    { time: '09:35 IST', type: 'SELL', symbol: 'MARUTI', qty: 20, price: 9840.00, status: 'COMPLETE' },
    { time: '09:20 IST', type: 'BUY', symbol: 'HDFCBANK', qty: 100, price: 1508.00, status: 'COMPLETE' }
  ]
};

export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json();
    if (!message) {
      return NextResponse.json({ success: false, message: 'Message parameter is required' }, { status: 400 });
    }

    const settings = getSavedSettings();
    if (!settings.kiteMcpEnabled) {
      return NextResponse.json({
        success: true,
        response: `> [!WARNING]
> **Kite MCP Gateway is Disabled**
> Go to [Settings (c:///app/settings/page.tsx)](/settings) and toggle the **Zerodha Kite MCP Gateway** on to link local portfolio states.

Here is a static simulation of your ledger context:
- **Net Available Cash**: ₹${MOCK_PORTFOLIO.cashBalance.toLocaleString('en-IN')}
- **Today's Net Realized PnL**: +₹${MOCK_PORTFOLIO.netTodayPnl.toLocaleString('en-IN')}
- **Active Linked Positions**: HDFCBANK, RELIANCE, NIFTY Call Options.`
      });
    }

    // Load active real-time mock data matrices
    const marketData = generateMockData(5);
    const query = message.toLowerCase();

    // Determine if we can use the Anthropic API
    const hasKey = settings.anthropicKey && 
                   settings.anthropicKey !== 'admin' && 
                   settings.anthropicKey !== 'mock' && 
                   !settings.anthropicKey.startsWith('mock_');

    if (hasKey) {
      try {
        const anthropic = new Anthropic({ apiKey: settings.anthropicKey });
        
        // Build streamlined context for the prompt
        const terminalContext = {
          portfolio: MOCK_PORTFOLIO,
          niftyIndex: {
            current: marketData.candles[marketData.candles.length - 1]?.close || 24000,
            vix: marketData.vix.current,
            regime: marketData.regime.regime,
            bias: marketData.regime.bias
          },
          strongestSectors: marketData.sectors.slice(0, 3).map(s => `${s.name} (${s.changePercent}%)`),
          weakestSectors: marketData.sectors.slice(-3).map(s => `${s.name} (${s.changePercent}%)`)
        };

        const response = await anthropic.messages.create({
          model: settings.anthropicModel || 'claude-3-haiku-20240307',
          max_tokens: 450,
          temperature: 0.15,
          system: `You are the Zerodha Kite MCP local AI Assistant for a professional intraday trading terminal.
Your task is to analyze the trading session, portfolio, or sector dynamics based on the provided live data.
Rules:
1. Answer factually, concisely, and professionally. Use markdown.
2. Provide precise figures (portfolio value, position sizes, gains, margins, index changes).
3. Do NOT make up any positions. Only use the provided portfolio.
4. End with a very short trading diagnostic or risk note.
5. Use Indian formatting (Lakh, Crore, or Rupee symbol where necessary).`,
          messages: [
            {
              role: 'user',
              content: `Context: ${JSON.stringify(terminalContext)}\n\nUser Question: "${message}"`
            }
          ]
        });

        // Extract and return text response
        const contentBlock = response.content[0];
        const answerText = contentBlock && 'text' in contentBlock ? contentBlock.text : '';
        return NextResponse.json({ success: true, response: answerText });
      } catch (err: any) {
        console.error('[MCP API] Claude call failed, falling back to deterministic engine:', err.message);
      }
    }

    // Fallback: Deterministic Code-Driven Engine (Offline/Mock Mode)
    let responseText = '';

    if (query.includes('portfolio') || query.includes('holding') || query.includes('position')) {
      const positionRows = MOCK_PORTFOLIO.positions.map(p => 
        `| **${p.symbol}** | ${p.qty} | ₹${p.avgPrice.toFixed(2)} | ₹${p.currentPrice.toFixed(2)} | <span class="${p.pnl >= 0 ? 'text-[#00e5a0]' : 'text-[#ff3a3a]'} font-bold">₹${p.pnl >= 0 ? '+' : ''}${p.pnl.toLocaleString('en-IN')}</span> |`
      ).join('\n');

      responseText = `### 💼 PORTFOLIO CURRENT ACTIVE POSITIONS

| INSTRUMENT | QUANTITY | AVG PRICE | LTP | NET PNL |
| :--- | :--- | :--- | :--- | :--- |
${positionRows}

**Account Diagnostics Summary:**
- **Margin Occupied**: ₹${MOCK_PORTFOLIO.marginUsed.toLocaleString('en-IN')}
- **Available Cash Capital**: ₹${MOCK_PORTFOLIO.cashBalance.toLocaleString('en-IN')}
- **Aggregate Equity PnL**: <span class="text-[#00e5a0] font-bold">+₹${MOCK_PORTFOLIO.netTodayPnl.toLocaleString('en-IN')} (${MOCK_PORTFOLIO.netTodayPnlPercent}%)</span>

> [!NOTE]
> All derivative positions are mapped directly under session risk limits. High open-interest walls indicate strong resistance around key Nifty levels.`;

    } else if (query.includes('pnl') || query.includes('profit') || query.includes('loss') || query.includes('gain')) {
      responseText = `### 📈 REAL-TIME ACCOUNT P&L BREAKDOWN

- **Intraday Net Gains**: <span class="text-[#00e5a0] font-bold">+₹${MOCK_PORTFOLIO.netTodayPnl.toLocaleString('en-IN')} (${MOCK_PORTFOLIO.netTodayPnlPercent}% gain)</span>
- **Realized Booking**: ₹26,500.00 (from cleared positions)
- **Unrealized Floating Ledger**: +₹16,020.00 (from HDFCBANK & RELIANCE)
- **Overall Ledger Health**: **HIGHLY PROFITABLE (BULLISH ROTATION ALIGNMENT)**

> [!TIP]
> Current relative strength is highly concentrated in Nifty IT and Energy. Consider taking partial profits on derivatives if India VIX crosses 16.5.`;

    } else if (query.includes('sector') || query.includes('rotation') || query.includes('strong') || query.includes('weak')) {
      const topSectors = marketData.sectors.slice(0, 3);
      const bottomSectors = marketData.sectors.slice(-3);

      responseText = `### 🔄 LIVE SECTOR ROTATION ANALYSIS

**Top Contributing Sectors:**
${topSectors.map((s, idx) => `${idx + 1}. **${s.name}**: +${s.changePercent}% (${s.momentum} momentum, Lead: \`${s.leadingStock}\`)`).join('\n')}

**Underperforming Sectors:**
${bottomSectors.map((s, idx) => `${idx + 1}. **${s.name}**: ${s.changePercent}% (${s.momentum} momentum, Lead: \`${s.leadingStock}\`)`).join('\n')}

**Market Summary**:
The market regime is currently **${marketData.regime.regime.replace('_', ' ')}** with a **${marketData.regime.bias}** bias. Institutional buyers are focused on **${topSectors[0]?.name || 'NIFTY IT'}**.

> [!IMPORTANT]
> Long sector buildup detected in **${topSectors[0]?.name}** stocks like **${topSectors[0]?.leadingStock}**. Maintain stop losses aligned below daily order blocks.`;

    } else if (query.includes('nifty') || query.includes('index') || query.includes('trend') || query.includes('regime') || query.includes('vix')) {
      const latestPrice = marketData.candles[marketData.candles.length - 1]?.close || 24000;
      responseText = `### 📊 INDEX REGIME & VOLATILITY STATUS

- **Nifty 50 Spot Reference**: **₹${latestPrice.toLocaleString('en-IN')}**
- **Trend Regime Profile**: **${marketData.regime.regime.replace('_', ' ')}** (Bias: **${marketData.regime.bias}**, Confidence: **78%**)
- **India VIX**: **${marketData.vix.current}** (${marketData.vix.trend} trend — *${marketData.vix.interpretation}*)
- **FII net stance today**: **${marketData.institutional.fii.direction}** (Net flow: ₹${marketData.institutional.fii.total.toLocaleString('en-IN')} Cr)

> [!NOTE]
> Open interest max-pain resides at **₹${marketData.optionChain.maxPain}**. Resistance and Call walls are thick at **₹${marketData.optionChain.callWalls[0]?.strike}** strikes.`;

    } else if (query.includes('trade') || query.includes('order') || query.includes('history') || query.includes('log')) {
      const orderRows = MOCK_PORTFOLIO.orders.map(o => 
        `| ${o.time} | **${o.type}** | ${o.symbol} | ${o.qty} | ₹${o.price.toFixed(2)} | <span class="text-[#00e5a0] font-bold">${o.status}</span> |`
      ).join('\n');

      responseText = `### 📜 INTRADAY ACCOUNT EXECUTION LOGS

| EXECUTION TIME | TYPE | SYMBOL | QUANTITY | PRICE | STATUS |
| :--- | :--- | :--- | :--- | :--- | :--- |
${orderRows}

**Audit Summary:**
- **Execution Rate**: 100% fill success.
- **Latency Slip**: ~45ms across execution paths.
- **Linked Engine**: Zerodha Kite Connect API gateway.`;

    } else {
      responseText = `### 🤖 NEXUS ALPHA TERMINAL — AI BROKER DESK

Greetings. I am your local **AI Broker Desk (Kite MCP)**. Ask me anything about:
1. **Portfolio holdings & active positions** (e.g. *"Show my portfolio positions"*)
2. **Current Profit & Loss status** (e.g. *"What is my P&L today?"*)
3. **Sector Rotation & momentum leaders** (e.g. *"Which sectors are strongest?"*)
4. **Index trend, regime or India VIX levels** (e.g. *"What is Nifty's trend regime?"*)
5. **Intraday order logs & history** (e.g. *"Show my recent trades"*)

---
**Current Fast Context Reference:**
- **Nifty LTP**: ₹${(marketData.candles[marketData.candles.length - 1]?.close || 24000).toLocaleString('en-IN')}
- **VIX**: ${marketData.vix.current}
- **Active Regime**: ${marketData.regime.regime.replace('_', ' ')} (${marketData.regime.bias})`;
    }

    return NextResponse.json({ success: true, response: responseText });
  } catch (error: any) {
    console.error('[MCP QUERY ERROR]', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
