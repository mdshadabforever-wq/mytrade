import { detectNoTradeCondition, NoTradeStatus } from './no-trade-engine';

export interface AgentScore {
  score: number;
  bias: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  reason: string;
}

export interface ConfluenceResult {
  score: number; // 0-100
  grade: 'A_PLUS' | 'HIGH' | 'MODERATE' | 'LOW_QUALITY' | 'NO_TRADE';
  agents: {
    regime: AgentScore;
    sector: AgentScore;
    stock: AgentScore;
    futures: AgentScore;
    smc: AgentScore;
    risk: AgentScore;
  };
  direction: 'BUY' | 'SELL' | 'WAIT';
  shouldAlert: boolean;
  noTradeStatus?: NoTradeStatus;
}

/**
 * Evaluates the master confluence scores across the 6-Agent framework
 */
export function calculateConfluence(data: {
  // Agent 1: Regime
  regime: {
    type: 'TRENDING_UP' | 'TRENDING_DOWN' | 'RANGING' | 'CHOPPY';
    bias: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    confidence: number;
  };
  // Agent 2: Sector
  sector: {
    name: string;
    bias: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    momentum: 'ACCELERATING' | 'DECELERATING' | 'STABLE' | 'EXHAUSTED';
  };
  // Agent 3: Stock
  stock: {
    relativeStrength: number; // vs index
    orbStatus: 'BULLISH_BREAKOUT' | 'BEARISH_BREAKOUT' | 'INSIDE_RANGE';
  };
  // Agent 4: Futures
  futures: {
    buildup: 'LONG_BUILDUP' | 'SHORT_BUILDUP' | 'LONG_UNWINDING' | 'SHORT_COVERING';
    oiChangePercent: number;
  };
  // Agent 5: SMC
  smc: {
    hasChoch: boolean;
    hasBos: boolean;
    hasUnmitigatedOb: boolean;
    hasUnfilledFvg: boolean;
    trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  };
  // Agent 6: Risk
  risk: {
    isOpeningBuffer: boolean; // First 15 min
    isClosingBuffer: boolean; // Last 15 min
    isHighVolatility: boolean; // VIX > 25
    isChoppyIndex: boolean;
  };
  // Expanded optional institutional parameters for exact No-Trade detection
  institutional?: {
    fiiNetCash: number;
    diiNetCash: number;
  };
  vixValue?: number;
  sectorDispersion?: {
    strongestChange: number;
    weakestChange: number;
  };
  timeOfDayMinutes?: number;
}): ConfluenceResult {
  let score = 0;

  // 1. Resolve exact parameters for No-Trade detection
  const resolvedVix = data.vixValue ?? (data.risk.isHighVolatility ? 26 : 14.5);
  const resolvedFii = data.institutional?.fiiNetCash ?? 850;
  const resolvedDii = data.institutional?.diiNetCash ?? -200;
  const resolvedDispersion = data.sectorDispersion ?? { strongestChange: 1.2, weakestChange: -0.4 };

  const noTradeStatus = detectNoTradeCondition({
    vix: resolvedVix,
    regimeType: data.regime.type,
    sectorDispersion: resolvedDispersion,
    fiiNetCash: resolvedFii,
    diiNetCash: resolvedDii,
    timeOfDayMinutes: data.timeOfDayMinutes
  });

  // ==========================================
  // Agent 1: Market Regime (Max 15)
  // ==========================================
  let regimeScore = 5;
  let regimeReason = 'Index consolidates inside range limits.';
  if (data.regime.bias === 'BULLISH') {
    regimeScore = data.regime.type === 'TRENDING_UP' ? 15 : 10;
    regimeReason = 'Bullish trending regime confirmed on intraday charts.';
  } else if (data.regime.bias === 'BEARISH') {
    regimeScore = data.regime.type === 'TRENDING_DOWN' ? 15 : 10;
    regimeReason = 'Bearish breakdown structure dominates index regime.';
  }
  score += regimeScore;

  // ==========================================
  // Agent 2: Sector Rotation (Max 20)
  // ==========================================
  let sectorScore = 5;
  let sectorReason = 'Target sector is neutral or consolidating.';
  if (data.sector.bias === 'BULLISH') {
    sectorScore = data.sector.momentum === 'ACCELERATING' ? 20 : 15;
    sectorReason = `Sector ${data.sector.name} leads index rotation with accelerating momentum.`;
  } else if (data.sector.bias === 'BEARISH') {
    sectorScore = data.sector.momentum === 'ACCELERATING' ? 20 : 15;
    sectorReason = `Sector ${data.sector.name} under distribution pressure.`;
  }
  score += sectorScore;

  // ==========================================
  // Agent 3: Stock relative strength (Max 20)
  // ==========================================
  let stockScore = 5;
  let stockReason = 'Stock trades inside daily ranges.';
  const hasOrbBreakout = data.stock.orbStatus !== 'INSIDE_RANGE';
  
  if (data.stock.relativeStrength > 1.0) {
    stockScore = hasOrbBreakout ? 20 : 12;
    stockReason = `Stock outperforming Nifty (RS: ${data.stock.relativeStrength}%) with ORB breakout.`;
  } else if (data.stock.relativeStrength < -1.0) {
    stockScore = hasOrbBreakout ? 20 : 12;
    stockReason = `Stock underperforming index (RS: ${data.stock.relativeStrength}%) with breakdown.`;
  }
  score += stockScore;

  // ==========================================
  // Agent 4: Futures buildup (Max 20)
  // ==========================================
  let futuresScore = 5;
  let futuresReason = 'Neutral derivatives buildup.';
  
  if (data.futures.buildup === 'LONG_BUILDUP' && Math.abs(data.futures.oiChangePercent) > 2) {
    futuresScore = 20;
    futuresReason = 'Strong Long Buildup denotes aggressive institutional inflows.';
  } else if (data.futures.buildup === 'SHORT_BUILDUP' && Math.abs(data.futures.oiChangePercent) > 2) {
    futuresScore = 20;
    futuresReason = 'Strong Short Buildup denotes aggressive distribution hedging.';
  } else if (data.futures.buildup === 'SHORT_COVERING') {
    futuresScore = 12;
    futuresReason = 'Short covering triggers minor short-squeeze rally.';
  }
  score += futuresScore;

  // ==========================================
  // Agent 5: SMC structure (Max 15)
  // ==========================================
  let smcScore = 5;
  let smcReason = 'Index structure consolidates inside equilibrium.';
  if (data.smc.hasChoch && data.smc.hasUnmitigatedOb) {
    smcScore = 15;
    smcReason = 'CHOCH trend reversal coupled with fresh Order Block levels.';
  } else if (data.smc.hasBos) {
    smcScore = 10;
    smcReason = 'BOS structure break confirms trend expansion.';
  }
  score += smcScore;

  // ==========================================
  // Agent 6: Risk Engine (Max 10)
  // ==========================================
  let riskScore = 10;
  const riskWarnings: string[] = [];
  
  if (data.risk.isOpeningBuffer || data.risk.isClosingBuffer) {
    riskScore = 0;
    riskWarnings.push('⚠️ Buffer Window: Avoid trading in opening or closing 15 minutes.');
  }
  if (data.risk.isHighVolatility || resolvedVix > 18) {
    riskScore -= 5;
    riskWarnings.push('⚠️ VIX Spikes: High volatility regime; reduce position sizes by 50%.');
  }
  if (data.risk.isChoppyIndex) {
    riskScore -= 3;
    riskWarnings.push('⚠️ Choppy Index: Consolidations cap trend expectancy.');
  }
  
  score += Math.max(0, riskScore);

  // Apply absolute risk locks
  const isTradeBlocked = data.risk.isOpeningBuffer || data.risk.isClosingBuffer;
  if (isTradeBlocked) {
    score = 0;
  }

  // Force score lock if strict no-trade detection triggers
  if (noTradeStatus.isNoTradeActive) {
    score = Math.min(score, 30); // Force low confluence
  }

  // Determine conviction grade
  let grade: ConfluenceResult['grade'] = 'NO_TRADE';
  let direction: ConfluenceResult['direction'] = 'WAIT';

  if (score >= 86) {
    grade = 'A_PLUS';
  } else if (score >= 71) {
    grade = 'HIGH';
  } else if (score >= 51) {
    grade = 'MODERATE';
  } else if (score >= 31) {
    grade = 'LOW_QUALITY';
  } else {
    grade = 'NO_TRADE';
  }

  // Resolve direction based on biases
  const bullishCount = [data.regime.bias, data.sector.bias, data.smc.trend].filter(x => x === 'BULLISH').length;
  const bearishCount = [data.regime.bias, data.sector.bias, data.smc.trend].filter(x => x === 'BEARISH').length;

  if (bullishCount >= 2 && !isTradeBlocked && score >= 50 && !noTradeStatus.isNoTradeActive) {
    direction = 'BUY';
  } else if (bearishCount >= 2 && !isTradeBlocked && score >= 50 && !noTradeStatus.isNoTradeActive) {
    direction = 'SELL';
  }

  // Only Grade A+ and A should notify prominently (score >= 71)
  const shouldAlert = score >= 71 && !isTradeBlocked && !noTradeStatus.isNoTradeActive;

  return {
    score,
    grade,
    agents: {
      regime: { score: regimeScore, bias: data.regime.bias, reason: regimeReason },
      sector: { score: sectorScore, bias: data.sector.bias, reason: sectorReason },
      stock: { score: stockScore, bias: data.stock.relativeStrength >= 0 ? 'BULLISH' : 'BEARISH', reason: stockReason },
      futures: { score: futuresScore, bias: data.futures.buildup.includes('LONG') || data.futures.buildup === 'SHORT_COVERING' ? 'BULLISH' : 'BEARISH', reason: futuresReason },
      smc: { score: smcScore, bias: data.smc.trend, reason: smcReason },
      risk: { score: riskScore, bias: riskScore >= 7 ? 'BULLISH' : 'BEARISH', reason: riskWarnings.join(' | ') || 'Risk levels stable. Action approved.' }
    },
    direction,
    shouldAlert,
    noTradeStatus
  };
}
