import axios from 'axios';
import { Anthropic } from '@anthropic-ai/sdk';
import { getNextCalendarEvent, isHighImpactEventToday } from './nifty-sessions';
import { generateMockData } from './data-sources/mock-data';
import { resolveModelName } from './claude-client';
import { cacheGet, cacheSet } from './cache';
import fs from 'fs';
import path from 'path';

function getSavedSettings() {
  const filePath = path.join(process.cwd(), 'settings.json');
  if (!fs.existsSync(filePath)) return {};
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return {};
  }
}

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
  const cacheKey = `news_sentiment:${Buffer.from(headline).toString('base64').substring(0, 100)}`;
  try {
    const cached = await cacheGet(cacheKey);
    if (cached) {
      return cached;
    }
  } catch (err) {
    console.warn('[NEWS SENTIMENT CACHE GET ERROR]', err);
  }

  const settings = getSavedSettings();
  const apiKey = process.env.ANTHROPIC_API_KEY || settings.anthropicKey || '';
  
  let result: { sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL', reason: string };

  if (!apiKey || apiKey.includes('mock') || apiKey === 'admin' || apiKey === '') {
    result = evaluateLocalSentiment(headline);
  } else {
    try {
      const anthropic = new Anthropic({ apiKey });
      const modelName = resolveModelName('haiku');
      const response = await anthropic.messages.create({
        model: modelName,
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

      result = { sentiment, reason };
    } catch (error: any) {
      console.warn('[NEWS SENTIMENT] Claude Haiku request failed, using heuristics:', error.message);
      result = evaluateLocalSentiment(headline);
    }
  }

  try {
    await cacheSet(cacheKey, result, 14400); // Cache for 4 hours (14400 seconds)
  } catch (err) {
    console.warn('[NEWS SENTIMENT CACHE SET ERROR]', err);
  }

  return result;
}

export async function getNewsIntelligence(): Promise<NewsData> {
  const settings = getSavedSettings();
  const provider = settings.newsProvider || 'GOOGLE_NEWS';
  const dataSource = process.env.DATA_SOURCE || 'MOCK';

  // Even if DATA_SOURCE is MOCK, let GOOGLE_NEWS bypass to query live because it is free & zero-latency
  if (dataSource === 'MOCK' && provider !== 'GOOGLE_NEWS') {
    const mock = generateMockData();
    return mock.news;
  }

  try {
    const items: NewsItem[] = [];

    if (provider === 'GOOGLE_NEWS') {
      const url = 'https://news.google.com/rss/search?q=Nifty+50+Sensex+Stock+Market&hl=en-IN&gl=IN&ceid=IN:en';
      const response = await axios.get(url, { timeout: 5000 });
      const rawXml = response.data || '';
      
      const matches = rawXml.match(/<item>([\s\S]*?)<\/item>/g) || [];
      const topNews = matches.slice(0, 8);
      
      for (const item of topNews) {
        const titleMatch = item.match(/<title>([\s\S]*?)<\/title>/);
        const pubDateMatch = item.match(/<pubDate>([\s\S]*?)<\/pubDate>/);
        const sourceMatch = item.match(/<source[^>]*>([\s\S]*?)<\/source>/);
        
        let headline = titleMatch ? titleMatch[1] : 'Stock Market Update';
        let publisherName = sourceMatch ? sourceMatch[1] : 'Google News';
        if (headline.includes(' - ')) {
          const parts = headline.split(' - ');
          publisherName = parts.pop() || publisherName;
          headline = parts.join(' - ');
        }
        
        const pubDateStr = pubDateMatch ? pubDateMatch[1] : '';
        let itemTime = '09:15 IST';
        if (pubDateStr) {
          try {
            itemTime = new Date(pubDateStr).toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
              timeZone: 'Asia/Kolkata'
            }) + ' IST';
          } catch {}
        }
        
        const isHighImpact = headline.toUpperCase().includes('FED') || 
                             headline.toUpperCase().includes('RBI') || 
                             headline.toUpperCase().includes('BUDGET') ||
                             headline.toUpperCase().includes('INFLATION') ||
                             headline.toUpperCase().includes('RATE') ||
                             headline.toUpperCase().includes('CRUDE');
                             
        const { sentiment, reason } = await fetchNewsSentiment(headline);
        
        items.push({
          headline,
          source: publisherName,
          time: itemTime,
          sentiment,
          sentimentReason: reason,
          isHighImpact
        });
      }
    } else if (provider === 'NEWS_API' && settings.newsApiKey) {
      const url = `https://newsapi.org/v2/top-headlines?country=in&category=business&pageSize=8&apiKey=${settings.newsApiKey}`;
      const response = await axios.get(url, { timeout: 5000 });
      const articles = response.data?.articles ?? [];
      
      for (const article of articles) {
        const headline = article.title;
        const source = article.source?.name ?? 'NewsAPI';
        const itemTime = article.publishedAt 
          ? new Date(article.publishedAt).toLocaleTimeString('en-US', {
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
    } else {
      const url = 'https://query1.finance.yahoo.com/v1/finance/search?q=Nifty%2050';
      const response = await axios.get(url, {
        headers: { 'User-Agent': USER_AGENT },
        timeout: 5000
      });
      const rawNews = response.data?.news ?? [];
      const topNews = rawNews.slice(0, 8);
      
      for (const item of topNews) {
        const headline = item.title;
        const source = item.publisher ?? 'Yahoo Finance';
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
    }

    if (items.length === 0) {
      throw new Error('No news items resolved from API');
    }

    const bulls = items.filter(i => i.sentiment === 'BULLISH').length;
    const bears = items.filter(i => i.sentiment === 'BEARISH').length;
    const overallNewsSentiment = bulls > bears + 1 ? 'BULLISH' : bears > bulls + 1 ? 'BEARISH' : 'MIXED';

    const today = new Date();
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

