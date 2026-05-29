import { NextRequest, NextResponse } from 'next/server';
import { detectNoTradeCondition } from '@/lib/no-trade-engine';
import { callClaude } from '@/lib/claude-client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { vix, regimeType, sectorDispersion, fiiNetCash, diiNetCash, timeOfDayMinutes } = body;

    const noTradeStatus = detectNoTradeCondition({
      vix: vix ?? 14.5,
      regimeType: regimeType ?? 'TRENDING_UP',
      sectorDispersion: sectorDispersion ?? { strongestChange: 1.2, weakestChange: -0.4 },
      fiiNetCash: fiiNetCash ?? 850,
      diiNetCash: diiNetCash ?? -200,
      timeOfDayMinutes
    });

    let aiExplanation = '';

    if (noTradeStatus.isNoTradeDay) {
      // Prompt Claude Haiku for a direct, reassuring explanation
      const userPrompt = `Explain why these no-trade triggers: ${noTradeStatus.reasons.join(', ')} are actually GOOD for the trader. Keep it under 3 sentences.`;
      aiExplanation = await callClaude(userPrompt, `No Trade triggers activated. VIX: ${vix}`, 'haiku');
    }

    return NextResponse.json({
      success: true,
      ...noTradeStatus,
      aiExplanation
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
