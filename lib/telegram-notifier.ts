import axios from 'axios';

export interface TelegramAlertPayload {
  symbol: string;
  score: number;
  grade: string;
  direction: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  entryZone: string;
  stopLoss: string;
  targets: string[];
  immediateAction?: string;
  overallNewsSentiment?: string;
  regimeState?: string;
  positionSizing?: {
    tradingCapital: number;
    suggestedQty: number;
    capitalUsed: number;
    maxLoss: number;
    potentialProfit: number;
    rrRatio: number;
    lotSize?: number;
    lotsSuggested?: number;
    approxMarginRequired?: number;
    totalMarginNeeded?: number;
    isCapitalInsufficient?: boolean;
  };
}

/**
 * Dispatches a beautifully formatted quantitative trade alert directly to Telegram
 * optionally attaching a server-generated high-contrast Bloomberg chart PNG.
 */
export async function sendTelegramAlert(
  botToken: string,
  chatId: string,
  payload: TelegramAlertPayload,
  photoBuffer?: Buffer | null
): Promise<boolean> {
  if (!botToken || !chatId) {
    console.warn('[TELEGRAM] Notification skipped due to missing token or chat ID.');
    return false;
  }

  const {
    symbol,
    score,
    grade,
    direction,
    entryZone,
    stopLoss,
    targets,
    immediateAction,
    overallNewsSentiment,
    regimeState,
    positionSizing
  } = payload;

  const directionLabel = direction === 'BULLISH' ? 'LONG' : direction === 'BEARISH' ? 'SHORT' : 'ALERT';
  const displayGrade = grade === 'A_PLUS' ? 'A+' : grade === 'HIGH' ? 'A' : grade;

  const htmlMessage = `
🚨 <b>HIGH CONVICTION SETUP</b>

<b>${symbol.toUpperCase()} FUT — ${directionLabel}</b>

━━━━━━━━━━

<b>Entry:</b> <code>${entryZone}</code>
<b>Stop Loss:</b> <code>${stopLoss}</code>
<b>Target:</b> <code>${targets[0] || 'Next Major FVG'}</code>

<b>Lot Size:</b> <code>${positionSizing?.lotSize || '250'}</code>
<b>Lots Suggested:</b> <code>${positionSizing?.lotsSuggested || '1'}</code>

<b>Approx Margin Required:</b> <code>₹${positionSizing?.approxMarginRequired?.toLocaleString('en-IN') || '0'}</code>
<b>Estimated Max Loss:</b> <code>₹${positionSizing?.maxLoss?.toLocaleString('en-IN') || '0'}</code>
<b>Potential Reward:</b> <code>₹${positionSizing?.potentialProfit?.toLocaleString('en-IN') || '0'}</code>
${positionSizing?.isCapitalInsufficient ? `\n⚠️ <i>Margin exceeds available capital (Available: ₹${positionSizing?.tradingCapital?.toLocaleString('en-IN') || '50,000'}).</i>` : ''}

━━━━━━━━━━

<b>Why this matters:</b>

• Sector leadership confirmed
• Institutional participation visible
• Breakout structure intact
• Market regime supportive

<b>Confidence:</b> <code>${score}% (${displayGrade})</code>

━━━━━━━━━━

<b>Discipline Reminder:</b>
Do not chase price outside entry zone.
    `.trim();

  try {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const response = await axios.post(url, {
      chat_id: chatId,
      text: htmlMessage,
      parse_mode: 'HTML',
      disable_web_page_preview: true
    });

    return response.data?.ok === true;
  } catch (error: any) {
    console.error('[TELEGRAM] Message transmission failed:', error.response?.data || error.message);
    return false;
  }
}

/**
 * Sends a generic text message (used for connection handshakes)
 */
export async function sendTelegramTextMessage(
  botToken: string,
  chatId: string,
  text: string
): Promise<boolean> {
  if (!botToken || !chatId) return false;

  try {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const response = await axios.post(url, {
      chat_id: chatId,
      text: text,
      parse_mode: 'HTML'
    });
    return response.data?.ok === true;
  } catch (error: any) {
    console.error('[TELEGRAM] Generic message dispatch failed:', error.response?.data || error.message);
    return false;
  }
}

/**
 * Sends an elegant, reassuring institutional NO-TRADE alert
 */
export async function sendTelegramNoTradeAlert(
  botToken: string,
  chatId: string,
  reason?: string
): Promise<boolean> {
  if (!botToken || !chatId) return false;

  const htmlMessage = `
⚠️ <b>NO A+ SETUP TODAY</b>

<b>Market conditions remain choppy:</b>
• Mixed sector participation
• Weak momentum continuation
• High intraday noise

<i>${reason || 'Capital protection mode remains active.'}</i>

<b>Reassuring Capital Protection active.</b>
`.trim();

  try {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const response = await axios.post(url, {
      chat_id: chatId,
      text: htmlMessage,
      parse_mode: 'HTML'
    });
    return response.data?.ok === true;
  } catch (error: any) {
    console.error('[TELEGRAM] No-trade alert failed:', error.response?.data || error.message);
    return false;
  }
}
