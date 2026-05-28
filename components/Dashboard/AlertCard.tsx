import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, ChevronUp, Check, X, ShieldAlert, Zap, Layers, Sparkles } from 'lucide-react';

export interface AlertCardProps {
  alert: {
    id: string;
    timestamp: number;
    score: number;
    grade: 'HIGH' | 'MEDIUM' | 'LOW' | 'NO TRADE';
    direction: 'BULLISH' | 'BEARISH' | 'MIXED';
    layers: {
      macro: any;
      institutional: any;
      options: any;
      smc: any;
      news: any;
    };
    analysisId?: string;
    headline: string;
    summary: string;
  };
  onDismiss: (id: string) => void;
}

export function AlertCard({ alert, onDismiss }: AlertCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [streamText, setStreamText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isNoted, setIsNoted] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Border color based on conviction level
  let borderClass = 'border-l-4 border-l-[#8892a4]';
  let badgeColor = 'text-[#8892a4] bg-[#8892a4]/5 border-[#8892a4]/25';
  
  if (alert.grade === 'HIGH') {
    borderClass = 'border-l-4 border-l-[#f0a500]';
    badgeColor = 'text-[#f0a500] bg-[#f0a500]/10 border-[#f0a500]/25';
  } else if (alert.grade === 'MEDIUM') {
    borderClass = 'border-l-4 border-l-cyan-400';
    badgeColor = 'text-cyan-400 bg-cyan-400/10 border-cyan-400/25';
  }

  // Effect to handle expansion and streaming
  useEffect(() => {
    if (isExpanded && alert.analysisId && !streamText && !loading) {
      setLoading(true);
      setError(null);
      
      const sseUrl = `/api/stream-analysis?id=${alert.analysisId}`;
      const es = new EventSource(sseUrl);
      eventSourceRef.current = es;

      es.onmessage = (event) => {
        if (event.data === '[DONE]') {
          setLoading(false);
          es.close();
          return;
        }

        try {
          const parsed = JSON.parse(event.data);
          if (parsed.error) {
            setError(parsed.error);
            setLoading(false);
            es.close();
            return;
          }
          
          if (parsed.chunk) {
            setStreamText(prev => prev + parsed.chunk);
          }
        } catch (err) {
          console.error('[SSE PARSE ERROR]', err);
        }
      };

      es.onerror = (err) => {
        console.error('[SSE CONNECTION ERROR]', err);
        setError('Failed to load streaming analysis feed.');
        setLoading(false);
        es.close();
      };
    }

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [isExpanded, alert.analysisId, streamText, loading]);

  const handleToggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  const handleNoted = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsNoted(true);
  };

  // Helper to render layer validation scores (colored ticks or blocks)
  const renderLayerIndicator = (layer: any, name: string) => {
    const isBullish = layer.bias === 'BULLISH';
    const isBearish = layer.bias === 'BEARISH';
    let blockColor = 'bg-[#21262d]';
    if (isBullish) blockColor = 'bg-[#00e5a0]';
    else if (isBearish) blockColor = 'bg-[#ff3a3a]';

    return (
      <div className="flex flex-col items-center justify-center p-1 bg-[#050508] border border-[#21262d] rounded min-w-[55px]">
        <span className="text-[7px] text-[#8892a4] font-bold uppercase">{name}</span>
        <div className={`w-3.5 h-1.5 rounded-full mt-1 ${blockColor}`} />
        <span className={`text-[7px] mt-0.5 font-bold ${isBullish ? 'text-[#00e5a0]' : isBearish ? 'text-[#ff3a3a]' : 'text-[#8892a4]'}`}>
          {layer.bias}
        </span>
      </div>
    );
  };

  return (
    <div 
      className={`w-full bg-[#0d1117] border border-[#21262d] hover:border-[#21262d]/90 rounded transition-all duration-300 ${borderClass} ${
        isNoted ? 'opacity-40' : ''
      }`}
    >
      {/* Header section (Always visible) */}
      <div 
        onClick={handleToggleExpand}
        className="p-3 cursor-pointer flex flex-col justify-between"
      >
        <div className="flex justify-between items-center text-[10px]">
          <div className="flex items-center space-x-2">
            <span className={`px-2 py-0.5 border rounded font-extrabold uppercase ${badgeColor}`}>
              {alert.grade} CONVICTION
            </span>
            <span className="text-[#8892a4] font-mono">
              {new Date(alert.timestamp).toLocaleTimeString('en-US', { hour12: false })} IST
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-[9px] text-[#8892a4] font-bold">CONFLUENCE: {alert.score}/100</span>
            {isExpanded ? <ChevronUp className="w-4 h-4 text-[#8892a4]" /> : <ChevronDown className="w-4 h-4 text-[#8892a4]" />}
          </div>
        </div>

        {/* Headline details */}
        <h4 className="text-xs font-bold text-white mt-2 leading-snug">
          {alert.headline}
        </h4>

        {/* Collapsed short summary */}
        {!isExpanded && (
          <p className="text-[10px] text-[#8892a4] mt-1 line-clamp-2 leading-relaxed">
            {alert.summary}
          </p>
        )}

        {/* 5-layer score bar indicator */}
        <div className="flex space-x-1.5 mt-3">
          {renderLayerIndicator(alert.layers.macro, 'MACRO')}
          {renderLayerIndicator(alert.layers.institutional, 'INST')}
          {renderLayerIndicator(alert.layers.options, 'OPTS')}
          {renderLayerIndicator(alert.layers.smc, 'SMC')}
          {renderLayerIndicator(alert.layers.news, 'NEWS')}
        </div>
      </div>

      {/* Expanded stream area */}
      {isExpanded && (
        <div className="border-t border-[#21262d] bg-[#050508]/55 p-3 font-mono text-[10.5px] leading-relaxed text-[#e6e6e6]">
          
          <div className="flex items-center space-x-1.5 mb-2 border-b border-[#21262d] pb-1.5 text-[9px] font-bold text-[#f0a500]">
            <Sparkles className="w-3.5 h-3.5 animate-pulse" />
            <span>AI UNIFIED 5-LAYER INTELLIGENCE REPORT</span>
          </div>

          {loading && streamText === '' && (
            <div className="text-xs text-[#8892a4] flex items-center space-x-2 py-3">
              <span className="animate-spin text-[#f0a500]">•</span>
              <span>ESTABLISHING SECURE CLAUDE STREAMING CHANNEL...</span>
            </div>
          )}

          {error && (
            <div className="text-xs text-[#ff3a3a] py-2 flex items-center space-x-1.5 font-bold">
              <ShieldAlert className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Typewriter formatted stream response */}
          {streamText && (
            <pre className="whitespace-pre-wrap font-mono text-[#e6e6e6] overflow-x-auto leading-relaxed max-h-[400px] overflow-y-auto pr-1">
              {streamText}
            </pre>
          )}

          {/* Bottom Card Actions */}
          <div className="flex justify-end space-x-2 border-t border-[#21262d] pt-3 mt-3">
            <button 
              onClick={handleNoted}
              className={`text-[9px] px-2.5 py-1 rounded border font-bold flex items-center space-x-1 transition-all duration-300 ${
                isNoted 
                  ? 'bg-transparent text-[#8892a4] border-[#21262d]' 
                  : 'bg-[#00e5a0]/10 text-[#00e5a0] border-[#00e5a0]/25 hover:bg-[#00e5a0]/20'
              }`}
            >
              <Check className="w-3 h-3" />
              <span>{isNoted ? 'NOTED' : 'MARK AS NOTED'}</span>
            </button>
            <button 
              onClick={() => onDismiss(alert.id)}
              className="text-[9px] px-2.5 py-1 bg-transparent text-[#ff3a3a] border border-[#ff3a3a]/25 hover:bg-[#ff3a3a]/10 rounded font-bold flex items-center space-x-1 transition-all duration-300"
            >
              <X className="w-3 h-3" />
              <span>DISMISS SIGNAL</span>
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
