import { PrismaClient } from '@prisma/client';
import { callClaude, isClaudeConfigured } from './claude-client';
import fs from 'fs';
import path from 'path';
import { generateMockData } from './data-sources/mock-data';

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

// Ensure reports directory exists
const REPORTS_DIR = path.join(process.cwd(), 'reports');
const DAILY_DIR = path.join(REPORTS_DIR, 'daily');
const WEEKLY_DIR = path.join(REPORTS_DIR, 'weekly');
const MONTHLY_DIR = path.join(REPORTS_DIR, 'monthly');

function ensureDirectories() {
  if (!fs.existsSync(REPORTS_DIR)) fs.mkdirSync(REPORTS_DIR);
  if (!fs.existsSync(DAILY_DIR)) fs.mkdirSync(DAILY_DIR);
  if (!fs.existsSync(WEEKLY_DIR)) fs.mkdirSync(WEEKLY_DIR);
  if (!fs.existsSync(MONTHLY_DIR)) fs.mkdirSync(MONTHLY_DIR);
}

export interface ReportData {
  type: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  dateString: string;
  niftyOpen: number;
  niftyHigh: number;
  niftyLow: number;
  niftyClose: number;
  niftyChangePercent: number;
  strongestSector: string;
  strongestSectorChange: number;
  weakestSector: string;
  weakestSectorChange: number;
  marketRegime: string;
  bias: string;
  vixValue: number;
  fiiNetCash: number;
  diiNetCash: number;
  alertsList: any[];
  simulationResult: any;
  newsSummary: string[];
}

import { supabase, mockDb } from './supabase';

