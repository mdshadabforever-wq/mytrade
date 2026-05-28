import { NextResponse } from 'next/server';
import { fetchYFinanceQuote } from '@/lib/data-sources/yfinance-client';
import { generateMockData } from '@/lib/data-sources/mock-data';

export async function GET() {
  const dataSource = process.env.DATA_SOURCE || 'MOCK';

  if (dataSource === 'MOCK') {
    const mock = generateMockData();
    return NextResponse.json(mock.vix);
  }

  try {
    const quote = await fetchYFinanceQuote('^INDIAVIX');

    let level: 'LOW' | 'NORMAL' | 'HIGH' | 'EXTREME' = 'NORMAL';
    if (quote.price < 13) level = 'LOW';
    else if (quote.price > 30) level = 'EXTREME';
    else if (quote.price > 20) level = 'HIGH';

    const interpretation = quote.price < 13 ? 'Low volatility — stable conditions' : 
                           quote.price > 20 ? 'High volatility — structural risk warning' : 'Normal volatility — balanced trade structures';

    const tradeImplication = quote.price < 13 ? 'Premium decay is high; good for options writers' : 
                             quote.price > 20 ? 'Wider stop-losses needed; trade dynamic breakouts' : 'Standard position sizing recommended';

    // Calculate trend from last few historical quotes
    let trend: 'RISING' | 'FALLING' | 'FLAT' = 'FLAT';
    if (quote.change > 0.15) trend = 'RISING';
    else if (quote.change < -0.15) trend = 'FALLING';

    return NextResponse.json({
      current: quote.price,
      previousClose: quote.prevClose,
      change: quote.change,
      changePercent: quote.changePercent,
      trend,
      interpretation,
      tradeImplication,
      level,
      history: quote.history
    });
  } catch (error: any) {
    console.error('[API INDIA VIX] Route error, falling back to mock:', error.message);
    const mock = generateMockData();
    return NextResponse.json(mock.vix);
  }
}

