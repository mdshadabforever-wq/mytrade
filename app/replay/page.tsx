'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Play, Pause, FastForward, Calendar, CheckCircle, RefreshCw, Star, Trash2 } from 'lucide-react';

export default function ReplaySystem() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [candles, setCandles] = useState<any[]>([]);
  const [visibleCount, setVisibleCount] = useState(5);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playSpeed, setPlaySpeed] = useState<1 | 2 | 5>(1);

  // Journal form state
  const [entryPrice, setEntryPrice] = useState('');
  const [exitPrice, setExitPrice] = useState('');
  const [direction, setDirection] = useState<'BUY' | 'SELL'>('BUY');
  const [result, setResult] = useState<'WIN' | 'LOSS' | 'BE'>('WIN');
  const [pnl, setPnl] = useState('');
  const [rr, setRr] = useState('');
  const [setupType, setSetupType] = useState('Order Block Retest');
  const [session, setSession] = useState('FIRST_WINDOW');
  const [notes, setNotes] = useState('');
  const [emotion, setEmotion] = useState('calm');
  const [rating, setRating] = useState(5);

  const [journalEntries, setJournalEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch journal logs
  const fetchJournal = async () => {
    try {
      const res = await axios.get('/api/journal');
      if (res.data?.success) {
        setJournalEntries(res.data.journal);
      }
    } catch (err) {
      console.error('Failed to get journal entries:', err);
    }
  };

  // Fetch candles on date change
  const fetchCandles = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`/api/candles?interval=5`);
      if (res.data?.candles) {
        setCandles(res.data.candles);
        setVisibleCount(10); // reset playback
      }
    } catch (err) {
      console.error('Failed to fetch candles:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCandles();
    fetchJournal();
  }, [selectedDate]);

  // Handle Playback Interval Loop
  useEffect(() => {
    let intervalId: any;
    if (isPlaying) {
      const delay = 1000 / playSpeed;
      intervalId = setInterval(() => {
        setVisibleCount(prev => {
          if (prev >= candles.length) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, delay);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isPlaying, playSpeed, candles.length]);

  const handleAddJournal = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      entryPrice,
      exitPrice,
      direction,
      result,
      pnl,
      rrAchieved: rr,
      setupType,
      session,
      notes,
      emotion,
      rating
    };

    try {
      const res = await axios.post('/api/journal', payload);
      if (res.data?.success) {
        fetchJournal();
        // Clear inputs
        setEntryPrice('');
        setExitPrice('');
        setPnl('');
        setRr('');
        setNotes('');
      }
    } catch (err) {
      console.error('Failed to log journal:', err);
    }
  };

  const handleDeleteJournal = async (id: string) => {
    try {
      const res = await axios.delete(`/api/journal?id=${id}`);
      if (res.data?.success) {
        fetchJournal();
      }
    } catch (err) {
      console.error('Failed to delete entry:', err);
    }
  };

  const visibleCandles = candles.slice(0, visibleCount);
  const latestPrice = visibleCandles[visibleCandles.length - 1]?.close || 24000;

  return (
    <div className="min-h-screen bg-[#050508] text-[#e6e6e6] p-6 font-mono relative">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,_rgba(0,0,0,0.25)_50%),_linear-gradient(90deg,_rgba(255,0,0,0.06),_rgba(0,255,0,0.02),_rgba(0,0,255,0.06))] bg-[size:100%_4px,_6px_100%] pointer-events-none z-10" />

      {/* Header Sticky Navigation */}
      <header className="sticky top-0 z-40 bg-[#050508] border-b border-[#21262d] p-3 flex items-center justify-between">
        <div>
          <h1 className="text-sm font-extrabold tracking-widest text-[#f0a500] uppercase">
            NEXUS ALPHA // VISUAL REPLAY & JOURNAL DESK
          </h1>
          <p className="text-[9px] text-[#8892a4] tracking-wider uppercase">
            Scrub candles, validate mathematical edge, and audit psychological metrics
          </p>
        </div>
      </header>

      <main className="max-w-6xl w-full mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6 relative z-20">
        
        {/* Playback Controls & SVG Candlestick Chart */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[#0d1117]/60 border border-[#21262d] p-4 rounded hover:border-[#f0a500]/25 transition-all duration-300">
            <div className="flex items-center justify-between border-b border-[#21262d] pb-2 mb-4">
              <span className="text-xs font-bold text-white uppercase flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-[#f0a500]" />
                <span>1. PLAYBACK TIMELINE REscrubber</span>
              </span>
              <div className="flex items-center space-x-2">
                <input 
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-[#050508] border border-[#21262d] text-xs p-1 rounded text-white focus:outline-none focus:border-[#f0a500]"
                />
              </div>
            </div>

            {/* Playback actions toolbar */}
            <div className="bg-[#050508] border border-[#21262d] p-3 rounded flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="p-1.5 bg-[#f0a500]/10 border border-[#f0a500]/20 rounded text-[#f0a500] hover:bg-[#f0a500]/20 transition"
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => setPlaySpeed(1)}
                    className={`px-2 py-0.5 text-[9px] font-bold border rounded transition ${playSpeed === 1 ? 'bg-[#f0a500] text-[#030305] border-[#f0a500]' : 'border-[#21262d] text-[#8892a4]'}`}
                  >
                    1X
                  </button>
                  <button
                    onClick={() => setPlaySpeed(2)}
                    className={`px-2 py-0.5 text-[9px] font-bold border rounded transition ${playSpeed === 2 ? 'bg-[#f0a500] text-[#030305] border-[#f0a500]' : 'border-[#21262d] text-[#8892a4]'}`}
                  >
                    2X
                  </button>
                  <button
                    onClick={() => setPlaySpeed(5)}
                    className={`px-2 py-0.5 text-[9px] font-bold border rounded transition ${playSpeed === 5 ? 'bg-[#f0a500] text-[#030305] border-[#f0a500]' : 'border-[#21262d] text-[#8892a4]'}`}
                  >
                    5X
                  </button>
                </div>
              </div>

              <div className="text-[10px] text-[#8892a4]">
                <span>CANDLE STACK: </span>
                <span className="text-white font-bold">{visibleCount}</span> / {candles.length}
              </div>
            </div>

            {/* Candle Chart Panel */}
            <div className="h-64 bg-[#050508] border border-[#21262d] rounded flex items-center justify-center relative">
              {loading ? (
                <RefreshCw className="w-8 h-8 text-[#f0a500] animate-spin" />
              ) : visibleCandles.length === 0 ? (
                <span className="text-xs text-[#8892a4]">No session candles resolved.</span>
              ) : (
                <div className="w-full h-full flex flex-col justify-end p-4">
                  <div className="flex items-end justify-between space-x-1 h-44 border-b border-[#21262d] pb-2">
                    {visibleCandles.slice(-30).map((c, i) => {
                      const isBullish = c.close >= c.open;
                      const barColor = isBullish ? 'bg-[#00e5a0]' : 'bg-[#ff3a3a]';
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center justify-end h-full">
                          <div className="w-1 bg-[#8892a4]/40 h-16 rounded-t" />
                          <div className={`w-full ${barColor} h-12 rounded-sm`} />
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex justify-between text-[9px] text-[#8892a4] pt-2">
                    <span>09:15 IST</span>
                    <span>LATEST SPOT: ₹{latestPrice.toLocaleString('en-IN')}</span>
                    <span>15:30 IST</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Journal Entries List */}
          <div className="bg-[#0d1117]/60 border border-[#21262d] p-4 rounded hover:border-[#f0a500]/25 transition-all duration-300">
            <h2 className="text-xs font-bold text-white uppercase border-b border-[#21262d] pb-2 mb-3">
              3. TRAILING PERFORMANCE JOURNAL LOGS
            </h2>

            {journalEntries.length === 0 ? (
              <p className="text-[10px] text-[#8892a4] py-8 text-center uppercase">No logged trade journals detected.</p>
            ) : (
              <div className="space-y-3">
                {journalEntries.map((e, i) => (
                  <div key={i} className="bg-[#050508] border border-[#21262d] p-3 rounded flex justify-between items-center text-xs">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${e.result === 'WIN' ? 'bg-[#00e5a0]/10 text-[#00e5a0]' : 'bg-[#ff3a3a]/10 text-[#ff3a3a]'}`}>{e.result}</span>
                        <span className="font-bold text-white">{e.setup_type} ({e.direction})</span>
                      </div>
                      <p className="text-[10px] text-[#8892a4] mt-1">{e.notes}</p>
                      <div className="flex items-center space-x-3 text-[9px] text-[#8892a4] mt-1.5">
                        <span>PNL: <b className={e.pnl >= 0 ? 'text-[#00e5a0]' : 'text-[#ff3a3a]'}>₹{e.pnl.toLocaleString('en-IN')}</b></span>
                        <span>R:R: <b>1:{e.rr_achieved}</b></span>
                        <span>EMOTION: <b>{e.emotion}</b></span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteJournal(e.id)}
                      className="p-1 text-[#8892a4] hover:text-[#ff3a3a] transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Journal Logging form */}
        <div className="space-y-6">
          <div className="bg-[#0d1117]/60 border border-[#21262d] p-4 rounded hover:border-[#f0a500]/25 transition-all duration-300">
            <h2 className="text-xs font-bold text-white uppercase border-b border-[#21262d] pb-2 mb-4 flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-[#f0a500]" />
              <span>2. LOG NEW TRADE OUTCOME</span>
            </h2>

            <form onSubmit={handleAddJournal} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] text-[#8892a4] font-bold">ENTRY PRICE (₹)</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={entryPrice}
                    onChange={(e) => setEntryPrice(e.target.value)}
                    className="w-full bg-[#050508] border border-[#21262d] p-2 rounded text-white focus:outline-none focus:border-[#f0a500]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] text-[#8892a4] font-bold">EXIT PRICE (₹)</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={exitPrice}
                    onChange={(e) => setExitPrice(e.target.value)}
                    className="w-full bg-[#050508] border border-[#21262d] p-2 rounded text-white focus:outline-none focus:border-[#f0a500]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] text-[#8892a4] font-bold">DIRECTION</label>
                  <select
                    value={direction}
                    onChange={(e) => setDirection(e.target.value as any)}
                    className="w-full bg-[#050508] border border-[#21262d] p-2 rounded text-white focus:outline-none"
                  >
                    <option value="BUY">BUY (LONG)</option>
                    <option value="SELL">SELL (SHORT)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] text-[#8892a4] font-bold">RESULT</label>
                  <select
                    value={result}
                    onChange={(e) => setResult(e.target.value as any)}
                    className="w-full bg-[#050508] border border-[#21262d] p-2 rounded text-white focus:outline-none"
                  >
                    <option value="WIN">WIN (PROFITABLE)</option>
                    <option value="LOSS">LOSS (STOP LOSS)</option>
                    <option value="BE">BE (BREAK EVEN)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] text-[#8892a4] font-bold">NET PNL (₹)</label>
                  <input
                    type="number"
                    required
                    value={pnl}
                    onChange={(e) => setPnl(e.target.value)}
                    className="w-full bg-[#050508] border border-[#21262d] p-2 rounded text-white focus:outline-none focus:border-[#f0a500]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] text-[#8892a4] font-bold">R:R RATIO ACHIEVED</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={rr}
                    onChange={(e) => setRr(e.target.value)}
                    className="w-full bg-[#050508] border border-[#21262d] p-2 rounded text-white focus:outline-none focus:border-[#f0a500]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] text-[#8892a4] font-bold">SETUP TYPE / ENGINE TRIGGER</label>
                <select
                  value={setupType}
                  onChange={(e) => setSetupType(e.target.value)}
                  className="w-full bg-[#050508] border border-[#21262d] p-2 rounded text-white focus:outline-none"
                >
                  <option value="Order Block Retest">SMC Order Block Retest</option>
                  <option value="Fair Value Gap Fill">SMC FVG Imbalance Fill</option>
                  <option value="CHOCH Reversal Breakout">CHOCH Reversal Breakout</option>
                  <option value="ORB Trend Breakout">ORB Trend Breakout</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] text-[#8892a4] font-bold">SESSION TIMING</label>
                <select
                  value={session}
                  onChange={(e) => setSession(e.target.value)}
                  className="w-full bg-[#050508] border border-[#21262d] p-2 rounded text-white focus:outline-none"
                >
                  <option value="FIRST_WINDOW">Morning Peak (09:30 - 11:30)</option>
                  <option value="MIDDAY_LULL">Sideways Dull (11:30 - 13:30)</option>
                  <option value="SECOND_WINDOW">Afternoon Acceleration (13:30 - 15:15)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] text-[#8892a4] font-bold">PSYCHOLOGICAL STATE (EMOTION)</label>
                <select
                  value={emotion}
                  onChange={(e) => setEmotion(e.target.value)}
                  className="w-full bg-[#050508] border border-[#21262d] p-2 rounded text-white focus:outline-none"
                >
                  <option value="calm">Calm & Disciplined</option>
                  <option value="anxious">Anxious / Over-sensitive</option>
                  <option value="greedy">Greedy / Sizing infraction</option>
                  <option value="fearful">Fearful / Early exit</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] text-[#8892a4] font-bold">TRADE SETUP RATING (1-5 STARS)</label>
                <div className="flex items-center space-x-1.5 mt-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      type="button"
                      key={star}
                      onClick={() => setRating(star)}
                      className="focus:outline-none"
                    >
                      <Star className={`w-5 h-5 ${star <= rating ? 'text-[#f0a500] fill-[#f0a500]' : 'text-[#8892a4]'}`} />
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] text-[#8892a4] font-bold">DISCIPLINE JOURNAL NOTES</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Record deviations from rules, slippage observation, or macro catalysts..."
                  className="w-full bg-[#050508] border border-[#21262d] p-2 rounded text-white h-20 placeholder-[#8892a4]/30 focus:outline-none focus:border-[#f0a500]"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-[#f0a500] hover:bg-[#f0a500]/95 text-[#030305] font-black py-2 rounded text-xs transition uppercase tracking-widest"
              >
                COMMIT LOG TO PERSISTENCE VAULT
              </button>
            </form>
          </div>
        </div>

      </main>
    </div>
  );
}
