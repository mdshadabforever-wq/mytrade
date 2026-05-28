import React from 'react';

export interface MarketMoodMeterProps {
  score: number; // 0 - 100
  label: string;
  color: string;
}

export function MarketMoodMeter({ score, label, color }: MarketMoodMeterProps) {
  // SVG Arc calculations
  const radius = 32;
  const strokeWidth = 5;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="flex items-center space-x-3 bg-[#0d1117]/80 border border-[#21262d] p-1.5 px-3 rounded font-mono select-none">
      {/* Circular Gauge */}
      <div className="relative w-12 h-12 flex items-center justify-center">
        <svg className="w-full h-full transform -rotate-90">
          {/* Background circle */}
          <circle
            cx="24"
            cy="24"
            r={radius}
            stroke="#161b22"
            strokeWidth={strokeWidth}
            fill="transparent"
            className="w-12 h-12"
          />
          {/* Active colored arc */}
          <circle
            cx="24"
            cy="24"
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <span className="absolute text-[11px] font-bold text-[#e6e6e6]">{score}</span>
      </div>

      <div>
        <div className="text-[8px] text-[#8892a4] uppercase tracking-wider">MARKET MOOD</div>
        <div 
          className="text-xs font-bold uppercase transition-colors duration-500"
          style={{ color }}
        >
          {label.replace('_', ' ')}
        </div>
      </div>
    </div>
  );
}
