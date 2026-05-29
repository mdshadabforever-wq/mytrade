import axios from 'axios';
import NodeCache from 'node-cache';
import { cacheGet, cacheSet } from '../cache';

// Create caches: one for cookies (expires in 15 mins), one for API responses (expires in 2 mins)
const cookieCache = new NodeCache({ stdTTL: 900 });
const apiCache = new NodeCache({ stdTTL: 120 }); // Cache responses to prevent rate limit blocks

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';

async function getNseCookies(): Promise<string> {
  const cachedCookie = cookieCache.get<string>('nse_cookies');
  if (cachedCookie) return cachedCookie;

  try {
    // Initial handshake to acquire valid session cookies
    const response = await axios.get('https://www.nseindia.com/', {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
      },
      timeout: 8000
    });

    const setCookieHeaders = response.headers['set-cookie'];
    if (!setCookieHeaders) {
      throw new Error('No set-cookie headers returned from NSE handshake');
    }

    // Combine cookies into a single string
    const cookies = setCookieHeaders.map(cookie => cookie.split(';')[0]).join('; ');
    cookieCache.set('nse_cookies', cookies);
    return cookies;
  } catch (error: any) {
    console.warn('[NSE] Cookie handshake failed:', error.message);
    throw error;
  }
}

export async function fetchNseApi(url: string): Promise<any> {
  // Check response cache
  const cachedData = apiCache.get(url);
  if (cachedData) return cachedData;

  let retries = 2;
  while (retries > 0) {
    try {
      const cookies = await getNseCookies();
      const response = await axios.get(url, {
        headers: {
          'User-Agent': USER_AGENT,
          'Accept': 'application/json, text/plain, */*',
          'Accept-Language': 'en-US,en;q=0.9',
          'Referer': 'https://www.nseindia.com/',
          'Cookie': cookies,
          'Connection': 'keep-alive',
        },
        timeout: 8000
      });

      const data = response.data;
      apiCache.set(url, data);
      return data;
    } catch (error: any) {
      retries--;
      console.warn(`[NSE] API request failed to ${url}. Retries remaining: ${retries}. Error:`, error.message);
      
      // Clear cookie cache on failure to force new handshake on next retry
      cookieCache.del('nse_cookies');
      
      if (retries === 0) {
        throw error;
      }
      
      // Wait a short time before retrying
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}

// Fetch FII/DII Net Flow Cash Data
export async function fetchFIIDIITrade(): Promise<any> {
  const cacheKey = 'nse_fii_dii_trade_24h';
  try {
    const cached = await cacheGet(cacheKey);
    if (cached) return cached;
  } catch (err) {
    console.warn('[FII DII CACHE GET ERROR]', err);
  }

  const url = 'https://www.nseindia.com/api/fiidiiTradeReact';
  try {
    const rawData = await fetchNseApi(url);
    
    // Parse response
    // NSE returns an array of daily flows: [{ date: "...", category: "FII", buyValue: ..., sellValue: ..., netValue: ... }]
    if (Array.isArray(rawData)) {
      const fiiRecord = rawData.find(r => r.category === 'FII' || r.category === 'Foreign Institutional Investors');
      const diiRecord = rawData.find(r => r.category === 'DII' || r.category === 'Domestic Institutional Investors');
      
      const date = fiiRecord?.date ?? new Date().toISOString().split('T')[0];

      const result = {
        fii: {
          cash: fiiRecord ? Math.round(parseFloat(fiiRecord.netValue)) : 0,
          futures: 0, // NSE cash endpoint doesn't return futures, we'll estimate or combine
          total: fiiRecord ? Math.round(parseFloat(fiiRecord.netValue)) : 0,
          direction: fiiRecord && parseFloat(fiiRecord.netValue) > 0 ? 'BUYING' : 'SELLING'
        },
        dii: {
          cash: diiRecord ? Math.round(parseFloat(diiRecord.netValue)) : 0,
          total: diiRecord ? Math.round(parseFloat(diiRecord.netValue)) : 0,
          direction: diiRecord && parseFloat(diiRecord.netValue) > 0 ? 'BUYING' : 'SELLING'
        },
        date
      };

      try {
        await cacheSet(cacheKey, result, 86400); // Cache for 24 hours (86400 seconds)
      } catch (err) {
        console.warn('[FII DII CACHE SET ERROR]', err);
      }

      return result;
    }
    throw new Error('FII/DII response is not an array');
  } catch (error: any) {
    console.warn('[NSE] FII/DII fetch failed, using fallback:', error.message);
    // Return sensible fallback structure
    return null;
  }
}

// Fetch Option Chain for NIFTY
export async function fetchNiftyOptionChain(): Promise<any> {
  const url = 'https://www.nseindia.com/api/option-chain-indices?symbol=NIFTY';
  try {
    const rawData = await fetchNseApi(url);
    return rawData;
  } catch (error: any) {
    console.warn('[NSE] Option chain fetch failed, using fallback:', error.message);
    return null;
  }
}
