'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Landmark, ArrowUpRight, ArrowDownRight, Compass } from 'lucide-react';
import { formatIndianRupees } from '@/lib/utils';

export interface FIIDIIPanelProps {
  institutional: any;
}

export function FIIDIIPanel({ institutional }: FIIDIIPanelProps) {
  const [participantOI, setParticipantOI] = useState<any>(null);

  useEffect(() => {
    const fetchOI = async () => {
      try {
        const res = await axios.get('/api/participant-oi');
        if (res.data?.fii) setParticipantOI(res.data);
      } catch (err) {
        console.warn('[FIIDII PANEL] Participant OI fetch failed:', err);
      }
    };
    fetchOI();
    const timer = window.setInterval(fetchOI, 30 * 60 * 1000);
    return () => window.clearInterval(timer);
  }, []);

  if (!institutional) {
    return (
      <div className="w-full h-[180px] bg-[#0d1117] border border-[#21262d] flex items-center justify-center text-xs text-[#8892a4] font-mono animate-pulse">
        COMPILING INSTITUTIONAL POSITIONINGS...
      </div>
    );
  }

  const { fii, dii } = institutional;
  const combinedNet = fii.cash + dii.cash;
  const isNetBuying = combinedNet >= 0;

  // 5-day historical mock flows for the sparklines
  const fiiHistory = [-1200, -850, 450, -1100, fii.cash];
  const diiHistory = [800, 1550, -200, 1400, dii.cash];

  // Helper to render SVG sparklines
  const renderSparkline = (history: number[], strokeColor: string) => {
    const width = 120;
    const height = 28;
    const padding = 2;
    const pointsCount = history.length;
    
    const maxVal = Math.max(...history, 500);
    const minVal = Math.min(...history, -500);
    const range = maxVal - minVal || 1;

    const coords = history.map((val, idx) => {
      const x = (idx / (pointsCount - 1)) * (width - 2 * padding) + padding;
      const y = height - ((val - minVal) / range) * (height - 2 * padding) - padding;
      return `${x},${y}`;
    });

    return (
      <svg width={width} height={height} className="overflow-visible select-none">
        {/* Zero Line */}
        {minVal < 0 && maxVal > 0 && (
          <line
            x1="0"
            y1={height - ((0 - minVal) / range) * height}
            x2={width}
            y2={height - ((0 - minVal) / range) * height}
            stroke="#161b22"
            strokeWidth="0.8"
            strokeDasharray="2,2"
          />
        )}
        <polyline
          fill="none"
          stroke={strokeColor}
          strokeWidth="1.5"
          points={coords.join(' ')}
        />
        {/* Draw latest dot */}
        {coords.length > 0 && (
          <circle
            cx={coords[coords.length - 1].split(',')[0]}
            cy={coords[coords.length - 1].split(',')[1]}
            r="2.5"
            fill={strokeColor}
          />
        )}
      </svg>
    );
  };

  return (
    <div className="w-full bg-[#0d1117] border border-[#21262d] p-3 rounded font-mono select-none">
      
      {/* Panel Header */}
      <div className="flex items-center space-x-2 border-b border-[#21262d] pb-2 mb-3">
        <Landmark className="w-4 h-4 text-[#f0a500]" />
        <span className="text-xs font-bold text-[#e6e6e6]">INSTITUTIONAL POSITIONING & FLOWS</span>
        <span className="text-[8px] text-[#8892a4]">(DAILY REPORTING)</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* FII Panel */}
        <div className="bg-[#050508] border border-[#21262d] p-2.5 rounded flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center">
              <span className="text-[10px] text-white font-bold">FII PROPOSITION (GLOBAL FLOWS)</span>
              <span className={`text-[9px] px-1 bg-[#21262d] rounded ${fii.cash >= 0 ? 'text-[#00e5a0]' : 'text-[#ff3a3a]'}`}>
                {fii.cash >= 0 ? 'NET ACCUMULATING' : 'NET DISTRIBUTING'}
              </span>
            </div>
            
            <div className="flex justify-between items-baseline mt-2">
              <div className="flex flex-col">
                <span className="text-[8px] text-[#8892a4]">TODAY'S CASH FLOW</span>
                <span className={`text-xl font-bold font-mono ${fii.cash >= 0 ? 'text-[#00e5a0]' : 'text-[#ff3a3a]'}`}>
                  {fii.cash >= 0 ? '₹+' : '₹'}{formatIndianRupees(fii.cash)} Cr
                </span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[8px] text-[#8892a4] mb-1">5-DAY CASH TREND</span>
                {renderSparkline(fiiHistory, fii.cash >= 0 ? '#00e5a0' : '#ff3a3a')}
              </div>
            </div>
          </div>

          {/* Futures OI Long/Short Bar */}
          <div className="mt-3 border-t border-[#21262d]/50 pt-2 text-[9px]">
            <div className="flex justify-between text-[#8892a4] font-bold">
              <span>INDEX FUTURES L/S RATIO: {fii.longShortRatio}</span>
              <span className={fii.longShortRatio >= 1.0 ? 'text-[#00e5a0]' : 'text-[#ff3a3a]'}>
                {fii.longShortRatio >= 1.0 ? 'LONG ACCUMULATION' : 'SHORT DOMINANCE'}
              </span>
            </div>
            
            {/* Horizontal comparative bar */}
            <div className="w-full h-2 bg-[#161b22] rounded-full overflow-hidden mt-1.5 flex">
              <div 
                className="h-full bg-[#00e5a0]"
                style={{ width: `${Math.min(100, (fii.longShortRatio / (fii.longShortRatio + 1)) * 100)}%` }}
              />
              <div 
                className="h-full bg-[#ff3a3a]"
                style={{ width: `${Math.min(100, (1 / (fii.longShortRatio + 1)) * 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* DII Panel */}
        <div className="bg-[#050508] border border-[#21262d] p-2.5 rounded flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center">
              <span className="text-[10px] text-white font-bold">DII PROPOSITION (DOMESTIC SUPPORT)</span>
              <span className={`text-[9px] px-1 bg-[#21262d] rounded ${dii.cash >= 0 ? 'text-[#00e5a0]' : 'text-[#ff3a3a]'}`}>
                {dii.cash >= 0 ? 'NET ACCUMULATING' : 'NET DISTRIBUTING'}
              </span>
            </div>
            
            <div className="flex justify-between items-baseline mt-2">
              <div className="flex flex-col">
                <span className="text-[8px] text-[#8892a4]">TODAY'S CASH FLOW</span>
                <span className={`text-xl font-bold font-mono ${dii.cash >= 0 ? 'text-[#00e5a0]' : 'text-[#ff3a3a]'}`}>
                  {dii.cash >= 0 ? '₹+' : '₹'}{formatIndianRupees(dii.cash)} Cr
                </span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[8px] text-[#8892a4] mb-1">5-DAY CASH TREND</span>
                {renderSparkline(diiHistory, dii.cash >= 0 ? '#00e5a0' : '#ff3a3a')}
              </div>
            </div>
          </div>

          <div className="mt-3 border-t border-[#21262d]/50 pt-2 text-[9px] flex flex-col justify-end">
            <div className="flex justify-between text-[#8892a4] font-bold">
              <span>DOMESTIC HEDGING RATIO</span>
              <span className="text-white">STABLE SUPPORT</span>
            </div>
            <div className="text-[8px] text-[#8892a4] mt-1.5 leading-tight font-sans">
              DII cash flow maintains liquid domestic safety nets, absorption ratios remain normal.
            </div>
          </div>
        </div>
      </div>

      {/* COMBINED READING FOOTER */}
      <div className="mt-3 border-t border-[#21262d] pt-3 flex items-center justify-between text-[10px] font-bold">
        <div className="flex items-center space-x-1.5">
          <Compass className="w-4 h-4 text-[#f0a500]" />
          <span>COMBINED POSITIONING bias:</span>
        </div>
        <div className={`flex items-center space-x-1 border px-2 py-0.5 rounded ${
          isNetBuying 
            ? 'text-[#00e5a0] bg-[#00e5a0]/5 border-[#00e5a0]/25' 
            : 'text-[#ff3a3a] bg-[#ff3a3a]/5 border-[#ff3a3a]/25'
        }`}>
          {isNetBuying ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
          <span className="uppercase">INSTITUTIONS NET {isNetBuying ? `BUYING (+₹${formatIndianRupees(combinedNet)} Cr)` : `SELLING (₹${formatIndianRupees(combinedNet)} Cr)`}</span>
        </div>
      </div>

      {/* F&O Participant-wise OI Section */}
      <div className="mt-3 border-t border-[#21262d] pt-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[9px] font-bold text-[#8892a4] uppercase tracking-wider">F&O Participant OI (EOD)</span>
          {participantOI ? (
            <span className={`text-[7px] px-1 rounded font-bold border ${
              participantOI.source === 'LIVE'
                ? 'text-[#00e5a0] bg-[#00e5a0]/10 border-[#00e5a0]/20'
                : 'text-[#f0a500] bg-[#f0a500]/10 border-[#f0a500]/20'
            }`}>
              {participantOI.source}
            </span>
          ) : (
            <span className="text-[7px] text-[#8892a4] animate-pulse">LOADING...</span>
          )}
        </div>

        {participantOI ? (
          <div className="flex flex-col space-y-1">
            {[
              { label: 'FII',    data: participantOI.fii },
              { label: 'DII',    data: participantOI.dii },
              { label: 'PRO',    data: participantOI.pro },
              { label: 'RETAIL', data: participantOI.retail }
            ].map(({ label, data }) => (
              <div key={label} className="flex items-center justify-between bg-[#050508] border border-[#21262d] px-2 py-1 rounded">
                <span className="text-[8.5px] font-bold text-[#8892a4] w-10">{label}</span>
                <span className="text-[8.5px] font-mono text-white flex-1 text-center">
                  {(data?.netOI ?? 0) >= 0 ? '+' : ''}{(data?.netOI ?? 0).toLocaleString()} cts
                </span>
                <span className={`text-[7.5px] font-black px-1.5 py-0.5 rounded border ${
                  data?.direction === 'LONG'
                    ? 'text-[#00e5a0] bg-[#00e5a0]/10 border-[#00e5a0]/25'
                    : data?.direction === 'SHORT'
                    ? 'text-[#ff3a3a] bg-[#ff3a3a]/10 border-[#ff3a3a]/25'
                    : 'text-[#8892a4] bg-[#21262d] border-[#21262d]'
                }`}>
                  {data?.direction ?? 'NEUTRAL'}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-[8px] text-[#8892a4] italic font-sans">Fetching F&O positioning data...</div>
        )}
      </div>

    </div>
  );
}
