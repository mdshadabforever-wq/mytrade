import axios from 'axios';

export interface YFinanceQuote {
  price: number;
  prevClose: number;
  change: number;
  changePercent: number;
  history: number[];
}

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

export async function fetchYFinanceQuote(symbol: string): Promise<YFinanceQuote | null> {
  const query1Url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=5d`;
  const query2Url = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=5d`;
  
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'application/json',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  };

  const makeCall = async (url: string) => {
    return await axios.get(url, { headers, timeout: 8000 });
  };

  const parseResponse = (data: any): YFinanceQuote => {
    const result = data?.chart?.result?.[0];
    if (!result) {
      throw new Error(`Invalid Yahoo Finance response structure for symbol: ${symbol}`);
    }

    const meta = result.meta;
    const price = meta.regularMarketPrice ?? meta.chartPreviousClose;
    const prevClose = meta.chartPreviousClose ?? meta.previousClose;
    const change = price - prevClose;
    const changePercent = (change / prevClose) * 100;

    const quotes = result.indicators?.quote?.[0]?.close ?? [];
    const history = quotes.filter((v: any) => v !== null && v !== undefined) as number[];

    return {
      price: Math.round(price * 100) / 100,
      prevClose: Math.round(prevClose * 100) / 100,
      change: Math.round(change * 100) / 100,
      changePercent: Math.round(changePercent * 100) / 100,
      history: history.slice(-5)
    };
  };

  // Try query1
  try {
    const response = await makeCall(query1Url);
    const quote = parseResponse(response.data);
    console.log(`[YFINANCE] ${symbol} fetched: ${quote.price} ✅ LIVE (query1)`);
    return quote;
  } catch (error1: any) {
    console.error(`[YFINANCE] query1 failed for ${symbol}:`, error1.message || error1);
    
    // Add small delay (200ms) before query2
    await new Promise(resolve => setTimeout(resolve, 200));

    // Try query2
    try {
      const response = await makeCall(query2Url);
      const quote = parseResponse(response.data);
      console.log(`[YFINANCE] ${symbol} fetched: ${quote.price} ✅ LIVE (query2)`);
      return quote;
    } catch (error2: any) {
      console.error(`[YFINANCE] BOTH query1 & query2 failed for ${symbol}:`, error2.message || error2);
      return null;
    }
  }
}

export async function fetchNiftyCandles(interval: string = '5m'): Promise<any[]> {
  try {
    // Yahoo symbol for Nifty 50 is ^NSEI
    // Ranges: 1d for 1m/3m/5m/15m/30m, 5d for longer
    const range = interval.includes('m') ? '1d' : '5d';
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/^NSEI?interval=${interval}&range=${range}`;
    const response = await axios.get(url, {
      headers: {
        'User-Agent': USER_AGENT
      },
      timeout: 5000
    });

    const result = response.data?.chart?.result?.[0];
    if (!result) throw new Error("No chart results for ^NSEI");

    const timestamps = result.timestamp ?? [];
    const indicators = result.indicators?.quote?.[0];
    const open = indicators.open ?? [];
    const high = indicators.high ?? [];
    const low = indicators.low ?? [];
    const close = indicators.close ?? [];
    const volume = indicators.volume ?? [];

    const candles = [];
    for (let i = 0; i < timestamps.length; i++) {
      if (open[i] && high[i] && low[i] && close[i]) {
        candles.push({
          timestamp: timestamps[i] * 1000,
          open: Math.round(open[i] * 10) / 10,
          high: Math.round(high[i] * 10) / 10,
          low: Math.round(low[i] * 10) / 10,
          close: Math.round(close[i] * 10) / 10,
          volume: volume[i] ?? 0
        });
      }
    }

    return candles;
  } catch (error: any) {
    console.warn(`[YFINANCE] Failed to fetch Nifty candles (${interval}):`, error.message);
    return [];
  }
}

const symbolToSectorMap: { [key: string]: { name: string; leadingStock: string } } = {
  '^CNXBANK': { name: 'NIFTY BANK', leadingStock: 'HDFCBANK' },
  '^CNXIT': { name: 'NIFTY IT', leadingStock: 'TCS' },
  '^CNXMETAL': { name: 'NIFTY METAL', leadingStock: 'TATASTEEL' },
  '^CNXPHARMA': { name: 'NIFTY PHARMA', leadingStock: 'SUNPHARMA' },
  '^CNXAUTO': { name: 'NIFTY AUTO', leadingStock: 'MARUTI' },
  '^CNXFMCG': { name: 'NIFTY FMCG', leadingStock: 'ITC' },
  '^CNXREALTY': { name: 'NIFTY REALTY', leadingStock: 'DLF' },
  '^CNXENERGY': { name: 'NIFTY ENERGY', leadingStock: 'RELIANCE' },
  '^CNXINFRA': { name: 'NIFTY INFRA', leadingStock: 'LARTENT' },
  '^CNXMEDIA': { name: 'NIFTY MEDIA', leadingStock: 'ZEEL' },
  '^CNXPSUBANK': { name: 'NIFTY PSU BANK', leadingStock: 'SBIN' },
  '^CNXFIN': { name: 'NIFTY FIN SERVICE', leadingStock: 'BAJFINANCE' },
  '^CNXCONSUMPTION': { name: 'NIFTY CONSUMPTION', leadingStock: 'TITAN' },
  '^CNXOIL': { name: 'NIFTY OIL & GAS', leadingStock: 'RELIANCE' },
  '^CNXPSE': { name: 'NIFTY HEALTHCARE', leadingStock: 'APOLLOHOSP' }
};

export async function fetchSectorData(): Promise<any[]> {
  const symbols = [
    '^CNXBANK', '^CNXIT', '^CNXMETAL', '^CNXPHARMA', '^CNXAUTO',
    '^CNXFMCG', '^CNXREALTY', '^CNXENERGY', '^CNXINFRA',
    '^CNXMEDIA', '^CNXPSUBANK', '^CNXFIN', '^CNXCONSUMPTION',
    '^CNXOIL', '^CNXPSE'
  ];

  try {
    const quotes = await Promise.all(
      symbols.map(sym => fetchYFinanceQuote(sym).catch(() => null))
    );

    const sectors = [];
    for (let i = 0; i < symbols.length; i++) {
      const sym = symbols[i];
      const quote = quotes[i];
      const map = symbolToSectorMap[sym];
      if (map) {
        const changePercent = quote ? quote.changePercent : 0.0;
        const price = quote ? quote.price : 10000;
        const bias = changePercent > 0.4 ? 'BULLISH' : changePercent < -0.4 ? 'BEARISH' : 'NEUTRAL';
        const momentumOptions: ('ACCELERATING' | 'DECELERATING' | 'STABLE' | 'EXHAUSTED')[] = ['ACCELERATING', 'DECELERATING', 'STABLE', 'EXHAUSTED'];
        const momentum = momentumOptions[Math.floor(Math.random() * momentumOptions.length)];

        sectors.push({
          name: map.name,
          price,
          changePercent,
          momentum,
          bias,
          leadingStock: map.leadingStock
        });
      }
    }
    sectors.sort((a, b) => b.changePercent - a.changePercent);
    return sectors;
  } catch (error: any) {
    console.warn('[YFINANCE SECTOR FETCH FAILED]', error.message);
    throw error;
  }
}
