import { Candle } from '../smc-engine';

export interface MockSectorData {
  name: string;
  price: number;
  changePercent: number;
  momentum: 'ACCELERATING' | 'DECELERATING' | 'STABLE' | 'EXHAUSTED';
  bias: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  leadingStock: string;
}

export interface MockStockData {
  symbol: string;
  sector: string;
  price: number;
  changePercent: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  vwap: number;
  oi: number;
  oiChangePercent: number;
  buildup: 'LONG_BUILDUP' | 'SHORT_BUILDUP' | 'LONG_UNWINDING' | 'SHORT_COVERING';
  relativeStrength: number; // Score relative to Nifty 50
  orbStatus: 'BULLISH_BREAKOUT' | 'BEARISH_BREAKOUT' | 'INSIDE_RANGE';
}

export interface MockDataResult {
  candles: Candle[];
  giftNifty: {
    price: number;
    prevClose: number;
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
    previousClose: number;
    change: number;
    changePercent: number;
    trend: 'RISING' | 'FALLING' | 'FLAT';
    interpretation: string;
    level: 'LOW' | 'NORMAL' | 'HIGH' | 'EXTREME';
    history: number[];
  };
  sectors: MockSectorData[];
  stocks: MockStockData[];
  news: {
    items: {
      headline: string;
      source: string;
      time: string;
      sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
      sentimentReason: string;
      isHighImpact: boolean;
    }[];
    overallNewsSentiment: 'BULLISH' | 'BEARISH' | 'MIXED';
    highImpactEventToday: boolean;
    nextHighImpactEvent: { name: string; date: string; daysAway: number } | null;
  };
  regime: {
    regime: 'TRENDING_UP' | 'TRENDING_DOWN' | 'RANGING' | 'CHOPPY';
    bias: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    confidence: number; // 0-100
    explanation: string;
  };
  optionChain: {
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
  };
}

export const SECTOR_NAMES = [
  'NIFTY BANK', 'NIFTY IT', 'NIFTY FIN SERVICE', 'NIFTY AUTO', 'NIFTY FMCG',
  'NIFTY PHARMA', 'NIFTY METAL', 'NIFTY ENERGY', 'NIFTY PSU BANK', 'NIFTY REALTY',
  'NIFTY MEDIA', 'NIFTY INFRA', 'NIFTY CONSUMPTION', 'NIFTY OIL & GAS', 'NIFTY HEALTHCARE'
];

