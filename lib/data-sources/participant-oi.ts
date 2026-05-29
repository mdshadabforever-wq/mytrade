import { fetchNseApi } from './nse-client';
import { cacheGet, cacheSet } from '../cache';

export interface ParticipantOIEntry {
  longContracts: number;
  shortContracts: number;
  netOI: number;
  direction: 'LONG' | 'SHORT' | 'NEUTRAL';
}

export interface ParticipantOIData {
  fii: ParticipantOIEntry;
  dii: ParticipantOIEntry;
  retail: ParticipantOIEntry;
  pro: ParticipantOIEntry;
  date: string;
  source: 'LIVE' | 'MOCK';
}

function mockParticipantOI(): ParticipantOIData {
  return {
    fii: { longContracts: 312450, shortContracts: 241200, netOI: 71250, direction: 'LONG' },
    dii: { longContracts: 128300, shortContracts: 145800, netOI: -17500, direction: 'SHORT' },
    retail: { longContracts: 890500, shortContracts: 920100, netOI: -29600, direction: 'SHORT' },
    pro: { longContracts: 415200, shortContracts: 439350, netOI: -24150, direction: 'SHORT' },
    date: new Date().toISOString().split('T')[0],
    source: 'MOCK'
  };
}

function parseParticipant(records: any[], label: string): ParticipantOIEntry {
  const record = records.find(
    (r: any) =>
      (r.clientType ?? r.client_type ?? '').toUpperCase().includes(label.toUpperCase())
  );
  if (!record) {
    return { longContracts: 0, shortContracts: 0, netOI: 0, direction: 'NEUTRAL' };
  }

  const longContracts =
    Number(record.futureIndexLong ?? record.future_index_long ?? 0) +
    Number(record.futureStockLong ?? record.future_stock_long ?? 0);

  const shortContracts =
    Number(record.futureIndexShort ?? record.future_index_short ?? 0) +
    Number(record.futureStockShort ?? record.future_stock_short ?? 0);

  const netOI = longContracts - shortContracts;

  return {
    longContracts,
    shortContracts,
    netOI,
    direction: netOI > 10000 ? 'LONG' : netOI < -10000 ? 'SHORT' : 'NEUTRAL'
  };
}

export async function fetchParticipantOI(): Promise<ParticipantOIData> {
  const cacheKey = 'nse_participant_oi_24h';

  // Check cache first
  try {
    const cached = await cacheGet<ParticipantOIData>(cacheKey);
    if (cached) return cached;
  } catch (err) {
    console.warn('[PARTICIPANT OI CACHE GET ERROR]', err);
  }

  const url = 'https://www.nseindia.com/api/participant-wise-trading-data';
  try {
    const rawData = await fetchNseApi(url);

    // NSE returns array of records per participant category
    const records: any[] = Array.isArray(rawData) ? rawData : [];

    if (records.length === 0) throw new Error('Empty participant OI response');

    const result: ParticipantOIData = {
      fii: parseParticipant(records, 'FII'),
      dii: parseParticipant(records, 'DII'),
      retail: parseParticipant(records, 'CLIENT'),
      pro: parseParticipant(records, 'PRO'),
      date: new Date().toISOString().split('T')[0],
      source: 'LIVE'
    };

    // Cache for 24 hours — NSE publishes this once daily EOD
    try {
      await cacheSet(cacheKey, result, 86400);
    } catch (err) {
      console.warn('[PARTICIPANT OI CACHE SET ERROR]', err);
    }

    return result;
  } catch (error: any) {
    console.warn('[PARTICIPANT OI] Fetch failed, using mock data:', error.message);
    return mockParticipantOI();
  }
}
