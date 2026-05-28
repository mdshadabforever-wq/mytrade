export interface StockPerformance {
  symbol: string;
  sector: string;
  price: number;
  changePercent: number;
  relativeStrength: number;
}

export interface RelativeStrengthRankings {
  leaders: StockPerformance[];
  laggards: StockPerformance[];
  sectorRanks: { sector: string; avgChange: number; strengthRank: number }[];
}

/**
 * Calculates relative strength and ranks stocks and sectors
 * @param stocks Array of stock details
 * @param indexChangePercent Underlying Nifty 50 percentage change
 */
export function calculateRelativeStrength(
  stocks: { symbol: string; sector: string; price: number; changePercent: number }[],
  indexChangePercent: number
): RelativeStrengthRankings {
  const stockPerformance: StockPerformance[] = stocks.map(stock => {
    const relativeStrength = stock.changePercent - indexChangePercent;
    return {
      symbol: stock.symbol,
      sector: stock.sector,
      price: stock.price,
      changePercent: stock.changePercent,
      relativeStrength: Math.round(relativeStrength * 100) / 100
    };
  });

  // Sort by relative strength descending
  const sortedStocks = [...stockPerformance].sort((a, b) => b.relativeStrength - a.relativeStrength);

  // Group by sectors to calculate average sector performance
  const sectorMap: { [key: string]: number[] } = {};
  stocks.forEach(s => {
    if (!sectorMap[s.sector]) {
      sectorMap[s.sector] = [];
    }
    sectorMap[s.sector].push(s.changePercent);
  });

  const sectorRanks = Object.keys(sectorMap).map(sector => {
    const changes = sectorMap[sector];
    const avgChange = changes.reduce((a, b) => a + b, 0) / changes.length;
    return {
      sector,
      avgChange: Math.round(avgChange * 100) / 100,
      strengthRank: 0 // placeholder to sort next
    };
  });

  // Sort sectors by performance descending
  sectorRanks.sort((a, b) => b.avgChange - a.avgChange);
  sectorRanks.forEach((sec, idx) => {
    sec.strengthRank = idx + 1;
  });

  return {
    leaders: sortedStocks.slice(0, 10), // Top 10 leaders
    laggards: sortedStocks.slice(-10).reverse(), // Top 10 laggards (worst first)
    sectorRanks
  };
}
