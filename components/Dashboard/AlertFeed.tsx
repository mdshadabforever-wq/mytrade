import React from 'react';
import { AlertCard } from './AlertCard';
import { ShieldAlert, Zap } from 'lucide-react';

export interface AlertFeedProps {
  alerts: any[];
  onDismissAlert: (id: string) => void;
}

export function AlertFeed({ alerts, onDismissAlert }: AlertFeedProps) {
  const activeAlerts = alerts.filter(a => !a.isDismissed);

  return (
    <div className="w-full bg-[#0d1117]/85 border border-[#21262d] p-3 rounded font-mono select-none flex flex-col">
      {/* Feed Header */}
      <div className="flex items-center justify-between border-b border-[#21262d] pb-2 mb-3">
        <div className="flex items-center space-x-2">
          <Zap className="w-4 h-4 text-[#f0a500] animate-pulse" />
          <span className="text-xs font-bold text-[#e6e6e6]">INTELLIGENCE SIGNAL ALERTS</span>
          {activeAlerts.length > 0 && (
            <span className="text-[9px] px-1.5 py-0.5 bg-[#f0a500]/10 text-[#f0a500] border border-[#f0a500]/25 rounded-full font-bold">
              {activeAlerts.length} ACTIVE
            </span>
          )}
        </div>
        <span className="text-[8px] text-[#8892a4] uppercase font-bold tracking-wider">CLAUDE-OPUS HIERARCHICAL ANALYSIS</span>
      </div>

      {/* Feed list */}
      <div className="flex flex-col space-y-3 max-h-[480px] overflow-y-auto pr-1">
        {activeAlerts.map(alert => (
          <AlertCard 
            key={alert.id}
            alert={alert}
            onDismiss={onDismissAlert}
          />
        ))}

        {activeAlerts.length === 0 && (
          <div className="flex flex-col items-center justify-center p-6 border border-[#21262d] border-dashed rounded bg-[#050508]/40">
            <ShieldAlert className="w-8 h-8 text-[#8892a4] mb-2" />
            <h5 className="text-[11px] font-bold text-white uppercase">NO ACTIVE SIGNAL TRIGGERS</h5>
            <p className="text-[9px] text-[#8892a4] text-center mt-1 leading-normal max-w-xs font-sans">
              All 5 layers are being actively scanned. Typewriter alerts activate automatically when composite confluence metrics reach high probability criteria ({'>'}=60).
            </p>
          </div>
        )}
      </div>

    </div>
  );
}
