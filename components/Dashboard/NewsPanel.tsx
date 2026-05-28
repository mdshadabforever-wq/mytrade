import React from 'react';
import { Newspaper, Bell, Calendar, Flame, AlertCircle } from 'lucide-react';
import { NewsItem } from '@/lib/news-fetcher';

export interface NewsPanelProps {
  newsData: {
    items: NewsItem[];
    overallNewsSentiment: 'BULLISH' | 'BEARISH' | 'MIXED';
    highImpactEventToday: boolean;
    nextHighImpactEvent: any;
  } | null;
}

export function NewsPanel({ newsData }: NewsPanelProps) {
  if (!newsData) {
    return (
      <div className="w-full h-[200px] bg-[#0d1117] border border-[#21262d] flex items-center justify-center text-xs text-[#8892a4] font-mono animate-pulse">
        COMPILING NEWS FEED...
      </div>
    );
  }

  const { items, overallNewsSentiment, highImpactEventToday, nextHighImpactEvent } = newsData;

  return (
    <div className="w-full bg-[#0d1117] border border-[#21262d] p-3 rounded font-mono select-none">
      
      {/* 1. News ticker bar */}
      <div className="flex items-center space-x-2 bg-[#050508] border border-[#21262d] p-1.5 px-3 rounded mb-3 overflow-hidden whitespace-nowrap text-[10px]">
        <span className="flex items-center space-x-1 font-bold text-[#f0a500] flex-shrink-0">
          <Bell className="w-3.5 h-3.5 text-[#f0a500] animate-bounce" />
          <span>TICKER:</span>
        </span>
        
        {/* Infinite scroll-like ticker marquee using simple horizontal animation */}
        <div className="w-full overflow-hidden inline-block relative">
          <div className="animate-marquee whitespace-nowrap flex space-x-6 text-[#e6e6e6]">
            {items.map((item, idx) => (
              <span key={idx} className="hover:text-[#f0a500] cursor-pointer">
                [{item.sentiment}] {item.headline}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* 2. Grid split layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* LEFT/CENTER columns: Detailed News Cards (2/3 width) */}
        <div className="lg:col-span-2 flex flex-col space-y-2 max-h-[300px] overflow-y-auto pr-1">
          <div className="flex items-center space-x-2 border-b border-[#21262d] pb-1.5 mb-1.5">
            <Newspaper className="w-4 h-4 text-[#f0a500]" />
            <span className="text-xs font-bold text-white">INSTITUTIONAL WIRE</span>
          </div>

          {items.map((item, idx) => {
            const sentimentColors = 
              item.sentiment === 'BULLISH' ? 'text-[#00e5a0] bg-[#00e5a0]/5 border-[#00e5a0]/25' :
              item.sentiment === 'BEARISH' ? 'text-[#ff3a3a] bg-[#ff3a3a]/5 border-[#ff3a3a]/25' :
              'text-[#8892a4] bg-[#21262d]/5 border-[#21262d]';

            return (
              <div 
                key={idx}
                className="bg-[#050508] border border-[#21262d] p-2 rounded flex flex-col transition-all duration-300 hover:border-[#f0a500]/30"
              >
                <div className="flex justify-between items-start space-x-2">
                  <h4 className="text-[11px] font-bold text-[#e6e6e6] leading-tight hover:underline cursor-pointer">
                    {item.headline}
                  </h4>
                  <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border flex-shrink-0 uppercase ${sentimentColors}`}>
                    {item.sentiment}
                  </span>
                </div>
                
                <div className="flex justify-between items-center mt-2 text-[9px] text-[#8892a4]">
                  <div className="flex items-center space-x-1.5">
                    <span className="text-[#f0a500] font-bold">{item.source}</span>
                    <span>•</span>
                    <span>{item.time}</span>
                  </div>
                  <span className="text-[9px] italic text-[#e6e6e6] font-medium leading-tight">
                    {item.sentimentReason}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* RIGHT column: Economic Calendar & Threat Banner (1/3 width) */}
        <div className="bg-[#050508] border border-[#21262d] p-3 rounded flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2 border-b border-[#21262d] pb-1.5 mb-3">
              <Calendar className="w-4 h-4 text-[#f0a500]" />
              <span className="text-xs font-bold text-white">ECONOMIC RISK CALENDAR</span>
            </div>

            {nextHighImpactEvent ? (
              <div className="bg-[#0d1117] border border-[#21262d] p-2 rounded">
                <div className="text-[8px] text-[#8892a4] font-bold uppercase tracking-wider">NEXT HIGH IMPACT EVENT</div>
                <h5 className="text-xs font-bold text-white mt-1 leading-snug">
                  {nextHighImpactEvent.name}
                </h5>
                <div className="flex justify-between items-center mt-3 text-[9px] text-[#f0a500]">
                  <span>DATE: {nextHighImpactEvent.date}</span>
                  <span className="px-1.5 py-0.5 bg-[#f0a500]/10 border border-[#f0a500]/25 rounded font-bold uppercase">
                    {nextHighImpactEvent.daysAway} DAYS AWAY
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-[9px] text-[#8892a4] text-center p-3 border border-[#21262d] rounded">
                NO REGISTERED RISK ANNOUNCEMENTS DETECTED
              </div>
            )}

            <div className="mt-3 text-[8.5px] text-[#8892a4] leading-normal font-sans">
              All calendar event parameters are monitored server-side. Pre-market and post-market scans evaluate structural risk adjustments automatically.
            </div>
          </div>

          {/* High Impact Event Banner */}
          {highImpactEventToday ? (
            <div className="mt-3 p-2 bg-[#ff3a3a]/10 border border-[#ff3a3a]/30 rounded flex items-center space-x-2 text-[9px] text-[#ff3a3a]">
              <Flame className="w-4 h-4 flex-shrink-0 animate-pulse" />
              <span className="font-bold uppercase leading-snug">
                EVENT RISK: Major High-Impact Announcement today! AI trade signals locked. No execution entries.
              </span>
            </div>
          ) : (
            <div className="mt-3 p-2 bg-[#00e5a0]/10 border border-[#00e5a0]/30 rounded flex items-center space-x-2 text-[9px] text-[#00e5a0]">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="font-bold uppercase leading-tight">
                MACRO CALENDAR STABLE: No high impact schedule triggers active today. Scans running normally.
              </span>
            </div>
          )}
        </div>

      </div>

      {/* Marquee Animation Keyframes injected locally */}
      <style jsx global>{`
        @keyframes marquee {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
        .animate-marquee {
          animation: marquee 25s linear infinite;
        }
      `}</style>

    </div>
  );
}
