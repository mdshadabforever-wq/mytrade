import { NextResponse } from 'next/server';
import { getNewsIntelligence } from '@/lib/news-fetcher';

export async function GET() {
  try {
    const newsData = await getNewsIntelligence();
    return NextResponse.json(newsData);
  } catch (error: any) {
    console.error('[API NEWS] Route error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
