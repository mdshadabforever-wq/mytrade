import React from 'react';
import { MarketMoodMeter } from './MarketMoodMeter';
import { SessionPanel } from './SessionPanel';
import { formatPrice } from '@/lib/utils';

export interface PriceHeaderProps {
  currentPrice: number;
  prevClose: number;
  moodScore: number;
  moodLabel: string;
  moodColor: string;
  isScanning: boolean;
}

export function PriceHeader({
  currentPrice,
  prevClose,
  moodScore,
  moodLabel,
  moodColor,
  isScanning
}: PriceHeaderProps) {
  const change = currentPrice - prevClose;
  const changePercent = (change / prevClose) * 100;
  const isBullish = change >= 0;

  return (
    <div className="w-full bg-[#0d1117]/40 border-b border-[#21262d] p-3 px-4 flex items-center justify-between font-sans select-none">
      {/* LEFT: Nifty Price Ticker */}
      <div className="flex flex-col">
        <div className="flex items-baseline space-x-2">
          <span className="text-[10px] text-[#8892a4] font-mono tracking-wider font-semibold uppercase">NSE INDEX</span>
          <span className="text-[9px] px-1 bg-[#f0a500]/10 text-[#f0a500] border border-[#f0a500]/25 rounded font-mono">NIFTY 50</span>
        </div>
        <div className="flex items-baseline space-x-3 mt-0.5">
          <span className="text-3xl font-extrabold font-mono tracking-tight text-[#e6e6e6]">
            {formatPrice(currentPrice)}
          </span>
          <span className={`text-sm font-bold font-mono ${isBullish ? 'text-[#00e5a0]' : 'text-[#ff3a3a]'}`}>
            {isBullish ? '+' : ''}{change.toFixed(2)} ({isBullish ? '+' : ''}{changePercent.toFixed(2)}%)
          </span>
        </div>
      </div>

      {/* CENTER: Market Mood Meter Circular Gauge */}
      <MarketMoodMeter score={moodScore} label={moodLabel} color={moodColor} />

      {/* RIGHT: Session name + IST Time */}
      <SessionPanel isScanning={isScanning} />
    </div>
  );
}
