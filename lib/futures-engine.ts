export type BuildupType = 'LONG_BUILDUP' | 'SHORT_BUILDUP' | 'LONG_UNWINDING' | 'SHORT_COVERING';

export interface FuturesBuildupInfo {
  buildup: BuildupType;
  description: string;
  bias: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  color: string; // Tailwind color class
}

/**
 * Classifies the futures open interest and price buildup type
 * @param priceChangePercent Percentage price change
 * @param oiChangePercent Percentage OI change
 * @param volumeChangePercent Percentage Volume change (optional)
 */
export function classifyBuildup(
  priceChangePercent: number,
  oiChangePercent: number
): FuturesBuildupInfo {
  // Thresholds: minor changes are neutral
  const priceThreshold = 0.05;
  const oiThreshold = 0.1;

  if (Math.abs(priceChangePercent) < priceThreshold && Math.abs(oiChangePercent) < oiThreshold) {
    return {
      buildup: 'LONG_BUILDUP', // default placeholder
      description: 'Neutral / No Buildup',
      bias: 'NEUTRAL',
      color: 'text-[#8892a4]'
    };
  }

  // 1. Long Buildup: Price UP, OI UP (Aggressive long additions)
  if (priceChangePercent >= 0 && oiChangePercent >= 0) {
    return {
      buildup: 'LONG_BUILDUP',
      description: 'Long Buildup (Aggressive Buying)',
      bias: 'BULLISH',
      color: 'text-[#00e5a0]'
    };
  }

  // 2. Short Buildup: Price DOWN, OI UP (Aggressive short additions)
  if (priceChangePercent < 0 && oiChangePercent >= 0) {
    return {
      buildup: 'SHORT_BUILDUP',
      description: 'Short Buildup (Aggressive Selling)',
      bias: 'BEARISH',
      color: 'text-[#ff3a3a]'
    };
  }

  // 3. Long Unwinding: Price DOWN, OI DOWN (Longs closing out)
  if (priceChangePercent < 0 && oiChangePercent < 0) {
    return {
      buildup: 'LONG_UNWINDING',
      description: 'Long Unwinding (Long Profit Booking)',
      bias: 'BEARISH',
      color: 'text-[#ff9f00]'
    };
  }

  // 4. Short Covering: Price UP, OI DOWN (Shorts forced to cover)
  return {
    buildup: 'SHORT_COVERING',
    description: 'Short Covering (Shorts Liquidating)',
    bias: 'BULLISH',
    color: 'text-cyan-400'
  };
}

/**
 * Evaluates institutional futures participation intensity based on volume spikes
 */
export function getInstitutionalParticipation(
  volume: number,
  avgVolume: number
): 'HIGH' | 'MEDIUM' | 'LOW' {
  if (volume > avgVolume * 2.0) return 'HIGH';
  if (volume > avgVolume * 1.2) return 'MEDIUM';
  return 'LOW';
}