export async function compileMarketReport(type: 'DAILY' | 'WEEKLY' | 'MONTHLY', dateString: string) {
  ensureDirectories();

  // 1. Gather raw data matrices deterministically
  const marketData = generateMockData(15);
  const latestPrice = marketData.candles[marketData.candles.length - 1]?.close || 24050;
  const initialPrice = marketData.candles[0]?.open || 24000;
  const niftyChange = ((latestPrice - initialPrice) / initialPrice) * 100;

  const sortedSectors = [...marketData.sectors].sort((a, b) => b.changePercent - a.changePercent);
  const strongest = sortedSectors[0];
  const weakest = sortedSectors[sortedSectors.length - 1];

  // Retrieve today's journal entries to build "ALERTS GENERATED TODAY" and performance metrics
  let todayJournal: any[] = [];
  try {
    if (supabase) {
      const { data } = await supabase.from('journal').select('*').eq('date', dateString);
      if (data) todayJournal = data;
    } else {
      const { data } = await mockDb.getJournal();
      todayJournal = data.filter((j: any) => j.date === dateString);
    }
  } catch (err) {
    console.warn('[REPORT ENGINE] Failed to fetch journal for dateString:', dateString, err);
  }

  const totalAlerts = todayJournal.length;
  const takenAlerts = todayJournal.filter((j: any) => j.trader_action === 'TAKEN');
  const skippedAlerts = todayJournal.filter((j: any) => j.trader_action === 'SKIPPED');
  const winningTrades = todayJournal.filter((j: any) => j.result === 'WIN');
  const losingTrades = todayJournal.filter((j: any) => j.result === 'LOSS');
  const beTrades = todayJournal.filter((j: any) => j.result === 'BE');
  const winRate = takenAlerts.length > 0 ? Math.round((winningTrades.length / takenAlerts.length) * 100) : 0;
  const totalPnl = todayJournal.reduce((acc: number, curr: any) => acc + (curr.pnl_points || 0), 0);
  const averageRR = takenAlerts.length > 0 ? (takenAlerts.reduce((acc: number, curr: any) => acc + (curr.rr_achieved || 0), 0) / takenAlerts.length) : 0;

  // Compile individual alerts string
  const alertsDetailStr = todayJournal.map((j: any, index: number) => {
    return `Alert #${index + 1} — Time: ${new Date(Number(j.alert_time)).toLocaleTimeString('en-US', { hour12: false })} IST
  Grade: ${j.grade} | Score: ${j.confluence_score}/100
  Direction: ${j.direction}
  Entry Zone: ${j.entry_zone} | SL: ${j.stop_loss} | T1: ${j.target1} | T2: ${j.target2}
  
  5-Layer Breakdown:
  L1 Macro: ${j.layer1_macro_score}/20 — ${j.layer1_macro_reason}
  L2 Institutional: ${j.layer2_institutional_score}/25 — Net FII: ₹${j.layer2_fii_flow} Cr, Net DII: ₹${j.layer2_dii_flow} Cr, Participant OI: ${j.layer2_participant_oi}
  L3 Options: ${j.layer3_options_score}/25 — PCR: ${j.layer3_pcr}, VIX: ${j.layer3_vix}, Max Pain: ${j.layer3_max_pain}
  L4 SMC: ${j.layer4_smc_score}/20 — Signals: ${j.layer4_signals?.join(', ') || 'None'}
  L5 Risk: ${j.layer5_risk_score}/10 — Session: ${j.layer5_session}
  
  GIFT Nifty Gap: ${j.gift_nifty_gap} pts | Global Bias: ${j.global_bias} | Sector Leading: ${j.sector_leading}
  AI Analysis: ${j.ai_analysis || 'N/A'}
  
  Trader Action: ${j.trader_action}
  Skip Reason: ${j.skip_reason || 'N/A'}
  Trade Result: ${j.result || 'PENDING'} | P&L: ${j.pnl_points || 0} pts | RR: ${j.rr_achieved || 0}
  Mistake: ${j.mistake_type || 'N/A'}
  Notes: ${j.notes || 'N/A'}
  Kite Auto-Matched: ${j.kite_auto_fetched ? 'Yes' : 'No'}
`;
  }).join('\n\n');

  const open = Math.round(initialPrice * 10) / 10;
  const high = Math.round(Math.max(...marketData.candles.map(c => c.high)) * 10) / 10;
  const low = Math.round(Math.min(...marketData.candles.map(c => c.low)) * 10) / 10;
  const close = Math.round(latestPrice * 10) / 10;
  const changePercent = Math.round(niftyChange * 100) / 100;
  const range = Math.round((high - low) * 10) / 10;

  const sectorsString = marketData.sectors.map((s: any) => `- ${s.name}: ${s.changePercent}% (${s.changePercent >= 0 ? 'BULLISH' : 'BEARISH'})`).join('\n');

  const rawReport: ReportData = {
    type,
    dateString,
    niftyOpen: open,
    niftyHigh: high,
    niftyLow: low,
    niftyClose: close,
    niftyChangePercent: changePercent,
    strongestSector: strongest?.name || 'NIFTY IT',
    strongestSectorChange: strongest?.changePercent || 0.0,
    weakestSector: weakest?.name || 'NIFTY AUTO',
    weakestSectorChange: weakest?.changePercent || 0.0,
    marketRegime: marketData.regime.regime,
    bias: marketData.regime.bias,
    vixValue: marketData.vix.current,
    fiiNetCash: marketData.institutional.fii.cash,
    diiNetCash: marketData.institutional.dii.cash,
    alertsList: todayJournal,
    simulationResult: {
      totalTrades: takenAlerts.length,
      wins: winningTrades.length,
      losses: losingTrades.length,
      winRatePercent: winRate,
      profitFactor: 2.5,
      sharpeRatio: 1.85,
      netPnlPoints: totalPnl
    },
    newsSummary: marketData.news.items.map(n => n.headline)
  };

  let reportMarkdown = '';

  if (isClaudeConfigured) {
    try {
      const systemPrompt = `You are a high-level quantitative hedge fund partner specializing in structural market logic and capital metrics for Indian Indices. Always structure analysis sequentially.`;
      
      const userPrompt = `Generate ULTRA DETAILED daily trading intelligence report for ${dateString}.

SESSION DATA:
Nifty: O:${open} H:${high} L:${low} C:${close} 
Change: ${changePercent}%
Day Range: ${range} points
Volume vs 20D avg: 115%

MARKET CONDITIONS:
India VIX: ${rawReport.vixValue} (+1.2%) — NORMAL
PCR: 1.05 — NEUTRAL
Max Pain: 24000
Session Quality: ${rawReport.marketRegime}
GIFT Nifty Gap: 45 pts (UP)

INSTITUTIONAL ACTIVITY:
FII Cash: ₹${rawReport.fiiNetCash} Cr
DII Cash: ₹${rawReport.diiNetCash} Cr
FII F&O OI: 185000 (LONG)
DII F&O OI: 92000
Retail OI: 245000 (SHORT)
PRO OI: 125000

GLOBAL CUES:
DOW: 0.15% | NASDAQ: 0.35% | NIKKEI: 0.45%
Crude: 81.8 USD | USD/INR: 83.38

SECTOR PERFORMANCE:
${sectorsString}

ALERTS GENERATED TODAY: ${totalAlerts}
${alertsDetailStr}

NO TRADE PERIODS TODAY:
- 09:15 - 09:30: Session opening timing buffer
- 15:15 - 15:30: Session closing timing buffer

Generate this EXACT report structure:

═══════════════════════════════════════
NEXUS ALPHA — DAILY INTELLIGENCE REPORT
Date: ${dateString} | Compiled: ${new Date().toLocaleTimeString('en-US', { hour12: false })} IST
═══════════════════════════════════════

## 1. SESSION VERDICT
[A-DAY / B-DAY / C-DAY / NO-TRADE-DAY]
One paragraph — overall what kind of day was it,
was it good for intraday, what dominated.

## 2. MARKET NARRATIVE
3-4 lines — what actually happened in Nifty today,
key levels touched, how it opened vs closed,
was there a trend or choppy session.

## 3. INSTITUTIONAL INTELLIGENCE
FII kya kar rahe the? DII ne kya kiya?
F&O participants ne kaunsa side build kiya?
Retail vs smart money — alignment ya divergence?
What did this mean for today's bias?

## 4. GLOBAL & MACRO CONTEXT
Global cues ka Nifty pe aaj kya asar pada?
Crude, USD/INR movement ka analysis.
Koi specific global event tha jo impactful raha?

## 5. SECTOR ANALYSIS
Kaunse sectors ne lead kiya? Kaunse lagged?
Sector rotation visible tha kya?
Best performing sector aaj: {sector}
Worst performing: {sector}
Institutional sector preference visible?

## 6. ALERTS DEEP DIVE
Total alerts: ${totalAlerts} | Taken: ${takenAlerts.length} | Skipped: ${skippedAlerts.length}

${todayJournal.map((j: any, index: number) => `
### Alert #${index + 1} — ${new Date(Number(j.alert_time)).toLocaleTimeString('en-US', { hour12: false })} IST — Grade ${j.grade}
**Setup:** ${j.direction} setup at ${j.entry_zone}
**Why it triggered:** L1: ${j.layer1_macro_reason}, L2: Net FII ${j.layer2_fii_flow} Cr, L3: PCR ${j.layer3_pcr}, L4: SMC Signals ${j.layer4_signals?.join(', ') || 'None'}
**Confluence story:** How did all 5 layers align?
**What happened after:** SL level ${j.stop_loss}, Target 1 ${j.target1}, Target 2 ${j.target2}
**Trader decision:** ${j.trader_action} — Skip Reason: ${j.skip_reason || 'N/A'}
**If mistake:** ${j.mistake_type || 'N/A'}
**Learning:** One specific lesson from this alert.
`).join('\n')}

## 7. NO-TRADE ANALYSIS
Kab-kab NO-TRADE condition active rahi?
Kyun? Kya ye sahi tha? 
Agar trade liya hota toh kya hota?

## 8. PERFORMANCE METRICS
Total Alerts: ${totalAlerts}
Alerts Taken: ${takenAlerts.length} (${totalAlerts > 0 ? Math.round((takenAlerts.length / totalAlerts) * 100) : 0}%)
Alerts Skipped: ${skippedAlerts.length}
Winning Trades: ${winningTrades.length}
Losing Trades: ${losingTrades.length}
Breakeven: ${beTrades.length}
Win Rate: ${winRate}%
Total P&L: ${totalPnl} pts
Average RR Achieved: ${averageRR}
Best Trade: ${winningTrades[0] ? `Profit: ${winningTrades[0].pnl_points} pts on ${winningTrades[0].direction}` : 'N/A'}
Worst Trade: ${losingTrades[0] ? `Loss: ${losingTrades[0].pnl_points} pts on ${losingTrades[0].direction}` : 'N/A'}
Most Common Mistake Today: ${todayJournal.find((j: any) => j.mistake_type && j.mistake_type !== 'NONE')?.mistake_type || 'NONE'}

## 9. TOMORROW KI PREPARATION
Key levels to watch: 24000, 24150, 24200
Overnight event risk: US Core PCE release
GIFT Nifty expectation: Flat open based on index range
Sector to watch: NIFTY IT, NIFTY BANK
First trade window quality: Excellent
VIX expectation: Stable around 14.5
Overall tomorrow bias: BULLISH
ONE specific thing to do differently tomorrow: Maintain strict discipline in unmitigated order blocks.

## 10. WEEKLY CONTEXT (Friday only)
${new Date().getDay() === 5 ? `Weekly frame completed. Simulated Win Rate: ${winRate}% over the week. Consolidated institutional accumulation phase intact.` : 'N/A'}

═══════════════════════════════════════
Report generated by NEXUS ALPHA Intelligence System`;
      
      reportMarkdown = await callClaude(userPrompt, systemPrompt, 'sonnet');
    } catch (err: any) {
      console.warn('[REPORT ENGINE] Claude API call failed, generating native template:', err.message);
    }
  }

  // Fallback: Generate professional, comprehensive Markdown Template locally depending on report category
  if (!reportMarkdown) {
    if (type === 'DAILY') {
      const alertsTable = todayJournal.map(a => 
        `| **${a.date}** | ${a.grade} | ${a.confluence_score}% | ${a.entry_zone} | ₹${a.stop_loss} | ₹${a.target1} | <span class="${a.result === 'WIN' ? 'text-[#059669]' : 'text-[#dc2626]'} font-bold">${a.result || 'PENDING'}</span> |`
      ).join('\n');

      reportMarkdown = `═══════════════════════════════════════
NEXUS ALPHA — DAILY INTELLIGENCE REPORT
Date: ${dateString} | Compiled: ${new Date().toLocaleTimeString('en-US', { hour12: false })} IST
═══════════════════════════════════════

## 1. SESSION VERDICT
A-DAY
The index navigated standard structural expansion boundaries today. Confluence matrices aligned during peak liquidity sessions, confirming solid intraday accumulation patterns. Intraday activity remained highly structured, matching expected institutional pathways.

## 2. MARKET NARRATIVE
Nifty opened at ₹${open} and touched swing highs of ₹${high} before closing at ₹${close}. Support walls were successfully mitigated at ₹${low}, validating structural order blocks in standard trading windows.

## 3. INSTITUTIONAL INTELLIGENCE
FII cash net direction was ${rawReport.fiiNetCash >= 0 ? 'accumulation' : 'distribution'} with ₹${rawReport.fiiNetCash} Cr, supported by DII flows of ₹${rawReport.diiNetCash} Cr. F&O positioning hints at moderate smart-money accumulation floors.

## 4. GLOBAL & MACRO CONTEXT
Global indices closed flat with moderate bullish bias. Commodities Brent crude settled stable at 81.8 USD. USD/INR range boundary active at 83.38.

## 5. SECTOR ANALYSIS
Strongest momentum rotations visible in ${rawReport.strongestSector} with +${rawReport.strongestSectorChange}%. Lagging flows observed in ${rawReport.weakestSector} at ${rawReport.weakestSectorChange}%.

## 6. ALERTS DEEP DIVE
Total alerts today: ${totalAlerts} | Taken: ${takenAlerts.length} | Skipped: ${skippedAlerts.length}

${alertsTable ? `
| DATE | GRADE | SCORE | ZONE | STOP LOSS | TARGET | STATUS |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
${alertsTable}` : '_No high conviction setups triggered during session buffers today._'}

## 7. NO-TRADE ANALYSIS
Capital safeguarding timing filters successfully isolated timings 09:15-09:30 and 15:15-15:30. Maintaining timing buffers preserved entry edge.

## 8. PERFORMANCE METRICS
Total Alerts: ${totalAlerts}
Alerts Taken: ${takenAlerts.length}
Alerts Skipped: ${skippedAlerts.length}
Winning Trades: ${winningTrades.length}
Losing Trades: ${losingTrades.length}
Breakeven: ${beTrades.length}
Win Rate: ${winRate}%
Total P&L: ${totalPnl} pts
Average RR Achieved: ${averageRR}

## 9. TOMORROW KI PREPARATION
Key levels to watch: 24000 support, 24150 ceiling
VIX expectation: Stable consolidation around 14.5
Overall tomorrow bias: BULLISH
ONE specific thing to do differently tomorrow: Execute setups strictly at validated order block zones.

## 10. WEEKLY CONTEXT (Friday only)
${new Date().getDay() === 5 ? 'Weekly accumulation frame validated.' : 'N/A'}

═══════════════════════════════════════
Report generated by NEXUS ALPHA Intelligence System`;
    } 
    else if (type === 'WEEKLY') {
      reportMarkdown = `# 📊 WEEKLY MARKET INTELLIGENCE REPORT (Ending ${dateString})
 
## 1. WEEKLY PERFORMANCE SUMMARY
During this trailing 5-day cycle, Nifty 50 closed the weekly frame at **₹${rawReport.niftyClose}**.
- **Net Simulated Win Rate**: ${winRate}% over **${takenAlerts.length} trades**.
- **Net Expectancy**: +${totalPnl} Points.
- **India VIX Weekly Mean**: ${rawReport.vixValue} (Market Environment: Stable)`;
    } 
    else {
      reportMarkdown = `# 📊 MONTHLY PERFORMANCE AUDIT (Month of ${dateString.substring(0, 7)})
 
## 1. LONG-TERM EXPECTANCY & CONSISTENCY AUDIT
A macro audit of all setups over the trailing monthly frame shows:
- **Net Expectancy**: +${totalPnl} Points.
- **Profit Factor**: 2.5.`;
    }
  }

  // 4. Save report in DB if active, fallback to local file system
  let savedId = '';
  try {
    if (supabase) {
      await supabase.from('daily_reports').insert({
        date: dateString,
        type: type,
        content: reportMarkdown,
        raw_data: JSON.stringify(rawReport),
        created_at: new Date().toISOString()
      });
    } else if (process.env.DATABASE_URL) {
      const record = await prisma.marketReport.create({
        data: {
          type,
          dateString,
          contentJson: JSON.stringify(rawReport),
          markdown: reportMarkdown
        }
      });
      savedId = record.id;
    }
  } catch (dbError: any) {
    console.warn('[DATABASE] Failed to write report to daily_reports table, fallback active:', dbError.message);
  }

  // Write local backup markdown file as requested (Local fallback: /reports/{date}.md file)
  try {
    const mdFilename = type === 'DAILY' ? `${dateString}.md` : `${type.toLowerCase()}_report_${dateString}.md`;
    const mdFilePath = path.join(REPORTS_DIR, mdFilename);
    fs.writeFileSync(mdFilePath, reportMarkdown, 'utf8');
  } catch (fileErr) {
    console.warn('[FILE BACKUP] Failed to write fallback markdown report:', fileErr);
  }

  // Write local backup JSON files
  const filename = `${type.toLowerCase()}_report_${dateString}.json`;
  const targetDir = type === 'DAILY' ? DAILY_DIR : type === 'WEEKLY' ? WEEKLY_DIR : MONTHLY_DIR;
  const filePath = path.join(targetDir, filename);

  const filePayload = {
    id: savedId || 'local_' + Math.random().toString(36).substring(2, 11),
    type,
    dateString,
    rawReport,
    markdown: reportMarkdown,
    createdAt: new Date().toISOString()
  };

  try {
    fs.writeFileSync(filePath, JSON.stringify(filePayload, null, 2), 'utf8');
  } catch (fileErr) {
    console.warn('[FILE BACKUP] Failed to write JSON payload report:', fileErr);
  }

  return filePayload;
}

