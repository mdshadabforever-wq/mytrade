import { NextRequest, NextResponse } from 'next/server';
import { getLocalReportsList, compileMarketReport, getLocalReportByFilename } from '@/lib/report-engine';

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
    return NextResponse.json({ success: true, report, message: `${type} report generated successfully` });
  } catch (error: any) {
    console.error('[REPORTS POST API] Error:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
