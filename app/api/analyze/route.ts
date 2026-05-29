import { NextRequest, NextResponse } from 'next/server';
import { format } from 'date-fns';
import { promptCache } from '@/lib/shared-cache';
import { getSkillContent } from '@/lib/skill';
import { supabase, mockDb } from '@/lib/supabase';
import fs from 'fs';
import path from 'path';

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
      candles = [],
      smcSignals = [],
      marketContext,
      optionChain,
      vix,
      news,
      interval = '5',
      currentPrice,
      confluenceResult
    } = body;

    if (!confluenceResult || !currentPrice) {
      return NextResponse.json({ error: 'Missing confluence calculations' }, { status: 400 });
    }

    const formatIST = (timestamp: any) => {
      try {
        return format(new Date(timestamp), 'HH:mm:ss');
      } catch {
        return '00:00:00';
      }
    };

    // 1. Build SYSTEM PROMPT precisely to spec
    const systemPrompt = `You are an elite institutional trader and quantitative analyst specializing in Nifty 50 index on NSE India. You combine:
- Smart Money Concepts (SMC) for price structure
- Institutional order flow (FII/DII data)  
- Options market intelligence (PCR, Max Pain, OI walls)
- Global macro context (GIFT Nifty, US markets, crude)
- News sentiment and event risk
- India VIX for volatility regime

You think in terms of 5-layer confluence. A trade is only HIGH CONVICTION when at least 4 of 5 layers align. You are precise with price levels, specific with risk, and honest about uncertainty. You never recommend trading during high impact news windows or extreme VIX. You always account for the NSE session context and Thursday expiry effects.
Response language: English. Be concise and actionable.`;

    const istTime = format(new Date(), 'HH:mm:ss');
    const sessionName = confluenceResult.total > 50 ? 'PEAK MOMENTUM WINDOW' : 'MIDDAY LULL';

    // 2. Build USER PROMPT precisely to spec
    const userPrompt = `---
NIFTY 50 — INSTITUTIONAL ANALYSIS REQUEST
Time: ${istTime} IST | Session: ${sessionName}
Interval: ${interval}M | Current Price: ${currentPrice}

═══ LAYER 1: GLOBAL MACRO ═══
GIFT Nifty Gap: ${marketContext?.giftNifty?.direction || 'FLAT'} ${marketContext?.giftNifty?.gap || 0} pts
DOW: ${marketContext?.globalCues?.dow?.changePercent || 0}% | NASDAQ: ${marketContext?.globalCues?.nasdaq?.changePercent || 0}%
NIKKEI: ${marketContext?.globalCues?.nikkei?.changePercent || 0}% | HANGSENG: ${marketContext?.globalCues?.hangseng?.changePercent || 0}%
Crude (Brent): ${marketContext?.commodities?.crude?.price || 0} USD (${marketContext?.commodities?.crude?.changePercent || 0}%)
USD/INR: ${marketContext?.commodities?.usdinr?.price || 0} (${marketContext?.commodities?.usdinr?.change || 0})
US 10Y Yield: ${marketContext?.commodities?.us10y?.yield || 0}%
Global Bias: ${marketContext?.overallGlobalBias || 'MIXED'}

═══ LAYER 2: INSTITUTIONAL FLOWS ═══
FII Cash Net: ₹${marketContext?.institutional?.fii?.cash || 0} Cr (${marketContext?.institutional?.fii?.direction || 'NEUTRAL'})
FII Futures Net OI: ${marketContext?.institutional?.fii?.futuresNet || 0} (Long/Short: ${marketContext?.institutional?.fii?.longShortRatio || 1.0})
DII Cash Net: ₹${marketContext?.institutional?.dii?.cash || 0} Cr (${marketContext?.institutional?.dii?.direction || 'NEUTRAL'})
Combined Institutional: ${marketContext?.institutional?.fii?.direction || 'NEUTRAL'}

═══ LAYER 3: OPTIONS INTELLIGENCE ═══
India VIX: ${vix?.current || 14.5} (${vix?.trend || 'FLAT'}, ${vix?.level || 'NORMAL'})
PCR: ${optionChain?.pcr || 1.05} → PCR stable
Max Pain: ${optionChain?.maxPain || 24000} (Current price ${optionChain?.maxPain > currentPrice ? 'below' : 'above'} max pain)
Days to Expiry: ${optionChain?.daysToExpiry || 6}
Call Walls (Resistance): ${(optionChain?.callWalls || []).map((w: any) => w.strike + ' OI:' + w.oi).join(', ')}
Put Walls (Support): ${(optionChain?.putWalls || []).map((w: any) => w.strike + ' OI:' + w.oi).join(', ')}
ATM IV: ${optionChain?.atmIV || 14.2}%

═══ LAYER 4: SMC PRICE STRUCTURE ═══
Last 10 candles (${interval}M):
${candles.slice(-10).map((c: any) => 
  `[${formatIST(c.timestamp)}] O:${c.open} H:${c.high} L:${c.low} C:${c.close} V:${c.volume}`
).join('\n')}

SMC Signals Detected:
${smcSignals.map((s: any) => 
  `- ${s.type}: Zone ${s.zone ? s.zone[0] + '-' + s.zone[1] : 'N/A'}, Strength:${s.strength || 80}%`
).join('\n')}

═══ LAYER 5: NEWS & EVENTS ═══
Overall News Sentiment: ${news?.overallNewsSentiment || 'MIXED'}
High Impact Event Today: ${news?.highImpactEventToday ? 'YES — REDUCE RISK' : 'No'}
Recent Headlines:
${(news?.items || []).slice(0, 4).map((n: any) => `[${n.sentiment}] ${n.headline}`).join('\n')}

═══ PROVIDE ANALYSIS IN THIS EXACT FORMAT ═══

CONVICTION: [HIGH / MEDIUM / LOW / NO TRADE]
OVERALL BIAS: [BULLISH / BEARISH / NEUTRAL]

5-LAYER SCORE:
- Global Macro: [BULLISH/BEARISH/NEUTRAL] — [reason]
- Institutional: [BULLISH/BEARISH/NEUTRAL] — [reason]
- Options Intel: [BULLISH/BEARISH/NEUTRAL] — [reason]
- SMC Structure: [BULLISH/BEARISH/NEUTRAL] — [reason]  
- News/Events: [BULLISH/BEARISH/NEUTRAL / ⚠️ HIGH RISK]

TRADE SETUP:
Direction: [BUY / SELL / WAIT]
Entry Zone: [price]-[price]
Stop Loss: [price] ([X] pts risk)
Target 1: [price] ([X] pts | 1:[ratio] RR)
Target 2: [price] ([X] pts | 1:[ratio] RR)
Position Size: [1% risk | 0.5% if B setup | SKIP if conviction LOW]

KEY LEVELS FROM OPTIONS:
Hard Resistance: [call wall strike]
Hard Support: [put wall strike]  
Max Pain Gravity: [max pain] [pull direction]

IMMEDIATE ACTION:
[1-2 sentences: exactly what to watch for RIGHT NOW]

RISK FACTORS:
[2-3 specific risks for this exact setup today]

DO NOT TRADE IF:
[Specific conditions that would make this setup invalid]
---`;

    const settings = getSavedSettings();
    const isAiEnabled = settings.anthropicToggle !== false;
    const apiKey = isAiEnabled ? settings.anthropicKey : '';
    
    // Choose model based on grade
    let modelName = 'haiku';
    if (confluenceResult.grade === 'A+' || confluenceResult.grade === 'A') {
      modelName = 'opus';
    }

    const analysisId = 'analysis_' + Math.random().toString(36).substring(2, 11);
    promptCache.set(analysisId, { systemPrompt, userPrompt, apiKey, modelName });

    // 3. Log alert to Supabase or Mock DB
    const alertData = {
      grade: confluenceResult.grade,
      direction: confluenceResult.direction,
      entry_zone: '24000 - 24030',
      stop_loss: '23980',
      target1: '24080',
      target2: '24150',
      confluence_score: confluenceResult.total,
      smc_signals: JSON.stringify(smcSignals),
      layer_data: JSON.stringify({ marketContext, optionChain, vix, news }),
      ai_explanation: '',
      status: 'PENDING'
    };

    if (supabase) {
      try {
        await supabase.from('alerts').insert({ id: analysisId, ...alertData });
      } catch {}
    } else {
      await mockDb.insertAlert({ id: analysisId, ...alertData });
    }

    return NextResponse.json({
      success: true,
      analysisId,
      message: '5-Layer analysis generated and queued'
    });
  } catch (error: any) {
    console.error('[API ANALYZE] Restructure failed:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
