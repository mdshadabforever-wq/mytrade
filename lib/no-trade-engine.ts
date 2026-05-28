export interface NoTradeStatus {
  isNoTradeActive: boolean;
  blockReason: string;
  advisoryLevel: 'CAUTION' | 'STRICT_LOCK' | 'NORMAL';
  activeFilters: string[];
  explanation: string;
  recommendingAction: string;
}

export function detectNoTradeCondition(data: {
  vix: number;
  regimeType: 'TRENDING_UP' | 'TRENDING_DOWN' | 'RANGING' | 'CHOPPY';
  sectorDispersion: { strongestChange: number; weakestChange: number };
  fiiNetCash: number;
  diiNetCash: number;
  timeOfDayMinutes?: number; // Minutes from 09:15, e.g. 0 to 375
  totalIndexVolume?: number;
  averageVolume?: number;
}): NoTradeStatus {
  const activeFilters: string[] = [];
  let isNoTradeActive = false;
  let advisoryLevel: NoTradeStatus['advisoryLevel'] = 'NORMAL';
  let blockReason = 'Market conditions stable. Tactical participation approved.';
  let explanation = 'Unified institutional indicators show positive confluence. Key constituent weights are aligned with sector rotations.';
  let recommendingAction = 'Maintain standard position sizing. Scan for A+ breakouts near major 5M/15M order blocks.';

  // 1. High Volatility Lock (VIX > 18)
  if (data.vix > 18) {
    isNoTradeActive = true;
    advisoryLevel = data.vix > 22 ? 'STRICT_LOCK' : 'CAUTION';
    activeFilters.push('HIGH_VOLATILITY_LOCK');
    blockReason = 'India VIX Spikes — Reduced follow-through with elevated premium decay.';
  }

  // 2. Choppy or Ranging Index Regime
  if (data.regimeType === 'CHOPPY' || data.regimeType === 'RANGING') {
    isNoTradeActive = true;
    if (advisoryLevel !== 'STRICT_LOCK') advisoryLevel = 'CAUTION';
    activeFilters.push('INDEX_CONSOLIDATION_LOCK');
    if (blockReason.includes('stable')) {
      blockReason = 'Index Choppiness — Spot range-bound with high probability of breakout failure.';
    }
  }

  // 3. Mixed / Divergent Sector Rotation
  const sectorSpread = Math.abs(data.sectorDispersion.strongestChange - data.sectorDispersion.weakestChange);
  const isDivergentSectors = data.sectorDispersion.strongestChange > 0 && data.sectorDispersion.weakestChange < 0;
  if (isDivergentSectors && sectorSpread < 1.0) {
    isNoTradeActive = true;
    activeFilters.push('MIXED_SECTOR_DISPERSION');
    if (blockReason.includes('stable')) {
      blockReason = 'Divergent Sector Participation — Lacks institutional rotation support.';
    }
  }

  // 4. Weak / Flat Institutional Inflows
  const absoluteCombinedInflow = Math.abs(data.fiiNetCash + data.diiNetCash);
  const conflictingInstitutions = (data.fiiNetCash < 0 && data.diiNetCash > 0) || (data.fiiNetCash > 0 && data.diiNetCash < 0);
  if (absoluteCombinedInflow < 300 || (conflictingInstitutions && Math.abs(data.fiiNetCash) < 500)) {
    isNoTradeActive = true;
    activeFilters.push('WEAK_INSTITUTIONAL_VOLUME');
    if (blockReason.includes('stable')) {
      blockReason = 'Apathy in Institutional Blocks — Flat FII/DII cumulative cash balances.';
    }
  }

  // 5. High-Risk Buffer Windows (Opening and Closing)
  if (data.timeOfDayMinutes !== undefined) {
    const isOpeningBuffer = data.timeOfDayMinutes <= 15; // 09:15 - 09:30
    const isClosingBuffer = data.timeOfDayMinutes >= 360; // 15:15 - 15:30 (Market closes at 15:30, i.e. 375 mins)
    if (isOpeningBuffer) {
      isNoTradeActive = true;
      advisoryLevel = 'STRICT_LOCK';
      activeFilters.push('OPENING_BUFFER_LOCK');
      blockReason = 'Opening Bracket Risk — High spread volatility during initial order matching.';
    } else if (isClosingBuffer) {
      isNoTradeActive = true;
      advisoryLevel = 'STRICT_LOCK';
      activeFilters.push('CLOSING_LIQUIDITY_BUFFER');
      blockReason = 'Closing Liquidity Risk — Intraday position squarings trigger random fills.';
    }
  }

  // 6. Generate granular explanations
  if (isNoTradeActive) {
    const filtersList = activeFilters.join(' & ');
    explanation = `The system has triggered a strict **NO-TRADE ADVOCACY** due to ${filtersList}. Historical testing shows taking setups in these regimes yields a negative mathematical expectancy, leading to rapid capital drawdown.`;
    
    if (advisoryLevel === 'STRICT_LOCK') {
      recommendingAction = '❌ STRICT OVERRIDE: De-leverage completely. Cease scanning and close active positions. Preserve equity.';
    } else {
      recommendingAction = '⚠️ DEFENSIVE STANCE: Reduce typical risk per trade by 75%. Prioritize minor cash targets (scalping) or wait for a clear institutional block sweep.';
    }
  }

  return {
    isNoTradeActive,
    blockReason,
    advisoryLevel,
    activeFilters,
    explanation,
    recommendingAction
  };
}
