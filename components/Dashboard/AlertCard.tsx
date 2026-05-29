import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, ChevronUp, Check, X, ShieldAlert, Zap, Layers, Sparkles } from 'lucide-react';
import axios from 'axios';

export interface AlertCardProps {
  alert: {
    id: string;
    timestamp: number;
    score: number;
    grade: string;
    direction: string;
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
    obZone?: string;
    stopLossLevel?: number;
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

  // Trade tracking state machine states
  const [tradeState, setTradeState] = useState<'PENDING' | 'TAKEN' | 'SKIPPED'>('PENDING');
  const [entryPrice, setEntryPrice] = useState('');
  const [exitPrice, setExitPrice] = useState('');
  const [tradeResult, setTradeResult] = useState<'WIN' | 'LOSS' | 'BE' | null>(null);
  const [mistakeType, setMistakeType] = useState('NONE');
  const [notes, setNotes] = useState('');
  const [skipReason, setSkipReason] = useState('Setup weak laga');
  const [kiteStatus, setKiteStatus] = useState<string>('');
  const [isSaved, setIsSaved] = useState(false);

  // Initialize entry price mid-point when TAKEN is selected
  useEffect(() => {
    if (tradeState === 'TAKEN' && !entryPrice) {
      const zone = alert.obZone || '';
      const clean = zone.replace(/\s/g, '');
      const parts = clean.split('-');
      if (parts.length === 2) {
        const mid = (Number(parts[0]) + Number(parts[1])) / 2;
        setEntryPrice(mid.toString());
      } else {
        const fallback = Number(clean) || (alert.stopLossLevel ? (alert.direction === 'BULLISH' ? alert.stopLossLevel + 30 : alert.stopLossLevel - 30) : 24000);
        setEntryPrice(fallback.toString());
      }
    }
  }, [tradeState, alert, entryPrice]);

  // Kite auto-fetch completed order lookup
  useEffect(() => {
    if (tradeState === 'TAKEN') {
      setKiteStatus('Kite se auto-fetch karne ki koshish ho rahi hai...');
      
      const fetchKiteTrade = async () => {
        try {
          const dateToday = new Date().toISOString().split('T')[0];
          const directionParam = alert.direction === 'BULLISH' ? 'BUY' : 'SELL';
          const entryZoneParam = alert.obZone || '24000';
          const alertTimeParam = alert.timestamp;

          const response = await axios.get(
            `/api/kite-trades?date=${dateToday}&direction=${directionParam}&entry_zone=${entryZoneParam}&alert_time=${alertTimeParam}`
          );

          if (response.data?.success && response.data?.kite_available) {
            if (response.data.matched?.auto_match) {
              const matched = response.data.matched;
              setEntryPrice(matched.entry_price.toString());
              setKiteStatus(`Kite trade auto-matched! Entry: ₹${matched.entry_price} (${matched.tradingsymbol})`);
            } else {
              setKiteStatus('Kite connection active, but no matching order found.');
            }
          } else if (response.data?.success && !response.data?.kite_available) {
            setKiteStatus('Kite integration not configured in Settings. Manual entry required.');
          } else {
            setKiteStatus(response.data?.error || 'Failed to search Kite trades.');
          }
        } catch (err) {
          console.warn('[KITE AUTO-FETCH ERROR]', err);
          setKiteStatus('Kite lookup failed due to network or connection issue.');
        }
      };

      fetchKiteTrade();
    }
  }, [tradeState, alert]);

  const handleSaveTrade = async () => {
    try {
      const updates = {
        trader_action: 'TAKEN',
        entry_price: entryPrice ? Number(entryPrice) : null,
        exit_price: exitPrice ? Number(exitPrice) : null,
        result: tradeResult,
        pnl_points: (entryPrice && exitPrice) 
          ? (alert.direction === 'BULLISH' ? Number(exitPrice) - Number(entryPrice) : Number(entryPrice) - Number(exitPrice)) 
          : null,
        rr_achieved: (entryPrice && exitPrice && alert.stopLossLevel)
          ? Math.abs(Number(exitPrice) - Number(entryPrice)) / Math.abs(Number(entryPrice) - alert.stopLossLevel)
          : null,
        mistake_type: tradeResult === 'LOSS' ? mistakeType : 'NONE',
        notes: notes || '',
        kite_auto_fetched: kiteStatus.includes('auto-matched')
      };

      const res = await axios.patch('/api/journal', {
        alert_id: alert.id,
        ...updates
      });

      if (res.data?.success) {
        setIsSaved(true);
        setIsNoted(true);
      }
    } catch (err) {
      console.error('[SAVE TRADE ERROR]', err);
    }
  };

  const handleSaveSkip = async () => {
    try {
      const updates = {
        trader_action: 'SKIPPED',
        skip_reason: skipReason,
        notes: `Skipped: ${skipReason}`
      };

      const res = await axios.patch('/api/journal', {
        alert_id: alert.id,
        ...updates
      });

      if (res.data?.success) {
        setIsSaved(true);
        setIsNoted(true);
      }
    } catch (err) {
      console.error('[SAVE SKIP ERROR]', err);
    }
  };

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

          {/* Bottom Trade Tracking State Machine */}
          <div className="border-t border-[#21262d] bg-[#090d13]/70 p-3 mt-3 rounded font-mono text-[10px]">
            {isSaved ? (
              <div className="flex items-center space-x-2 text-[#00e5a0] py-1">
                <Check className="w-4 h-4 animate-bounce" />
                <span className="font-bold uppercase text-[10px]">TRADE JOURNAL ENTRY RECORDED SUCCESS</span>
              </div>
            ) : tradeState === 'PENDING' ? (
              <div className="flex flex-col space-y-2">
                <div className="text-[9px] text-[#8892a4] font-bold uppercase tracking-wider">JOURNAL WORKFLOW CONSOLE:</div>
                <div className="flex space-x-2">
                  <button 
                    onClick={() => setTradeState('TAKEN')}
                    className="flex-1 bg-[#00e5a0]/10 text-[#00e5a0] border border-[#00e5a0]/30 hover:bg-[#00e5a0]/20 py-1.5 px-3 rounded font-bold transition-all duration-300 flex items-center justify-center space-x-1"
                  >
                    <span>✓ TRADE LIYA</span>
                  </button>
                  <button 
                    onClick={() => setTradeState('SKIPPED')}
                    className="flex-1 bg-[#ff3a3a]/10 text-[#ff3a3a] border border-[#ff3a3a]/30 hover:bg-[#ff3a3a]/20 py-1.5 px-3 rounded font-bold transition-all duration-300 flex items-center justify-center space-x-1"
                  >
                    <span>✗ SKIP KIYA</span>
                  </button>
                </div>
              </div>
            ) : tradeState === 'TAKEN' ? (
              <div className="flex flex-col space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[#00e5a0] font-bold uppercase">STATE: TRADE ACTIVE</span>
                  <button onClick={() => setTradeState('PENDING')} className="text-[8px] text-[#8892a4] hover:text-white underline">CANCEL</button>
                </div>
                
                {/* Kite fetch indicator */}
                <div className="text-[8.5px] text-cyan-400 bg-cyan-950/20 border border-cyan-900/30 p-1.5 rounded">
                  {kiteStatus}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[8px] text-[#8892a4] uppercase font-bold">Entry Price</label>
                    <input 
                      type="number" 
                      value={entryPrice} 
                      onChange={e => setEntryPrice(e.target.value)}
                      className="w-full bg-[#050508] border border-[#21262d] text-white p-1 rounded mt-0.5 outline-none focus:border-[#00e5a0]/50" 
                    />
                  </div>
                  <div>
                    <label className="text-[8px] text-[#8892a4] uppercase font-bold">Exit Price</label>
                    <input 
                      type="number" 
                      value={exitPrice} 
                      onChange={e => setExitPrice(e.target.value)}
                      className="w-full bg-[#050508] border border-[#21262d] text-white p-1 rounded mt-0.5 outline-none focus:border-[#00e5a0]/50" 
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[8px] text-[#8892a4] uppercase font-bold block mb-1">Result</label>
                  <div className="flex space-x-1.5">
                    {(['WIN', 'LOSS', 'BE'] as const).map(res => (
                      <button
                        key={res}
                        type="button"
                        onClick={() => setTradeResult(res)}
                        className={`flex-1 py-1 rounded font-bold transition-all border text-[9px] ${
                          tradeResult === res
                            ? res === 'WIN'
                              ? 'bg-[#00e5a0]/25 text-[#00e5a0] border-[#00e5a0]'
                              : res === 'LOSS'
                              ? 'bg-[#ff3a3a]/25 text-[#ff3a3a] border-[#ff3a3a]'
                              : 'bg-cyan-500/25 text-cyan-400 border-cyan-500'
                            : 'bg-[#050508] text-[#8892a4] border-[#21262d] hover:bg-[#0d1117]'
                        }`}
                      >
                        {res}
                      </button>
                    ))}
                  </div>
                </div>

                {tradeResult === 'LOSS' && (
                  <div>
                    <label className="text-[8px] text-[#ff3a3a] uppercase font-bold">Mistake Type</label>
                    <select
                      value={mistakeType}
                      onChange={e => setMistakeType(e.target.value)}
                      className="w-full bg-[#050508] border border-[#ff3a3a]/25 text-white p-1 rounded mt-0.5 outline-none focus:border-[#ff3a3a]/50 text-[9.5px]"
                    >
                      <option value="NONE">-- Select Mistake --</option>
                      <option value="FOMO entry">FOMO entry</option>
                      <option value="SL nahi lagaya">SL nahi lagaya</option>
                      <option value="Early exit">Early exit</option>
                      <option value="Against trend">Against trend</option>
                      <option value="News time entry">News time entry</option>
                      <option value="Overtrading">Overtrading</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                )}

                <div>
                  <label className="text-[8px] text-[#8892a4] uppercase font-bold">Notes (Optional)</label>
                  <textarea 
                    value={notes} 
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Enter execution remarks..."
                    className="w-full bg-[#050508] border border-[#21262d] text-white p-1 rounded mt-0.5 h-10 outline-none resize-none text-[9.5px] focus:border-[#00e5a0]/50" 
                  />
                </div>

                <button 
                  onClick={handleSaveTrade}
                  className="w-full bg-[#00e5a0] text-black hover:bg-[#00e5a0]/90 py-1 rounded font-bold transition-all duration-300 uppercase tracking-wider text-[9.5px]"
                >
                  SAVE TRADE DETAILS
                </button>
              </div>
            ) : (
              <div className="flex flex-col space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[#ff3a3a] font-bold uppercase">STATE: SKIPPED</span>
                  <button onClick={() => setTradeState('PENDING')} className="text-[8px] text-[#8892a4] hover:text-white underline">CANCEL</button>
                </div>

                <div>
                  <label className="text-[8px] text-[#8892a4] uppercase font-bold">Skip Reason</label>
                  <select
                    value={skipReason}
                    onChange={e => setSkipReason(e.target.value)}
                    className="w-full bg-[#050508] border border-[#21262d] text-white p-1.5 rounded mt-0.5 outline-none focus:border-[#ff3a3a]/50 text-[9.5px]"
                  >
                    <option value="Setup weak laga">Setup weak laga</option>
                    <option value="News risk tha">News risk tha</option>
                    <option value="Already 3 trades le chuke">Already 3 trades le chuke</option>
                    <option value="Session avoid window">Session avoid window</option>
                    <option value="Mera conviction nahi tha">Mera conviction nahi tha</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <button 
                  onClick={handleSaveSkip}
                  className="w-full bg-[#ff3a3a] text-white hover:bg-[#ff3a3a]/90 py-1 rounded font-bold transition-all duration-300 uppercase tracking-wider text-[9.5px]"
                >
                  SAVE SKIP
                </button>
              </div>
            )}
          </div>
          
          <div className="flex justify-end space-x-2 pt-2 border-t border-[#21262d]/40">
            <button 
              onClick={() => onDismiss(alert.id)}
              className="text-[8.5px] px-2 py-0.5 bg-transparent text-[#ff3a3a] border border-[#ff3a3a]/25 hover:bg-[#ff3a3a]/10 rounded font-bold flex items-center space-x-1 transition-all duration-300"
            >
              <X className="w-2.5 h-2.5" />
              <span>DISMISS ALERT</span>
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
