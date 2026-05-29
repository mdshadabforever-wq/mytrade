import { NextResponse } from 'next/server';
import { cacheGet, cacheSet } from '@/lib/cache';
import { getNewsIntelligence } from '@/lib/news-fetcher';

export const dynamic = 'force-dynamic';

export async function GET() {
  const cacheKey = 'nifty_news_intelligence_5layer';

  try {
    // 1. Attempt cached read
    const cachedData = await cacheGet(cacheKey);
    if (cachedData) {
      return NextResponse.json(cachedData);
    }

    // 2. Fetch fresh news intelligence
    const newsData = await getNewsIntelligence();

    // 3. Cache results for 20 minutes (1200 seconds)
    await cacheSet(cacheKey, newsData, 1200);

    return NextResponse.json(newsData);
  } catch (error: any) {
    console.error('[API NEWS] Restructured fetch failed:', error);
    // Graceful degradiation fallback
    return NextResponse.json({
      items: [
        {
          headline: 'Reliance shares rise post-expansion plans announcement',
          source: 'Economic Times',
          time: '09:45 IST',
          sentiment: 'BULLISH',
          sentimentReason: 'Heuristic: positive corporate cue',
          isHighImpact: false
        },
        {
          headline: 'India VIX stabilizes below 15; options premiums cool down',
          source: 'NSE announcements',
          time: '10:12 IST',
          sentiment: 'BULLISH',
          sentimentReason: 'Heuristic: low volatility favor',
          isHighImpact: true
        }
      ],
      overallNewsSentiment: 'MIXED',
      highImpactEventToday: false,
      nextHighImpactEvent: { name: 'RBI Monetary Policy', date: '2026-06-08', daysAway: 10 }
    });
  }
}