export const NIFTY_50_STOCKS = [
  { symbol: 'RELIANCE', sector: 'NIFTY OIL & GAS', weight: 9.8 },
  { symbol: 'HDFCBANK', sector: 'NIFTY BANK', weight: 8.5 },
  { symbol: 'ICICIBANK', sector: 'NIFTY BANK', weight: 7.9 },
  { symbol: 'INFY', sector: 'NIFTY IT', weight: 5.6 },
  { symbol: 'LARTENT', sector: 'NIFTY INFRA', weight: 4.2 },
  { symbol: 'TCS', sector: 'NIFTY IT', weight: 4.0 },
  { symbol: 'ITC', sector: 'NIFTY FMCG', weight: 3.8 },
  { symbol: 'BHARTIARTL', sector: 'NIFTY TELECOM', weight: 3.5 },
  { symbol: 'SBIN', sector: 'NIFTY PSU BANK', weight: 3.2 },
  { symbol: 'AXISBANK', sector: 'NIFTY BANK', weight: 3.0 },
  { symbol: 'HINDUNILVR', sector: 'NIFTY FMCG', weight: 2.8 },
  { symbol: 'KOTAKBANK', sector: 'NIFTY BANK', weight: 2.6 },
  { symbol: 'LT', sector: 'NIFTY INFRA', weight: 2.5 },
  { symbol: 'BAJFINANCE', sector: 'NIFTY FIN SERVICE', weight: 2.4 },
  { symbol: 'M&M', sector: 'NIFTY AUTO', weight: 2.2 },
  { symbol: 'MARUTI', sector: 'NIFTY AUTO', weight: 2.0 },
  { symbol: 'HCLTECH', sector: 'NIFTY IT', weight: 1.8 },
  { symbol: 'SUNPHARMA', sector: 'NIFTY PHARMA', weight: 1.6 },
  { symbol: 'NTPC', sector: 'NIFTY ENERGY', weight: 1.5 },
  { symbol: 'TATASTEEL', sector: 'NIFTY METAL', weight: 1.4 },
  { symbol: 'POWERGRID', sector: 'NIFTY ENERGY', weight: 1.3 },
  { symbol: 'COALINDIA', sector: 'NIFTY ENERGY', weight: 1.2 },
  { symbol: 'ADANIPORTS', sector: 'NIFTY INFRA', weight: 1.1 },
  { symbol: 'ASIANPAINT', sector: 'NIFTY CONSUMPTION', weight: 1.1 },
  { symbol: 'TITAN', sector: 'NIFTY CONSUMPTION', weight: 1.0 },
  { symbol: 'ULTRACEMCO', sector: 'NIFTY INFRA', weight: 0.9 },
  { symbol: 'BAJAJFINSV', sector: 'NIFTY FIN SERVICE', weight: 0.9 },
  { symbol: 'WIPRO', sector: 'NIFTY IT', weight: 0.8 },
  { symbol: 'ONGC', sector: 'NIFTY OIL & GAS', weight: 0.8 },
  { symbol: 'JSWSTEEL', sector: 'NIFTY METAL', weight: 0.8 },
  { symbol: 'GRASIM', sector: 'NIFTY METAL', weight: 0.8 },
  { symbol: 'ADANIENT', sector: 'NIFTY INFRA', weight: 0.7 },
  { symbol: 'HINDALCO', sector: 'NIFTY METAL', weight: 0.7 },
  { symbol: 'APOLLOHOSP', sector: 'NIFTY HEALTHCARE', weight: 0.6 },
  { symbol: 'TATACONSUM', sector: 'NIFTY CONSUMPTION', weight: 0.6 },
  { symbol: 'DIVISLAB', sector: 'NIFTY HEALTHCARE', weight: 0.6 },
  { symbol: 'EICHERMOT', sector: 'NIFTY AUTO', weight: 0.5 },
  { symbol: 'TECHM', sector: 'NIFTY IT', weight: 0.5 },
  { symbol: 'NESTLEIND', sector: 'NIFTY FMCG', weight: 0.5 },
  { symbol: 'INDUSINDBK', sector: 'NIFTY BANK', weight: 0.5 },
  { symbol: 'CIPLA', sector: 'NIFTY PHARMA', weight: 0.5 },
  { symbol: 'SBILIFE', sector: 'NIFTY FIN SERVICE', weight: 0.5 },
  { symbol: 'DRREDDY', sector: 'NIFTY HEALTHCARE', weight: 0.5 },
  { symbol: 'BRITANNIA', sector: 'NIFTY FMCG', weight: 0.4 },
  { symbol: 'TATAMOTORS', sector: 'NIFTY AUTO', weight: 0.4 },
  { symbol: 'BPCL', sector: 'NIFTY OIL & GAS', weight: 0.4 },
  { symbol: 'SHRIRAMFIN', sector: 'NIFTY FIN SERVICE', weight: 0.4 },
  { symbol: 'HEROMOTOCO', sector: 'NIFTY AUTO', weight: 0.4 },
  { symbol: 'JIOFIN', sector: 'NIFTY FIN SERVICE', weight: 0.4 },
  { symbol: 'DLF', sector: 'NIFTY REALTY', weight: 0.4 }
];

