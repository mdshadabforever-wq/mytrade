export interface Candle {
  timestamp: Date | string | number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface SMCOrderBlock {
  type: 'BULLISH' | 'BEARISH';
  high: number;
  low: number;
  timestamp: number;
  candleIndex: number;
  isMitigated: boolean;
  mitigatedByTimestamp?: number;
  strength: number; // Based on the volume/magnitude of the expansion
}

export interface SMCFairValueGap {
  type: 'BULLISH' | 'BEARISH';
  top: number;
  bottom: number;
  timestamp: number;
  candleIndex: number;
  isFilled: boolean;
  filledPercent: number; // 0 to 100
}

export interface SMCSweep {
  type: 'BSL' | 'SSL'; // Buy Side Liquidity, Sell Side Liquidity
  sweepPrice: number;
  targetPrice: number; // The swing level swept
  timestamp: number;
  strength: number;
}

export interface SMCSignal {
  type: 'BOS' | 'CHOCH' | 'BULLISH_OB' | 'BEARISH_OB' | 'BULLISH_FVG' | 'BEARISH_FVG' | 'BSL_SWEEP' | 'SSL_SWEEP';
  zone: [number, number]; // [lowerBound, upperBound]
  strength: number; // 0 to 100
  timestamp: number;
  description: string;
}

export interface SMCAnalysisResult {
  trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  swingHighs: { index: number; price: number; timestamp: number }[];
  swingLows: { index: number; price: number; timestamp: number }[];
  orderBlocks: SMCOrderBlock[];
  fairValueGaps: SMCFairValueGap[];
  sweeps: SMCSweep[];
  signals: SMCSignal[];
  premiumDiscount: {
    high: number;
    low: number;
    equilibrium: number;
    currentZone: 'PREMIUM' | 'DISCOUNT' | 'EQUILIBRIUM';
    discountPercent: number; // 0 to 100 (100% being deep discount)
  };
}

function getTimestamp(candle: Candle): number {
  if (!candle || !candle.timestamp) return Date.now();
  return typeof candle.timestamp === 'string'
    ? new Date(candle.timestamp).getTime()
    : (candle.timestamp instanceof Date ? candle.timestamp.getTime() : candle.timestamp as number);
}

/**
 * 1. STANDALONE DETECTOR: detectOrderBlocks
 */
export function detectOrderBlocks(candles: Candle[]): SMCOrderBlock[] {
  console.log(`[SMC DEBUG] detectOrderBlocks received ${candles?.length || 0} candles.`);
  const orderBlocks: SMCOrderBlock[] = [];
  const n = candles.length;
  if (n < 10) return orderBlocks;

  // Scan through candles to detect impulsive breakouts and set their base as Order Blocks
  for (let i = 2; i < n; i++) {
    const bodySize = Math.abs(candles[i].close - candles[i].open);
    const prevBodySize = Math.abs(candles[i - 1].close - candles[i - 1].open);

    // Reduced expansion threshold to 2x for MOCK data compatibility (as requested)
    const isImpulsiveBullish = candles[i].close > candles[i].open && bodySize >= 2 * prevBodySize && bodySize >= 3;
    const isImpulsiveBearish = candles[i].close < candles[i].open && bodySize >= 2 * prevBodySize && bodySize >= 3;

    if (isImpulsiveBullish) {
      let obIndex = i - 1;
      if (candles[obIndex].close < candles[obIndex].open) {
        const obCandle = candles[obIndex];
        const isDuplicate = orderBlocks.some(ob => ob.candleIndex === obIndex && ob.type === 'BULLISH');
        if (!isDuplicate) {
          orderBlocks.push({
            type: 'BULLISH',
            high: obCandle.high,
            low: obCandle.low,
            timestamp: getTimestamp(obCandle),
            candleIndex: obIndex,
            isMitigated: false,
            strength: 85
          });
        }
      }
    }

    if (isImpulsiveBearish) {
      let obIndex = i - 1;
      if (candles[obIndex].close > candles[obIndex].open) {
        const obCandle = candles[obIndex];
        const isDuplicate = orderBlocks.some(ob => ob.candleIndex === obIndex && ob.type === 'BEARISH');
        if (!isDuplicate) {
          orderBlocks.push({
            type: 'BEARISH',
            high: obCandle.high,
            low: obCandle.low,
            timestamp: getTimestamp(obCandle),
            candleIndex: obIndex,
            isMitigated: false,
            strength: 85
          });
        }
      }
    }
  }

  // Trace Order Block mitigation checks across subsequent price actions
  for (let i = 0; i < n; i++) {
    const low = candles[i].low;
    const high = candles[i].high;
    const t = getTimestamp(candles[i]);
    for (const ob of orderBlocks) {
      if (ob.isMitigated || i <= ob.candleIndex) continue;
      if (ob.type === 'BULLISH' && low <= ob.high) {
        ob.isMitigated = true;
        ob.mitigatedByTimestamp = t;
      } else if (ob.type === 'BEARISH' && high >= ob.low) {
        ob.isMitigated = true;
        ob.mitigatedByTimestamp = t;
      }
    }
  }

  return orderBlocks;
}

/**
 * 2. STANDALONE DETECTOR: detectFVG
 */
export function detectFVG(candles: Candle[]): SMCFairValueGap[] {
  const fairValueGaps: SMCFairValueGap[] = [];
  const n = candles.length;
  if (n < 10) return fairValueGaps;

  // Scan 3-candle structures for price imbalance gaps (minimum 3 points for MOCK)
  for (let i = 0; i < n - 2; i++) {
    const prev = candles[i];
    const curr = candles[i + 1];
    const next = candles[i + 2];
    const t = getTimestamp(curr);

    // Bullish FVG check: low of candle 3 is greater than high of candle 1 by at least 3 points
    if (next.low - prev.high >= 3) {
      fairValueGaps.push({
        type: 'BULLISH',
        top: next.low,
        bottom: prev.high,
        timestamp: t,
        candleIndex: i + 1,
        isFilled: false,
        filledPercent: 0
      });
    }

    // Bearish FVG check: high of candle 3 is less than low of candle 1 by at least 3 points
    if (prev.low - next.high >= 3) {
      fairValueGaps.push({
        type: 'BEARISH',
        top: prev.low,
        bottom: next.high,
        timestamp: t,
        candleIndex: i + 1,
        isFilled: false,
        filledPercent: 0
      });
    }
  }

  // Trace FVG fill checks
  for (let i = 0; i < n; i++) {
    const low = candles[i].low;
    const high = candles[i].high;
    for (const fvg of fairValueGaps) {
      if (fvg.isFilled || i <= fvg.candleIndex + 1) continue;
      if (fvg.type === 'BULLISH') {
        if (low <= fvg.bottom) {
          fvg.isFilled = true;
          fvg.filledPercent = 100;
        } else if (low < fvg.top) {
          const totalWidth = fvg.top - fvg.bottom;
          const filledAmount = fvg.top - low;
          const pct = Math.min(100, Math.round((filledAmount / totalWidth) * 100));
          fvg.filledPercent = Math.max(fvg.filledPercent, pct);
          if (fvg.filledPercent >= 95) fvg.isFilled = true;
        }
      } else {
        if (high >= fvg.top) {
          fvg.isFilled = true;
          fvg.filledPercent = 100;
        } else if (high > fvg.bottom) {
          const totalWidth = fvg.top - fvg.bottom;
          const filledAmount = high - fvg.bottom;
          const pct = Math.min(100, Math.round((filledAmount / totalWidth) * 100));
          fvg.filledPercent = Math.max(fvg.filledPercent, pct);
          if (fvg.filledPercent >= 95) fvg.isFilled = true;
        }
      }
    }
  }

  return fairValueGaps;
}

/**
 * 3. STANDALONE DETECTOR: detectBOSandCHOCH
 */
export function detectBOSandCHOCH(
  candles: Candle[],
  lookback: number = 3
): {
  signals: SMCSignal[];
  trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  swingHighs: { index: number; price: number; timestamp: number }[];
  swingLows: { index: number; price: number; timestamp: number }[];
} {
  const n = candles.length;
  const signals: SMCSignal[] = [];
  let trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
  const swingHighs: { index: number; price: number; timestamp: number }[] = [];
  const swingLows: { index: number; price: number; timestamp: number }[] = [];

  if (n < 10) return { signals, trend, swingHighs, swingLows };

  // Detect Swing Highs and Swing Lows with lookback of 3 candles each side
  for (let i = lookback; i < n - lookback; i++) {
    const currentHigh = candles[i].high;
    const currentLow = candles[i].low;

    let isSwingHigh = true;
    let isSwingLow = true;

    for (let j = 1; j <= lookback; j++) {
      if (candles[i - j].high >= currentHigh || candles[i + j].high > currentHigh) {
        isSwingHigh = false;
      }
      if (candles[i - j].low <= currentLow || candles[i + j].low < currentLow) {
        isSwingLow = false;
      }
    }

    const t = getTimestamp(candles[i]);

    if (isSwingHigh) swingHighs.push({ index: i, price: currentHigh, timestamp: t });
    if (isSwingLow) swingLows.push({ index: i, price: currentLow, timestamp: t });
  }

  // Check if swing arrays have enough points (need 4+ swings combined, otherwise fall back to lookback 2)
  if (swingHighs.length + swingLows.length < 4) {
    swingHighs.length = 0;
    swingLows.length = 0;
    const altLookback = 2;
    for (let i = altLookback; i < n - altLookback; i++) {
      const currentHigh = candles[i].high;
      const currentLow = candles[i].low;
      let isSwingHigh = true;
      let isSwingLow = true;
      for (let j = 1; j <= altLookback; j++) {
        if (candles[i - j].high >= currentHigh || candles[i + j].high > currentHigh) isSwingHigh = false;
        if (candles[i - j].low <= currentLow || candles[i + j].low < currentLow) isSwingLow = false;
      }
      const t = getTimestamp(candles[i]);
      if (isSwingHigh) swingHighs.push({ index: i, price: currentHigh, timestamp: t });
      if (isSwingLow) swingLows.push({ index: i, price: currentLow, timestamp: t });
    }
  }

  // Trace BOS and CHOCH breakouts
  let lastSwingHigh = swingHighs.length > 0 ? swingHighs[0] : null;
  let lastSwingLow = swingLows.length > 0 ? swingLows[0] : null;

  for (let i = 2; i < n; i++) {
    const close = candles[i].close;
    const t = getTimestamp(candles[i]);

    const foundHigh = swingHighs.find(sh => sh.index === i - 2);
    if (foundHigh) lastSwingHigh = foundHigh;

    const foundLow = swingLows.find(sl => sl.index === i - 2);
    if (foundLow) lastSwingLow = foundLow;

    if (lastSwingHigh && close > lastSwingHigh.price) {
      const type = trend === 'BEARISH' ? 'CHOCH' : 'BOS';
      trend = 'BULLISH';
      signals.push({
        type,
        zone: [lastSwingHigh.price, lastSwingHigh.price * 1.0005],
        strength: 85,
        timestamp: t,
        description: `Bullish ${type} via close above Swing High (${lastSwingHigh.price.toFixed(1)})`
      });
      lastSwingHigh = null;
    }

    if (lastSwingLow && close < lastSwingLow.price) {
      const type = trend === 'BULLISH' ? 'CHOCH' : 'BOS';
      trend = 'BEARISH';
      signals.push({
        type,
        zone: [lastSwingLow.price * 0.9995, lastSwingLow.price],
        strength: 85,
        timestamp: t,
        description: `Bearish ${type} via close below Swing Low (${lastSwingLow.price.toFixed(1)})`
      });
      lastSwingLow = null;
    }
  }

  return { signals, trend, swingHighs, swingLows };
}

/**
 * Main Scopes Orchestrator: detectSMC
 */
export function detectSMC(candles: Candle[], lookback: number = 2): SMCAnalysisResult {
  if (!candles || !Array.isArray(candles)) {
    return {
      trend: 'NEUTRAL',
      swingHighs: [],
      swingLows: [],
      orderBlocks: [],
      fairValueGaps: [],
      sweeps: [],
      signals: [],
      premiumDiscount: { high: 0, low: 0, equilibrium: 0, currentZone: 'EQUILIBRIUM', discountPercent: 50 }
    };
  }

  const n = candles.length;
  if (n < 10) {
    return {
      trend: 'NEUTRAL',
      swingHighs: [],
      swingLows: [],
      orderBlocks: [],
      fairValueGaps: [],
      sweeps: [],
      signals: [],
      premiumDiscount: { high: 0, low: 0, equilibrium: 0, currentZone: 'EQUILIBRIUM', discountPercent: 50 }
    };
  }

  // 1. Run standalone modular detections
  const orderBlocks = detectOrderBlocks(candles);
  const fairValueGaps = detectFVG(candles);
  const { signals: structSignals, trend, swingHighs, swingLows } = detectBOSandCHOCH(candles, 3);

  // 2. Liquidity sweeps (BSL / SSL sweeps) using the tracked swing highs and lows
  const sweeps: SMCSweep[] = [];
  const recentHighs = swingHighs.slice(-5);
  const recentLows = swingLows.slice(-5);
  const sweptHighs = new Set<number>();
  const sweptLows = new Set<number>();
  const sweepSignals: SMCSignal[] = [];

  for (let i = n - 15; i < n; i++) {
    if (i < 0) continue;
    const candle = candles[i];
    const high = candle.high;
    const low = candle.low;
    const close = candle.close;
    const open = candle.open;
    const t = getTimestamp(candle);

    // BSL sweep: High penetrates recent swing high but close is below it
    for (const sh of recentHighs) {
      if (sweptHighs.has(sh.index)) continue;
      if (i > sh.index && high > sh.price && close < sh.price && open < sh.price) {
        sweptHighs.add(sh.index);
        sweeps.push({
          type: 'BSL',
          sweepPrice: high,
          targetPrice: sh.price,
          timestamp: t,
          strength: Math.round((high - Math.max(open, close)) / (high - low) * 100)
        });
        
        sweepSignals.push({
          type: 'BSL_SWEEP',
          zone: [sh.price, high],
          strength: 75,
          timestamp: t,
          description: `Buy Side Liquidity Swept at ${sh.price.toFixed(1)} (wick sweep to ${high.toFixed(1)})`
        });
      }
    }

    // SSL sweep: Low penetrates recent swing low but close is above it
    for (const sl of recentLows) {
      if (sweptLows.has(sl.index)) continue;
      if (i > sl.index && low < sl.price && close > sl.price && open > sl.price) {
        sweptLows.add(sl.index);
        sweeps.push({
          type: 'SSL',
          sweepPrice: low,
          targetPrice: sl.price,
          timestamp: t,
          strength: Math.round((Math.min(open, close) - low) / (high - low) * 100)
        });

        sweepSignals.push({
          type: 'SSL_SWEEP',
          zone: [low, sl.price],
          strength: 75,
          timestamp: t,
          description: `Sell Side Liquidity Swept at ${sl.price.toFixed(1)} (wick sweep to ${low.toFixed(1)})`
        });
      }
    }
  }

  // 3. Premium vs Discount zones
  let rangeHigh = -Infinity;
  let rangeLow = Infinity;
  const rangeLookback = Math.min(30, n);
  for (let i = n - rangeLookback; i < n; i++) {
    if (candles[i].high > rangeHigh) rangeHigh = candles[i].high;
    if (candles[i].low < rangeLow) rangeLow = candles[i].low;
  }

  const equilibrium = (rangeHigh + rangeLow) / 2;
  const currentPrice = candles[n - 1].close;
  let currentZone: 'PREMIUM' | 'DISCOUNT' | 'EQUILIBRIUM' = 'EQUILIBRIUM';
  
  if (currentPrice > equilibrium + (rangeHigh - rangeLow) * 0.02) {
    currentZone = 'PREMIUM';
  } else if (currentPrice < equilibrium - (rangeHigh - rangeLow) * 0.02) {
    currentZone = 'DISCOUNT';
  }

  const discountPercent = Math.min(100, Math.max(0, Math.round(((rangeHigh - currentPrice) / (rangeHigh - rangeLow)) * 100)));

  // Combine all signals together
  const allSignals: SMCSignal[] = [];

  // Add structural signals (BOS/CHOCH)
  structSignals.forEach(s => allSignals.push(s));

  // Add sweep signals
  sweepSignals.forEach(s => allSignals.push(s));

  // Convert unmitigated OBs and unfilled FVGs to standard signals for rendering
  const activeUnmitigatedOBs = orderBlocks.filter(ob => !ob.isMitigated);
  const activeUnfilledFVGs = fairValueGaps.filter(fvg => !fvg.isFilled && fvg.filledPercent < 50);

  activeUnmitigatedOBs.forEach(ob => {
    allSignals.push({
      type: ob.type === 'BULLISH' ? 'BULLISH_OB' : 'BEARISH_OB',
      zone: [ob.low, ob.high],
      strength: ob.strength,
      timestamp: ob.timestamp,
      description: `${ob.type} Order Block zone identified: ${ob.low.toFixed(1)} - ${ob.high.toFixed(1)}`
    });
  });

  activeUnfilledFVGs.forEach(fvg => {
    allSignals.push({
      type: fvg.type === 'BULLISH' ? 'BULLISH_FVG' : 'BEARISH_FVG',
      zone: [fvg.bottom, fvg.top],
      strength: 60,
      timestamp: fvg.timestamp,
      description: `${fvg.type} Fair Value Gap detected: ${fvg.bottom.toFixed(1)} - ${fvg.top.toFixed(1)}`
    });
  });

  // Deduplicate and sort signals by timestamp desc
  const uniqueSignals = allSignals.filter((sig, index, self) => 
    index === self.findIndex(s => s.type === sig.type && s.timestamp === sig.timestamp && s.zone[0] === sig.zone[0])
  ).sort((a, b) => b.timestamp - a.timestamp);

  return {
    trend,
    swingHighs,
    swingLows,
    orderBlocks,
    fairValueGaps,
    sweeps,
    signals: uniqueSignals,
    premiumDiscount: {
      high: rangeHigh,
      low: rangeLow,
      equilibrium,
      currentZone,
      discountPercent
    }
  };
}
