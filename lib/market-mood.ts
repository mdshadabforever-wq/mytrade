export interface MarketMoodResult {
  score: number; // 0-100
  label: 'EXTREME_FEAR' | 'FEAR' | 'GREED' | 'EXTREME_GREED';
  color: string; // hex or tailwind class
  contributions: {
    vix: number;
    fii: number;
    pcr: number;
    news: number;
    maxPain: number;
  };
}

export function calculateMarketMood(data: {
  vix: number;
  fiiNetCash: number; // ₹ Crores
  pcr: number;
  newsSentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL' | 'MIXED';
  currentPrice: number;
  maxPain: number;
}): MarketMoodResult {
  // 1. VIX Contribution (inverted, Max 25)
  let vixContrib = 0;
  if (data.vix < 13) {
    vixContrib = 25;
  } else if (data.vix >= 13 && data.vix <= 20) {
    vixContrib = 18;
  } else if (data.vix > 20 && data.vix <= 30) {
    vixContrib = 8;
  } else {
    vixContrib = 0;
  }

  // 2. FII Flows (Max 25)
  let fiiContrib = 0;
  if (data.fiiNetCash > 1000) {
    fiiContrib = 25;
  } else if (data.fiiNetCash > 0 && data.fiiNetCash <= 1000) {
    fiiContrib = 15;
  } else if (data.fiiNetCash >= -1000 && data.fiiNetCash <= 0) {
    fiiContrib = 8;
  } else {
    fiiContrib = 0;
  }

  // 3. PCR (Max 25)
  let pcrContrib = 0;
  if (data.pcr > 1.2) {
    pcrContrib = 25;
  } else if (data.pcr >= 1.0 && data.pcr <= 1.2) {
    pcrContrib = 18;
  } else if (data.pcr >= 0.8 && data.pcr < 1.0) {
    pcrContrib = 12;
  } else {
    pcrContrib = 0;
  }

  // 4. News Sentiment (Max 15)
  let newsContrib = 0;
  if (data.newsSentiment === 'BULLISH') {
    newsContrib = 15;
  } else if (data.newsSentiment === 'NEUTRAL' || data.newsSentiment === 'MIXED') {
    newsContrib = 8;
  } else {
    newsContrib = 0;
  }

  // 5. Price vs Max Pain (Max 10)
  let maxPainContrib = 0;
  const diff = data.currentPrice - data.maxPain;
  if (diff > 50) {
    maxPainContrib = 10;
  } else if (Math.abs(diff) <= 50) {
    maxPainContrib = 5;
  } else {
    maxPainContrib = 0;
  }

  const score = vixContrib + fiiContrib + pcrContrib + newsContrib + maxPainContrib;

  let label: 'EXTREME_FEAR' | 'FEAR' | 'GREED' | 'EXTREME_GREED' = 'FEAR';
  let color = '#ff3a3a'; // red

  if (score >= 71) {
    label = 'EXTREME_GREED';
    color = '#00e5a0'; // green
  } else if (score >= 51) {
    label = 'GREED';
    color = '#f0a500'; // yellow/amber
  } else if (score >= 31) {
    label = 'FEAR';
    color = '#ff9f00'; // orange
  } else {
    label = 'EXTREME_FEAR';
    color = '#ff3a3a'; // red
  }

  return {
    score,
    label,
    color,
    contributions: {
      vix: vixContrib,
      fii: fiiContrib,
      pcr: pcrContrib,
      news: newsContrib,
      maxPain: maxPainContrib
    }
  };
}