export function generateMockData(intervalMinutes: number = 5): MockDataResult {
  const now = new Date();
  
  // 1. Generate Candles: Random walk around 24000
  const candleCount = 100;
  const candles: Candle[] = [];
  let basePrice = 24300;
  let t = now.getTime() - candleCount * intervalMinutes * 60 * 1000;

  for (let i = 0; i < candleCount; i++) {
    const isBullishDay = i > 40 && i < 60; 
    const isBearishDay = i > 75 && i < 90; 
    
    let change = (Math.random() - 0.49) * 20; 
    if (isBullishDay) change += 25; 
    if (isBearishDay) change -= 22; 

    if (i === 50) change = 80; 

    const open = basePrice;
    const close = basePrice + change;
    
    let high, low;
    if (close > open) {
      high = close + Math.random() * 8;
      low = open - Math.random() * 8;
      if (i === 50) low = open;
    } else {
      high = open + Math.random() * 8;
      low = close - Math.random() * 8;
    }

    if (i === 49) high = open + 5;
    if (i === 51) low = close - 5;

    const volume = Math.round(100000 + Math.random() * 300000 + (i === 50 ? 500000 : 0));

    candles.push({
      timestamp: t,
      open: Math.round(open * 10) / 10,
      high: Math.round(high * 10) / 10,
      low: Math.round(low * 10) / 10,
      close: Math.round(close * 10) / 10,
      volume
    });

    basePrice = close;
    t += intervalMinutes * 60 * 1000;
  }

  const currentPrice = candles[candles.length - 1].close;

  // 2. GIFT Nifty gap
  const gapPoints = Math.round((Math.random() - 0.4) * 150); 
  const direction: 'GAP_UP' | 'GAP_DOWN' | 'FLAT' = gapPoints > 15 ? 'GAP_UP' : gapPoints < -15 ? 'GAP_DOWN' : 'FLAT';
  const giftPrice = currentPrice + gapPoints;
  const giftNifty = {
    price: Math.round(giftPrice * 10) / 10,
    prevClose: Math.round(currentPrice * 10) / 10,
    gapPoints,
    gapPercent: Math.round((gapPoints / currentPrice) * 100 * 100) / 100,
    direction
  };

  // 3. FII / DII net cash flows
  const fiiCash = Math.round((Math.random() - 0.45) * 3500); 
  const diiCash = Math.round((Math.random() - 0.4) * 2500);
  const fiiFutures = Math.round((Math.random() - 0.5) * 1500);
  const longShortRatio = Math.round((1.05 + (Math.random() - 0.45) * 0.3) * 100) / 100;
  
  const institutional = {
    fii: {
      cash: fiiCash,
      futures: fiiFutures,
      total: fiiCash + fiiFutures,
      longShortRatio,
      direction: fiiCash > 0 ? 'BUYING' as const : 'SELLING' as const
    },
    dii: {
      cash: diiCash,
      total: diiCash,
      direction: diiCash > 0 ? 'BUYING' as const : 'SELLING' as const
    },
    date: now.toISOString().split('T')[0]
  };

  // 4. India VIX
  const vixHistory = [14.1, 13.8, 14.5, 14.2, 13.9];
  const vixCurrent = Math.round((13.5 + Math.random() * 2) * 100) / 100;
  const vixPrev = vixHistory[vixHistory.length - 1];
  const vixChange = vixCurrent - vixPrev;
  const vixChangePercent = Math.round((vixChange / vixPrev) * 100 * 100) / 100;
  const vixTrend = vixChange > 0.15 ? 'RISING' as const : vixChange < -0.15 ? 'FALLING' as const : 'FLAT' as const;

  let vixLevel: 'LOW' | 'NORMAL' | 'HIGH' | 'EXTREME' = 'NORMAL';
  if (vixCurrent < 13) vixLevel = 'LOW';
  else if (vixCurrent > 30) vixLevel = 'EXTREME';
  else if (vixCurrent > 20) vixLevel = 'HIGH';

  const vix = {
    current: vixCurrent,
    previousClose: vixPrev,
    change: Math.round(vixChange * 100) / 100,
    changePercent: vixChangePercent,
    trend: vixTrend,
    interpretation: vixCurrent < 13 ? 'Low volatility — stable conditions' : 
                    vixCurrent > 20 ? 'High volatility — structural risk warning' : 'Normal volatility — balanced trade structures',
    level: vixLevel,
    history: [...vixHistory, vixCurrent]
  };

  // 5. Generate Sector data (15 sectors)
  const isMarketUp = currentPrice > candles[0].open;
  const sectors: MockSectorData[] = SECTOR_NAMES.map((name) => {
    let sectorBias = Math.random() > 0.45;
    if (name === 'NIFTY IT' && isMarketUp) sectorBias = true;
    if (name === 'NIFTY BANK' && !isMarketUp) sectorBias = false;

    const sectorMultiplier = sectorBias ? 1 : -1;
    const changePercent = Math.round((Math.random() * 1.8 * sectorMultiplier + (Math.random() - 0.5) * 0.4) * 100) / 100;
    
    // Find representative stock
    const leadingStocks: { [key: string]: string } = {
      'NIFTY BANK': 'HDFCBANK',
      'NIFTY IT': 'TCS',
      'NIFTY FIN SERVICE': 'BAJFINANCE',
      'NIFTY AUTO': 'MARUTI',
      'NIFTY FMCG': 'ITC',
      'NIFTY PHARMA': 'SUNPHARMA',
      'NIFTY METAL': 'TATASTEEL',
      'NIFTY ENERGY': 'RELIANCE',
      'NIFTY PSU BANK': 'SBIN',
      'NIFTY REALTY': 'DLF',
      'NIFTY MEDIA': 'ZEEL',
      'NIFTY INFRA': 'LARTENT',
      'NIFTY CONSUMPTION': 'TITAN',
      'NIFTY OIL & GAS': 'RELIANCE',
      'NIFTY HEALTHCARE': 'APOLLOHOSP'
    };

    const momentumOptions: MockSectorData['momentum'][] = ['ACCELERATING', 'DECELERATING', 'STABLE', 'EXHAUSTED'];
    const momentum = momentumOptions[Math.floor(Math.random() * momentumOptions.length)];

    return {
      name,
      price: name === 'NIFTY BANK' ? 49200 : name === 'NIFTY IT' ? 34500 : 15400,
      changePercent,
      momentum,
      bias: changePercent > 0.4 ? 'BULLISH' as const : changePercent < -0.4 ? 'BEARISH' as const : 'NEUTRAL' as const,
      leadingStock: leadingStocks[name] || 'RELIANCE'
    };
  });

  // Sort sectors by percentage change descending (strongest first)
  sectors.sort((a, b) => b.changePercent - a.changePercent);

  // 6. Generate 50 Stock futures details
  const stocks: MockStockData[] = NIFTY_50_STOCKS.map((stock) => {
    // Sector reference
    const sec = sectors.find(s => s.name === stock.sector) || sectors[0];
    const baseChange = sec.changePercent;
    
    // Stock change is sector change + a random delta
    const stockChangePercent = Math.round((baseChange + (Math.random() - 0.5) * 1.2) * 100) / 100;
    const baseStockPrice = stock.symbol === 'RELIANCE' ? 2450 : stock.symbol === 'TCS' ? 3850 : stock.symbol === 'HDFCBANK' ? 1520 : 650;
    const close = baseStockPrice * (1 + stockChangePercent / 100);
    const open = baseStockPrice;
    
    let high = Math.max(open, close) + Math.random() * (baseStockPrice * 0.01);
    let low = Math.min(open, close) - Math.random() * (baseStockPrice * 0.01);

    const volume = Math.round(500000 + Math.random() * 4500000);
    const vwap = (open + high + low + close) / 4;

    // Futures Open Interest
    const oi = Math.round(5000000 + Math.random() * 20000000);
    // Let's generate a buildup type
    const oiChangePercent = Math.round((Math.random() - 0.45) * 18 * 100) / 100;
    
    let buildup: MockStockData['buildup'] = 'LONG_BUILDUP';
    if (stockChangePercent >= 0 && oiChangePercent >= 0) buildup = 'LONG_BUILDUP';
    else if (stockChangePercent < 0 && oiChangePercent >= 0) buildup = 'SHORT_BUILDUP';
    else if (stockChangePercent < 0 && oiChangePercent < 0) buildup = 'LONG_UNWINDING';
    else buildup = 'SHORT_COVERING';

    // Relative strength is stock change minus index change
    const indexChange = (currentPrice - candles[0].open) / candles[0].open * 100;
    const relativeStrength = Math.round((stockChangePercent - indexChange) * 100) / 100;

    // ORB Status
    const orbRand = Math.random();
    const orbStatus = orbRand > 0.85 ? 'BULLISH_BREAKOUT' as const : orbRand < 0.15 ? 'BEARISH_BREAKOUT' as const : 'INSIDE_RANGE' as const;

    return {
      symbol: stock.symbol,
      sector: stock.sector,
      price: Math.round(close * 10) / 10,
      changePercent: stockChangePercent,
      open: Math.round(open * 10) / 10,
      high: Math.round(high * 10) / 10,
      low: Math.round(low * 10) / 10,
      close: Math.round(close * 10) / 10,
      volume,
      vwap: Math.round(vwap * 10) / 10,
      oi,
      oiChangePercent,
      buildup,
      relativeStrength,
      orbStatus
    };
  });

  // Sort stocks by changePercent descending
  stocks.sort((a, b) => b.changePercent - a.changePercent);

  // 7. News headlines (NSE wire focus only)
  const newsItems = [
    {
      headline: 'HDFC Bank launches structural retail credit push; plans ₹5,000 Cr corporate loan book expansion',
      source: 'CNBC TV18',
      time: '14:25 IST',
      sentiment: 'BULLISH' as const,
      sentimentReason: 'Accelerates credit growth and margins',
      isHighImpact: false
    },
    {
      headline: 'NIFTY IT gains momentum as TCS leads major tech rotation, stock surges 3.4%',
      source: 'Bloomberg India',
      time: '13:10 IST',
      sentiment: 'BULLISH' as const,
      sentimentReason: 'Strong institutional sector rotation',
      isHighImpact: true
    },
    {
      headline: 'Automotive volumes slip in passenger vehicle segment; Maruti and Mahindra report flat growth',
      source: 'Financial Express',
      time: '11:45 IST',
      sentiment: 'BEARISH' as const,
      sentimentReason: 'Slow PV demand dampens earnings profile',
      isHighImpact: false
    },
    {
      headline: 'Adani Ports acquires new logistics gateway terminal on east coast; increases capacity by 12%',
      source: 'ET Markets',
      time: '09:40 IST',
      sentiment: 'BULLISH' as const,
      sentimentReason: 'Expands asset footprint & revenue margins',
      isHighImpact: false
    },
    {
      headline: 'RBI Governor indicates steady interest rate profile; inflation risks cap immediate cuts',
      source: 'RBI Press Bulletin',
      time: '08:15 IST',
      sentiment: 'NEUTRAL' as const,
      sentimentReason: 'Maintains balanced macro lending rates',
      isHighImpact: true
    }
  ];

  const overallNewsSentiment = 'BULLISH' as const;
  const highImpactEventToday = false;
  const nextHighImpactEvent = {
    name: 'RBI Monetary Policy Committee Review',
    date: '2026-06-08',
    daysAway: 11
  };

  const news = {
    items: newsItems,
    overallNewsSentiment,
    highImpactEventToday,
    nextHighImpactEvent
  };

  // 8. Regime
  let regime: MockDataResult['regime']['regime'] = 'TRENDING_UP';
  let bias: MockDataResult['regime']['bias'] = 'BULLISH';
  const explanation = isMarketUp 
    ? 'Index shows continuous higher highs on the 5M chart, supported by aggressive FII buying and Nifty IT rotation.'
    : 'Index consolidates below the opening range high, showing selling pressure near yesterday close thresholds.';

  if (Math.abs(currentPrice - candles[0].open) < 40) {
    regime = 'RANGING';
    bias = 'NEUTRAL';
  } else if (!isMarketUp) {
    regime = 'TRENDING_DOWN';
    bias = 'BEARISH';
  }

  // 9. Option Chain Mock Data
  const daysUntilThursday = (4 - now.getDay() + 7) % 7 || 7;
  const expiry = new Date(now.getTime() + daysUntilThursday * 24 * 60 * 60 * 1000);
  const expiryDateString = expiry.toISOString().split('T')[0];
  const atmStrike = Math.round(currentPrice / 50) * 50;

  const optionChain = {
    currentPrice: Math.round(currentPrice * 10) / 10,
    expiryDate: expiryDateString,
    pcr: Math.round((0.85 + Math.random() * 0.4) * 100) / 100, // PCR random walk around 1.0
    maxPain: Math.round(currentPrice / 100) * 100, // round to nearest 100
    ivPercentile: 35,
    callWalls: [
      { strike: atmStrike + 100, oi: 85000, oiChange: 15000, premium: 85.5 },
      { strike: atmStrike + 200, oi: 95000, oiChange: 25000, premium: 30.1 },
      { strike: atmStrike + 300, oi: 72000, oiChange: 12000, premium: 8.5 }
    ],
    putWalls: [
      { strike: atmStrike - 100, oi: 92000, oiChange: 18000, premium: 78.4 },
      { strike: atmStrike - 200, oi: 88000, oiChange: 22000, premium: 24.8 },
      { strike: atmStrike - 300, oi: 68000, oiChange: 8000, premium: 6.2 }
    ],
    atmStrike,
    atmIV: Math.round((13.0 + Math.random() * 2) * 100) / 100,
    sentiment: bias,
    daysToExpiry: daysUntilThursday
  };

  return {
    candles,
    giftNifty,
    institutional,
    vix,
    sectors,
    stocks,
    news,
    regime: {
      regime,
      bias,
      confidence: 78,
      explanation
    },
    optionChain
  };
}
