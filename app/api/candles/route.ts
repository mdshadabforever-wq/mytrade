import { NextRequest, NextResponse } from 'next/server';
import { fetchKiteCandles } from '@/lib/data-sources/kite-client';
import { fetchNiftyCandles } from '@/lib/data-sources/yfinance-client';
import { generateMockData } from '@/lib/data-sources/mock-data';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const interval = searchParams.get('interval') || '5'; // default 5 minutes
  const intervalNum = parseInt(interval);

  const dataSource = process.env.NEXT_PUBLIC_DATA_SOURCE || 'MOCK';

  try {
    let candles: any[] = [];

    if (dataSource === 'KITE') {
      candles = await fetchKiteCandles(intervalNum, 2);
    }

    // Fallback 1: Yahoo Finance
    if (candles.length === 0 && dataSource !== 'MOCK') {
      // Map minutes to Yahoo intervals: 3m, 5m, 15m
      const yfInterval = `${interval}m`;
      candles = await fetchNiftyCandles(yfInterval);
    }

    // Fallback 2: Mock data
    if (candles.length === 0) {
      const mock = generateMockData(intervalNum);
      candles = mock.candles;
    }

    // Return structured candle data
    return NextResponse.json({
      candles,
      count: candles.length,
      interval: `${interval}M`,
      dataSource: candles.length > 0 ? dataSource : 'MOCK',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('[API CANDLES] Route error:', error.message);
    const mock = generateMockData(intervalNum);
    return NextResponse.json({
      candles: mock.candles,
      count: mock.candles.length,
      interval: `${interval}M`,
      dataSource: 'MOCK',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}
