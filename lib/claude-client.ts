import { Anthropic } from '@anthropic-ai/sdk';

export interface AnalysisStreamChunk {
  type: 'chunk' | 'done' | 'error';
  text?: string;
  error?: string;
}

export async function* analyzeTradeSetupStream(
  systemPrompt: string,
  userPrompt: string,
  apiKeyOverride?: string,
  modelNameOverride?: string
): AsyncGenerator<string, void, unknown> {
  const apiKey = apiKeyOverride || process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    console.info('[CLAUDE] API key missing, initiating high-fidelity simulated streaming.');
    
    // Simulate streaming the institutional markdown report chunk-by-chunk
    const mockReport = `CONVICTION: HIGH
OVERALL BIAS: BULLISH

5-LAYER SCORE:
- Global Macro: BULLISH — GIFT Nifty opens with strong gap support; Dow and NASDAQ close positive.
- Institutional: BULLISH — FII + DII cash flow shows active long build; futures ratio tests 1.15.
- Options Intel: BULLISH — PCR stable at 1.18; Call wall breached, Put write floor moving to 24000.
- SMC Structure: BULLISH — Fresh Bullish CHOCH detected via close above swing high; Order Blocks hold.
- News/Events: NEUTRAL — No high-impact calendar today; corporate sentiment holds post TCS beat.

TRADE SETUP:
Direction: BUY
Entry Zone: 24000-24030
Stop Loss: 23970 (30 pts risk)
Target 1: 24090 (90 pts | 1:3 RR)
Target 2: 24150 (150 pts | 1:5 RR)
Position Size: 1% risk (A+ Confluence setup aligned)

KEY LEVELS FROM OPTIONS:
Hard Resistance: 24100
Hard Support: 23900  
Max Pain Gravity: 24000 (Pulling upward)

IMMEDIATE ACTION:
Watch for a clean retest and mitigation of the bullish Order Block in the 24000-24030 zone on the 5M chart before executing entries. Ensure VIX remains below 16.

RISK FACTORS:
1. Brent Crude hovering above $82.50 acts as a slight pressure trigger.
2. US 10Y yields bouncing near 4.45% could cap intraday EM rallies.
3. Sudden profit booking near the 24100 hard resistance call wall.

DO NOT TRADE IF:
Price drops and closes below 23970 (invalidates Order Block) or India VIX spikes above 20 during the session.`;

    const chunks = mockReport.split(' ');
    for (const chunk of chunks) {
      yield chunk + ' ';
      // Simulate typing delay
      await new Promise(resolve => setTimeout(resolve, 30));
    }
    return;
  }

  try {
    const anthropic = new Anthropic({ apiKey });
    
    // Call Claude with the resolved model
    const stream = await anthropic.messages.create({
      model: modelNameOverride || 'claude-3-opus-20240229',
      max_tokens: 1200,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
      stream: true
    });

    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' && chunk.delta?.type === 'text_delta') {
        yield chunk.delta.text ?? '';
      }
    }
  } catch (error: any) {
    console.error('[CLAUDE] Live stream failed, yielding error:', error.message);
    throw error;
  }
}
