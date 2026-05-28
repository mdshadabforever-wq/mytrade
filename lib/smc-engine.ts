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

export function detectSMC(candles: Candle[], lookback: number = 2): SMCAnalysisResult {
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

  const swingHighs: { index: number; price: number; timestamp: number }[] = [];
  const swingLows: { index: number; price: number; timestamp: number }[] = [];

  // 1. Detect Swing Highs and Swing Lows
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

    const t = typeof candles[i].timestamp === 'string' 
      ? new Date(candles[i].timestamp).getTime() 
      : (candles[i].timestamp instanceof Date ? (candles[i].timestamp as Date).getTime() : candles[i].timestamp as number);

    if (isSwingHigh) {
      swingHighs.push({ index: i, price: currentHigh, timestamp: t });
    }
    if (isSwingLow) {
      swingLows.push({ index: i, price: currentLow, timestamp: t });
    }
  }

  // 2. Market Structure (BOS / CHOCH) and Order Blocks (OB)
  const orderBlocks: SMCOrderBlock[] = [];
  const signals: SMCSignal[] = [];
  let currentTrend: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';

  // We walk through candles from lookback onwards to dynamically trace BOS and CHOCH
  let lastSwingHigh = swingHighs.length > 0 ? swingHighs[0] : null;
  let lastSwingLow = swingLows.length > 0 ? swingLows[0] : null;

  for (let i = lookback + 1; i < n; i++) {
    const candle = candles[i];
    const prevCandle = candles[i - 1];
    const close = candle.close;
    const t = typeof candle.timestamp === 'string' 
      ? new Date(candle.timestamp).getTime() 
      : (candle.timestamp instanceof Date ? (candle.timestamp as Date).getTime() : candle.timestamp as number);

    // Update swing points if we reached their indexes
    const foundHigh = swingHighs.find(sh => sh.index === i - lookback);
    if (foundHigh) lastSwingHigh = foundHigh;

    const foundLow = swingLows.find(sl => sl.index === i - lookback);
    if (foundLow) lastSwingLow = foundLow;

    // BULLISH Breakout: Candle closes above the most recent Swing High
    if (lastSwingHigh && close > lastSwingHigh.price) {
      const type = currentTrend === 'BEARISH' ? 'CHOCH' : 'BOS';
      currentTrend = 'BULLISH';

      // Find Order Block: The last bearish candle before this breakout move
      // Walk backward to find the last candle where close < open
      let obIndex = -1;
      for (let k = i; k > lastSwingHigh.index; k--) {
        if (candles[k].close < candles[k].open) {
          obIndex = k;
          break;
        }
      }
      if (obIndex === -1 && lastSwingHigh.index > 0) {
        obIndex = lastSwingHigh.index - 1; // Fallback to swing high source
      }

      if (obIndex !== -1 && obIndex < i) {
        const obCandle = candles[obIndex];
        const expansionVolume = candles.slice(obIndex, i + 1).reduce((acc, c) => acc + c.volume, 0);
        const strength = Math.min(100, Math.round((candles[i].close - obCandle.low) / (obCandle.high - obCandle.low) * 15 + expansionVolume / 100000));

        const isDuplicate = orderBlocks.some(ob => ob.candleIndex === obIndex && ob.type === 'BULLISH');
        if (!isDuplicate) {
          orderBlocks.push({
            type: 'BULLISH',
            high: obCandle.high,
            low: obCandle.low,
            timestamp: typeof obCandle.timestamp === 'string' ? new Date(obCandle.timestamp).getTime() : (obCandle.timestamp instanceof Date ? obCandle.timestamp.getTime() : obCandle.timestamp as number),
            candleIndex: obIndex,
            isMitigated: false,
            strength
          });
        }
      }

      signals.push({
        type,
        zone: [lastSwingHigh.price, lastSwingHigh.price * 1.0005],
        strength: 85,
        timestamp: t,
        description: `Bullish ${type} via close above Swing High (${lastSwingHigh.price.toFixed(1)})`
      });

      // Clear last swing high to prevent duplicate breakout detection from the same swing point
      lastSwingHigh = null;
    }

    // BEARISH Breakout: Candle closes below the most recent Swing Low
    if (lastSwingLow && close < lastSwingLow.price) {
      const type = currentTrend === 'BULLISH' ? 'CHOCH' : 'BOS';
      currentTrend = 'BEARISH';

      // Find Bearish Order Block: Last bullish candle before this breakout move
      let obIndex = -1;
      for (let k = i; k > lastSwingLow.index; k--) {
        if (candles[k].close > candles[k].open) {
          obIndex = k;
          break;
        }
      }
      if (obIndex === -1 && lastSwingLow.index > 0) {
        obIndex = lastSwingLow.index - 1;
      }

      if (obIndex !== -1 && obIndex < i) {
        const obCandle = candles[obIndex];
        const expansionVolume = candles.slice(obIndex, i + 1).reduce((acc, c) => acc + c.volume, 0);
        const strength = Math.min(100, Math.round((obCandle.high - candles[i].close) / (obCandle.high - obCandle.low) * 15 + expansionVolume / 100000));

        const isDuplicate = orderBlocks.some(ob => ob.candleIndex === obIndex && ob.type === 'BEARISH');
        if (!isDuplicate) {
          orderBlocks.push({
            type: 'BEARISH',
            high: obCandle.high,
            low: obCandle.low,
            timestamp: typeof obCandle.timestamp === 'string' ? new Date(obCandle.timestamp).getTime() : (obCandle.timestamp instanceof Date ? obCandle.timestamp.getTime() : obCandle.timestamp as number),
            candleIndex: obIndex,
            isMitigated: false,
            strength
          });
        }
      }

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

  // 3. Fair Value Gaps (FVG)
  const fairValueGaps: SMCFairValueGap[] = [];
  for (let i = 1; i < n - 1; i++) {
    const prev = candles[i - 1];
    const curr = candles[i];
    const next = candles[i + 1];

    const t = typeof curr.timestamp === 'string' 
      ? new Date(curr.timestamp).getTime() 
      : (curr.timestamp instanceof Date ? curr.timestamp.getTime() : curr.timestamp as number);

    // Bullish FVG: Low of candle 3 is greater than High of candle 1
    if (next.low > prev.high) {
      // Gap range: prev.high to next.low
      fairValueGaps.push({
        type: 'BULLISH',
        top: next.low,
        bottom: prev.high,
        timestamp: t,
        candleIndex: i,
        isFilled: false,
        filledPercent: 0
      });
    }

    // Bearish FVG: High of candle 3 is less than Low of candle 1
    if (next.high < prev.low) {
      // Gap range: next.high to prev.low
      fairValueGaps.push({
        type: 'BEARISH',
        top: prev.low,
        bottom: next.high,
        timestamp: t,
        candleIndex: i,
        isFilled: false,
        filledPercent: 0
      });
    }
  }

  // 4. Trace mitigation and filling
  for (let i = 0; i < n; i++) {
    const candle = candles[i];
    const high = candle.high;
    const low = candle.low;
    const t = typeof candle.timestamp === 'string' 
      ? new Date(candle.timestamp).getTime() 
      : (candle.timestamp instanceof Date ? candle.timestamp.getTime() : candle.timestamp as number);

    // Order Block mitigation checks
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

    // FVG fill checks
    for (const fvg of fairValueGaps) {
      if (fvg.isFilled || i <= fvg.candleIndex + 1) continue;

      if (fvg.type === 'BULLISH') {
        // If price touches bottom of bullish FVG, it is completely filled
        if (low <= fvg.bottom) {
          fvg.isFilled = true;
          fvg.filledPercent = 100;
        } else if (low < fvg.top) {
          // Partially filled
          const totalWidth = fvg.top - fvg.bottom;
          const filledAmount = fvg.top - low;
          const pct = Math.min(100, Math.round((filledAmount / totalWidth) * 100));
          fvg.filledPercent = Math.max(fvg.filledPercent, pct);
          if (fvg.filledPercent >= 95) fvg.isFilled = true;
        }
      } else {
        // Bearish FVG
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

  // 5. Liquidity sweeps (BSL / SSL sweeps)
  // Check the last 15 candles for wick sweep of recently established swing points
  const sweeps: SMCSweep[] = [];
  const recentHighs = swingHighs.slice(-5);
  const recentLows = swingLows.slice(-5);

  for (let i = n - 15; i < n; i++) {
    if (i < 0) continue;
    const candle = candles[i];
    const high = candle.high;
    const low = candle.low;
    const close = candle.close;
    const open = candle.open;
    const t = typeof candle.timestamp === 'string' 
      ? new Date(candle.timestamp).getTime() 
      : (candle.timestamp instanceof Date ? candle.timestamp.getTime() : candle.timestamp as number);

    // BSL sweep: High penetrates recent swing high but close is below it
    for (const sh of recentHighs) {
      if (i > sh.index && high > sh.price && close < sh.price && open < sh.price) {
        sweeps.push({
          type: 'BSL',
          sweepPrice: high,
          targetPrice: sh.price,
          timestamp: t,
          strength: Math.round((high - Math.max(open, close)) / (high - low) * 100)
        });
        
        signals.push({
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
      if (i > sl.index && low < sl.price && close > sl.price && open > sl.price) {
        sweeps.push({
          type: 'SSL',
          sweepPrice: low,
          targetPrice: sl.price,
          timestamp: t,
          strength: Math.round((Math.min(open, close) - low) / (high - low) * 100)
        });

        signals.push({
          type: 'SSL_SWEEP',
          zone: [low, sl.price],
          strength: 75,
          timestamp: t,
          description: `Sell Side Liquidity Swept at ${sl.price.toFixed(1)} (wick sweep to ${low.toFixed(1)})`
        });
      }
    }
  }

  // 6. Premium vs Discount zones
  // Find highest high and lowest low of last 30 candles
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

  // Convert unmitigated OBs and unfilled FVGs to standard signals for rendering/alerts
  const activeUnmitigatedOBs = orderBlocks.filter(ob => !ob.isMitigated);
  const activeUnfilledFVGs = fairValueGaps.filter(fvg => !fvg.isFilled && fvg.filledPercent < 50);

  activeUnmitigatedOBs.forEach(ob => {
    signals.push({
      type: ob.type === 'BULLISH' ? 'BULLISH_OB' : 'BEARISH_OB',
      zone: [ob.low, ob.high],
      strength: ob.strength,
      timestamp: ob.timestamp,
      description: `${ob.type} Order Block zone identified: ${ob.low.toFixed(1)} - ${ob.high.toFixed(1)}`
    });
  });

  activeUnfilledFVGs.forEach(fvg => {
    signals.push({
      type: fvg.type === 'BULLISH' ? 'BULLISH_FVG' : 'BEARISH_FVG',
      zone: [fvg.bottom, fvg.top],
      strength: 60,
      timestamp: fvg.timestamp,
      description: `${fvg.type} Fair Value Gap detected: ${fvg.bottom.toFixed(1)} - ${fvg.top.toFixed(1)}`
    });
  });

  // Trend detection based on recent BOS / CHOCH direction
  const recentTrendSignals = signals.filter(s => s.type === 'BOS' || s.type === 'CHOCH').slice(-3);
  if (recentTrendSignals.length > 0) {
    const lastSig = recentTrendSignals[recentTrendSignals.length - 1];
    currentTrend = lastSig.description.includes('Bullish') ? 'BULLISH' : 'BEARISH';
  }

  // Deduplicate and sort signals by timestamp desc
  const uniqueSignals = signals.filter((sig, index, self) => 
    index === self.findIndex(s => s.type === sig.type && s.timestamp === sig.timestamp && s.zone[0] === sig.zone[0])
  ).sort((a, b) => b.timestamp - a.timestamp);

  return {
    trend: currentTrend,
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
