import React from 'react';
import { Target, AlertTriangle, HelpCircle, Activity } from 'lucide-react';
import { parsePCRInterpretation } from '@/lib/option-intelligence';

export interface OptionIntelPanelProps {
  optionChain: any;
}

export function OptionIntelPanel({ optionChain }: OptionIntelPanelProps) {
  if (!optionChain) {
    return (
      <div className="w-full h-[250px] bg-[#0d1117] border border-[#21262d] flex items-center justify-center text-xs text-[#8892a4] font-mono animate-pulse">
        COMPILING OPTION FLOWS...
      </div>
    );
  }

  const {
    currentPrice,
    expiryDate,
    pcr,
    maxPain,
    ivPercentile,
    callWalls,
    putWalls,
    atmStrike,
    atmIV,
    sentiment,
    daysToExpiry
  } = optionChain;

  const painDiff = currentPrice - maxPain;
  const isPcrBullish = pcr > 1.0;
  const pcrInterpretation = parsePCRInterpretation(pcr);

  // Generate 8 strikes centered around the ATM (e.g. step of 50 or 100)
  const strikeStep = 50;
  const strikesToShow: number[] = [];
  for (let i = -4; i <= 4; i++) {
    strikesToShow.push(atmStrike + i * strikeStep);
  }

  // Find max OI in walls to scale the bars correctly
  const maxCallOI = Math.max(...callWalls.map((w: any) => w.oi), 100000);
  const maxPutOI = Math.max(...putWalls.map((w: any) => w.oi), 100000);
  const scaleMax = Math.max(maxCallOI, maxPutOI);

  // Helper to check if strike exists in walls
  const getStrikeOI = (strike: number, side: 'CE' | 'PE') => {
    // If strike matches primary call walls, return details
    const wall = side === 'CE' 
      ? callWalls.find((w: any) => w.strike === strike)
      : putWalls.find((w: any) => w.strike === strike);
    
    if (wall) return { oi: wall.oi, isWall: true };
    
    // Fallback to simulated OI decay based on distance from ATM
    const dist = Math.abs(strike - atmStrike) / strikeStep;
    const baseOI = side === 'CE' ? 75000 : 80000;
    const oiDecay = Math.max(10000, Math.round(baseOI * Math.exp(-dist * 0.4)));
    return { oi: oiDecay, isWall: false };
  };

  return (
    <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4 font-mono select-none">
      
      {/* LEFT: OI Wall Heatmap */}
      <div className="bg-[#0d1117] border border-[#21262d] p-3 rounded flex flex-col">
        <div className="flex items-center space-x-2 border-b border-[#21262d] pb-2 mb-3">
          <Activity className="w-4 h-4 text-[#f0a500]" />
          <span className="text-xs font-bold text-[#e6e6e6]">OPEN INTEREST WALL HEATMAP</span>
          <span className="text-[8px] text-[#8892a4]">(CENTERED AROUND ATM)</span>
        </div>

        {/* Heatmap Grid */}
        <div className="flex flex-col space-y-1.5 text-[10px]">
          {/* Legend */}
          <div className="grid grid-cols-7 border-b border-[#21262d] pb-1 text-[8px] text-[#8892a4] font-bold text-center">
            <div className="col-span-3 text-left">PUT OPEN INTEREST (SUPPORT)</div>
            <div className="col-span-1">STRIKE</div>
            <div className="col-span-3 text-right">CALL OPEN INTEREST (RESISTANCE)</div>
          </div>

          {/* Strikes rows */}
          {strikesToShow.map((strike, idx) => {
            const isATM = strike === atmStrike;
            const pe = getStrikeOI(strike, 'PE');
            const ce = getStrikeOI(strike, 'CE');

            const putWidth = Math.min(100, (pe.oi / scaleMax) * 100);
            const callWidth = Math.min(100, (ce.oi / scaleMax) * 100);

            return (
              <div 
                key={idx}
                className={`grid grid-cols-7 items-center p-1 rounded transition-all duration-300 ${
                  isATM ? 'bg-[#f0a500]/5 border border-[#f0a500]/30' : 'border border-transparent'
                }`}
              >
                {/* PUT OI BAR (Pointing LEFT, i.e., right-aligned inside its container) */}
                <div className="col-span-3 flex items-center justify-end space-x-1.5 pr-2">
                  <span className={`text-[8px] ${pe.isWall ? 'text-[#00e5a0] font-bold' : 'text-[#8892a4]'}`}>
                    {(pe.oi / 1000).toFixed(0)}K
                  </span>
                  <div className="w-24 h-2.5 bg-[#161b22] rounded-sm overflow-hidden flex justify-end">
                    <div 
                      className={`h-full transition-all duration-500 ${pe.isWall ? 'bg-[#00e5a0]' : 'bg-[#00e5a0]/40'}`}
                      style={{ width: `${putWidth}%` }}
                    />
                  </div>
                </div>

                {/* STRIKE PRICE */}
                <div className={`col-span-1 text-center font-bold font-mono py-0.5 rounded ${
                  isATM ? 'bg-[#f0a500] text-[#050508]' : 'text-white'
                }`}>
                  {strike}
                </div>

                {/* CALL OI BAR (Pointing RIGHT, i.e., left-aligned inside its container) */}
                <div className="col-span-3 flex items-center space-x-1.5 pl-2">
                  <div className="w-24 h-2.5 bg-[#161b22] rounded-sm overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-500 ${ce.isWall ? 'bg-[#ff3a3a]' : 'bg-[#ff3a3a]/40'}`}
                      style={{ width: `${callWidth}%` }}
                    />
                  </div>
                  <span className={`text-[8px] ${ce.isWall ? 'text-[#ff3a3a] font-bold' : 'text-[#8892a4]'}`}>
                    {(ce.oi / 1000).toFixed(0)}K
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* RIGHT: Option Metrics */}
      <div className="bg-[#0d1117] border border-[#21262d] p-3 rounded flex flex-col justify-between">
        <div>
          <div className="flex items-center space-x-2 border-b border-[#21262d] pb-2 mb-3">
            <Target className="w-4 h-4 text-[#f0a500]" />
            <span className="text-xs font-bold text-[#e6e6e6]">DERIVATIVES INTELLIGENCE SUMMARY</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* PCR Gauge */}
            <div className="bg-[#050508] border border-[#21262d] p-2 rounded">
              <div className="text-[8px] text-[#8892a4] font-bold uppercase tracking-wider">PUT-CALL RATIO</div>
              <div className="flex items-baseline space-x-2 mt-1">
                <span className={`text-xl font-bold font-mono ${pcr > 1.2 ? 'text-[#00e5a0]' : pcr < 0.8 ? 'text-[#ff3a3a]' : 'text-[#f0a500]'}`}>
                  {pcr.toFixed(2)}
                </span>
                <span className="text-[9px] text-[#e6e6e6] font-semibold">({sentiment})</span>
              </div>
              <div className="text-[8px] text-[#8892a4] mt-1 leading-normal font-sans">
                {pcrInterpretation}
              </div>
            </div>

            {/* Max Pain Gravity */}
            <div className="bg-[#050508] border border-[#21262d] p-2 rounded">
              <div className="text-[8px] text-[#8892a4] font-bold uppercase tracking-wider">MAX PAIN GRAVITY</div>
              <div className="flex items-baseline space-x-2 mt-1">
                <span className="text-xl font-bold font-mono text-[#f0a500]">{maxPain}</span>
              </div>
              <div className="text-[8px] text-[#8892a4] mt-1 leading-normal font-sans">
                {painDiff > 50 
                  ? `Index is ${Math.round(painDiff)} pts ABOVE Max Pain. Downward pull expected.` 
                  : painDiff < -50 
                    ? `Index is ${Math.round(Math.abs(painDiff))} pts BELOW Max Pain. Upward pull expected.`
                    : 'Index is trading near Equilibrium gravity.'}
              </div>
            </div>

            {/* ATM Implied Volatility */}
            <div className="bg-[#050508] border border-[#21262d] p-2 rounded">
              <div className="text-[8px] text-[#8892a4] font-bold uppercase tracking-wider">ATM IMPLIED VOLATILITY</div>
              <div className="flex items-baseline space-x-2 mt-1">
                <span className="text-xl font-bold font-mono text-[#e6e6e6]">{atmIV.toFixed(1)}%</span>
              </div>
              <div className="text-[8px] text-[#8892a4] mt-1 leading-normal font-sans">
                Option pricing premiums represent stable hedging expectations.
              </div>
            </div>

            {/* IV Percentile */}
            <div className="bg-[#050508] border border-[#21262d] p-2 rounded flex flex-col justify-between">
              <div>
                <div className="text-[8px] text-[#8892a4] font-bold uppercase tracking-wider">IV PERCENTILE (52W)</div>
                <div className="flex items-baseline space-x-2 mt-1">
                  <span className="text-xl font-bold font-mono text-[#e6e6e6]">{ivPercentile}%</span>
                </div>
              </div>
              
              {/* Simple IVP progress bar */}
              <div className="w-full h-1.5 bg-[#161b22] rounded-full overflow-hidden mt-1">
                <div 
                  className="h-full bg-[#f0a500]"
                  style={{ width: `${ivPercentile}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Expiry / Thursday Warning Banner */}
        {daysToExpiry === 0 ? (
          <div className="mt-3 p-2 bg-[#ff3a3a]/10 border border-[#ff3a3a]/30 rounded flex items-center space-x-2 text-[9px] text-[#ff3a3a]">
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="font-bold uppercase leading-tight">
              EXPIRY DAY TODAY: Extreme Gamma risk active! Options decay rapidly. Reduce size by 50% after 14:00.
            </span>
          </div>
        ) : daysToExpiry === 1 ? (
          <div className="mt-3 p-2 bg-[#f0a500]/10 border border-[#f0a500]/30 rounded flex items-center space-x-2 text-[9px] text-[#f0a500]">
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="font-bold uppercase leading-tight">
              EXPIRY WARNING: Tomorrow is contract settlement. Heightened theta decay active in ATM strikes.
            </span>
          </div>
        ) : (
          <div className="mt-3 p-2 bg-[#21262d] rounded flex items-center space-x-2 text-[9px] text-[#8892a4]">
            <HelpCircle className="w-3.5 h-3.5 flex-shrink-0" />
            <span>Weekly derivatives contracts expire in {daysToExpiry} days on Thursday. No theta alerts triggered.</span>
          </div>
        )}
      </div>
    </div>
  );
}
