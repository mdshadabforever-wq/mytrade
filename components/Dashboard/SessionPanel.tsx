import React, { useState, useEffect } from 'react';
import { getCurrentSession, getISTDate } from '@/lib/nifty-sessions';

export interface SessionPanelProps {
  isScanning: boolean;
}

export function SessionPanel({ isScanning }: SessionPanelProps) {
  const [time, setTime] = useState<string>('--:--:--');
  const [sessionName, setSessionName] = useState<string>('LOADING');
  const [sessionColor, setSessionColor] = useState<string>('text-[#8892a4]');

  useEffect(() => {
    const updateTime = () => {
      const istDate = getISTDate();
      
      // Clock string
      const hours = String(istDate.getHours()).padStart(2, '0');
      const minutes = String(istDate.getMinutes()).padStart(2, '0');
      const seconds = String(istDate.getSeconds()).padStart(2, '0');
      setTime(`${hours}:${minutes}:${seconds}`);

      // Session state
      const session = getCurrentSession(istDate);
      setSessionName(session.sessionName);

      // Session color mapping
      if (session.sessionName.includes('CLOSED') || session.sessionName.includes('WEEKEND')) {
        setSessionColor('text-[#ff3a3a] border-[#ff3a3a]/25 bg-[#ff3a3a]/5');
      } else if (session.sessionName === 'PRE-MARKET') {
        setSessionColor('text-[#f0a500] border-[#f0a500]/25 bg-[#f0a500]/5');
      } else if (session.sessionName === 'LUNCH') {
        setSessionColor('text-[#8892a4] border-[#8892a4]/25 bg-[#8892a4]/5');
      } else {
        // ACTIVE TRADING WINDOWS
        setSessionColor('text-[#00e5a0] border-[#00e5a0]/25 bg-[#00e5a0]/5');
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center space-x-3 bg-[#0d1117]/80 border border-[#21262d] p-1.5 px-3 rounded font-mono select-none">
      {/* Dynamic IST Clock */}
      <div className="text-right">
        <div className="text-[8px] text-[#8892a4] uppercase tracking-wider">IST TIME (UTC+5:30)</div>
        <div className="text-sm font-bold text-[#e6e6e6] tracking-widest">{time}</div>
      </div>

      <div className="h-6 w-[1px] bg-[#21262d]" />

      {/* Session State */}
      <div className="text-right">
        <div className="text-[8px] text-[#8892a4] uppercase tracking-wider">NSE SESSION</div>
        <div className={`flex items-center space-x-1.5 text-xs font-bold border px-1.5 rounded ${sessionColor}`}>
          {isScanning && (
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00e5a0] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#00e5a0]"></span>
            </span>
          )}
          <span>{sessionName}</span>
        </div>
      </div>
    </div>
  );
}
