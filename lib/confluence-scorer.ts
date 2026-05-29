import { detectNoTradeCondition, NoTradeResult } from './no-trade-engine';

export interface LayerScore {
  score: number; // 0 to max weight
  signal: 'BULL' | 'BEAR' | 'NEUTRAL' | 'BLOCKED';
  reason: string;
}

export interface ConvictionResult {
  total: number; // 0-100
  grade: 'A+' | 'A' | 'B' | 'NO_TRADE';
  direction: 'BUY' | 'SELL' | 'WAIT';
  layers: {
    macro: LayerScore;
    institutional: LayerScore;
    options: LayerScore;
    structure: LayerScore;
    risk: LayerScore;
  };
  shouldAlert: boolean;
  noTradeReason: string | null;
  noTradeStatus?: NoTradeResult;
}

/**
 * 100% deterministic 5-layer confluence scorer. No AI is used here.
 */
export function calculateConfluence(data: {
  // Layer 1: Macro (GIFT Nifty, Global Indices) - Weight 20
  macro: {
    giftNiftyDirection: 'GAP_UP' | 'GAP_DOWN' | 'FLAT';
    giftNiftyGap: number;
    alignedIndicesCount: number; // count of global indices trending same direction
    globalBias: 'BULLISH' | 'BEARISH' | 'MIXED';
    isLiveData?: boolean;
  };
  // Layer 2: Institutional (FII/DII net flows) - Weight 25
  institutional: {
    fiiCash: number;
    diiCash: number;
    fiiDirection: 'BUYING' | 'SELLING' | 'NEUTRAL';
    diiDirection: 'BUYING' | 'SELLING' | 'NEUTRAL';
  };
  // Layer 3: Options Intelligence - Weight 25
  options: {
    pcr: number;
    vix: number;
    isPriceAboveMaxPain: boolean;
    isObSupporting: boolean;
    vixLive?: boolean;
  };
  // Layer 4: Structure (SMC Signals) - Weight 20
  structure: {
    hasChoch: boolean;
    hasBos: boolean;
    hasUnmitigatedOb: boolean;
    hasUnfilledFvg: boolean;
    hasLiquiditySweep: boolean;
  };
  // Layer 5: Risk & Volume (Overrides & Expiry Check) - Weight 10
  risk: {
    timeOfDayMinutes?: number;
    isHighImpactEventToday?: boolean;
    isHolidayTomorrow?: boolean;
    volumePercentOfAverage?: number;
    sectorDispersion: { strongestChange: number; weakestChange: number };
  };
  // Optional: Participant-wise F&O OI bonus/penalty
  participantOI?: {
    fii?: { direction: 'LONG' | 'SHORT' | 'NEUTRAL' };
    [key: string]: any;
  };
}): ConvictionResult {
  
  // 1. Evaluate Layer 5: Risk & Overrides (Deterministic No-Trade)
  const noTradeStatus = detectNoTradeCondition({
    vix: data.options.vix,
    regimeType: data.macro.globalBias === 'MIXED' ? 'CHOPPY' : 'TRENDING_UP',
    sectorDispersion: data.risk.sectorDispersion,
    fiiNetCash: data.institutional.fiiCash,
    diiNetCash: data.institutional.diiCash,
    timeOfDayMinutes: data.risk.timeOfDayMinutes,
    isHighImpactEventToday: data.risk.isHighImpactEventToday,
    isHolidayTomorrow: data.risk.isHolidayTomorrow,
    volumePercentOfAverage: data.risk.volumePercentOfAverage,
    globalIndicesLive: data.macro.isLiveData,
    vixLive: data.options.vixLive
  });

  const isBlocked = noTradeStatus.isNoTradeDay;

  // Layer 5 (Risk, weight 10 or block)
  let riskScore = 10;
  let riskSignal: LayerScore['signal'] = 'NEUTRAL';
  let riskReason = 'Risk parameters stable.';

  if (isBlocked) {
    riskScore = 0;
    riskSignal = 'BLOCKED';
    riskReason = noTradeStatus.reasons[0] || 'Strict capital safety block active.';
  } else if (data.options.vix > 20) {
    riskScore = 5;
    riskSignal = 'BEAR';
    riskReason = 'VIX elevated (20-25). Expect high intraday noise.';
  } else {
    riskSignal = 'BULL';
  }

  // Layer 1 (Macro, weight 20)
  let macroScore = 5;
  let macroSignal: LayerScore['signal'] = 'NEUTRAL';
  let macroReason = 'Mixed global macro triggers.';
  
  if (data.macro.isLiveData === false) {
    macroScore = 10;
    macroSignal = 'NEUTRAL';
    macroReason = 'Live data unavailable — macro layer neutralized';
  } else if (data.macro.alignedIndicesCount >= 3) {
    macroScore = 20;
    macroSignal = data.macro.globalBias === 'BULLISH' ? 'BULL' : 'BEAR';
    macroReason = `Strong global correlation: ${data.macro.alignedIndicesCount} indices aligned ${data.macro.globalBias}.`;
  } else if (data.macro.alignedIndicesCount === 2) {
    macroScore = 12;
    macroSignal = 'NEUTRAL';
    macroReason = 'Moderate global indices alignment.';
  }
  
  // Layer 2 (Institutional, weight 25)
  let instScore = 5;
  let instSignal: LayerScore['signal'] = 'NEUTRAL';
  let instReason = 'Mixed or flat institutional activity.';

  if (data.institutional.fiiDirection === 'BUYING' && data.institutional.diiDirection === 'BUYING') {
    instScore = 25;
    instSignal = 'BULL';
    instReason = 'FII + DII joint buying denotes active cash accumulation.';
  } else if (data.institutional.fiiDirection === 'SELLING' && data.institutional.diiDirection === 'SELLING') {
    instScore = 0;
    instSignal = 'BEAR';
    instReason = 'Joint FII + DII distribution. Heavy selling pressure.';
  } else if (data.institutional.fiiDirection === 'BUYING' || data.institutional.diiDirection === 'BUYING') {
    instScore = 15;
    instSignal = 'NEUTRAL';
    instReason = 'One-sided institutional support.';
  }

  // Participant OI bonus/penalty: FII F&O positioning adds ±5 to Layer 2, capped at 25
  if (data.participantOI?.fii?.direction === 'LONG') {
    instScore = Math.min(25, instScore + 5);
    instReason += ' FII F&O net long position reinforces bullish bias.';
  } else if (data.participantOI?.fii?.direction === 'SHORT') {
    instScore = Math.max(0, instScore - 5);
    instReason += ' FII F&O net short position adds bearish weight.';
  }

  // Layer 3 (Options, weight 25)
  let optScore = 5;
  let optSignal: LayerScore['signal'] = 'NEUTRAL';
  let optReason = 'Option metrics in neutral consolidation.';

  if (data.options.pcr > 1.0 && data.options.isPriceAboveMaxPain && data.options.isObSupporting) {
    optScore = 25;
    optSignal = 'BULL';
    optReason = 'High PCR (>1.0) and price above support floor walls.';
  } else if (data.options.pcr < 0.8 && data.options.vix > 18) {
    optScore = 5;
    optSignal = 'BEAR';
    optReason = 'Bearish PCR (<0.8) and rising VIX ceiling pressure.';
  } else if (data.options.pcr >= 0.8 && data.options.pcr <= 1.0) {
    optScore = 12;
    optSignal = 'NEUTRAL';
    optReason = 'PCR neutral, max pain magnetic gravity active.';
  }

  // Layer 4 (SMC Structure, weight 20)
  let structScore = 5;
  let structSignal: LayerScore['signal'] = 'NEUTRAL';
  let structReason = 'Chop structure. No validated order blocks.';

  if (data.structure.hasChoch && data.structure.hasUnmitigatedOb && data.structure.hasUnfilledFvg && data.structure.hasLiquiditySweep) {
    structScore = 20;
    structSignal = 'BULL';
    structReason = 'High conviction CHOCH, fresh OB, unfilled FVG, and liquidity sweeps.';
  } else if (data.structure.hasBos && data.structure.hasUnmitigatedOb) {
    structScore = 15;
    structSignal = 'BULL';
    structReason = 'BOS continuation break coupled with fresh unmitigated Order Blocks.';
  } else if (data.structure.hasUnmitigatedOb || data.structure.hasUnfilledFvg) {
    structScore = 8;
    structReason = 'Single OB or FVG detected. Standard momentum validation.';
  }

  // Final Total Confluence Math
  let total = isBlocked ? 0 : (macroScore + instScore + optScore + structScore + riskScore);

  // Grade Thresholds
  let grade: ConvictionResult['grade'] = 'NO_TRADE';
  if (isBlocked || total < 45) {
    grade = 'NO_TRADE';
  } else if (total >= 75) {
    grade = 'A+';
  } else if (total >= 60) {
    grade = 'A';
  } else {
    grade = 'B';
  }

  // Cap grade at B if both global indices and vix are down/mock
  if (data.macro.isLiveData === false && data.options.vixLive === false && grade !== 'NO_TRADE') {
    grade = 'B';
  }

  // Direction resolution
  let direction: ConvictionResult['direction'] = 'WAIT';
  if (grade !== 'NO_TRADE') {
    const bullLayerCount = [macroSignal, instSignal, optSignal, structSignal].filter(s => s === 'BULL').length;
    const bearLayerCount = [macroSignal, instSignal, optSignal, structSignal].filter(s => s === 'BEAR').length;
    if (bullLayerCount >= 2) direction = 'BUY';
    else if (bearLayerCount >= 2) direction = 'SELL';
  }

  const shouldAlert = (grade === 'A+' || grade === 'A') && !isBlocked;

  console.log('[CONFLUENCE DIAGNOSTICS] Layer Scores & Inputs:', {
    macro: { score: macroScore, signal: macroSignal, input: data.macro },
    institutional: { score: instScore, signal: instSignal, input: data.institutional },
    options: { score: optScore, signal: optSignal, input: data.options },
    structure: { score: structScore, signal: structSignal, input: data.structure },
    risk: { score: riskScore, signal: riskSignal, input: data.risk },
    total,
    grade,
    isBlocked
  });

  return {
    total,
    grade,
    direction,
    layers: {
      macro: { score: macroScore, signal: macroSignal, reason: macroReason },
      institutional: { score: instScore, signal: instSignal, reason: instReason },
      options: { score: optScore, signal: optSignal, reason: optReason },
      structure: { score: structScore, signal: structSignal, reason: structReason },
      risk: { score: riskScore, signal: riskSignal, reason: riskReason }
    },
    shouldAlert,
    noTradeReason: isBlocked ? riskReason : null,
    noTradeStatus
  };
}
