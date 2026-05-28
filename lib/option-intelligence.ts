import { fetchNiftyOptionChain } from './data-sources/nse-client';
import { generateMockData } from './data-sources/mock-data';

export interface OptionChainData {
  currentPrice: number;
  expiryDate: string;
  pcr: number;
  maxPain: number;
  ivPercentile: number;
  callWalls: { strike: number; oi: number; oiChange: number; premium: number }[];
  putWalls: { strike: number; oi: number; oiChange: number; premium: number }[];
  atmStrike: number;
  atmIV: number;
  sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  daysToExpiry: number;
}

export function parsePCRInterpretation(pcr: number): string {
  if (pcr > 1.2) return "Strong Bullish — heavy put writing, floor support";
  if (pcr > 1.0) return "Bullish — more puts written than calls";
  if (pcr >= 0.8 && pcr <= 1.0) return "Neutral";
  if (pcr < 0.6) return "Strong Bearish — heavy call writing, ceiling pressure";
  return "Bearish — more calls written, resistance likely";
}

export function calculateMaxPain(records: any[]): number {
  if (!records || records.length === 0) return 24000;

  // Extract all unique strike prices
  const strikes: number[] = records.map(r => r.strikePrice);
  
  let minPain = Infinity;
  let maxPainStrike = strikes[0] || 24000;

  // For each potential expiry strike, compute total buyer pain
  for (const expiryStrike of strikes) {
    let totalPain = 0;
    
    for (const option of records) {
      const strike = option.strikePrice;
      
      // Call Pain: if expiry price is above the strike, call buyers are in the money, so writers lose.
      // (Loss for writers = Gain for buyers = (expiryStrike - strike) * CallOI)
      if (option.CE && expiryStrike > strike) {
        const ceOI = option.CE.openInterest ?? 0;
        totalPain += (expiryStrike - strike) * ceOI;
      }
      
      // Put Pain: if expiry price is below the strike, put buyers are in the money, so writers lose.
      // (Loss for writers = Gain for buyers = (strike - expiryStrike) * PutOI)
      if (option.PE && expiryStrike < strike) {
        const peOI = option.PE.openInterest ?? 0;
        totalPain += (strike - expiryStrike) * peOI;
      }
    }

    if (totalPain < minPain) {
      minPain = totalPain;
      maxPainStrike = expiryStrike;
    }
  }

  return maxPainStrike;
}

export async function getOptionIntelligence(): Promise<OptionChainData> {
  const dataSource = process.env.DATA_SOURCE || 'MOCK';

  if (dataSource === 'MOCK') {
    const mock = generateMockData();
    return mock.optionChain;
  }

  try {
    const rawData = await fetchNiftyOptionChain();
    if (!rawData || !rawData.filtered) {
      throw new Error('Invalid NSE option chain response');
    }

    const currentPrice = rawData.records.underlyingValue;
    const expiryDates = rawData.records.expiryDates;
    const nearestExpiry = expiryDates[0]; // Nearest weekly expiry

    // Filter records for the nearest weekly expiry
    const records = rawData.records.data.filter((r: any) => r.expiryDate === nearestExpiry);

    // Calculate total Call/Put Open Interest
    let totalCallOI = 0;
    let totalPutOI = 0;
    
    for (const r of records) {
      if (r.CE) totalCallOI += r.CE.openInterest ?? 0;
      if (r.PE) totalPutOI += r.PE.openInterest ?? 0;
    }

    const pcr = totalCallOI > 0 ? Math.round((totalPutOI / totalCallOI) * 100) / 100 : 1.0;

    // Calculate Max Pain
    const maxPain = calculateMaxPain(records);

    // Find ATM Strike (closest strike to underlying value)
    const strikes = records.map((r: any) => r.strikePrice);
    const atmStrike = strikes.reduce((prev: number, curr: number) => 
      Math.abs(curr - currentPrice) < Math.abs(prev - currentPrice) ? curr : prev
    );

    // ATM IV
    const atmRecord = records.find((r: any) => r.strikePrice === atmStrike);
    const atmIV = atmRecord?.CE?.impliedVolatility ?? atmRecord?.PE?.impliedVolatility ?? 14.2;

    // Find Call/Put Walls (Top 3 by Open Interest)
    const callOptions = records
      .filter((r: any) => r.CE)
      .map((r: any) => ({
        strike: r.strikePrice,
        oi: r.CE.openInterest ?? 0,
        oiChange: r.CE.changeinOpenInterest ?? 0,
        premium: r.CE.lastPrice ?? 0
      }))
      .sort((a: any, b: any) => b.oi - a.oi)
      .slice(0, 3);

    const putOptions = records
      .filter((r: any) => r.PE)
      .map((r: any) => ({
        strike: r.strikePrice,
        oi: r.PE.openInterest ?? 0,
        oiChange: r.PE.changeinOpenInterest ?? 0,
        premium: r.PE.lastPrice ?? 0
      }))
      .sort((a: any, b: any) => b.oi - a.oi)
      .slice(0, 3);

    // Calculate Days to Expiry
    const today = new Date();
    const expiry = new Date(nearestExpiry);
    const diffTime = Math.abs(expiry.getTime() - today.getTime());
    const daysToExpiry = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    let sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
    if (pcr > 1.1) sentiment = 'BULLISH';
    else if (pcr < 0.85) sentiment = 'BEARISH';

    return {
      currentPrice,
      expiryDate: nearestExpiry,
      pcr,
      maxPain,
      ivPercentile: 35, // Static approximation or dynamic calculation if 52w history present
      callWalls: callOptions,
      putWalls: putOptions,
      atmStrike,
      atmIV,
      sentiment,
      daysToExpiry
    };
  } catch (error: any) {
    console.error('[OPTION INTEL] Failed, falling back to mock:', error.message);
    const mock = generateMockData();
    return mock.optionChain;
  }
}

