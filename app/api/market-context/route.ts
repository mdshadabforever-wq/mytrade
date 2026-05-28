import { NextResponse } from 'next/server';
import { getMarketContext } from '@/lib/market-context';

export async function GET() {
  try {
    const context = await getMarketContext();
    return NextResponse.json(context);
  } catch (error: any) {
    console.error('[API MARKET CONTEXT] Route error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
