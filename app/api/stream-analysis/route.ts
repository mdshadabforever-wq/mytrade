import { NextRequest } from 'next/server';
import { promptCache } from '@/lib/shared-cache';
import { analyzeTradeSetupStream } from '@/lib/claude-client';
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

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return new Response('Missing correlation analysis id', { status: 400 });
  }

  const prompts = promptCache.get<{ systemPrompt: string; userPrompt: string; apiKey?: string; modelName?: string }>(id);
  if (!prompts) {
    return new Response('Analysis session expired or not found', { status: 404 });
  }

  const { systemPrompt, userPrompt, apiKey, modelName } = prompts;
  const encoder = new TextEncoder();

  const readableStream = new ReadableStream({
    async start(controller) {
      try {
        let fullAnalysisText = '';
        
        // Match models
        const resolvedModel = modelName === 'opus' ? 'opus' : modelName === 'sonnet' ? 'sonnet' : 'haiku';

        for await (const chunk of analyzeTradeSetupStream(systemPrompt, userPrompt, resolvedModel)) {
          fullAnalysisText += chunk;
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ chunk })}\n\n`));
        }

        // Send terminal event signaling completion
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();

        // 💾 Post-streaming logic: update explanation in database (Supabase or Mock DB)
        try {
          if (supabase) {
            try {
              await supabase.from('alerts').update({ ai_explanation: fullAnalysisText }).eq('id', id);
            } catch {}
          } else {
            const listRes = await mockDb.getAlerts();
            const alert = listRes.data?.find(a => a.id === id);
            if (alert) alert.ai_explanation = fullAnalysisText;
          }
        } catch (dbErr) {
          console.warn('[DATABASE] Failed to update stream explanation:', dbErr);
        }

        // 📡 Telegram Alerts Dispatch Hook
        try {
          const settings = getSavedSettings();
          if (settings.telegramToggle && settings.telegramBotToken && settings.telegramChatId) {
            const extractField = (regex: RegExp, fallback: string) => {
              const match = fullAnalysisText.match(regex);
              return match ? match[1].trim() : fallback;
            };

            const symbolMatch = userPrompt.match(/Symbol:\s*([A-Za-z0-9_]+)/i);
            const symbol = symbolMatch ? symbolMatch[1] : 'NIFTY';
            
            const scoreMatch = userPrompt.match(/total:\s*([0-9]+)/i) || userPrompt.match(/Confluence Score:\s*([0-9]+)/i) || userPrompt.match(/Score:\s*([0-9]+)/i);
            const score = scoreMatch ? parseInt(scoreMatch[1]) : 75;

            const gradeMatch = userPrompt.match(/grade:\s*([A-Za-z0-9_]+)/i) || userPrompt.match(/Confluence Grade:\s*([A-Za-z0-9_]+)/i) || userPrompt.match(/Grade:\s*([A-Za-z0-9_]+)/i);
            const grade = gradeMatch ? gradeMatch[1] : 'A';

            const entryZone = extractField(/Entry Zone:\s*([^\n\r]+)/i, 'Market Price');
            const stopLoss = extractField(/Stop Loss:\s*([^\n\r]+)/i, 'Structural Swing Low');
            
            const targets: string[] = [];
            const tgt1 = extractField(/Target 1:\s*([^\n\r]+)/i, '');
            const tgt2 = extractField(/Target 2:\s*([^\n\r]+)/i, '');
            if (tgt1) targets.push(tgt1);
            if (tgt2) targets.push(tgt2);
            if (targets.length === 0) targets.push('Next Major Liquidity Zone / FVG');

            const directionMatch = extractField(/Direction:\s*([^\n\r]+)/i, '').toUpperCase();
            const biasMatch = extractField(/OVERALL BIAS:\s*([^\n\r]+)/i, '').toUpperCase();
            const direction = directionMatch.includes('BUY') || biasMatch.includes('BULLISH') ? 'BULLISH' : 'BEARISH';

            const actionMatch = extractField(/IMMEDIATE ACTION:\s*([^\n\r]+)/i, 'Watch price action parameters.');

            let positionSizingObj: any = undefined;
            try {
              const parsePrice = (text: string, fallback: number): number => {
                const cleaned = text.replace(/₹|,/g, '');
                const match = cleaned.match(/(\d+(?:\.\d+)?)/);
                return match ? parseFloat(match[1]) : fallback;
              };

              const priceMatch = userPrompt.match(/Current Price:\s*([0-9.]+)/i);
              const indexPriceFallback = priceMatch ? Number(priceMatch[1]) : 24000;
              const entryPrice = parsePrice(entryZone, indexPriceFallback);
              const stopLossPrice = parsePrice(stopLoss, entryPrice * 0.99); 
              const targetPrice = parsePrice(tgt1 || tgt2 || '0', entryPrice * 1.02);

              const { calculatePositionSizing } = await import('@/lib/position-sizing');
              const sizing = calculatePositionSizing(
                entryPrice,
                stopLossPrice,
                targetPrice,
                settings.tradingCapital || 50000,
                settings.maxRiskPercent || 1.0,
                symbol
              );

              positionSizingObj = {
                tradingCapital: settings.tradingCapital || 50000,
                suggestedQty: sizing.suggestedQty,
                capitalUsed: sizing.capitalUsed,
                maxLoss: sizing.maxLoss,
                potentialProfit: sizing.potentialProfit,
                rrRatio: sizing.rrRatio,
                lotSize: sizing.lotSize,
                lotsSuggested: sizing.lotsSuggested,
                approxMarginRequired: sizing.approxMarginRequired,
                totalMarginNeeded: sizing.totalMarginNeeded,
                isCapitalInsufficient: sizing.isCapitalInsufficient
              };
            } catch (sizingErr) {
              console.warn('[TELEGRAM] Sizing calculations skipped:', sizingErr);
            }

            const { sendTelegramAlert } = await import('@/lib/telegram-notifier');
            await sendTelegramAlert(settings.telegramBotToken, settings.telegramChatId, {
              symbol,
              score,
              grade,
              direction: direction as any,
              entryZone,
              stopLoss,
              targets,
              immediateAction: actionMatch,
              positionSizing: positionSizingObj
            });
          }
        } catch (tgError: any) {
          console.warn('[TELEGRAM] Background notifier failed:', tgError.message);
        }

      } catch (error: any) {
        console.error('[STREAM ANALYSIS ERROR] SSE error:', error.message);
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: error.message })}\n\n`));
        controller.close();
      }
    }
  });

  return new Response(readableStream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no'
    }
  });
}
