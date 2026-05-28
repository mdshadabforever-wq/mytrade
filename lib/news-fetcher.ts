import axios from 'axios';
import { Anthropic } from '@anthropic-ai/sdk';
import { getNextCalendarEvent, isHighImpactEventToday } from './nifty-sessions';
import { generateMockData } from './data-sources/mock-data';

export interface NewsItem {
  headline: string;
  source: string;
  time: string;
  sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  sentimentReason: string;
  isHighImpact: boolean;
}

export interface NewsData {
  items: NewsItem[];
  overallNewsSentiment: 'BULLISH' | 'BEARISH' | 'MIXED';
  highImpactEventToday: boolean;
  nextHighImpactEvent: { name: string; date: string; daysAway: number } | null;
}

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

// Local heuristic-based fallback sentiment parser in case Claude is unavailable or fails
function evaluateLocalSentiment(headline: string): { sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL', reason: string } {
  const h = headline.toLowerCase();
  
  if (h.includes('beat') || h.includes('above estimate') || h.includes('growth') || h.includes('bullish') || h.includes('partner') || h.includes('surpass') || h.includes('dividend') || h.includes('buyback') || h.includes('rises') || h.includes('soars') || h.includes('gain')) {
    return { sentiment: 'BULLISH', reason: 'Heuristic: positive earnings/expansion language' };
  }
  
  if (h.includes('spikes') && h.includes('crude')) {
    return { sentiment: 'BEARISH', reason: 'Heuristic: Brent Crude surge caps margins' };
  }

  if (h.includes('slip') || h.includes('drop') || h.includes('plunge') || h.includes('bearish') || h.includes('cut') || h.includes('deficit') || h.includes('miss') || h.includes('inflation spikes') || h.includes('rate hike') || h.includes('conflict') || h.includes('risk')) {
    return { sentiment: 'BEARISH', reason: 'Heuristic: negative macro/earning signal' };
  }

  return { sentiment: 'NEUTRAL', reason: 'Heuristic: balanced reporting structure' };
}

export async function fetchNewsSentiment(headline: string): Promise<{ sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL', reason: string }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return evaluateLocalSentiment(headline);
  }

  try {
    const anthropic = new Anthropic({ apiKey });
    const response = await anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 20,
      messages: [{
        role: 'user',
        content: `Is this news BULLISH, BEARISH, or NEUTRAL for Nifty 50? 
                 Reply with only: BULLISH / BEARISH / NEUTRAL — [5 word reason]
                 
                 News: "${headline}"`
      }]
    });

    const text = (response.content[0] as any)?.text ?? '';
    const cleanText = text.trim().toUpperCase();

    let sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
    let reason = 'Claude: General index cue';

    if (cleanText.includes('BULLISH')) {
      sentiment = 'BULLISH';
      reason = text.split('—')[1]?.trim() ?? 'Claude: Positive catalyst';
    } else if (cleanText.includes('BEARISH')) {
      sentiment = 'BEARISH';
      reason = text.split('—')[1]?.trim() ?? 'Claude: Negative catalyst';
    } else if (cleanText.includes('NEUTRAL')) {
      sentiment = 'NEUTRAL';
      reason = text.split('—')[1]?.trim() ?? 'Claude: Flat impact';
    }

    return { sentiment, reason };
  } catch (error: any) {
    console.warn('[NEWS SENTIMENT] Claude Haiku request failed, using heuristics:', error.message);
    return evaluateLocalSentiment(headline);
  }
}

export async function getNewsIntelligence(): Promise<NewsData> {
  const dataSource = process.env.NEXT_PUBLIC_DATA_SOURCE || 'MOCK';

  if (dataSource === 'MOCK') {
    const mock = generateMockData();
    return mock.news;
  }

  try {
    // Fetch live news from Yahoo Finance Search API
    const url = 'https://query1.finance.yahoo.com/v1/finance/search?q=^NSEI';
    const response = await axios.get(url, {
      headers: { 'User-Agent': USER_AGENT },
      timeout: 5000
    });

    const rawNews = response.data?.news ?? [];
    const items: NewsItem[] = [];

    // Take top 8 news items and tag them
    const topNews = rawNews.slice(0, 8);
    
    for (const item of topNews) {
      const headline = item.title;
      const source = item.publisher ?? 'Yahoo Finance';
      
      // Format time from epoch timestamp
      const itemTime = item.providerPublishTime 
        ? new Date(item.providerPublishTime * 1000).toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit', 
            hour12: false, 
            timeZone: 'Asia/Kolkata' 
          }) + ' IST'
        : '09:15 IST';

      const isHighImpact = headline.toUpperCase().includes('FED') || 
                           headline.toUpperCase().includes('RBI') || 
                           headline.toUpperCase().includes('BUDGET') ||
                           headline.toUpperCase().includes('INFLATION');

      // Call Claude (or local heuristics)
      const { sentiment, reason } = await fetchNewsSentiment(headline);

      items.push({
        headline,
        source,
        time: itemTime,
        sentiment,
        sentimentReason: reason,
        isHighImpact
      });
    }

    if (items.length === 0) {
      throw new Error('No news items resolved from API');
    }

    // Determine overall bias
    const bulls = items.filter(i => i.sentiment === 'BULLISH').length;
    const bears = items.filter(i => i.sentiment === 'BEARISH').length;
    const overallNewsSentiment = bulls > bears + 1 ? 'BULLISH' : bears > bulls + 1 ? 'BEARISH' : 'MIXED';

    // Economic calendar integration
    const today = new Date();
    // Since running in node environment, adjust today to IST
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istToday = new Date(today.getTime() + istOffset);

    const highImpactEventToday = isHighImpactEventToday(istToday);
    const nextHighImpactEvent = getNextCalendarEvent(istToday);

    return {
      items,
      overallNewsSentiment,
      highImpactEventToday,
      nextHighImpactEvent
    };
  } catch (error: any) {
    console.error('[NEWS FETCHER] Failed, falling back to mock:', error.message);
    const mock = generateMockData();
    return mock.news;
  }
}
