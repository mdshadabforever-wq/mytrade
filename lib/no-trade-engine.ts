export interface NoTradeResult {
  isNoTradeDay: boolean;
  confidence: 'HIGH' | 'MEDIUM';
  reasons: string[];
  resumeAfter: string | null;
}

/**
 * Checks all deterministic hard and soft block rules to safeguard capital.
 * 100% deterministic, never makes AI calls.
 */
export function detectNoTradeCondition(data: {
  vix: number;
  regimeType: 'TRENDING_UP' | 'TRENDING_DOWN' | 'RANGING' | 'CHOPPY';
  sectorDispersion: { strongestChange: number; weakestChange: number };
  fiiNetCash: number;
  diiNetCash: number;
  timeOfDayMinutes?: number; // Minutes from 09:15, e.g. 0 to 375
  isHighImpactEventToday?: boolean;
  isHolidayTomorrow?: boolean;
  volumePercentOfAverage?: number; // E.g., 50 for 50%
  globalIndicesLive?: boolean;
  vixLive?: boolean;
}): NoTradeResult {
  const reasons: string[] = [];
  let isNoTradeDay = false;
  let resumeAfter: string | null = null;

  // If outside active market hours, disable safety blocks so mock/replay scoring calculates correctly
  if (data.timeOfDayMinutes !== undefined && data.timeOfDayMinutes < 0) {
    return {
      isNoTradeDay: false,
      confidence: 'MEDIUM',
      reasons: [],
      resumeAfter: null
    };
  }

  // 1. HARD BLOCKS (Strict protection)
  
  // A. Extreme Volatility (VIX > 25)
  if (data.vix > 25) {
    isNoTradeDay = true;
    reasons.push('HIGH VIX VOLATILITY LOCK: India VIX above 25 makes premium sizing highly unsafe.');
  }

  // B. High Impact Event Today (RBI, Budget, Fed)
  if (data.isHighImpactEventToday) {
    isNoTradeDay = true;
    reasons.push('EVENT RISK LOCK: RBI Policy, Union Budget, or Fed Decision today. Cease trading.');
  }

  // C. Timing Bracket Buffer Windows
  if (data.timeOfDayMinutes !== undefined) {
    const isOpeningBuffer = data.timeOfDayMinutes >= 0 && data.timeOfDayMinutes <= 15; // 09:15 - 09:30
    const isClosingBuffer = data.timeOfDayMinutes >= 360 && data.timeOfDayMinutes <= 375; // 15:15 - 15:30
    
    if (isOpeningBuffer) {
      isNoTradeDay = true;
      reasons.push('OPENING VOLATILITY BUFFER: High spread risk matching during 09:15 - 09:30.');
      resumeAfter = '09:30 AM';
    } else if (isClosingBuffer) {
      isNoTradeDay = true;
      reasons.push('CLOSING LIQUIDITY BUFFER: Margin squaring volatility during 15:15 - 15:30.');
      resumeAfter = 'Tomorrow';
    }
  }

  // D. Holiday Tomorrow
  if (data.isHolidayTomorrow) {
    isNoTradeDay = true;
    reasons.push('HOLIDAY LIQUIDITY BUFFER: Holiday tomorrow triggers low liquidity and wide spreads today.');
  }

  // 2. SOFT BLOCKS (Triggers caution)
  
  // A. Weak FII/DII Joint Distribution
  if (data.fiiNetCash < 0 && data.diiNetCash < 0) {
    reasons.push('CAUTION: Both FII and DII are net cash market sellers today.');
  }

  // B. Global Index Distribution Panic
  if (data.volumePercentOfAverage !== undefined && data.volumePercentOfAverage < 60) {
    reasons.push('CAUTION: Session volume is below 60% of the 20-day historical average.');
  }

  // C. Range Bound / Contradicting Sectors
  const sectorSpread = Math.abs(data.sectorDispersion.strongestChange - data.sectorDispersion.weakestChange);
  const isDivergent = data.sectorDispersion.strongestChange > 0 && data.sectorDispersion.weakestChange < 0;
  if (isDivergent && sectorSpread < 1.0) {
    reasons.push('CAUTION: Mixed sector rotation indicates lack of clear institutional participation.');
  }

  // D. Global Feeds Down Soft Block
  if (data.globalIndicesLive === false && data.vixLive === false) {
    reasons.push('SOFT BLOCK: Market data feeds down');
  }

  // Resolve confidence level
  const confidence = reasons.filter(r => r.startsWith('HIGH') || r.startsWith('EVENT') || r.startsWith('OPENING') || r.startsWith('CLOSING')).length >= 2 
    ? 'HIGH' 
    : 'MEDIUM';

  return {
    isNoTradeDay: isNoTradeDay || reasons.length >= 3,
    confidence,
    reasons,
    resumeAfter
  };
}