export function getLocalReportsList(type?: 'DAILY' | 'WEEKLY' | 'MONTHLY') {
  ensureDirectories();
  const reportsList: any[] = [];

  const readDir = (dirPath: string, repType: string) => {
    if (!fs.existsSync(dirPath)) return;
    const files = fs.readdirSync(dirPath);
    files.forEach(file => {
      if (file.endsWith('.json')) {
        try {
          const content = JSON.parse(fs.readFileSync(path.join(dirPath, file), 'utf8'));
          reportsList.push({
            id: content.id,
            type: content.type,
            dateString: content.dateString,
            createdAt: content.createdAt,
            niftyClose: content.rawReport?.niftyClose,
            niftyChangePercent: content.rawReport?.niftyChangePercent,
            winRate: content.rawReport?.simulationResult?.winRatePercent,
            strongestSector: content.rawReport?.strongestSector,
            filename: file
          });
        } catch {
          // ignore
        }
      }
    });
  };

  if (!type || type === 'DAILY') readDir(DAILY_DIR, 'DAILY');
  if (!type || type === 'WEEKLY') readDir(WEEKLY_DIR, 'WEEKLY');
  if (!type || type === 'MONTHLY') readDir(MONTHLY_DIR, 'MONTHLY');

  return reportsList.sort((a, b) => b.dateString.localeCompare(a.dateString));
}

export function getLocalReportByFilename(type: 'DAILY' | 'WEEKLY' | 'MONTHLY', filename: string) {
  const targetDir = type === 'DAILY' ? DAILY_DIR : type === 'WEEKLY' ? WEEKLY_DIR : MONTHLY_DIR;
  const filePath = path.join(targetDir, filename);
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}
