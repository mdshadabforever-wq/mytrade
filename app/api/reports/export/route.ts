import { NextRequest, NextResponse } from 'next/server';
import { getLocalReportByFilename } from '@/lib/report-engine';

export const dynamic = 'force-dynamic';

function convertToBlogHtml(markdown: string): string {
  // Remove code blocks
  let text = markdown.replace(/```[\s\S]*?```/g, '');

  // Remove table rows
  text = text.replace(/^\|.*\|$/gm, '');

  // Remove horizontal rules and divider lines
  text = text.replace(/^[-=_*#\u2550\u2500\u2502\u250c\u2510\u2514\u2518]{3,}$/gm, '');

  const lines = text.split(/\r?\n/);
  const processedLines: string[] = [];

  lines.forEach(line => {
    const trimmed = line.trim();
    if (!trimmed) return;

    // Convert headers to <h2>
    if (trimmed.startsWith('#')) {
      const headerText = trimmed.replace(/^#+\s*/, '').replace(/[*_`]/g, '');
      processedLines.push(`<h2>${headerText}</h2>`);
      return;
    }

    // Convert bold markdown to HTML bold tags
    let formattedLine = trimmed.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
    formattedLine = formattedLine.replace(/_(.*?)_/g, '<i>$1</i>');
    formattedLine = formattedLine.replace(/`(.*?)`/g, '<code>$1</code>');

    // Convert bullet points to simple paragraphs with bullet
    if (formattedLine.startsWith('•') || formattedLine.startsWith('-') || formattedLine.startsWith('*')) {
      const itemText = formattedLine.replace(/^[•\-*]\s*/, '');
      processedLines.push(`<p>• ${itemText}</p>`);
      return;
    }

    // Wrap normal paragraphs in <p>
    processedLines.push(`<p>${formattedLine}</p>`);
  });

  return processedLines.join('\n');
}

function convertToYoutubeScript(markdown: string): string {
  // Remove code blocks
  let text = markdown.replace(/```[\s\S]*?```/g, '');

  // Remove table rows
  text = text.replace(/^\|.*\|$/gm, '');

  // Remove horizontal rules and divider lines
  text = text.replace(/^[-=_*#\u2550\u2500\u2502\u250c\u2510\u2514\u2518]{3,}$/gm, '');

  const lines = text.split(/\r?\n/);
  const processedLines: string[] = [];

  // YouTube spoken opener
  processedLines.push("Namaste doston, [PAUSE] market ke ek aur informative segment mein aapka swagat hai. [PAUSE] [SHOW CHART]");

  lines.forEach(line => {
    const trimmed = line.trim();
    if (!trimmed) return;

    // Convert section headers to narrative speech transitions
    if (trimmed.startsWith('#')) {
      const headerText = trimmed.replace(/^#+\s*/, '').replace(/[*_`]/g, '');
      
      if (headerText.includes('Verdict') || headerText.includes('VERDICT')) {
        processedLines.push("\n[PAUSE] [EMPHASIZE] Chaliye sabse pehle aaj ke verdict ki baat karte hain.");
      } else if (headerText.includes('Kahani') || headerText.includes('NARRATIVE') || headerText.includes('Kya Kiya')) {
        processedLines.push("\n[PAUSE] [SHOW CHART] Ab aate hain aaj ki kahani par, ki subah se shaam tak market mein kya-kya hua.");
      } else if (headerText.includes('Smart Money') || headerText.includes('INSTITUTIONAL')) {
        processedLines.push("\n[PAUSE] [EMPHASIZE] Aaj smart money kya kar raha tha? FII aur DII data ko decode karte hain.");
      } else if (headerText.includes('Global Picture') || headerText.includes('GLOBAL')) {
        processedLines.push("\n[PAUSE] [SHOW CHART] Bahar global markets mein kya chal raha hai aur iska India par kya impact hai?");
      } else if (headerText.includes('Sector Battlefield') || headerText.includes('SECTOR')) {
        processedLines.push("\n[PAUSE] [SHOW CHART] Chaliye sector rotation aur sectors ki ladai ko dekhte hain.");
      } else if (headerText.includes('Alerts') || headerText.includes('ALERTS')) {
        processedLines.push("\n[PAUSE] [SHOW CHART] Nexus Alpha alert system ne aaj kaun se setups trigger kiye?");
      } else if (headerText.includes('Kal Ke Liye') || headerText.includes('PREPARATION')) {
        processedLines.push("\n[PAUSE] [EMPHASIZE] Ab sabse important baat - kal ke liye hamari kya taiyari honi chahiye? Levels kya hain?");
      } else if (headerText.includes('Aaj Ka Sabak')) {
        processedLines.push("\n[PAUSE] [EMPHASIZE] Aur aakhir mein, aaj ka sabak jo aapko long term mein trading discipline seekhayega.");
      } else {
        processedLines.push(`\n[PAUSE] [EMPHASIZE] ${headerText}`);
      }
      return;
    }

    // Clean remaining markdown formatting characters
    let cleanedLine = trimmed
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/_(.*?)_/g, '$1')
      .replace(/`(.*?)`/g, '$1')
      .replace(/^[•\-*]\s*/, '') // remove bullet list dots
      .replace(/^[🟢🔴🟡⏳✅⏭️🚨⚠️🎯📖🏦🌍📊⚡📈🔮💡]\s*/g, ''); // strip emojis

    if (cleanedLine) {
      processedLines.push(cleanedLine);
    }
  });

  // YouTube subscription CTA at the end
  processedLines.push("\n[PAUSE] [EMPHASIZE] Agar aapko ye intelligence review accha laga, toh video ko like karein, share karein aur channel ko subscribe zaroor karein! Kal milte hain. [PAUSE]");

  return processedLines.join('\n');
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') as 'DAILY' | 'WEEKLY' | 'MONTHLY' | null;
    const filename = searchParams.get('filename');
    const format = searchParams.get('format') as 'pdf' | 'markdown' | 'csv' | 'json' | 'blog' | 'youtube' | null;

    if (!type || !filename || !format) {
      return NextResponse.json({ success: false, message: 'Type, filename, and format query parameters are required' }, { status: 400 });
    }

    const report = getLocalReportByFilename(type, filename);
    if (!report) {
      return NextResponse.json({ success: false, message: 'Report not found' }, { status: 404 });
    }

    const { rawReport, markdown } = report;

    switch (format) {
      case 'json': {
        return new NextResponse(JSON.stringify(report, null, 2), {
          headers: {
            'Content-Type': 'application/json',
            'Content-Disposition': `attachment; filename="${filename}"`
          }
        });
      }

      case 'markdown': {
        return new NextResponse(markdown, {
          headers: {
            'Content-Type': 'text/markdown',
            'Content-Disposition': `attachment; filename="${filename.replace('.json', '.md')}"`
          }
        });
      }

      case 'csv': {
        // Compile flat trade/alert spreadsheet
        let csvContent = `METRIC,VALUE\n`;
        csvContent += `Report Type,${report.type}\n`;
        csvContent += `Session Date,${report.dateString}\n`;
        csvContent += `Nifty Close,${rawReport.niftyClose}\n`;
        csvContent += `Nifty Change Percent,${rawReport.niftyChangePercent}%\n`;
        csvContent += `Strongest Sector,${rawReport.strongestSector}\n`;
        csvContent += `Weakest Sector,${rawReport.weakestSector}\n`;
        csvContent += `FII Cash Flow,${rawReport.fiiNetCash} Cr\n`;
        csvContent += `DII Cash Flow,${rawReport.diiNetCash} Cr\n`;
        csvContent += `VIX,${rawReport.vixValue}\n`;
        csvContent += `Win Rate,${rawReport.simulationResult?.winRatePercent}%\n`;
        csvContent += `Profit Factor,${rawReport.simulationResult?.profitFactor}\n`;
        csvContent += `\nALERTS LOGS\n`;
        csvContent += `STOCK,ALERT TYPE,CONFIDENCE,ENTRY,STOP LOSS,TARGET,STATUS\n`;
        rawReport.alertsList.forEach((a: any) => {
          csvContent += `"${a.stock}","${a.type}",${a.confidence}%,₹${a.entry},₹${a.sl},₹${a.target},"${a.status}"\n`;
        });

        return new NextResponse(csvContent, {
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="${filename.replace('.json', '.csv')}"`
          }
        });
      }

      case 'pdf': {
        // Return a beautifully styled institutional print HTML template
        const printHtml = `<!DOCTYPE html>
<html>
<head>
  <title>${report.type} Market Report - ${report.dateString}</title>
  <style>
    body {
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      background-color: #ffffff;
      color: #1a1a1a;
      margin: 40px;
      padding: 0;
      line-height: 1.6;
      font-size: 14px;
    }
    .header {
      border-bottom: 2px solid #a06700;
      padding-bottom: 20px;
      margin-bottom: 30px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    .title-area h1 {
      margin: 0;
      font-size: 26px;
      font-weight: 800;
      letter-spacing: -0.5px;
      color: #111111;
      text-transform: uppercase;
    }
    .title-area span {
      font-size: 11px;
      color: #a06700;
      font-weight: bold;
      letter-spacing: 1px;
    }
    .date-badge {
      font-size: 14px;
      font-weight: bold;
      color: #666666;
    }
    .grid-container {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 15px;
      margin-bottom: 30px;
    }
    .grid-card {
      background-color: #faf9f6;
      border: 1px solid #e5e2d9;
      border-radius: 4px;
      padding: 12px;
    }
    .grid-card .label {
      font-size: 9px;
      font-weight: bold;
      color: #666666;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .grid-card .value {
      font-size: 18px;
      font-weight: bold;
      color: #111111;
      margin-top: 4px;
    }
    .value.up { color: #00875a; }
    .value.down { color: #d32f2f; }
    
    h2 {
      font-size: 16px;
      font-weight: bold;
      color: #111111;
      border-bottom: 1px solid #e5e2d9;
      padding-bottom: 5px;
      margin-top: 30px;
      margin-bottom: 15px;
      text-transform: uppercase;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 25px;
      font-size: 12px;
    }
    th {
      background-color: #faf9f6;
      border-bottom: 2px solid #e5e2d9;
      padding: 8px;
      font-weight: bold;
      text-align: left;
      color: #666666;
    }
    td {
      border-bottom: 1px solid #f2efeb;
      padding: 8px;
      color: #222222;
    }
    .badge-win { color: #00875a; font-weight: bold; }
    .badge-loss { color: #d32f2f; font-weight: bold; }
    
    .callout {
      background-color: #faf9f6;
      border-left: 3px solid #a06700;
      padding: 12px;
      margin: 15px 0;
      font-size: 12.5px;
      border-radius: 0 4px 4px 0;
    }
    .callout-title {
      font-weight: bold;
      color: #a06700;
      margin-bottom: 4px;
      font-size: 10px;
      text-transform: uppercase;
    }
    
    .markdown-body {
      font-size: 13.5px;
      line-height: 1.7;
    }
    
    @media print {
      body { margin: 20px; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="no-print" style="background-color: #faf9f6; border: 1px solid #e5e2d9; padding: 10px 15px; margin-bottom: 30px; border-radius: 4px; display: flex; justify-content: space-between; align-items: center;">
    <span style="font-size: 12px; font-weight: bold; color: #111111;">NEXUS ALPHA // PRINT REPORT CONSOLE</span>
    <button onclick="window.print()" style="background-color: #a06700; border: none; color: white; padding: 6px 16px; font-size: 11px; font-weight: bold; border-radius: 3px; cursor: pointer; text-transform: uppercase; letter-spacing: 0.5px;">Print / Save as PDF</button>
  </div>

  <div class="header">
    <div class="title-area">
      <h1>NEXUS ALPHA JOURNAL</h1>
      <span>INSTITUTIONAL INTEL REPORT</span>
    </div>
    <div class="date-badge">
      ${report.type} // ${report.dateString}
    </div>
  </div>

  <div class="grid-container">
    <div class="grid-card">
      <div class="label">Nifty 50 Close</div>
      <div class="value">₹${rawReport.niftyClose.toLocaleString('en-IN')}</div>
    </div>
    <div class="grid-card">
      <div class="label">Intraday Return</div>
      <div class="value ${rawReport.niftyChangePercent >= 0 ? 'up' : 'down'}">${rawReport.niftyChangePercent >= 0 ? '+' : ''}${rawReport.niftyChangePercent}%</div>
    </div>
    <div class="grid-card">
      <div class="label">Strongest Sector</div>
      <div class="value" style="font-size: 14px; margin-top: 8px;">${rawReport.strongestSector} (+${rawReport.strongestSectorChange}%)</div>
    </div>
    <div class="grid-card">
      <div class="label">Sim. Win Rate</div>
      <div class="value">${rawReport.simulationResult?.winRatePercent}%</div>
    </div>
  </div>

  <h2>Intraday Alerts Logs</h2>
  <table>
    <thead>
      <tr>
        <th>Instrument</th>
        <th>Alert Type</th>
        <th>Confidence</th>
        <th>Entry</th>
        <th>Stop Loss</th>
        <th>Target</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>
      ${rawReport.alertsList.map((a: any) => `
        <tr>
          <td><strong>${a.stock}</strong></td>
          <td>${a.type}</td>
          <td>${a.confidence}%</td>
          <td>₹${a.entry.toFixed(2)}</td>
          <td>₹${a.sl.toFixed(2)}</td>
          <td>₹${a.target.toFixed(2)}</td>
          <td><span class="${a.status === 'WIN' ? 'badge-win' : 'badge-loss'}">${a.status}</span></td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <h2>Hedge Fund Desk Analysis</h2>
  <div class="markdown-body" style="white-space: pre-wrap;">${markdown.replace(/#+\s+.*\n/g, '')}</div>

  <script>
    // Auto-trigger browser print dialog on load if not already printed
    window.onload = function() {
      // setTimeout(() => window.print(), 500);
    }
  </script>
</body>
</html>`;

        return new NextResponse(printHtml, {
          headers: {
            'Content-Type': 'text/html'
          }
        });
      }

      case 'blog': {
        const blogHtml = convertToBlogHtml(markdown);
        return new NextResponse(blogHtml, {
          headers: {
            'Content-Type': 'text/html',
            'Content-Disposition': `attachment; filename="${filename.replace('.json', '_blog.html')}"`
          }
        });
      }

      case 'youtube': {
        const youtubeScript = convertToYoutubeScript(markdown);
        return new NextResponse(youtubeScript, {
          headers: {
            'Content-Type': 'text/plain',
            'Content-Disposition': `attachment; filename="${filename.replace('.json', '_youtube.txt')}"`
          }
        });
      }

      default:
        return NextResponse.json({ success: false, message: 'Invalid export format parameter' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('[REPORT EXPORT API] Error:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
