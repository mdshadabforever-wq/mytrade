import { NextResponse } from 'next/server';
import { cacheGet, cacheSet } from '@/lib/cache';
import { fetchYFinanceQuote } from '@/lib/data-sources/yfinance-client';
import { generateMockData } from '@/lib/data-sources/mock-data';

export async function GET() {
  const cacheKey = 'nifty_india_vix_5layer';

  try {
    // 1. Attempt cached read
    const cachedData = await cacheGet(cacheKey);
    if (cachedData) {
      return NextResponse.json(cachedData);
    }

    const dataSource = process.env.DATA_SOURCE || 'MOCK';

    if (dataSource === 'MOCK') {
      const mock = generateMockData();
      return NextResponse.json(mock.vix);
    }

    // 2. Fetch live VIX quote
    const quote = await fetchYFinanceQuote('^INDIAVIX');

    if (!quote) {
      throw new Error('VIX quote returned null');
    }

    let level: 'LOW' | 'NORMAL' | 'HIGH' | 'EXTREME' = 'NORMAL';
    if (quote.price < 13) level = 'LOW';
    else if (quote.price > 30) level = 'EXTREME';
    else if (quote.price > 20) level = 'HIGH';

    const interpretation = quote.price < 13 ? 'Low volatility — stable conditions' : 
                           quote.price > 20 ? 'High volatility — structural risk warning' : 'Normal volatility — balanced trade structures';

    const tradeImplication = quote.price < 13 ? 'Premium decay is high; good for options writers' : 
                              quote.price > 20 ? 'Wider stop-losses needed; trade dynamic breakouts' : 'Standard position sizing recommended';

    // Calculate trend
    let trend: 'RISING' | 'FALLING' | 'FLAT' = 'FLAT';
    if (quote.change > 0.15) trend = 'RISING';
    else if (quote.change < -0.15) trend = 'FALLING';

    const formattedVix = {
      current: quote.price,
      previousClose: quote.prevClose,
      change: quote.change,
      changePercent: quote.changePercent,
      trend,
      interpretation,
      tradeImplication,
      level,
      history: quote.history
    };

    // Cache the VIX result for 3 minutes (180 seconds)
    await cacheSet(cacheKey, formattedVix, 180);

    return NextResponse.json(formattedVix);
  } catch (error: any) {
    console.error('[API INDIA VIX] Failed, falling back to mock:', error.message);
    const mock = generateMockData();
    return NextResponse.json(mock.vix);
  }
}
