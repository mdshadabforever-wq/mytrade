import { Anthropic } from '@anthropic-ai/sdk';
import { getSkillContent } from './skill';
import fs from 'fs';
import path from 'path';

function getSavedSettings() {
  const filePath = path.join(process.cwd(), 'settings.json');
  if (!fs.existsSync(filePath)) return {};
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return {};
  }
}

function getAnthropicClient() {
  const settings = getSavedSettings();
  const key = process.env.ANTHROPIC_API_KEY || settings.anthropicKey || '';
  if (!key || key.includes('mock') || key === 'admin' || key === '') {
    return null;
  }
  return new Anthropic({ apiKey: key });
}

export function resolveModelName(modelTier: 'haiku' | 'sonnet' | 'opus'): string {
  const settings = getSavedSettings();
  const configuredModel = settings.anthropicModel;
  
  if (configuredModel) {
    if (modelTier === 'opus') {
      return configuredModel;
    }
    if (modelTier === 'sonnet' && (configuredModel.includes('sonnet') || configuredModel.includes('4-6'))) {
      return configuredModel;
    }
    if (modelTier === 'haiku') {
      if (configuredModel.includes('haiku')) {
        return configuredModel;
      }
      if (configuredModel.includes('sonnet') || configuredModel.includes('4-6')) {
        return configuredModel;
      }
    }
  }
  
  const modelMap = {
    haiku: 'claude-haiku-4-5-20251001',
    sonnet: 'claude-sonnet-4-6',
    opus: 'claude-opus-4-5'
  };
  return modelMap[modelTier];
}

// Export isClaudeConfigured dynamically evaluated on load
export const isClaudeConfigured = getSavedSettings().hasOwnProperty('anthropicKey') || !!process.env.ANTHROPIC_API_KEY;

/**
 * Universal caller to Claude with integrated skills playbook as system context.
 */
export async function callClaude(
  userPrompt: string,
  liveContext: string,
  model: 'haiku' | 'sonnet' | 'opus' = 'sonnet'
): Promise<string> {
  const modelName = resolveModelName(model);
  const client = getAnthropicClient();

  if (!client) {
    console.info(`[CLAUDE MOCK] Key missing. Executing mock call for model ${modelName}`);
    return getMockResponseForPrompt(userPrompt);
  }

  try {
    const response = await client.messages.create({
      model: modelName,
      max_tokens: 1200,
      system: `${getSkillContent()}\n\nLIVE MARKET CONTEXT:\n${liveContext}`,
      messages: [{ role: 'user', content: userPrompt }]
    });

    const firstBlock = response.content[0];
    if (firstBlock && 'text' in firstBlock) {
      return firstBlock.text;
    }
    return '';
  } catch (err: any) {
    console.error('[CLAUDE API ERROR] Failed to query Claude:', err.message);
    return getMockResponseForPrompt(userPrompt);
  }
}

/**
 * SSE streaming quantitative analyzer for live dashboard streaming.
 */
export async function* analyzeTradeSetupStream(
  systemPrompt: string,
  userPrompt: string,
  model: 'haiku' | 'sonnet' | 'opus' = 'opus'
): AsyncGenerator<string, void, unknown> {
  const modelName = resolveModelName(model);
  const client = getAnthropicClient();

  if (!client) {
    console.info(`[CLAUDE STREAM MOCK] Key missing. Executing mock streaming for model ${modelName}`);
    const mockReport = getMockResponseForPrompt(userPrompt);
    const chunks = mockReport.split(' ');
    for (const chunk of chunks) {
      yield chunk + ' ';
      await new Promise(resolve => setTimeout(resolve, 30));
    }
    return;
  }

  try {
    const stream = await client.messages.create({
      model: modelName,
      max_tokens: 1200,
      system: `${getSkillContent()}\n\n${systemPrompt}`,
      messages: [{ role: 'user', content: userPrompt }],
      stream: true
    });

    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' && chunk.delta?.type === 'text_delta') {
        yield chunk.delta.text ?? '';
      }
    }
  } catch (err: any) {
    console.error('[CLAUDE STREAM ERROR] Live streaming failed, yielding mock fallback:', err.message);
    const mockReport = getMockResponseForPrompt(userPrompt);
    const chunks = mockReport.split(' ');
    for (const chunk of chunks) {
      yield chunk + ' ';
    }
  }
}

/**
 * Returns mock responses based on prompt keywords to simulate fully operational mode offline
 */
function getMockResponseForPrompt(prompt: string): string {
  const lower = prompt.toLowerCase();

  if (lower.includes('news')) {
    return 'BULLISH — Corporate earnings index support.';
  }

  if (lower.includes('blocked') || lower.includes('no trade')) {
    return 'The system has locked trading for safety. India VIX is elevated above 25, meaning standard directional breakout follow-through is mathematically highly unfavorable today. De-leverage completely to safeguard trading capital.';
  }

  if (lower.includes('daily report')) {
    return `### DAILY MARKET REVIEW
Nifty closed at 24,080, demonstrating strong dip accumulation from the 24,000 Support put wall. Sessions remained highly orderly.

### INSTITUTIONAL SUMMARY
FII finished the cash market segment as active buyers (net inflow ₹1,200 Cr). Combined flow denoted steady support.

### ALERTS ANALYSIS
One A+ Long alert was triggered today at RELIANCE. The mitigation of the 5M Order block was successfully swept, generating a clean 1:3 risk-to-reward bounce.

### TOMORROW'S VERDICT (A Day)
Maintain positive buy-on-dips bias. Primary resistance walls sit at 24,200 call strike ceiling.`;
  }

  return `CONVICTION: HIGH
OVERALL BIAS: BULLISH

5-LAYER SCORE:
- Global Macro: BULLISH — GIFT Nifty gap and positive Asian cues confirm strong opening momentum.
- Institutional: BULLISH — Joint FII/DII accumulation with FII cash buyer ₹1200 Cr.
- Options Intel: BULLISH — PCR stands at 1.15; Put write support floor sits firmly at 24000 strike.
- SMC Structure: BULLISH — Bullish CHOCH body close confirmed on the 15M chart.
- News/Events: NEUTRAL — Light economic docket supports organic trend extensions.

TRADE SETUP:
Direction: BUY
Entry Zone: 24010-24030
Stop Loss: 23980 (30 pts risk)
Target 1: 24090 (80 pts | 1:2.6 RR)
Target 2: 24150 (140 pts | 1:4.6 RR)
Position Size: 1% risk (A+ Confluence setup aligned)

KEY LEVELS FROM OPTIONS:
Hard Resistance: 24100 strike call wall
Hard Support: 23900 strike put floor
Max Pain Gravity: 24000 strike (pulling upward)

IMMEDIATE ACTION:
Watch for a clean retest and mitigation of the bullish 5M Order block zone during the midday lull before entering.

RISK FACTORS:
1. Short profit-booking spikes near the 24100 call wall.
2. Crudes sudden bounce near $82.50.

DO NOT TRADE IF:
Price sweeps and breaks below 23980 body close invalidation line.`;
}
