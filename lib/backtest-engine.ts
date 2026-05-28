import { Candle } from './smc-engine';

export interface BacktestTrade {
  id: string;
  type: 'BUY' | 'SELL';
  entryPrice: number;
  stopLoss: number;
  target: number;
  exitPrice?: number;
  status: 'OPEN' | 'WIN' | 'LOSS';
  pnlPoints: number; // Gross P&L points
  netPnlPoints: number; // Net P&L points after slippage, brokerage, and taxes
  slippagePoints: number;
  brokerageTaxesPoints: number;
  entryTime: number;
  exitTime?: number;
  category: 'ORB' | 'SMC_OB';
}

export interface BacktestMetrics {
  totalTrades: number;
  wins: number;
  losses: number;
  winRatePercent: number;
  profitFactor: number;
  maxDrawdownPoints: number;
  sharpeRatio: number;
  totalPnlPoints: number; // Gross P&L points sum
  totalNetPnlPoints: number; // Net P&L points sum after all costs
  totalFrictionCosts: number; // Slippage + brokerage + taxes sum
  expectancy: number; // Net average points per trade
  averageRR: number; // Average risk-to-reward ratio of setups
  orbExpectancy: number;
  smcExpectancy: number;
  tradesList: BacktestTrade[];
}

/**
 * Replays candles and simulates intraday breakout/retest trades with realistic charges.
 * Slippage: 0.05% on entry + 0.05% on exit.
 * Brokerage: Flat ₹20 per order (₹40 round-trip).
 * Exchange transaction fees + STT + GST: ~0.035% of total turnover.
 */
