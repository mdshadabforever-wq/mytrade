export interface PositionSizingResult {
  suggestedQty: number;
  capitalUsed: number;
  maxLoss: number;
  potentialProfit: number;
  riskPerShare: number;
  rrRatio: number;
  
  // Futures specific metrics
  lotSize: number;
  lotsSuggested: number;
  approxMarginRequired: number;
  totalMarginNeeded: number;
  isCapitalInsufficient: boolean;
}

const LOT_SIZES: { [key: string]: number } = {
  RELIANCE: 250,
  HDFCBANK: 550,
  ICICIBANK: 700,
  INFY: 400,
  TCS: 175,
  LT: 300,
  LARTENT: 300,
  ITC: 1600,
  SBIN: 1500,
  AXISBANK: 625,
  BHARTIARTL: 950,
  NIFTY: 25,
  BANKNIFTY: 15,
  FINNIFTY: 40,
  TATAMOTORS: 1425,
  BAJFINANCE: 125,
  MARUTI: 100,
  KOTAKBANK: 400,
  SUNPHARMA: 350,
  NTPC: 1500,
  TATASTEEL: 5500,
  POWERGRID: 1800,
  COALINDIA: 1800,
  ADANIPORTS: 400,
  ASIANPAINT: 200,
  TITAN: 175,
  ULTRACEMCO: 100,
  BAJAJFINSV: 500,
  WIPRO: 1500,
  ONGC: 3850,
  JSWSTEEL: 675,
  GRASIM: 475,
  ADANIENT: 300,
  HINDALCO: 1400,
  APOLLOHOSP: 125,
  TATACONSUM: 650,
  DIVISLAB: 150,
  EICHERMOT: 175,
  TECHM: 600,
  NESTLEIND: 400,
  INDUSINDBK: 500,
  CIPLA: 650,
  SBILIFE: 375,
  DRREDDY: 125,
  BRITANNIA: 200,
  BPCL: 1800,
  SHRIRAMFIN: 300,
  HEROMOTOCO: 150,
  JIOFIN: 2000,
  DLF: 1200
};

/**
 * Computes dynamic equity and futures position sizing based on available capital, exchange lot sizes, and margin requirements.
 */
export function calculatePositionSizing(
  entryPrice: number,
  stopLoss: number,
  targetPrice: number,
  capital: number = 50000,
  maxRiskPercent: number = 1.0,
  symbol: string = 'RELIANCE'
): PositionSizingResult {
  const resolvedCapital = capital > 0 ? capital : 50000;
  const resolvedRiskPercent = maxRiskPercent > 0 ? maxRiskPercent : 1.0;

  const riskPerShare = Math.abs(entryPrice - stopLoss);
  const maxRiskBudget = resolvedCapital * (resolvedRiskPercent / 100);

  // 1. Standard Equity Calculations
  let suggestedQty = 0;
  if (riskPerShare > 0 && entryPrice > 0) {
    const riskBasedQty = Math.floor(maxRiskBudget / riskPerShare);
    const powerBasedQty = Math.floor(resolvedCapital / entryPrice);
    suggestedQty = Math.min(riskBasedQty, powerBasedQty);
  } else if (entryPrice > 0) {
    suggestedQty = Math.floor(resolvedCapital / entryPrice);
  }
  if (suggestedQty < 0) suggestedQty = 0;

  const capitalUsed = suggestedQty * entryPrice;
  const potentialProfitEquity = suggestedQty * Math.abs(targetPrice - entryPrice);
  const rewardPerShare = Math.abs(targetPrice - entryPrice);
  const rrRatio = riskPerShare > 0 ? rewardPerShare / riskPerShare : 0;

  // 2. Premium Futures-Specific Position Sizing Calculations
  const cleanSymbol = symbol.toUpperCase().replace('FUT', '').replace('-F', '').trim();
  const lotSize = LOT_SIZES[cleanSymbol] || 250; // default exchange lot size fallback is 250

  // Real-world margin calculation approx. 16% of total contract exposure
  const approxMarginRequired = Math.round(entryPrice * lotSize * 0.16);
  
  // Calculate affordable lot count, defaulting to at least 1 lot so risk/reward calculations are always shown
  const actualLotsSuggested = Math.floor(resolvedCapital / approxMarginRequired);
  const lotsSuggested = Math.max(1, actualLotsSuggested);
  const totalMarginNeeded = lotsSuggested * approxMarginRequired;
  const isCapitalInsufficient = resolvedCapital < approxMarginRequired;

  // Real-world PnL for suggested lots (which is at least 1 lot!)
  const maxLoss = lotsSuggested * lotSize * riskPerShare;
  const potentialProfit = lotsSuggested * lotSize * rewardPerShare;

  return {
    suggestedQty: lotsSuggested * lotSize,
    capitalUsed: totalMarginNeeded,
    maxLoss,
    potentialProfit,
    riskPerShare,
    rrRatio,
    
    lotSize,
    lotsSuggested,
    approxMarginRequired,
    totalMarginNeeded,
    isCapitalInsufficient
  };
}
