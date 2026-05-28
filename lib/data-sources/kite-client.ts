import axios from 'axios';

export interface KiteCandle {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

const NIFTY_INSTRUMENT_TOKEN = 256265; // Nifty 50 Index Token on Zerodha Kite

export async function fetchKiteCandles(
  intervalMinutes: number = 5,
  daysBack: number = 2
): Promise<any[]> {
  const apiKey = process.env.KITE_API_KEY;
  const accessToken = process.env.KITE_ACCESS_TOKEN;

  if (!apiKey || !accessToken) {
    console.info('[KITE] API keys missing, skipping Kite candle fetch.');
    return [];
  }

  // Convert minutes into Kite intervals
  let kiteInterval = '5minute';
  if (intervalMinutes === 3) kiteInterval = '3minute';
  else if (intervalMinutes === 15) kiteInterval = '15minute';
  else if (intervalMinutes === 30) kiteInterval = '30minute';
  else if (intervalMinutes === 60) kiteInterval = '60minute';

  const toDate = new Date();
  const fromDate = new Date();
  fromDate.setDate(toDate.getDate() - daysBack);

  const fromString = fromDate.toISOString().split('T')[0] + ' 09:15:00';
  const toString = toDate.toISOString().split('T')[0] + ' 15:30:00';

  try {
    const url = `https://api.kite.trade/instruments/historical/${NIFTY_INSTRUMENT_TOKEN}/${kiteInterval}`;
    const response = await axios.get(url, {
      headers: {
        'X-Kite-Version': '3',
        'Authorization': `token ${apiKey}:${accessToken}`,
      },
      params: {
        from: fromString,
        to: toString
      },
      timeout: 5000
    });

    const candles = response.data?.data?.candles ?? [];
    // Zerodha Kite returns candles as array of arrays: [ [timestamp, open, high, low, close, volume], ... ]
    return candles.map((c: any) => ({
      timestamp: new Date(c[0]).getTime(),
      open: parseFloat(c[1]),
      high: parseFloat(c[2]),
      low: parseFloat(c[3]),
      close: parseFloat(c[4]),
      volume: parseInt(c[5])
    }));
  } catch (error: any) {
    console.warn('[KITE] Failed to fetch historical candles:', error.message);
    return [];
  }
}
