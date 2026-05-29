import { NextRequest, NextResponse } from 'next/server';
import { getLocalReportsList, compileMarketReport, getLocalReportByFilename } from '@/lib/report-engine';
import { sendTelegramTextMessage } from '@/lib/telegram-notifier';
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

const SENT_REPORTS_FILE = path.join(process.cwd(), 'data', 'sent_reports.json');

function hasReportBeenSent(dateString: string): boolean {
  if (!fs.existsSync(SENT_REPORTS_FILE)) return false;
  try {
    const data = JSON.parse(fs.readFileSync(SENT_REPORTS_FILE, 'utf8'));
    return Array.isArray(data) && data.includes(dateString);
  } catch {
    return false;
  }
}

function markReportAsSent(dateString: string) {
  let data: string[] = [];
  const dir = path.dirname(SENT_REPORTS_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (fs.existsSync(SENT_REPORTS_FILE)) {
    try {
      data = JSON.parse(fs.readFileSync(SENT_REPORTS_FILE, 'utf8'));
      if (!Array.isArray(data)) data = [];
    } catch {
      data = [];
    }
  }
  if (!data.includes(dateString)) {
    data.push(dateString);
    try {
      fs.writeFileSync(SENT_REPORTS_FILE, JSON.stringify(data, null, 2), 'utf8');
    } catch (err) {
      console.error('[REPORTS API] Failed to write sent reports file:', err);
    }
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') as 'DAILY' | 'WEEKLY' | 'MONTHLY' | null;
    const filename = searchParams.get('filename');

    if (filename && type) {
      const report = getLocalReportByFilename(type, filename);
      if (!report) {
        return NextResponse.json({ success: false, message: 'Report file not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, report });
    }

    const reports = getLocalReportsList(type || undefined);
    return NextResponse.json({ success: true, reports });
  } catch (error: any) {
    console.error('[REPORTS GET API] Error:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, dateString } = body;

    if (!type || !dateString) {
      return NextResponse.json({ success: false, message: 'Type and dateString parameters are required' }, { status: 400 });
    }

    if (!['DAILY', 'WEEKLY', 'MONTHLY'].includes(type)) {
      return NextResponse.json({ success: false, message: 'Invalid report type' }, { status: 400 });
    }

    const report = await compileMarketReport(type, dateString);

    // Automatically trigger Telegram message for daily reports
    if (type === 'DAILY') {
      if (hasReportBeenSent(dateString)) {
        console.log("Daily summary already delivered.");
      } else {
        const settings = getSavedSettings();
        if (settings.telegramToggle && settings.telegramBotToken && settings.telegramChatId) {
          try {
            // Parse today's verdict from the report markdown
            const verdictRegex = /##\s*🎯\s*Aaj\s*Ka\s*Verdict\s*—\s*([^\n\r#\-]+)/i;
            const match = report.markdown.match(verdictRegex);
            let verdict = match ? match[1].trim() : 'N/A';

            if (verdict === 'N/A') {
              const fallbackMatch = report.markdown.match(/##\s*1\.\s*SESSION\s*VERDICT\s*[\r\n]+([^\r\n]+)/i);
              if (fallbackMatch) {
                verdict = fallbackMatch[1].trim();
              }
            }

            if (verdict === 'N/A' && report.rawReport) {
              verdict = report.rawReport.marketRegime || 'A-DAY';
            }

            // Identify the best alert based on confluence_score descending
            let alertSummary = 'None today';
            if (report.rawReport && Array.isArray(report.rawReport.alertsList) && report.rawReport.alertsList.length > 0) {
              const sortedAlerts = [...report.rawReport.alertsList].sort((a: any, b: any) => (b.confluence_score || 0) - (a.confluence_score || 0));
              const bestAlert = sortedAlerts[0];
              const bestStock = bestAlert.stock || bestAlert.sector_leading || 'NIFTY';
              const bestDir = bestAlert.direction || bestAlert.type || 'LONG';
              const bestGrade = bestAlert.grade || 'A';
              const bestScore = bestAlert.confluence_score || bestAlert.confidence || 0;
              alertSummary = `${bestGrade} ${bestDir} on ${bestStock} (Score: ${bestScore}%)`;
            }

            // Build keyLevel: S/R bands around Nifty Close
            const closeVal = report.rawReport?.niftyClose || 24050;
            const sLevel = Math.round(closeVal - 100);
            const rLevel = Math.round(closeVal + 100);
            const keyLevel = `S: ${sLevel} | R: ${rLevel}`;

            // Extra details
            const formattedClose = report.rawReport?.niftyClose || closeVal;
            const rawChange = report.rawReport?.niftyChangePercent || 0.0;
            const formattedChange = (rawChange >= 0 ? '+' : '') + rawChange;
            const formattedBias = report.rawReport?.bias || 'NEUTRAL';

            // Construct rich HTML-formatted 10-line Telegram message
            const richMessage = `📊 <b>${dateString} Market Summary</b>
Verdict: <b>${verdict}</b>
Nifty: <b>${formattedClose}</b> (${formattedChange}%)
Best setup: <b>${alertSummary}</b>
Kal dekhna: <b>${keyLevel}</b>
Bias: <b>${formattedBias}</b>`.trim();

            const sentSuccess = await sendTelegramTextMessage(
              settings.telegramBotToken,
              settings.telegramChatId,
              richMessage
            );

            if (sentSuccess) {
              markReportAsSent(dateString);
            }
          } catch (tgErr) {
            console.warn('[REPORTS API] Telegram dispatch failed:', tgErr);
          }
        }
      }
    }

    return NextResponse.json({ success: true, report, message: `${type} report generated successfully` });
  } catch (error: any) {
    console.error('[REPORTS POST API] Error:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
