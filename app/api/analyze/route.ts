import { NextRequest, NextResponse } from 'next/server';
import { format } from 'date-fns';
import { promptCache } from '@/lib/shared-cache';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();
const SETTINGS_FILE_PATH = path.join(process.cwd(), 'settings.json');

function getSavedSettings() {
  if (!fs.existsSync(SETTINGS_FILE_PATH)) return {};
  try {
    return JSON.parse(fs.readFileSync(SETTINGS_FILE_PATH, 'utf8'));
  } catch {
    return {};
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      symbol = 'NIFTY',
      regimeAgent,
      sectorAgent,
      stockAgent,
      futuresAgent,
      smcAgent,
      riskAgent,
      confluenceResult,
      candles = [],
      interval = '5',
      currentPrice
    } = body;

    if (!regimeAgent || !sectorAgent || !stockAgent || !futuresAgent || !smcAgent || !riskAgent || !confluenceResult || !currentPrice) {
      return NextResponse.json({ error: 'Missing 6-agent confluence parameters' }, { status: 400 });
    }

    // Format times for logs
    const formatIST = (timestamp: any) => {
      try {
        return format(new Date(timestamp), 'HH:mm:ss');
      } catch {
        return '00:00:00';
      }
    };

    // 1. Build SYSTEM PROMPT
    const systemPrompt = `You are an elite quantitative analyst and chief risk officer for an institutional intraday trading desk specialized for Indian Nifty 50 markets (NEXUS ALPHA). You combine:
- Market Regime Agent details (trending vs ranging indicators)
- Sector Rotation Agent details (momentum acceleration / rotations)
- Stock Strength Agent details (intraday relative strength relative to index)
- Futures Positioning Agent details (Price-Volume-OI buildup classification)
- SMC Intelligence Agent details (multi-timeframe structures: BOS, CHOCH, Order Blocks, Liquidity Sweeps)
- Risk Engine Agent details (Opening range buffers, choppy market blockages)

You think in terms of 6-agent confluences. A trade is only HIGH CONVICTION when at least 5 of 6 layers align. You are precise with price levels, specific with risk, and honest about uncertainty. You always account for the NSE session context and Thursday expiry effects.
Response language: English. Be concise and actionable.`;

    // 2. Build USER PROMPT
    const userPrompt = `---
NEXUS ALPHA — INSTITUTIONAL QUANTITATIVE TRADE ALERT
Time: ${format(new Date(), 'HH:mm:ss')} IST | Scope: Nifty 50 Intraday Stocks & Futures
Symbol: ${symbol} | Interval: ${interval}M | Current Price: ${currentPrice}

═══ AGENT 1: MARKET REGIME ═══
Regime State: ${regimeAgent.regime}
Market Bias: ${regimeAgent.bias}
Model Confidence: ${regimeAgent.confidence}%
Regime Analysis: ${regimeAgent.explanation}

═══ AGENT 2: SECTOR ROTATION ═══
Target Sector: ${sectorAgent.name}
Sector Bias: ${sectorAgent.bias}
Sector Momentum: ${sectorAgent.momentum}
Sector Leading Stock: ${sectorAgent.leadingStock}

═══ AGENT 3: STOCK STRENGTH ═══
Intraday Relative Strength: ${stockAgent.relativeStrength > 0 ? '+' : ''}${stockAgent.relativeStrength}% vs Nifty 50
ORB Breakout Status: ${stockAgent.orbStatus}

═══ AGENT 4: FUTURES POSITIONING ═══
OI Buildup Type: ${futuresAgent.buildup}
OI Change Percent: ${futuresAgent.oiChangePercent > 0 ? '+' : ''}${futuresAgent.oiChangePercent}%
Futures Volume Bias: ${futuresAgent.buildup.includes('LONG') ? 'ACCUMULATION' : 'DISTRIBUTION'}

═══ AGENT 5: SMC PRICE STRUCTURE ═══
Structure Bias: ${smcAgent.trend}
Last 10 Candles:
${candles.slice(-10).map((c: any) => 
  `[${formatIST(c.timestamp)}] O:${c.open} H:${c.high} L:${c.low} C:${c.close} V:${c.volume}`
).join('\n')}

Active Structural Signals:
- BOS: ${smcAgent.hasBos ? 'YES' : 'NO'}
- CHOCH: ${smcAgent.hasChoch ? 'YES' : 'NO'}
- Unmitigated OB: ${smcAgent.hasUnmitigatedOb ? 'YES' : 'NO'}
- Unfilled FVG: ${smcAgent.hasUnfilledFvg ? 'YES' : 'NO'}

═══ AGENT 6: RISK ENGINE ═══
Opening Range Buffer: ${riskAgent.isOpeningBuffer ? '⚠️ ACTIVE BLOCK' : 'CLEARED'}
Closing Range Buffer: ${riskAgent.isClosingBuffer ? '⚠️ ACTIVE BLOCK' : 'CLEARED'}
High Volatility Warning: ${riskAgent.isHighVolatility ? '⚠️ SHIELD ACTIVE' : 'CLEARED'}
Choppy Market Block: ${riskAgent.isChoppyIndex ? '⚠️ SHIELD ACTIVE' : 'CLEARED'}
Risk Verdict: ${confluenceResult.agents.risk.reason}

═══ PROVIDE ANALYSIS IN THIS EXACT FORMAT ═══

CONVICTION: [A+ INSTITUTIONAL / HIGH / MODERATE / NO TRADE]
OVERALL BIAS: [BULLISH / BEARISH / NEUTRAL]

6-AGENT SCORE:
- Regime Agent: [BULLISH/BEARISH/NEUTRAL] — [reason]
- Sector Agent: [BULLISH/BEARISH/NEUTRAL] — [reason]
- Stock Agent: [BULLISH/BEARISH/NEUTRAL] — [reason]
- Futures Agent: [BULLISH/BEARISH/NEUTRAL] — [reason]
- SMC Agent: [BULLISH/BEARISH/NEUTRAL] — [reason]
- Risk Engine: [BULLISH/BEARISH/NEUTRAL / ⚠️ WARNING]

TRADE SETUP:
Direction: [BUY / SELL / WAIT]
Entry Zone: [price]-[price]
Stop Loss: [price] ([X] pts risk)
Target 1: [price] ([X] pts | 1:[ratio] RR)
Target 2: [price] ([X] pts | 1:[ratio] RR)
Position Size: [1% risk | 0.5% if B setup | SKIP if conviction LOW]

KEY LEVEL METRIC:
Institutional Sweep Point: [price]
Unmitigated OB Boundary: [price]
Relative Strength Outperformance: [strength %]

IMMEDIATE ACTION:
[1-2 sentences: exactly what to watch for RIGHT NOW]

RISK FACTORS:
[2-3 specific risks for this exact setup today]

DO NOT TRADE IF:
[Specific conditions that would make this setup invalid]
---`;

    // Load local settings for dynamic API key & multi-model selections
    const settings = getSavedSettings();
    const isAiEnabled = settings.anthropicToggle !== false; // defaults to true if not set
    const apiKey = isAiEnabled ? settings.anthropicKey : ''; // empty key bypasses AI and runs mock instantly
    
    // Dynamic Model Routing based on Confluence Grade
    let modelName = 'claude-3-haiku-20240307'; // lightweight default for low/moderate
    if (confluenceResult.grade === 'A_PLUS') {
      modelName = settings.anthropicModel || 'claude-3-opus-20240229'; // user's selected premium model
    } else if (confluenceResult.grade === 'HIGH') {
      modelName = 'claude-3-5-sonnet-20240620'; // ultra-fast sonnet model
    }

    // Save prompts in cache with dynamic parameters for downstream SSE stream
    const analysisId = 'analysis_' + Math.random().toString(36).substring(2, 11);
    promptCache.set(analysisId, { systemPrompt, userPrompt, apiKey, modelName });

    // 3. Log alert to PostgreSQL database if active using Prisma Client (non-blocking)
    try {
      if (process.env.DATABASE_URL) {
        await prisma.aiAlert.create({
          data: {
            score: confluenceResult.score,
            grade: confluenceResult.grade,
            direction: confluenceResult.direction,
            headline: `${symbol} Intraday Confluence Alert`,
            summary: confluenceResult.agents.stock.reason,
            analysisId,
            layersData: JSON.stringify({
              regime: regimeAgent,
              sector: sectorAgent,
              stock: stockAgent,
              futures: futuresAgent,
              smc: smcAgent,
              risk: riskAgent
            })
          }
        });
      }
    } catch (dbError: any) {
      console.warn('[DATABASE] Failed to log alert to PG, proceeding in offline memory cache:', dbError.message);
    }

    return NextResponse.json({
      success: true,
      analysisId,
      message: 'Analysis generated and queued for streaming'
    });
  } catch (error: any) {
    console.error('[API ANALYZE] Route error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
