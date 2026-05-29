import { fetchYFinanceQuote, fetchSectorData } from './data-sources/yfinance-client';
import { cacheGet, cacheSet } from './cache';
import { fetchFIIDIITrade } from './data-sources/nse-client';
import { generateMockData, MockSectorData, MockStockData } from './data-sources/mock-data';

export interface MarketContextData {
  giftNifty: {
    price: number;
    gapPoints: number;
    gapPercent: number;
    direction: 'GAP_UP' | 'GAP_DOWN' | 'FLAT';
  };
  institutional: {
    fii: { cash: number; futures: number; total: number; longShortRatio: number; direction: 'BUYING' | 'SELLING' };
    dii: { cash: number; total: number; direction: 'BUYING' | 'SELLING' };
    date: string;
  };
  vix: {
    current: number;
    change: number;
    changePercent: number;
    trend: 'RISING' | 'FALLING' | 'FLAT';
    interpretation: string;
    level: 'LOW' | 'NORMAL' | 'HIGH' | 'EXTREME';
    isLive?: boolean;
  };
  sectors: MockSectorData[];
  stocks: MockStockData[];
  regime: {
    regime: 'TRENDING_UP' | 'TRENDING_DOWN' | 'RANGING' | 'CHOPPY';
    bias: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    confidence: number;
    explanation: string;
  };
  timestamp: string;
}

export async function getMarketContext(): Promise<MarketContextData> {
  const dataSource = process.env.DATA_SOURCE || 'MOCK';

  // Even if not in mock mode, mock data contains the full 50 stocks + 15 sectors.
  // We can merge real-time index levels with the detailed stock metrics for a hybrid layout.
  const mock = generateMockData();

  if (dataSource === 'MOCK') {
    return {
      giftNifty: mock.giftNifty,
      institutional: mock.institutional,
      vix: {
        current: mock.vix.current,
        change: mock.vix.change,
        changePercent: mock.vix.changePercent,
        trend: mock.vix.trend,
        interpretation: mock.vix.interpretation,
        level: mock.vix.level,
        isLive: false
      },
      sectors: mock.sectors,
      stocks: mock.stocks,
      regime: mock.regime,
      timestamp: new Date().toISOString()
    };
  }

  try {
    // In YFINANCE / KITE mode, fetch key benchmarks in parallel to overlay
    const [
      giftRaw,
      vixRaw,
      fiiDiiRaw
    ] = await Promise.all([
      fetchYFinanceQuote('NIFTY-I.NS').catch(() => null), // GIFT Nifty approximation
      fetchYFinanceQuote('^INDIAVIX').catch(() => null),
      fetchFIIDIITrade().catch(() => null)
    ]);

    // Format GIFT Nifty
    let giftNifty = mock.giftNifty;
    if (giftRaw) {
      const niftyQuote = (await fetchYFinanceQuote('^NSEI').catch(() => null)) || { price: 24000 };
      const gapPoints = giftRaw.price - niftyQuote.price;
      const gapPercent = (gapPoints / niftyQuote.price) * 100;
      giftNifty = {
        price: giftRaw.price,
        prevClose: niftyQuote.price,
        gapPoints: Math.round(gapPoints * 10) / 10,
        gapPercent: Math.round(gapPercent * 100) / 100,
        direction: gapPoints > 15 ? 'GAP_UP' : gapPoints < -15 ? 'GAP_DOWN' : 'FLAT'
      };
    }

    // Format VIX
    let vix = {
      current: mock.vix.current,
      change: mock.vix.change,
      changePercent: mock.vix.changePercent,
      trend: mock.vix.trend,
      interpretation: mock.vix.interpretation,
      level: mock.vix.level,
      isLive: false
    };

    if (vixRaw) {
      let level: 'LOW' | 'NORMAL' | 'HIGH' | 'EXTREME' = 'NORMAL';
      if (vixRaw.price < 13) level = 'LOW';
      else if (vixRaw.price > 30) level = 'EXTREME';
      else if (vixRaw.price > 20) level = 'HIGH';

      vix = {
        current: vixRaw.price,
        change: vixRaw.change,
        changePercent: vixRaw.changePercent,
        trend: vixRaw.change > 0.15 ? 'RISING' : vixRaw.change < -0.15 ? 'FALLING' : 'FLAT',
        interpretation: vixRaw.price < 13 ? 'Low volatility — stable conditions' : 'Normal volatility — balanced trade structures',
        level,
        isLive: true
      };
    }

    const institutional = fiiDiiRaw ?? mock.institutional;

    // Fetch live sector rotation data (cached 5 min)
    let sectors = mock.sectors;
    try {
      const cachedSectors = await cacheGet<any[]>('sector_rotation');
      if (cachedSectors) {
        sectors = cachedSectors;
      } else {
        const liveSectors = await fetchSectorData();
        if (liveSectors && liveSectors.length > 0) {
          sectors = liveSectors;
          await cacheSet('sector_rotation', liveSectors, 300);
        }
      }
    } catch (sectorErr) {
      console.warn('[MARKET CONTEXT] Sector fetch failed, using mock sectors:', sectorErr);
    }

    return {
      giftNifty,
      institutional,
      vix,
      sectors,              // Live CNX sector data or mock fallback
      stocks: mock.stocks,  // Merge in high-fidelity stock futures
      regime: mock.regime,
      timestamp: new Date().toISOString()
    };
  } catch (error: any) {
    console.warn('[MARKET CONTEXT] Fetch failed, returning high-fidelity mock fallback:', error.message);
    return {
      giftNifty: mock.giftNifty,
      institutional: mock.institutional,
      vix: {
        current: mock.vix.current,
        change: mock.vix.change,
        changePercent: mock.vix.changePercent,
        trend: mock.vix.trend,
        interpretation: mock.vix.interpretation,
        level: mock.vix.level,
        isLive: false
      },
      sectors: mock.sectors,
      stocks: mock.stocks,
      regime: mock.regime,
      timestamp: new Date().toISOString()
    };
  }
}

