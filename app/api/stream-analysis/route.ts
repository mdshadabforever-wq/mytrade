import { NextRequest } from 'next/server';
import { promptCache } from '@/lib/shared-cache';
import { analyzeTradeSetupStream } from '@/lib/claude-client';
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

  // Create a ReadableStream for Server-Sent Events (SSE)
  const readableStream = new ReadableStream({
    async start(controller) {
      try {
        let fullAnalysisText = '';
        for await (const chunk of analyzeTradeSetupStream(systemPrompt, userPrompt, apiKey, modelName)) {
          fullAnalysisText += chunk;
          // Send each chunk wrapped in SSE data format
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ chunk })}\n\n`));
        }

        // Send terminal event signaling completion
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();

        // 📡 Telegram Alerts Dispatch Hook (Asynchronous and Non-blocking)
        try {
          const settings = getSavedSettings();
          if (settings.telegramToggle && settings.telegramBotToken && settings.telegramChatId) {
            const extractField = (regex: RegExp, fallback: string) => {
              const match = fullAnalysisText.match(regex);
              return match ? match[1].trim() : fallback;
            };

            const convictionMatch = extractField(/CONVICTION:\s*([^\n\r]+)/i, '').toUpperCase();
            
            const symbolMatch = userPrompt.match(/Symbol:\s*([A-Za-z0-9_]+)/i);
            const symbol = symbolMatch ? symbolMatch[1] : 'NIFTY';
            
            const scoreMatch = userPrompt.match(/Score:\s*([0-9]+)/i) || userPrompt.match(/Confluence Score:\s*([0-9]+)/i);
            const score = scoreMatch ? parseInt(scoreMatch[1]) : 75;

            const gradeMatch = userPrompt.match(/Grade:\s*([A-Za-z0-9_]+)/i) || userPrompt.match(/Confluence Grade:\s*([A-Za-z0-9_]+)/i);
            const grade = gradeMatch ? gradeMatch[1] : 'HIGH';

            // Check if this setup is a professional No-Trade decision
            const isNoTrade = convictionMatch.includes('NO TRADE') || convictionMatch.includes('NO_TRADE') || grade === 'NO_TRADE' || score < 50;

            if (isNoTrade) {
              const { sendTelegramNoTradeAlert } = await import('@/lib/telegram-notifier');
              const reasonMatch = extractField(/Risk Verdict:\s*([^\n\r]+)/i, '') || extractField(/DO NOT TRADE IF:\s*([^\n\r]+)/i, 'Consolidation buffers active.');
              await sendTelegramNoTradeAlert(
                settings.telegramBotToken,
                settings.telegramChatId,
                reasonMatch || 'Mixed sector rotation and choppy momentum triggers defensive preservation mode.'
              );
            } else {
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

              const regimeMatch = userPrompt.match(/Regime State:\s*([^\n\r]+)/i);
              const regimeState = regimeMatch ? regimeMatch[1] : 'SCANNING';

              const newsMatch = userPrompt.match(/News Sentiment:\s*([^\n\r]+)/i) || userPrompt.match(/Sentiment:\s*([^\n\r]+)/i);
              const overallNewsSentiment = newsMatch ? newsMatch[1] : 'NEUTRAL';

              const actionMatch = extractField(/IMMEDIATE ACTION:\s*([^\n\r]+)/i, 'Watch price action parameters.');

              // 💰 Dynamic Sizing math calculation
              let positionSizingObj: any = undefined;
              let entryPrice = 24000;
              let stopLossPrice = 23900;
              let targetPrice = 24200;

              try {
                const parsePrice = (text: string, fallback: number): number => {
                  const cleaned = text.replace(/₹|,/g, '');
                  const match = cleaned.match(/(\d+(?:\.\d+)?)/);
                  return match ? parseFloat(match[1]) : fallback;
                };

                const priceMatch = userPrompt.match(/Current Price:\s*([0-9.]+)/i);
                const indexPriceFallback = priceMatch ? Number(priceMatch[1]) : 24000;
                entryPrice = parsePrice(entryZone, indexPriceFallback);
                stopLossPrice = parsePrice(stopLoss, entryPrice * 0.99); 
                targetPrice = parsePrice(tgt1 || tgt2 || '0', entryPrice * 1.02);

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
              } catch (sizingErr: any) {
                console.warn('[TELEGRAM] Sizing calculation bypassed:', sizingErr.message);
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
                regimeState,
                overallNewsSentiment,
                positionSizing: positionSizingObj
              });
            }
          }
        } catch (tgError: any) {
          console.warn('[TELEGRAM] Failed to initiate background broadcast sequence:', tgError.message);
        }

      } catch (error: any) {
        console.error('[STREAM ANALYSIS] SSE streaming error:', error.message);
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
      'X-Accel-Buffering': 'no' // Prevent Nginx/Vercel buffering
    }
  });
}