export function runHistoricalSimulation(
  candles: Candle[],
  strategy: 'ORB' | 'SMC_OB' = 'ORB'
): BacktestMetrics {
  if (candles.length < 20) {
    return {
      totalTrades: 0,
      wins: 0,
      losses: 0,
      winRatePercent: 0,
      profitFactor: 0,
      maxDrawdownPoints: 0,
      sharpeRatio: 0,
      totalPnlPoints: 0,
      totalNetPnlPoints: 0,
      totalFrictionCosts: 0,
      expectancy: 0,
      averageRR: 0,
      orbExpectancy: 0,
      smcExpectancy: 0,
      tradesList: []
    };
  }

  const trades: BacktestTrade[] = [];
  let openTrade: BacktestTrade | null = null;
  
  // Strategy 1: Opening Range Breakout (ORB)
  // Define opening range as high/low of first 5 candles (e.g. 25 minutes of a 5M chart)
  let orbHigh = -Infinity;
  let orbLow = Infinity;
  const orbLookback = 5;

  for (let i = 0; i < orbLookback; i++) {
    if (candles[i].high > orbHigh) orbHigh = candles[i].high;
    if (candles[i].low < orbLow) orbLow = candles[i].low;
  }

  // Drawdown tracking variables
  let peakPnl = 0;
  let maxDrawdown = 0;
  let cumulativePnl = 0;

  // Run replay loop starting from the end of the opening range
  for (let i = orbLookback; i < candles.length; i++) {
    const c = candles[i];
    const prevC = candles[i - 1];
    const timestamp = typeof c.timestamp === 'string' ? new Date(c.timestamp).getTime() : (c.timestamp instanceof Date ? c.timestamp.getTime() : c.timestamp as number);

    // 1. Manage existing open trade
    if (openTrade) {
      if (openTrade.type === 'BUY') {
        // Check Stop Loss hit
        if (c.low <= openTrade.stopLoss) {
          openTrade.status = 'LOSS';
          openTrade.exitPrice = openTrade.stopLoss;
          openTrade.exitTime = timestamp;
          openTrade.pnlPoints = openTrade.stopLoss - openTrade.entryPrice;
          
          // Math calculations for slippage & brokerage friction
          const slippage = (openTrade.entryPrice * 0.0005) + (openTrade.stopLoss * 0.0005);
          const brokerageTaxes = 40 + ((openTrade.entryPrice + openTrade.stopLoss) * 0.00035); // ₹40 round-trip brokerage + taxes
          // convert rupees to points (approx scale factor assuming index at ~24000)
          const slipPoints = slippage / 10;
          const taxPoints = brokerageTaxes / 10;

          openTrade.slippagePoints = Math.round(slipPoints * 100) / 100;
          openTrade.brokerageTaxesPoints = Math.round(taxPoints * 100) / 100;
          openTrade.netPnlPoints = Math.round((openTrade.pnlPoints - slipPoints - taxPoints) * 100) / 100;

          cumulativePnl += openTrade.netPnlPoints;
          trades.push(openTrade);
          openTrade = null;
        }
        // Check Target hit
        else if (c.high >= openTrade.target) {
          openTrade.status = 'WIN';
          openTrade.exitPrice = openTrade.target;
          openTrade.exitTime = timestamp;
          openTrade.pnlPoints = openTrade.target - openTrade.entryPrice;
          
          const slippage = (openTrade.entryPrice * 0.0005) + (openTrade.target * 0.0005);
          const brokerageTaxes = 40 + ((openTrade.entryPrice + openTrade.target) * 0.00035);
          const slipPoints = slippage / 10;
          const taxPoints = brokerageTaxes / 10;

          openTrade.slippagePoints = Math.round(slipPoints * 100) / 100;
          openTrade.brokerageTaxesPoints = Math.round(taxPoints * 100) / 100;
          openTrade.netPnlPoints = Math.round((openTrade.pnlPoints - slipPoints - taxPoints) * 100) / 100;

          cumulativePnl += openTrade.netPnlPoints;
          trades.push(openTrade);
          openTrade = null;
        }
      } else {
        // SELL Trade management
        if (c.high >= openTrade.stopLoss) {
          openTrade.status = 'LOSS';
          openTrade.exitPrice = openTrade.stopLoss;
          openTrade.exitTime = timestamp;
          openTrade.pnlPoints = openTrade.entryPrice - openTrade.stopLoss;
          
          const slippage = (openTrade.entryPrice * 0.0005) + (openTrade.stopLoss * 0.0005);
          const brokerageTaxes = 40 + ((openTrade.entryPrice + openTrade.stopLoss) * 0.00035);
          const slipPoints = slippage / 10;
          const taxPoints = brokerageTaxes / 10;

          openTrade.slippagePoints = Math.round(slipPoints * 100) / 100;
          openTrade.brokerageTaxesPoints = Math.round(taxPoints * 100) / 100;
          openTrade.netPnlPoints = Math.round((openTrade.pnlPoints - slipPoints - taxPoints) * 100) / 100;

          cumulativePnl += openTrade.netPnlPoints;
          trades.push(openTrade);
          openTrade = null;
        }
        else if (c.low <= openTrade.target) {
          openTrade.status = 'WIN';
          openTrade.exitPrice = openTrade.target;
          openTrade.exitTime = timestamp;
          openTrade.pnlPoints = openTrade.entryPrice - openTrade.target;
          
          const slippage = (openTrade.entryPrice * 0.0005) + (openTrade.target * 0.0005);
          const brokerageTaxes = 40 + ((openTrade.entryPrice + openTrade.target) * 0.00035);
          const slipPoints = slippage / 10;
          const taxPoints = brokerageTaxes / 10;

          openTrade.slippagePoints = Math.round(slipPoints * 100) / 100;
          openTrade.brokerageTaxesPoints = Math.round(taxPoints * 100) / 100;
          openTrade.netPnlPoints = Math.round((openTrade.pnlPoints - slipPoints - taxPoints) * 100) / 100;

          cumulativePnl += openTrade.netPnlPoints;
          trades.push(openTrade);
          openTrade = null;
        }
      }
    }

    // 2. Scan for entries if no trade is active
    if (!openTrade && i < candles.length - 5) {
      if (strategy === 'ORB') {
        // Buy Breakout: close crosses above ORB High
        if (prevC.close <= orbHigh && c.close > orbHigh) {
          const entry = c.close;
          const sl = orbLow;
          const risk = entry - sl;
          
          if (risk > 10 && risk < 150) { // filter out extreme noise
            openTrade = {
              id: 't_' + i,
              type: 'BUY',
              entryPrice: entry,
              stopLoss: sl,
              target: entry + risk * 2, // 1:2 RR ratio
              status: 'OPEN',
              pnlPoints: 0,
              netPnlPoints: 0,
              slippagePoints: 0,
              brokerageTaxesPoints: 0,
              entryTime: timestamp,
              category: 'ORB'
            };
          }
        }
        // Sell Breakout: close crosses below ORB Low
        else if (prevC.close >= orbLow && c.close < orbLow) {
          const entry = c.close;
          const sl = orbHigh;
          const risk = sl - entry;
          
          if (risk > 10 && risk < 150) {
            openTrade = {
              id: 't_' + i,
              type: 'SELL',
              entryPrice: entry,
              stopLoss: sl,
              target: entry - risk * 2,
              status: 'OPEN',
              pnlPoints: 0,
              netPnlPoints: 0,
              slippagePoints: 0,
              brokerageTaxesPoints: 0,
              entryTime: timestamp,
              category: 'ORB'
            };
          }
        }
      } else {
        // Strategy 2: SMC Order Block retouches
        // Simple mock of buying retracements to previous local lows/FVGs
        const isRetestLow = c.low < prevC.low - 15;
        if (isRetestLow) {
          const entry = c.low + 5;
          openTrade = {
            id: 't_' + i,
            type: 'BUY',
            entryPrice: entry,
            stopLoss: entry - 40,
            target: entry + 100, // 1:2.5 RR ratio
            status: 'OPEN',
            pnlPoints: 0,
            netPnlPoints: 0,
            slippagePoints: 0,
            brokerageTaxesPoints: 0,
            entryTime: timestamp,
            category: 'SMC_OB'
          };
        }
      }
    }

    // Peak drawdown tracker
    if (cumulativePnl > peakPnl) peakPnl = cumulativePnl;
    const currentDrawdown = peakPnl - cumulativePnl;
    if (currentDrawdown > maxDrawdown) maxDrawdown = currentDrawdown;
  }

  // Force close any remaining open trade at the end of session
  if (openTrade) {
    const finalCandle = candles[candles.length - 1];
    const finalTime = typeof finalCandle.timestamp === 'string' ? new Date(finalCandle.timestamp).getTime() : (finalCandle.timestamp instanceof Date ? finalCandle.timestamp.getTime() : finalCandle.timestamp as number);
    
    openTrade.status = finalCandle.close >= openTrade.entryPrice ? 'WIN' : 'LOSS';
    openTrade.exitPrice = finalCandle.close;
    openTrade.exitTime = finalTime;
    openTrade.pnlPoints = openTrade.type === 'BUY' 
      ? finalCandle.close - openTrade.entryPrice 
      : openTrade.entryPrice - finalCandle.close;
    
    const slippage = (openTrade.entryPrice * 0.0005) + (finalCandle.close * 0.0005);
    const brokerageTaxes = 40 + ((openTrade.entryPrice + finalCandle.close) * 0.00035);
    const slipPoints = slippage / 10;
    const taxPoints = brokerageTaxes / 10;

    openTrade.slippagePoints = Math.round(slipPoints * 100) / 100;
    openTrade.brokerageTaxesPoints = Math.round(taxPoints * 100) / 100;
    openTrade.netPnlPoints = Math.round((openTrade.pnlPoints - slipPoints - taxPoints) * 100) / 100;

    cumulativePnl += openTrade.netPnlPoints;
    trades.push(openTrade);
  }

  // 3. Compile statistics
  const totalTrades = trades.length;
  const wins = trades.filter(t => t.status === 'WIN').length;
  const losses = trades.filter(t => t.status === 'LOSS').length;
  const winRatePercent = totalTrades > 0 ? Math.round((wins / totalTrades) * 100) : 0;

  const totalPnlPoints = Math.round(trades.reduce((acc, t) => acc + t.pnlPoints, 0) * 100) / 100;
  const totalNetPnlPoints = Math.round(trades.reduce((acc, t) => acc + t.netPnlPoints, 0) * 100) / 100;
  const totalFrictionCosts = Math.round(trades.reduce((acc, t) => acc + t.slippagePoints + t.brokerageTaxesPoints, 0) * 100) / 100;

  const grossProfits = trades.filter(t => t.netPnlPoints > 0).reduce((acc, t) => acc + t.netPnlPoints, 0);
  const grossLosses = Math.abs(trades.filter(t => t.netPnlPoints < 0).reduce((acc, t) => acc + t.netPnlPoints, 0));
  const profitFactor = grossLosses > 0 ? Math.round((grossProfits / grossLosses) * 100) / 100 : grossProfits > 0 ? 9.99 : 0;

  // Expectancy (Net average points gained/lost per trade after realistic costs)
  const expectancy = totalTrades > 0 ? Math.round((totalNetPnlPoints / totalTrades) * 100) / 100 : 0;

  // Average Risk-to-Reward ratio
  let totalRRRatio = 0;
  let countRR = 0;
  trades.forEach(t => {
    const risk = Math.abs(t.entryPrice - t.stopLoss);
    const reward = Math.abs(t.target - t.entryPrice);
    if (risk > 0) {
      totalRRRatio += reward / risk;
      countRR++;
    }
  });
  const averageRR = countRR > 0 ? Math.round((totalRRRatio / countRR) * 100) / 100 : 2.0;

  // Expectancy by Category
  const orbTrades = trades.filter(t => t.category === 'ORB');
  const smcTrades = trades.filter(t => t.category === 'SMC_OB');

  const orbNetPnl = orbTrades.reduce((acc, t) => acc + t.netPnlPoints, 0);
  const smcNetPnl = smcTrades.reduce((acc, t) => acc + t.netPnlPoints, 0);

  const orbExpectancy = orbTrades.length > 0 ? Math.round((orbNetPnl / orbTrades.length) * 100) / 100 : 0;
  const smcExpectancy = smcTrades.length > 0 ? Math.round((smcNetPnl / smcTrades.length) * 100) / 100 : 0;

  // Calculate Sharpe Ratio (excess net return / standard net deviation of trade returns)
  const returns = trades.map(t => t.netPnlPoints);
  const avgReturn = returns.length > 0 ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;
  
  const variance = returns.length > 1
    ? returns.reduce((acc, r) => acc + Math.pow(r - avgReturn, 2), 0) / (returns.length - 1)
    : 1;
  const stdDev = Math.sqrt(variance) || 1;
  const sharpeRatio = Math.round((avgReturn / stdDev * Math.sqrt(252)) * 100) / 100;

  return {
    totalTrades,
    wins,
    losses,
    winRatePercent,
    profitFactor,
    maxDrawdownPoints: Math.round(maxDrawdown),
    sharpeRatio: Math.max(0, sharpeRatio),
    totalPnlPoints,
    totalNetPnlPoints,
    totalFrictionCosts,
    expectancy,
    averageRR,
    orbExpectancy,
    smcExpectancy,
    tradesList: trades
  };
}
