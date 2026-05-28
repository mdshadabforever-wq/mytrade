import { NextRequest, NextResponse } from 'next/server';
import { getLocalReportByFilename } from '@/lib/report-engine';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') as 'DAILY' | 'WEEKLY' | 'MONTHLY' | null;
    const filename = searchParams.get('filename');
    const format = searchParams.get('format') as 'pdf' | 'markdown' | 'csv' | 'json' | null;

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

      default:
        return NextResponse.json({ success: false, message: 'Invalid export format parameter' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('[REPORT EXPORT API] Error:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
