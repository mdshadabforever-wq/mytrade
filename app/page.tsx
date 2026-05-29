'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { 
  Play, Square, RefreshCw, Layers, ShieldAlert, Cpu, 
  ArrowUpRight, ArrowDownRight, Compass, Landmark, Flame, 
  Calendar, Zap, Sparkles, TrendingUp, TrendingDown, Target, HelpCircle, Activity, LogOut
} from 'lucide-react';
import { detectSMC } from '@/lib/smc-engine';
import { calculateConfluence } from '@/lib/confluence-scorer';
import { calculateMarketMood } from '@/lib/market-mood';
import { calculateRelativeStrength } from '@/lib/relative-strength';
import { classifyBuildup } from '@/lib/futures-engine';
import { runHistoricalSimulation } from '@/lib/backtest-engine';
import { formatPrice } from '@/lib/utils';
import { getCurrentSession, getISTDate } from '@/lib/nifty-sessions';

// Custom inline sub-components to keep types centralized and clean
import { SMCChartPanel } from '@/components/Dashboard/SMCChartPanel';
import { AlertFeed } from '@/components/Dashboard/AlertFeed';
import { GlobalContextBar } from '@/components/Dashboard/GlobalContextBar';
import { NewsPanel } from '@/components/Dashboard/NewsPanel';
import { OptionIntelPanel } from '@/components/Dashboard/OptionIntelPanel';

export default function NexusAlphaTerminal() {
  const router = useRouter();
  // Navigation & scanning controls
  const [interval, setInterval] = useState('5'); // default 5M
  const [isScanning, setIsScanning] = useState(true);
  const [countdown, setCountdown] = useState(30); 
  const [lastUpdated, setLastUpdated] = useState<string>('--:--:--');

  // Backtest / Simulation Console states
  const [selectedStrategy, setSelectedStrategy] = useState<'ORB' | 'SMC_OB'>('ORB');
  const [simulationResult, setSimulationResult] = useState<any>(null);
  const [showSimModal, setShowSimModal] = useState(false);

  // Search filter for stocks
  const [stockSearch, setStockSearch] = useState('');

  // Primary Data states
  const [candlesData, setCandlesData] = useState<any[]>([]);
  const [giftNifty, setGiftNifty] = useState<any>(null);
  const [institutional, setInstitutional] = useState<any>(null);
  const [vixData, setVixData] = useState<any>(null);
  const [sectorsData, setSectorsData] = useState<any[]>([]);
  const [stocksData, setStocksData] = useState<any[]>([]);
  const [newsData, setNewsData] = useState<any>(null);
  const [regimeData, setRegimeData] = useState<any>(null);
  const [optionChainData, setOptionChainData] = useState<any>(null);
  const [participantOI, setParticipantOI] = useState<any>(null);
  const [globalCues, setGlobalCues] = useState<any>(null);
  const [commodities, setCommodities] = useState<any>(null);

  // Local computed metrics
  const [smcSignals, setSmcSignals] = useState<any[]>([]);
  const [confluenceResult, setConfluenceResult] = useState<any>(null);
  const [moodResult, setMoodResult] = useState<any>(null);
  const [relativeStrengthRankings, setRelativeStrengthRankings] = useState<any>(null);

  // AI alerts feed state
  const [alerts, setAlerts] = useState<any[]>([]);

  // Toast overlay states
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  
  // Daily report generation gating state
  const [reportGeneratedToday, setReportGeneratedToday] = useState(false);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 5000);
  };

  // Navigation Tab State
  const [activeTab, setActiveTab] = useState<'WAR-ROOM' | 'JOURNAL'>('WAR-ROOM');

  // AI Daily/Weekly/Monthly Reporting States
  const [reportsList, setReportsList] = useState<any[]>([]);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [reportTypeFilter, setReportTypeFilter] = useState<'DAILY' | 'WEEKLY' | 'MONTHLY'>('DAILY');
  const [selectedDateString, setSelectedDateString] = useState(new Date().toISOString().split('T')[0]);
  const [reportGenerating, setReportGenerating] = useState(false);

  const fetchReports = async () => {
    try {
      const res = await axios.get('/api/reports');
      if (res.data?.success) {
        setReportsList(res.data.reports);
        if (res.data.reports.length > 0 && !selectedReport) {
          loadReportDetails(res.data.reports[0].type, res.data.reports[0].filename);
        }
      }
    } catch (err: any) {
      console.error('[FETCH REPORTS ERROR]', err.message);
    }
  };

  const loadReportDetails = async (type: string, filename: string) => {
    try {
      const res = await axios.get(`/api/reports?type=${type}&filename=${filename}`);
      if (res.data?.success) {
        setSelectedReport(res.data.report);
      }
    } catch (err: any) {
      console.error('[LOAD REPORT DETAILS ERROR]', err.message);
    }
  };

  const handleGenerateReport = async () => {
    setReportGenerating(true);
    try {
      const res = await axios.post('/api/reports', {
        type: reportTypeFilter,
        dateString: selectedDateString
      });
      if (res.data?.success) {
        await fetchReports();
        if (res.data.report) {
          const filename = `${reportTypeFilter.toLowerCase()}_report_${selectedDateString}.json`;
          loadReportDetails(reportTypeFilter, filename);
        }
      }
    } catch (err: any) {
      console.error('[GENERATE REPORT ERROR]', err.message);
    } finally {
      setReportGenerating(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'JOURNAL') {
      fetchReports();
    }
  }, [activeTab]);

  // Replay Mode States
  const [isReplayMode, setIsReplayMode] = useState(false);
  const [replayIndex, setReplayIndex] = useState(5);
  const [replayPlaying, setReplayPlaying] = useState(false);

  // Participant-wise F&O OI — fetch on mount, refresh every 30 min
  useEffect(() => {
    const fetchParticipantOI = async () => {
      try {
        const res = await axios.get('/api/participant-oi');
        if (res.data?.fii) setParticipantOI(res.data);
      } catch (err) {
        console.warn('[PARTICIPANT OI FETCH ERROR]', err);
      }
    };
    fetchParticipantOI();
    const oiTimer = window.setInterval(fetchParticipantOI, 30 * 60 * 1000);
    return () => window.clearInterval(oiTimer);
  }, []);

  // Timeout fallback for Market Regime Agent
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!regimeData) {
        let mockBias: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
        if (candlesData && candlesData.length >= 10) {
          const last10 = candlesData.slice(-10);
          const bullishCount = last10.filter(c => c.close > c.open).length;
          const bearishCount = last10.filter(c => c.close < c.open).length;
          if (bullishCount >= 6) mockBias = 'BULLISH';
          else if (bearishCount >= 6) mockBias = 'BEARISH';
        }
        setRegimeData({
          regime: mockBias === 'BULLISH' ? 'TRENDING_UP' : mockBias === 'BEARISH' ? 'TRENDING_DOWN' : 'RANGING',
          bias: mockBias,
          confidence: 75,
          explanation: 'NEUTRAL — Range Session (MOCK)'
        });
      }
    }, 3000);
    return () => clearTimeout(timer);
  }, [regimeData, candlesData]);

  // AI Broker Desk (Kite MCP Gateway) States
  const [chatMessages, setChatMessages] = useState<any[]>([
    { role: 'assistant', content: 'Greetings, Commander. I am your local AI Broker Desk (Kite MCP). Ask me anything about your active positions, trading history, sector rotation, or index trends.' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Replay timeline player timer effect
  useEffect(() => {
    let intervalId: any;
    if (isReplayMode && replayPlaying) {
      intervalId = window.setInterval(() => {
        setReplayIndex(prev => {
          if (prev >= candlesData.length) {
            setReplayPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isReplayMode, replayPlaying, candlesData.length]);

  // Auto-scroll chat window
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, chatLoading]);

  // Inline basic Markdown parser for Kite MCP responses
  const renderMcpMarkdown = (text: string) => {
    const lines = text.split('\n');
    let isTable = false;

    return lines.map((line, idx) => {
      const trimmed = line.trim();

      // Handle Callouts
      if (trimmed.startsWith('>')) {
        let content = trimmed.substring(1).trim();
        let alertBorder = 'border-l-2 border-cyan-500 bg-[#0d1117]/80';
        let alertTitle = 'NOTE';
        let titleColor = 'text-cyan-400';

        if (content.startsWith('[!WARNING]')) {
          content = content.replace('[!WARNING]', '').trim();
          alertBorder = 'border-l-2 border-[#ff3a3a] bg-[#ff3a3a]/5';
          alertTitle = 'WARNING';
          titleColor = 'text-[#ff3a3a]';
        } else if (content.startsWith('[!NOTE]')) {
          content = content.replace('[!NOTE]', '').trim();
          alertBorder = 'border-l-2 border-cyan-400 bg-cyan-400/5';
          alertTitle = 'NOTE';
          titleColor = 'text-cyan-400';
        } else if (content.startsWith('[!TIP]')) {
          content = content.replace('[!TIP]', '').trim();
          alertBorder = 'border-l-2 border-[#f0a500] bg-[#f0a500]/5';
          alertTitle = 'TIP';
          titleColor = 'text-[#f0a500]';
        } else if (content.startsWith('[!IMPORTANT]')) {
          content = content.replace('[!IMPORTANT]', '').trim();
          alertBorder = 'border-l-2 border-[#f0a500] bg-[#f0a500]/5';
          alertTitle = 'IMPORTANT';
          titleColor = 'text-[#f0a500]';
        }

        const cleanContent = content.replace(/^>\s*/, '');
        if (!cleanContent) return null;

        return (
          <div key={idx} className={`p-2 my-1.5 rounded-r font-mono text-[9px] ${alertBorder}`}>
            <span className={`font-bold ${titleColor}`}>[{alertTitle}]</span> {parseInlineFormatting(cleanContent)}
          </div>
        );
      }

      // Handle Table Rows
      if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
        const cells = trimmed.split('|').map(c => c.trim()).filter((_, i, arr) => i > 0 && i < arr.length - 1);
        
        if (cells.every(c => c.startsWith(':') || c.startsWith('-') || c.endsWith(':') || c.endsWith('-'))) {
          return null;
        }

        if (!isTable) {
          isTable = true;
          return (
            <div key={idx} className="w-full overflow-x-auto my-1 border border-[#21262d] rounded bg-[#050508]/50">
              <table className="w-full text-[9px] font-mono text-left">
                <thead>
                  <tr className="bg-[#0d1117] border-b border-[#21262d] text-[#8892a4]">
                    {cells.map((cell, cIdx) => (
                      <th key={cIdx} className="p-1 px-2 font-bold uppercase">{cell}</th>
                    ))}
                  </tr>
                </thead>
              </table>
            </div>
          );
        }

        return (
          <div key={idx} className="w-full overflow-x-auto border-x border-b border-[#21262d] bg-[#050508]/20 last:rounded-b">
            <table className="w-full text-[9px] font-mono text-left">
              <tbody>
                <tr className="hover:bg-[#0d1117]/60 text-white">
                  {cells.map((cell, cIdx) => {
                    const isGreen = cell.includes('text-[#00e5a0]') || cell.includes('+');
                    const isRed = cell.includes('text-[#ff3a3a]') || cell.includes('-');
                    let textColor = 'text-[#e6e6e6]';
                    if (isGreen) textColor = 'text-[#00e5a0]';
                    else if (isRed) textColor = 'text-[#ff3a3a]';
                    
                    const cleanCellText = cell.replace(/<\/?[^>]+(>|$)/g, "").replace(/\*\*|`/g, "");
                    return (
                      <td key={cIdx} className={`p-1 px-2 ${textColor}`}>{cleanCellText}</td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        );
      } else {
        isTable = false;
      }

      // Handle Headers
      if (trimmed.startsWith('###')) {
        return (
          <div key={idx} className="text-[10px] font-bold text-white border-b border-[#21262d]/60 pb-1 mt-3 mb-2 flex items-center space-x-1.5">
            <span className="h-1.5 w-1.5 bg-[#f0a500] rounded-sm" />
            <span>{trimmed.substring(3).trim()}</span>
          </div>
        );
      }

      // Handle Bullet Lists
      if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
        return (
          <div key={idx} className="pl-3.5 relative text-[9.5px] text-[#8892a4] my-1 font-sans">
            <span className="absolute left-1.5 top-1.5 h-1 w-1 bg-[#f0a500] rounded-full" />
            {parseInlineFormatting(trimmed.substring(1).trim())}
          </div>
        );
      }

      const isNumList = /^\d+\.\s/.test(trimmed);
      if (isNumList) {
        const dotIdx = trimmed.indexOf('.');
        return (
          <div key={idx} className="pl-3 text-[9.5px] text-[#8892a4] my-1 font-sans">
            <span className="font-bold text-[#f0a500]">{trimmed.substring(0, dotIdx + 1)}</span> {parseInlineFormatting(trimmed.substring(dotIdx + 1).trim())}
          </div>
        );
      }

      if (!trimmed) return <div key={idx} className="h-1.5" />;

      return (
        <div key={idx} className="text-[9.5px] text-[#8892a4] leading-relaxed my-1 font-sans">
          {parseInlineFormatting(trimmed)}
        </div>
      );
    });
  };

  const parseInlineFormatting = (text: string) => {
    const parts = [];
    let currentText = text;

    while (currentText) {
      const boldStart = currentText.indexOf('**');
      const codeStart = currentText.indexOf('`');

      if (boldStart === -1 && codeStart === -1) {
        parts.push(currentText);
        break;
      }

      const firstTokenIdx = (boldStart !== -1 && (codeStart === -1 || boldStart < codeStart)) ? boldStart : codeStart;
      const isBold = firstTokenIdx === boldStart;

      if (firstTokenIdx > 0) {
        parts.push(currentText.substring(0, firstTokenIdx));
      }

      const marker = isBold ? '**' : '`';
      const rem = currentText.substring(firstTokenIdx + marker.length);
      const endIdx = rem.indexOf(marker);

      if (endIdx === -1) {
        parts.push(currentText.substring(firstTokenIdx));
        break;
      }

      const innerContent = rem.substring(0, endIdx);
      if (isBold) {
        parts.push(<strong key={parts.length} className="text-white font-extrabold">{innerContent}</strong>);
      } else {
        parts.push(<code key={parts.length} className="px-1 py-0.5 rounded bg-[#050508] border border-[#21262d] text-[#f0a500] font-mono text-[8.5px]">{innerContent}</code>);
      }

      currentText = rem.substring(endIdx + marker.length);
    }

    return parts;
  };

  const handleSendChatMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = chatInput.trim();
    if (!query) return;

    setChatMessages(prev => [...prev, { role: 'user', content: query }]);
    setChatInput('');
    setChatLoading(true);

    try {
      const response = await axios.post('/api/mcp', { message: query });
      if (response.data?.success) {
        setChatMessages(prev => [...prev, { role: 'assistant', content: response.data.response }]);
      } else {
        setChatMessages(prev => [...prev, { role: 'assistant', content: `> [!WARNING]\n> Failed to query MCP: ${response.data?.message || 'Unknown issue'}` }]);
      }
    } catch (err: any) {
      setChatMessages(prev => [...prev, { role: 'assistant', content: `> [!WARNING]\n> Network error communicating with MCP gateway: ${err.message}` }]);
    } finally {
      setChatLoading(false);
    }
  };

  // Diagnostics & loading states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isInitialFetch = useRef(true);

  // Fetch all layers in parallel
  const fetchAllData = async () => {
    try {
      if (isInitialFetch.current) {
        setLoading(true);
      }

      // Fetch unified market context from our single, structured API
      const contextRes = await axios.get('/api/market-context');
      const context = contextRes.data ?? null;

      if (!context) throw new Error('Failed to load market-context API');

      // Fetch index candles
      const candlesRes = await axios.get(`/api/candles?interval=${interval}`);
      const candles = candlesRes.data?.candles ?? [];

      // Fetch news
      const newsRes = await axios.get('/api/news');
      const news = newsRes.data ?? null;

      // Fetch option chain flows
      const optionChainRes = await axios.get('/api/option-chain');
      const optionChain = optionChainRes.data ?? null;

      // Extract context details
      const { giftNifty: gift, institutional: inst, vix, sectors, stocks, regime, globalCues: gc, commodities: comms } = context;

      setCandlesData(candles);
      setGiftNifty(gift);
      setInstitutional(inst);
      setVixData(vix);
      setSectorsData(sectors);
      setStocksData(stocks);
      setNewsData(news);
      setRegimeData(regime);
      setOptionChainData(optionChain);
      setGlobalCues(gc || null);
      setCommodities(comms || null);
      setError(null);
      setLastUpdated(new Date().toLocaleTimeString('en-US', { hour12: false }));

      // 🕒 Automated Daily Intelligence Report Generation (at >= 15:35 IST)
      const nowIST = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
      const hours = nowIST.getHours();
      const minutes = nowIST.getMinutes();
      const isAfterReportTime = (hours > 15) || (hours === 15 && minutes >= 35);
      const isTradingDay = nowIST.getDay() >= 1 && nowIST.getDay() <= 5;

      if (isAfterReportTime && isTradingDay && !reportGeneratedToday) {
        setReportGeneratedToday(true);
        showToast("Daily report generating...", "info");
        
        const yyyy = nowIST.getFullYear();
        const mm = String(nowIST.getMonth() + 1).padStart(2, '0');
        const dd = String(nowIST.getDate()).padStart(2, '0');
        const todayDateStr = `${yyyy}-${mm}-${dd}`;

        axios.post('/api/reports', {
          type: 'DAILY',
          dateString: todayDateStr
        }).then(res => {
          if (res.data?.success) {
            showToast("Daily report generated successfully!", "success");
            fetchReports(); // Refresh list
          } else {
            showToast("Daily report generation failed.", "error");
          }
        }).catch(err => {
          console.error('[AUTO-REPORT ERROR]', err);
          showToast("Daily report generation encountered an error.", "error");
        });
      }
    } catch (err: any) {
      console.error('[NEXUS ALPHA POLL ERROR]', err);
      setError('Terminal interface handshake failed.');
    } finally {
      setLoading(false);
      isInitialFetch.current = false;
    }
  };

  // 🧪 Unified Reactive Local Calculations & Confluence Scoring Loop
  useEffect(() => {
    if (candlesData.length === 0) return;

    // Resolve current timeline visible slice for replay or live mode
    const visibleCandles = isReplayMode ? candlesData.slice(0, replayIndex) : candlesData;
    const latestCandle = visibleCandles[visibleCandles.length - 1];
    if (!latestCandle) return;

    const latestPrice = latestCandle.close ?? 24000;
    const indexReturn = visibleCandles.length > 0 ? ((latestPrice - visibleCandles[0].open) / visibleCandles[0].open) * 100 : 0.0;

    // 1. Run local client-side SMC Engine
    const smcResult = detectSMC(visibleCandles);
    setSmcSignals(smcResult.signals);

    // 2. Relative Strength Calculations
    if (stocksData && stocksData.length > 0) {
      const rs = calculateRelativeStrength(stocksData, indexReturn);
      setRelativeStrengthRankings(rs);
    }

    // 3. Market Mood Score
    if (vixData && institutional && newsData) {
      const mood = calculateMarketMood({
        vix: vixData.current,
        fiiNetCash: institutional.fii.cash,
        pcr: optionChainData?.pcr ?? 1.05,
        newsSentiment: newsData.overallNewsSentiment ?? 'MIXED',
        currentPrice: latestPrice,
        maxPain: optionChainData?.maxPain ?? 24000
      });
      setMoodResult(mood);
    }

    // 4. Confluence Scoring & No-Trade Detection
    const topStock = stocksData[0] || null;
    if (topStock && regimeData && sectorsData && vixData && newsData) {
      const targetSector = sectorsData.find((s: any) => s.name === topStock.sector) || sectorsData[0];
      
      const hasUnmitigatedOb = smcResult.orderBlocks.some(ob => !ob.isMitigated);
      const hasUnfilledFvg = smcResult.fairValueGaps.some(fvg => !fvg.isFilled && fvg.filledPercent < 50);
      const hasChoch = smcResult.signals.some(s => s.type === 'CHOCH');
      const hasBos = smcResult.signals.some(s => s.type === 'BOS');

      const istNow = getISTDate();
      const session = getCurrentSession(istNow);
      const timeMinutes = (istNow.getHours() - 9) * 60 + istNow.getMinutes() - 15;

      const alignedIndicesCount = [
        regimeData?.bias === 'BULLISH',
        sectorsData?.some((s: any) => s.bias === 'BULLISH'),
        smcResult.trend === 'BULLISH'
      ].filter(Boolean).length;

      const confluenceInput = {
        macro: {
          giftNiftyDirection: giftNifty?.direction || 'FLAT',
          giftNiftyGap: giftNifty?.gap || giftNifty?.gapPoints || 0,
          alignedIndicesCount,
          globalBias: regimeData?.bias || 'MIXED'
        },
        institutional: {
          fiiCash: institutional?.fii?.cash || 0,
          diiCash: institutional?.dii?.cash || 0,
          // Augment cash-flow direction with F&O OI participant bias when available
          fiiDirection: (participantOI?.fii?.direction === 'LONG'
            ? 'BUYING'
            : participantOI?.fii?.direction === 'SHORT'
            ? 'SELLING'
            : institutional?.fii?.cash > 1000 ? 'BUYING' : institutional?.fii?.cash < -1000 ? 'SELLING' : 'NEUTRAL') as any,
          diiDirection: (institutional?.dii?.cash > 1000 ? 'BUYING' : institutional?.dii?.cash < -1000 ? 'SELLING' : 'NEUTRAL') as any
        },
        options: {
          pcr: optionChainData?.pcr || 1.0,
          vix: vixData?.current || 14.5,
          isPriceAboveMaxPain: latestPrice > (optionChainData?.maxPain || 24000),
          isObSupporting: smcResult.orderBlocks.some(ob => !ob.isMitigated && ob.type === 'BULLISH')
        },
        structure: {
          hasChoch: smcResult.signals.some((s: any) => s.type === 'CHOCH'),
          hasBos: smcResult.signals.some((s: any) => s.type === 'BOS'),
          hasUnmitigatedOb: smcResult.orderBlocks.some(ob => !ob.isMitigated),
          hasUnfilledFvg: smcResult.fairValueGaps.some(fvg => !fvg.isFilled && fvg.filledPercent < 50),
          hasLiquiditySweep: smcResult.signals.some((s: any) => s.type === 'BSL_SWEEP' || s.type === 'SSL_SWEEP')
        },
        risk: {
          timeOfDayMinutes: timeMinutes,
          isHighImpactEventToday: newsData?.highImpactEventToday || false,
          isHolidayTomorrow: false,
          volumePercentOfAverage: 80,
          sectorDispersion: {
            strongestChange: Math.max(...sectorsData.map((s: any) => s.changePercent || 0)),
            weakestChange: Math.min(...sectorsData.map((s: any) => s.changePercent || 0))
          }
        }
      };

      const confluence = calculateConfluence(confluenceInput);
      setConfluenceResult(confluence);

      // 5. Run backtesting on Nifty index candles dynamically with realistic costs!
      const backtest = runHistoricalSimulation(visibleCandles, selectedStrategy);
      setSimulationResult(backtest);

      // 6. Trigger Smart Alert Rules (only in non-replay live modes to save cost)
      if (!isReplayMode) {
        // Daily alert cap = 5 maximum. When 5 alerts fired today, raise threshold to 85 for rest of day
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const alertsTodayCount = alerts.filter(a => a.timestamp >= startOfToday.getTime()).length;
        const scoreThreshold = alertsTodayCount >= 5 ? 85 : 60;

        // Deduplication: Same direction + same OB zone = suppress for 30 minutes
        const activeOb = smcResult.orderBlocks?.find(ob => !ob.isMitigated);
        const obZoneStr = activeOb ? `${activeOb.low}-${activeOb.high}` : 'no-ob-zone';
        const isSameObZoneSuppressed = alerts.some(a => 
          a.direction === (confluence.direction === 'BUY' ? 'BULLISH' : 'BEARISH') &&
          a.obZone === obZoneStr &&
          a.obZone !== 'no-ob-zone' &&
          (Date.now() - a.timestamp) < 1800000 // 30 minutes
        );

        // If SL level broken, suppress that direction for rest of session
        const isBullishSlBroken = alerts.some(a => 
          a.direction === 'BULLISH' && 
          a.stopLossLevel && 
          latestPrice <= a.stopLossLevel
        );
        const isBearishSlBroken = alerts.some(a => 
          a.direction === 'BEARISH' && 
          a.stopLossLevel && 
          latestPrice >= a.stopLossLevel
        );
        const isDirectionSuppressed = (confluence.direction === 'BUY' && isBullishSlBroken) ||
                                      (confluence.direction === 'SELL' && isBearishSlBroken);

        // Session gates: opening avoid window, closing avoid window, or Thursday expiry post 14:00 IST
        const isSessionGateActive = session.isAvoidWindow || session.isExpiryAfternoon;

        const qualifiesForAlert = 
          confluence.shouldAlert && 
          session.canScan && 
          !isSessionGateActive &&
          confluence.total >= scoreThreshold &&
          !isSameObZoneSuppressed &&
          !isDirectionSuppressed;

        if (qualifiesForAlert) {
          const alreadySignaled = alerts.some(a => 
            a.grade === confluence.grade && 
            Math.abs(a.score - confluence.total) <= 2 &&
            (Date.now() - a.timestamp) < 600000 // 10 minutes throttle
          );

          if (!alreadySignaled) {
            triggerClaudeAnalysis(
              topStock.symbol,
              regimeData,
              targetSector,
              topStock,
              topStock,
              smcResult,
              confluenceInput.risk,
              confluence,
              visibleCandles,
              latestPrice
            );
          }
        }
      }
    }
  }, [
    candlesData,
    isReplayMode,
    replayIndex,
    selectedStrategy,
    regimeData,
    sectorsData,
    stocksData,
    vixData,
    newsData,
    institutional,
    optionChainData
  ]);

  // Trigger Claude streaming quantitative setups
  const triggerClaudeAnalysis = async (
    symbol: string,
    regime: any,
    sector: any,
    stock: any,
    futures: any,
    smc: any,
    risk: any,
    confluence: any,
    candles: any[],
    currentPrice: number
  ) => {
    try {
      const response = await axios.post('/api/analyze', {
        symbol,
        candles,
        smcSignals: smc.signals,
        marketContext: {
          giftNifty,
          globalCues: {
            dow: { changePercent: 0.15 },
            nasdaq: { changePercent: 0.35 },
            nikkei: { changePercent: 0.45 },
            hangseng: { changePercent: -0.12 }
          },
          commodities: {
            crude: { price: 81.8, changePercent: -0.4 },
            usdinr: { price: 83.38, change: 0.04 },
            us10y: { yield: 4.42, change: 0.01 }
          },
          institutional: {
            fii: { cash: institutional?.fii?.cash || 0, futuresNet: institutional?.fii?.futures || 0, longShortRatio: institutional?.fii?.longShortRatio || 1.0, direction: institutional?.fii?.direction || 'NEUTRAL' },
            dii: { cash: institutional?.dii?.cash || 0, direction: institutional?.dii?.direction || 'NEUTRAL' }
          },
          overallGlobalBias: regime?.bias || 'MIXED'
        },
        optionChain: {
          pcr: optionChainData?.pcr || 1.05,
          maxPain: optionChainData?.maxPain || 24000,
          daysToExpiry: optionChainData?.daysToExpiry || 6,
          callWalls: optionChainData?.callWalls || [],
          putWalls: optionChainData?.putWalls || [],
          atmIV: optionChainData?.atmIV || 14.2
        },
        vix: {
          current: vixData?.current || 14.5,
          trend: vixData?.trend || 'FLAT',
          level: vixData?.level || 'NORMAL'
        },
        news: {
          overallNewsSentiment: newsData?.overallNewsSentiment || 'MIXED',
          highImpactEventToday: newsData?.highImpactEventToday || false,
          items: newsData?.items || []
        },
        interval,
        currentPrice,
        confluenceResult: confluence
      });

      if (response.data?.success && response.data?.analysisId) {
        const activeOb = smc.orderBlocks?.find((ob: any) => !ob.isMitigated);
        const obZoneStr = activeOb ? `${activeOb.low}-${activeOb.high}` : 'no-ob-zone';
        const stopLossLevel = confluence.direction === 'BUY'
          ? (activeOb ? activeOb.low : currentPrice - 30)
          : (activeOb ? activeOb.high : currentPrice + 30);

        const riskAmount = Math.abs(currentPrice - stopLossLevel) || 30;
        const target1 = confluence.direction === 'BUY' ? (currentPrice + riskAmount * 1.5) : (currentPrice - riskAmount * 1.5);
        const target2 = confluence.direction === 'BUY' ? (currentPrice + riskAmount * 2.5) : (currentPrice - riskAmount * 2.5);

        const localAlert = {
          id: response.data.analysisId, // Sync local ID with API analysis ID
          timestamp: Date.now(),
          score: confluence.total,
          grade: confluence.grade,
          direction: confluence.direction === 'BUY' ? 'BULLISH' as const : 'BEARISH' as const,
          layers: {
            macro: { bias: regime.bias },
            institutional: { bias: institutional?.fii?.cash >= 0 ? 'BULLISH' : 'BEARISH' },
            options: { bias: 'BULLISH' }, // default
            smc: { bias: smc.trend },
            news: { bias: newsData?.overallNewsSentiment ?? 'NEUTRAL' }
          },
          analysisId: response.data.analysisId,
          headline: `NEXUS ALPHA ALERT: ${symbol} (${stock.sector}) setup`,
          summary: `Stock relative strength rank stands at ${stock.relativeStrength}%. Price breaks ORB boundary with ${stock.buildup.replace('_', ' ')} confirmed.`,
          obZone: obZoneStr,
          stopLossLevel,
          target1,
          target2
        };

        // 💾 Auto-save fired A/A+ alert directly to the journal
        const journalPayload = {
          alert_id: response.data.analysisId,
          date: new Date().toISOString().split('T')[0],
          alert_time: Date.now(),
          grade: confluence.grade,
          confluence_score: confluence.total,
          direction: confluence.direction,
          entry_zone: obZoneStr,
          stop_loss: stopLossLevel,
          target1: target1,
          target2: target2,
          
          layer1_macro_score: confluence.layers.macro.score,
          layer1_macro_reason: confluence.layers.macro.reason,
          layer2_institutional_score: confluence.layers.institutional.score,
          layer2_fii_flow: institutional?.fii?.cash?.toString() || '0',
          layer2_dii_flow: institutional?.dii?.cash?.toString() || '0',
          layer2_participant_oi: participantOI?.fii?.direction || 'NEUTRAL',
          layer3_options_score: confluence.layers.options.score,
          layer3_pcr: optionChainData?.pcr || 1.0,
          layer3_vix: vixData?.current || 14.5,
          layer3_max_pain: optionChainData?.maxPain || 24000,
          layer4_smc_score: confluence.layers.structure.score,
          layer4_signals: smc.signals.map((s: any) => s.type),
          layer5_risk_score: confluence.layers.risk.score,
          layer5_session: risk.session || '',
          
          gift_nifty_gap: giftNifty?.gap?.toString() || giftNifty?.gapPoints?.toString() || '0',
          global_bias: regime?.bias || 'MIXED',
          sector_leading: sector?.name || 'NIFTY IT',
          
          ai_analysis: '',
          trader_action: 'PENDING',
          skip_reason: null,
          entry_price: null,
          exit_price: null,
          exit_time: null,
          result: null,
          pnl_points: null,
          rr_achieved: null,
          mistake_type: null,
          notes: null,
          kite_trade_id: null,
          kite_auto_fetched: false
        };

        axios.post('/api/journal', journalPayload)
          .then(() => showToast(`Auto-Journaled ${confluence.grade} Alert!`, 'success'))
          .catch(err => console.warn('[AUTO JOURNAL SAVE ERROR]', err));

        setAlerts(prev => [localAlert, ...prev]);
      }
    } catch (err: any) {
      console.error('[API TRIGGER CLAUDE ERROR]', err.message);
    }
  };

  const handleForceAIAnalysis = () => {
    if (stocksData.length > 0 && regimeData && sectorsData.length > 0 && vixData && newsData) {
      const topStock = stocksData[0];
      const targetSector = sectorsData.find((s: any) => s.name === topStock.sector) || sectorsData[0];
      const latestPrice = candlesData[candlesData.length - 1]?.close ?? 24000;
      
      const smcResult = detectSMC(candlesData);
      const hasUnmitigatedOb = smcResult.orderBlocks.some(ob => !ob.isMitigated);
      const hasUnfilledFvg = smcResult.fairValueGaps.some(fvg => !fvg.isFilled && fvg.filledPercent < 50);
      const hasChoch = smcResult.signals.some(s => s.type === 'CHOCH');
      const hasBos = smcResult.signals.some(s => s.type === 'BOS');

      const risk = {
        isOpeningBuffer: false,
        isClosingBuffer: false,
        isHighVolatility: vixData.current > 25,
        isChoppyIndex: false
      };

      if (confluenceResult) {
        triggerClaudeAnalysis(
          topStock.symbol,
          regimeData,
          targetSector,
          topStock,
          topStock,
          smcResult,
          risk,
          confluenceResult,
          candlesData,
          latestPrice
        );
      }
    }
  };

  // Scanning loops
  useEffect(() => {
    fetchAllData();
  }, [interval, selectedStrategy]);

  useEffect(() => {
    let timer: any;
    
    if (isScanning) {
      timer = window.setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            fetchAllData();
            return 30; // Reset loop
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timer) window.clearInterval(timer);
    };
  }, [isScanning, interval]);

  const handleDismissAlert = (id: string) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, isDismissed: true } : a));
  };

  const handleLogout = async () => {
    try {
      const response = await axios.delete('/api/auth');
      if (response.data?.success) {
        router.refresh();
        router.push('/login');
      }
    } catch (err: any) {
      console.error('[DASHBOARD] Logout failed:', err.message);
    }
  };

  // Filtered stocks list for table
  const filteredStocks = stocksData.filter(stock => 
    stock.symbol.toLowerCase().includes(stockSearch.toLowerCase()) || 
    stock.sector.toLowerCase().includes(stockSearch.toLowerCase())
  );

  const visibleCandles = isReplayMode ? candlesData.slice(0, replayIndex) : candlesData;
  const indexClosePrice = visibleCandles[visibleCandles.length - 1]?.close ?? 24050;
  const indexOpenPrice = visibleCandles[0]?.open ?? 24000;

  return (
    <div className="min-h-screen bg-[#050508] text-[#e6e6e6] flex flex-col font-sans pb-16">
      {/* Toast Notification Overlay */}
      {toastMessage && (
        <div className={`fixed top-4 right-4 p-4 border rounded text-[11px] font-mono font-bold flex items-center space-x-3 z-[99999] bg-[#0d1117]/95 shadow-2xl transition-all duration-500 ${
          toastMessage.type === 'success' 
            ? 'border-[#00e5a0]/40 text-[#00e5a0]' 
            : toastMessage.type === 'error'
            ? 'border-[#ff3a3a]/40 text-[#ff3a3a]'
            : 'border-[#f0a500]/40 text-[#f0a500]'
        }`}>
          <span>{toastMessage.text}</span>
        </div>
      )}
      
      {/* 1. Market Regime Sticky Bar */}
      <GlobalContextBar 
        data={loading && isInitialFetch.current ? null : { 
          marketContext: {
            globalCues: globalCues || {
              dow: { price: 39850, changePercent: 0.15 },
              sp500: { price: 5320, changePercent: 0.22 },
              nasdaq: { price: 18650, changePercent: 0.35 },
              nikkei: { price: 38700, changePercent: 0.45 },
              hangseng: { price: 18150, changePercent: -0.12 }
            },
            commodities: commodities || {
              crude: { price: 81.8, changePercent: -0.4 },
              gold: { price: 2345.5, changePercent: 0.12 },
              usdinr: { price: 83.38, change: 0.04 },
              us10y: { yield: 4.42, change: 0.01 }
            },
            giftNifty,
            institutional
          }, 
          optionChain: optionChainData || {
            pcr: 1.05,
            maxPain: 24000,
            daysToExpiry: 6
          },
          vix: vixData 
        }} 
      />

      {/* 2. Platform Branding Header */}
      <div className="w-full bg-[#050508] border-b border-[#21262d] p-3 px-4 flex flex-col md:flex-row items-center justify-between font-mono gap-3">
        <div className="flex items-center space-x-3">
          <Sparkles className="w-5 h-5 text-[#f0a500] animate-pulse" />
          <h1 className="text-sm font-extrabold tracking-widest text-[#f0a500] uppercase">
            NEXUS ALPHA // INDIAN INTRADAY TRADING DESK
          </h1>
        </div>

        {/* Dynamic Navigation Tabs */}
        <div className="flex items-center space-x-2 text-[10px] font-bold">
          <button 
            onClick={() => setActiveTab('WAR-ROOM')}
            className={`px-3 py-1.5 rounded flex items-center space-x-1.5 transition-all duration-300 ${
              activeTab === 'WAR-ROOM'
                ? 'bg-[#f0a500]/10 text-[#f0a500] border border-[#f0a500]/30'
                : 'bg-[#050508] text-[#8892a4] hover:text-[#e6e6e6] border border-[#21262d] hover:border-[#8892a4]/40'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>WAR-ROOM TERMINAL</span>
          </button>

          <button 
            onClick={() => setActiveTab('JOURNAL')}
            className={`px-3 py-1.5 rounded flex items-center space-x-1.5 transition-all duration-300 ${
              activeTab === 'JOURNAL'
                ? 'bg-[#f0a500]/10 text-[#f0a500] border border-[#f0a500]/30'
                : 'bg-[#050508] text-[#8892a4] hover:text-[#e6e6e6] border border-[#21262d] hover:border-[#8892a4]/40'
            }`}
          >
            <Calendar className="w-3.5 h-3.5 text-[#f0a500]" />
            <span>MARKET JOURNAL</span>
          </button>
          
          <button 
            onClick={() => router.push('/settings')}
            className="px-3 py-1.5 bg-[#050508] text-[#8892a4] hover:text-[#e6e6e6] border border-[#21262d] hover:border-[#8892a4]/40 rounded flex items-center space-x-1.5 transition-all duration-300"
          >
            <Cpu className="w-3.5 h-3.5 text-[#f0a500]" />
            <span>INTEGRATION SETTINGS</span>
          </button>

          <button 
            onClick={handleLogout}
            className="px-3 py-1.5 bg-[#ff3a3a]/10 text-[#ff3a3a] border border-[#ff3a3a]/25 hover:border-[#ff3a3a]/50 rounded flex items-center space-x-1.5 transition-all duration-300"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>LOGOUT</span>
          </button>
        </div>

        <div className="flex items-center space-x-2 text-[10px] text-[#8892a4]">
          <span>AGENT SCOPE: NIFTY 50 EQUITIES</span>
          <span className="h-2 w-2 rounded-full bg-[#00e5a0]" />
        </div>
      </div>

      {/* 3. Regime Banner */}
      <div className="w-full bg-[#0d1117]/60 border-b border-[#21262d] p-3 px-4 grid grid-cols-1 md:grid-cols-3 gap-3 font-mono">
        {/* Regime State */}
        <div className="flex items-center space-x-3 bg-[#050508]/85 border border-[#21262d] p-2 rounded">
          <Activity className="w-7 h-7 text-[#f0a500]" />
          <div>
            <div className="text-[8px] text-[#8892a4] uppercase tracking-wider font-bold">MARKET REGIME AGENT</div>
            <div className="text-xs font-bold text-white uppercase">{regimeData?.regime?.replace('_', ' ') ?? 'LOADING'}</div>
          </div>
        </div>

        {/* Bias Banner */}
        <div className="flex items-center space-x-3 bg-[#050508]/85 border border-[#21262d] p-2 rounded">
          {regimeData?.bias === 'BULLISH' ? <ArrowUpRight className="w-7 h-7 text-[#00e5a0]" /> : <ArrowDownRight className="w-7 h-7 text-[#ff3a3a]" />}
          <div>
            <div className="text-[8px] text-[#8892a4] uppercase tracking-wider font-bold">INTRADAY TREND BIAS</div>
            <div className={`text-xs font-bold uppercase ${regimeData?.bias === 'BULLISH' ? 'text-[#00e5a0]' : regimeData?.bias === 'BEARISH' ? 'text-[#ff3a3a]' : 'text-[#8892a4]'}`}>
              {regimeData?.bias ?? 'NEUTRAL'} ({regimeData?.confidence ?? 0}% Confidence)
            </div>
          </div>
        </div>

        {/* IST Clock */}
        <div className="flex items-center justify-between bg-[#050508]/85 border border-[#21262d] p-2 rounded">
          <div className="flex items-center space-x-2">
            <Compass className="w-5 h-5 text-[#f0a500]" />
            <div>
              <div className="text-[8px] text-[#8892a4] uppercase tracking-wider font-bold">NSE INTEL RADAR</div>
              <p className="text-[10px] text-white max-w-[180px] line-clamp-1 leading-normal font-sans">
                {regimeData?.explanation ?? 'Initializing scanning matrix...'}
              </p>
            </div>
          </div>
          {isScanning && (
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00e5a0] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00e5a0]"></span>
            </span>
          )}
        </div>
      </div>

      {activeTab === 'WAR-ROOM' ? (
        <main className="flex-grow p-4 grid grid-cols-1 xl:grid-cols-3 gap-4">
          
          {/* LEFT/CENTER Columns: Chart, Sectors, RS, Simulation (2/3 width) */}
          <div className="xl:col-span-2 flex flex-col space-y-4">
            
            {/* 🕰️ Candle-by-Candle Replay & Backtest Timeline Console */}
            <div className="bg-[#0d1117] border border-[#21262d] p-3 rounded font-mono select-none">
              <div className="flex flex-col sm:flex-row items-center justify-between border-b border-[#21262d]/50 pb-2.5 mb-2.5 gap-2.5">
                <div className="flex items-center space-x-2.5">
                  <Activity className={`w-4.5 h-4.5 ${isReplayMode ? 'text-indigo-600 animate-pulse font-bold' : 'text-[#f0a500]'}`} />
                  <div>
                    <span className="text-xs font-black text-[#0f172a] uppercase tracking-wider">
                      {isReplayMode ? '🕰️ INTRA-SESSION CANDLE REPLAY ACTIVE' : '📡 NIFTY LIVE RADAR STREAM'}
                    </span>
                    <p className="text-[8px] text-[#475569] uppercase font-bold mt-0.5 leading-none">
                      {isReplayMode ? 'Simulating historical chronological feed with cost friction' : 'Receiving active market ticks and institutional flow updates'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => {
                      setIsReplayMode(!isReplayMode);
                      setReplayIndex(Math.min(5, candlesData.length));
                      setReplayPlaying(false);
                    }}
                    className={`px-3 py-1 text-[9px] font-black rounded uppercase tracking-wider border transition-all duration-300 ${
                      isReplayMode
                        ? 'bg-[#ff3a3a]/10 border-[#ff3a3a]/30 text-[#ff3a3a] hover:bg-[#ff3a3a]/20'
                        : 'bg-[#6366f1]/10 border-[#6366f1]/30 text-[#6366f1] hover:bg-[#6366f1]/20 animate-pulse'
                    }`}
                  >
                    {isReplayMode ? 'Exit Replay' : 'Enter Replay Mode'}
                  </button>
                </div>
              </div>

              {isReplayMode && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#050508]/40 border border-[#21262d] p-2.5 rounded">
                  {/* Playback Controls */}
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setReplayIndex(Math.max(5, replayIndex - 1))}
                      disabled={replayIndex <= 5}
                      className="px-2 py-1 bg-white border border-slate-200 rounded text-[9px] font-bold text-slate-800 hover:border-slate-400 disabled:opacity-30 transition-all duration-200"
                      title="Step Backward"
                    >
                      Step back
                    </button>

                    <button
                      onClick={() => setReplayPlaying(!replayPlaying)}
                      className={`px-3 py-1 rounded text-[9px] font-black uppercase tracking-wider flex items-center space-x-1.5 transition-all duration-200 ${
                        replayPlaying
                          ? 'bg-[#ff3a3a]/15 text-[#ff3a3a] border border-[#ff3a3a]/30'
                          : 'bg-[#00e5a0]/15 text-[#00e5a0] border border-[#00e5a0]/30 animate-pulse'
                      }`}
                    >
                      <span>{replayPlaying ? 'Pause' : 'Play Timeline'}</span>
                    </button>

                    <button
                      onClick={() => setReplayIndex(Math.min(candlesData.length, replayIndex + 1))}
                      disabled={replayIndex >= candlesData.length}
                      className="px-2 py-1 bg-white border border-slate-200 rounded text-[9px] font-bold text-slate-800 hover:border-slate-400 disabled:opacity-30 transition-all duration-200"
                      title="Step Forward"
                    >
                      Step forward
                    </button>
                  </div>

                  {/* Scrubber slider */}
                  <div className="flex-grow flex items-center space-x-3 w-full sm:w-auto">
                    <input
                      type="range"
                      min={5}
                      max={candlesData.length}
                      value={replayIndex}
                      onChange={(e) => setReplayIndex(parseInt(e.target.value))}
                      className="flex-grow accent-[#6366f1] h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                    />
                    <span className="text-[10px] text-slate-700 font-bold font-mono min-w-[70px] text-right">
                      {replayIndex}/{candlesData.length} Candles
                    </span>
                  </div>

                  {/* Speed/Time indicator */}
                  <div className="text-[9.5px] text-[#475569] font-bold font-mono">
                    Time: <span className="text-[#d97706]">{candlesData[replayIndex - 1]?.timestamp ? new Date(candlesData[replayIndex - 1].timestamp).toLocaleTimeString('en-US', {hour12:false}) : '--:--:--'}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Main SVG Candlestick Chart */}
            <SMCChartPanel
              candles={visibleCandles}
              signals={smcSignals}
              optionChain={optionChainData || {
                callWalls: [{ strike: 24100 }],
                putWalls: [{ strike: 23900 }],
                pcr: 1.05,
                maxPain: 24000,
                daysToExpiry: 6
              }}
              currentPrice={indexClosePrice}
              interval={interval}
              onIntervalChange={(tf) => setInterval(tf)}
            />

            {/* Option Wall Heatmap & Derivatives Intel grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <OptionIntelPanel optionChain={optionChainData} />
              
              <div className="bg-[#0d1117] border border-[#21262d] p-3 rounded font-mono select-none">
                <div className="flex items-center space-x-2 border-b border-[#21262d] pb-2 mb-3 text-white font-bold text-xs uppercase">
                  <Landmark className="w-4 h-4 text-[#f0a500]" />
                  <span>DERIVATIVES INTELLIGENCE SUMMARY</span>
                </div>
                
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-[#050508] border border-[#21262d] p-2 rounded">
                    <div className="text-[7.5px] text-[#8892a4] font-bold">PUT-CALL RATIO</div>
                    <div className="text-lg font-bold text-white mt-1">
                      {optionChainData?.pcr ?? '1.05'}
                      <span className="text-[9px] text-[#8892a4] font-normal ml-1">(BULLISH)</span>
                    </div>
                    <div className="text-[7px] text-[#8892a4] mt-1 font-sans">Neutral support threshold</div>
                  </div>
                  
                  <div className="bg-[#050508] border border-[#21262d] p-2 rounded">
                    <div className="text-[7.5px] text-[#8892a4] font-bold">MAX PAIN GRAVITY</div>
                    <div className="text-lg font-bold text-[#f0a500] mt-1">{optionChainData?.maxPain ?? '24000'}</div>
                    <div className="text-[7px] text-[#8892a4] mt-1 font-sans">Index trading near Equilibrium gravity</div>
                  </div>
                  
                  <div className="bg-[#050508] border border-[#21262d] p-2 rounded">
                    <div className="text-[7.5px] text-[#8892a4] font-bold">ATM IMPLIED VOLATILITY</div>
                    <div className="text-lg font-bold text-white mt-1">14.3%</div>
                    <div className="text-[7px] text-[#8892a4] mt-1 font-sans">Option pricing premiums represent stable hedging expectations</div>
                  </div>
                  
                  <div className="bg-[#050508] border border-[#21262d] p-2 rounded">
                    <div className="text-[7.5px] text-[#8892a4] font-bold">IV PERCENTILE (30d)</div>
                    <div className="text-lg font-bold text-[#f0a500] mt-1">35%</div>
                    <div className="w-full h-1 bg-[#161b22] rounded overflow-hidden mt-1.5">
                      <div className="h-full bg-[#f0a500]" style={{ width: '35%' }} />
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-1 text-[8px] text-[#8892a4] mt-2 font-sans border-t border-[#21262d]/50 pt-2">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>weekly derivatives contracts expire in {optionChainData?.daysToExpiry ?? 7} days on thursday, no theta alerts triggered</span>
                </div>
              </div>
            </div>

            {/* Sector Rotation Heatmap list */}
            <div className="bg-[#0d1117] border border-[#21262d] p-3 rounded font-mono select-none">
              <div className="flex items-center space-x-2 border-b border-[#21262d] pb-2 mb-3 text-white font-bold text-xs uppercase">
                <Flame className="w-4 h-4 text-[#f0a500]" />
                <span>SECTOR ROTATION HEATMAP <span className="text-[8.5px] font-normal text-[#8892a4] ml-1">(15 SECTOR INDEX TRACKERS)</span></span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                {sectorsData.slice(0, 10).map((sec, idx) => {
                  const chg = sec.changePercent;
                  const isUp = chg >= 0;
                  const color = isUp ? 'text-[#00e5a0]' : 'text-[#ff3a3a]';
                  const bg = isUp ? 'bg-[#00e5a0]/5' : 'bg-[#ff3a3a]/5';
                  
                  return (
                    <div 
                      key={idx} 
                      className={`p-2 rounded border border-[#21262d] hover:border-[#f0a500]/25 transition-all duration-300 cursor-pointer ${bg}`}
                    >
                      <div className="text-[9px] text-[#8892a4] truncate uppercase tracking-wide font-extrabold">{sec.name.replace('NIFTY ', '')}</div>
                      <div className={`text-xs font-bold mt-1.5 font-mono ${color}`}>{chg >= 0 ? '+' : ''}{chg}%</div>
                      <div className="flex justify-between items-center text-[7px] text-[#8892a4] mt-1 font-sans uppercase">
                        <span>{sec.leadingStock}</span>
                        <span className="font-extrabold">{sec.momentum.substring(0,4)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 2. Nifty 50 Relative Strength & Stock Futures Scanner */}
            <div className="bg-[#0d1117] border border-[#21262d] p-3 rounded font-mono select-none">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-[#21262d] pb-2 mb-3">
                <div className="flex items-center space-x-2">
                  <Target className="w-4 h-4 text-[#f0a500]" />
                  <span className="text-xs font-bold text-white uppercase">NIFTY 50 RELATIVE STRENGTH & FUTURES SCANNER</span>
                </div>
                
                {/* Search bar */}
                <input
                  type="text"
                  placeholder="SEARCH SYMBOL OR SECTOR..."
                  value={stockSearch}
                  onChange={(e) => setStockSearch(e.target.value)}
                  className="mt-2 sm:mt-0 text-[10px] bg-[#050508] border border-[#21262d] p-1 px-2 rounded text-[#e6e6e6] focus:outline-none focus:border-[#f0a500]/60 w-48 font-mono uppercase"
                />
              </div>

              {/* Dense table */}
              <div className="w-full overflow-x-auto max-h-[300px] overflow-y-auto pr-1">
                <table className="w-full text-[10px] text-left divide-y divide-[#21262d]">
                  <thead className="text-[8px] text-[#8892a4] font-bold uppercase bg-[#050508]/40">
                    <tr>
                      <th className="p-2">SYMBOL</th>
                      <th className="p-2">SECTOR</th>
                      <th className="p-2 text-right">PRICE (₹)</th>
                      <th className="p-2 text-right">CHANGE (%)</th>
                      <th className="p-2 text-right">REL. STRENGTH (%)</th>
                      <th className="p-2 text-center">FUTURES OI BUILDUP</th>
                      <th className="p-2 text-center">ORB STATUS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#21262d]/50">
                    {filteredStocks.map((stock, idx) => {
                      const rsColor = stock.relativeStrength >= 0 ? 'text-[#00e5a0]' : 'text-[#ff3a3a]';
                      const chgColor = stock.changePercent >= 0 ? 'text-[#00e5a0]' : 'text-[#ff3a3a]';
                      
                      const buildupInfo = classifyBuildup(stock.changePercent, stock.oiChangePercent);

                      return (
                        <tr 
                          key={idx}
                          className="hover:bg-[#050508]/50 transition-all duration-300"
                        >
                          <td className="p-2 font-bold text-white">{stock.symbol}</td>
                          <td className="p-2 text-[#8892a4] text-[9px] truncate max-w-[120px]">{stock.sector.replace('NIFTY ', '')}</td>
                          <td className="p-2 text-right font-mono font-semibold">{formatPrice(stock.price)}</td>
                          <td className={`p-2 text-right font-mono font-bold ${chgColor}`}>
                            {stock.changePercent >= 0 ? '+' : ''}{stock.changePercent}%
                          </td>
                          <td className={`p-2 text-right font-mono font-bold ${rsColor}`}>
                            {stock.relativeStrength >= 0 ? '+' : ''}{stock.relativeStrength}%
                          </td>
                          <td className="p-2 text-center">
                            <span className={`text-[8.5px] px-1.5 py-0.5 rounded font-extrabold border bg-[#050508] ${
                              buildupInfo.buildup === 'LONG_BUILDUP' ? 'text-[#00e5a0] border-[#00e5a0]/15' :
                              buildupInfo.buildup === 'SHORT_BUILDUP' ? 'text-[#ff3a3a] border-[#ff3a3a]/15' :
                              buildupInfo.buildup === 'LONG_UNWINDING' ? 'text-[#ff9f00] border-[#ff9f00]/15' :
                              'text-cyan-400 border-cyan-400/15'
                            }`}>
                              {stock.buildup.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="p-2 text-center">
                            <span className={`text-[8px] px-1 rounded font-bold ${
                              stock.orbStatus === 'BULLISH_BREAKOUT' ? 'text-[#00e5a0] bg-[#00e5a0]/5' :
                              stock.orbStatus === 'BEARISH_BREAKOUT' ? 'text-[#ff3a3a] bg-[#ff3a3a]/5' :
                              'text-[#8892a4] bg-[#21262d]/20'
                            }`}>
                              {stock.orbStatus.replace('_', ' ')}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredStocks.length === 0 && (
                      <tr>
                        <td colSpan={7} className="p-4 text-center text-[#8892a4] italic">
                          NO SYMBOLS MATCHING THE ACTIVE RADAR CRITERIA
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 3. Backtesting Simulation Console Panel */}
            <div className="bg-[#0d1117] border border-[#21262d] p-3 rounded font-mono select-none">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-[#21262d] pb-2 mb-3">
                <div className="flex items-center space-x-2">
                  <Compass className="w-4 h-4 text-[#f0a500]" />
                  <span className="text-xs font-bold text-white uppercase">INTRADAY HISTORICAL REPLAY SIMULATOR</span>
                </div>

                <div className="flex items-center space-x-2 mt-2 sm:mt-0">
                  <span className="text-[9px] text-[#8892a4] font-bold">STRATEGY:</span>
                  <select
                    value={selectedStrategy}
                    onChange={(e) => setSelectedStrategy(e.target.value as any)}
                    className="bg-[#050508] border border-[#21262d] text-[9.5px] p-1 rounded text-[#e6e6e6] focus:outline-none w-36 font-mono"
                  >
                    <option value="ORB">ORB (Breakout)</option>
                    <option value="SMC_OB">SMC (OB Retest)</option>
                  </select>
                </div>
              </div>

              {simulationResult ? (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  {/* Stats cards */}
                  <div className="bg-[#050508] border border-[#21262d] p-2 rounded">
                    <div className="text-[8px] text-[#8892a4] font-bold">TOTAL SIMULATED TRADES</div>
                    <div className="text-lg font-bold text-white mt-0.5">{simulationResult.totalTrades}</div>
                    <div className="text-[7.5px] text-[#8892a4] mt-1 font-sans">
                      Winning: <span className="text-[#00e5a0]">{simulationResult.wins}</span> | Losing: <span className="text-[#ff3a3a]">{simulationResult.losses}</span>
                    </div>
                  </div>

                  <div className="bg-[#050508] border border-[#21262d] p-2 rounded">
                    <div className="text-[8px] text-[#8892a4] font-bold">WIN RATE EXPECTANCY</div>
                    <div className="text-lg font-bold text-[#00e5a0] mt-0.5">{simulationResult.winRatePercent}%</div>
                    <div className="w-full h-1 bg-[#161b22] rounded-full overflow-hidden mt-1.5">
                      <div className="h-full bg-[#00e5a0]" style={{ width: `${simulationResult.winRatePercent}%` }} />
                    </div>
                  </div>

                  <div className="bg-[#050508] border border-[#21262d] p-2 rounded">
                    <div className="text-[8px] text-[#8892a4] font-bold">PROFIT FACTOR RATIO</div>
                    <div className="text-lg font-bold text-[#f0a500] mt-0.5">{simulationResult.profitFactor}</div>
                    <div className="text-[7.5px] text-[#8892a4] mt-1 font-sans">
                      Sharpe Ratio expectation: {simulationResult.sharpeRatio}
                    </div>
                  </div>

                  <div className="bg-[#050508] border border-[#21262d] p-2 rounded flex flex-col justify-between">
                    <div>
                      <div className="text-[8px] text-[#8892a4] font-bold">NET PN EXPECTANCY</div>
                      <div className={`text-lg font-bold mt-0.5 ${simulationResult.totalPnlPoints >= 0 ? 'text-[#00e5a0]' : 'text-[#ff3a3a]'}`}>
                        {simulationResult.totalPnlPoints >= 0 ? '+' : ''}{simulationResult.totalPnlPoints} pts
                      </div>
                    </div>
                    <button 
                      onClick={() => setShowSimModal(true)}
                      className="text-[7px] text-right font-extrabold text-[#f0a500] hover:underline uppercase block tracking-wider"
                    >
                      VIEW SIMULATED LEDGER →
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center p-4 text-[9px] text-[#8892a4] border border-[#21262d] border-dashed rounded">
                  COMPILING REPLAY HISTORY STATS...
                </div>
              )}
            </div>

          </div>

          {/* RIGHT Column: AI Alerts, Economic Wire & News sentiment (1/3 width) */}
          <div className="xl:col-span-1 flex flex-col space-y-4">
            
            {/* 🛡️ No-Trade Advisory Locked Shield Badge */}
            {confluenceResult?.noTradeStatus?.isNoTradeActive && (
              <div className="w-full bg-[#fffbeb] border border-amber-200 p-3.5 rounded font-mono select-none flex flex-col hover:shadow-md transition-all duration-300 border-l-4 border-l-amber-500">
                <div className="flex items-center space-x-2 pb-2 mb-2 border-b border-amber-200/60">
                  <ShieldAlert className="w-5 h-5 text-amber-600 animate-pulse" />
                  <div>
                    <span className="text-xs font-black text-amber-800 uppercase tracking-wider">NO A+ SETUPS TODAY</span>
                    <p className="text-[7.5px] text-amber-700 font-bold uppercase mt-0.5 leading-none">
                      Tactical Capital Protection Lock Active — Overtrading Prevented
                    </p>
                  </div>
                </div>

                <p className="text-[10px] text-amber-800 leading-normal mb-2.5 font-sans">
                  {confluenceResult.noTradeStatus.blockReason}
                </p>

                {/* Display active filter locks as badges */}
                <div className="flex flex-wrap gap-1.5 mb-2.5">
                  {confluenceResult.noTradeStatus.activeFilters.map((flt: string, fidx: number) => (
                    <span 
                      key={fidx}
                      className="text-[8px] px-1.5 py-0.5 bg-amber-600 text-white font-extrabold rounded uppercase tracking-wider"
                    >
                      {flt.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>

                <div className="p-2 rounded bg-amber-600/5 border border-amber-200/50 text-[9px] leading-relaxed text-amber-800 font-sans">
                  {confluenceResult.noTradeStatus.recommendingAction}
                </div>
              </div>
            )}

            {/* AI Intelligence Alerts Feed */}
            <AlertFeed 
              alerts={isReplayMode 
                ? alerts.filter(a => {
                    const lastCandle = visibleCandles[visibleCandles.length - 1];
                    if (!lastCandle) return false;
                    const lastTime = typeof lastCandle.timestamp === 'string' ? new Date(lastCandle.timestamp).getTime() : (lastCandle.timestamp instanceof Date ? lastCandle.timestamp.getTime() : lastCandle.timestamp as number);
                    return a.timestamp <= lastTime;
                  })
                : alerts
              }
              onDismissAlert={handleDismissAlert}
            />

            {/* AI Intraday Broker Assistant (Kite MCP Gateway) */}
            <div className="bg-[#0d1117]/80 backdrop-blur border border-[#21262d] p-3 rounded font-mono flex flex-col select-none h-[380px] hover:border-[#f0a500]/25 transition-all duration-300">
              <div className="flex items-center justify-between border-b border-[#21262d] pb-2 mb-2">
                <div className="flex items-center space-x-2 text-white font-bold text-xs">
                  <Sparkles className="w-4 h-4 text-[#f0a500] animate-pulse" />
                  <span>AI BROKER DESK (KITE MCP)</span>
                </div>
                <div className="flex items-center space-x-1.5 text-[8px] text-[#8892a4] bg-[#050508] border border-[#21262d] px-1.5 py-0.5 rounded uppercase">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#00e5a0]" />
                  <span>LOCAL MCP</span>
                </div>
              </div>

              {/* Chat messages viewport */}
              <div className="flex-1 overflow-y-auto pr-1 flex flex-col space-y-2 mb-2 scrollbar-thin scrollbar-thumb-[#21262d] scrollbar-track-transparent">
                {chatMessages.map((msg, index) => {
                  const isAssistant = msg.role === 'assistant';
                  return (
                    <div 
                      key={index} 
                      className={`p-2 rounded text-[9.5px] max-w-[95%] leading-relaxed ${
                        isAssistant 
                          ? 'bg-[#161b22]/40 border border-[#21262d]/50 self-start text-[#e6e6e6]' 
                          : 'bg-[#f0a500]/10 border border-[#f0a500]/20 self-end text-[#ffffff] font-sans'
                      }`}
                    >
                      {isAssistant ? (
                        <div className="space-y-1">
                          {renderMcpMarkdown(msg.content)}
                        </div>
                      ) : (
                        <span>{msg.content}</span>
                      )}
                    </div>
                  );
                })}
                
                {chatLoading && (
                  <div className="flex items-center space-x-1.5 text-[9px] text-[#8892a4] p-1.5 self-start">
                    <Activity className="w-3 h-3 animate-spin text-[#f0a500]" />
                    <span className="animate-pulse">DESK ANALYZING LEDGER VECTOR...</span>
                  </div>
                )}
                
                <div ref={chatBottomRef} />
              </div>

              {/* Chat input box */}
              <form onSubmit={handleSendChatMessage} className="flex space-x-1.5 pt-2 border-t border-[#21262d]/50">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ask Kite MCP about positions, sectors..."
                  disabled={chatLoading}
                  className="flex-1 bg-[#050508] border border-[#21262d] p-1.5 rounded text-[10px] text-white focus:outline-none focus:border-[#f0a500]/60 placeholder-[#8892a4]/40 font-sans"
                />
                <button
                  type="submit"
                  disabled={chatLoading}
                  className="px-3 bg-[#f0a500] hover:bg-[#f0a500]/90 text-[#030305] font-black rounded text-[9px] transition-all duration-300 flex items-center justify-center disabled:opacity-50 uppercase tracking-wider"
                >
                  <span>SEND</span>
                </button>
              </form>
            </div>

            {/* Economic Risks and Sentiment Wire */}
            <NewsPanel 
              newsData={newsData} 
            />

            {/* Participant-wise F&O OI Panel */}
            <div className="bg-[#0d1117] border border-[#21262d] p-3 rounded font-mono select-none">
              <div className="flex items-center space-x-2 border-b border-[#21262d] pb-2 mb-3">
                <Landmark className="w-4 h-4 text-[#f0a500]" />
                <span className="text-xs font-bold text-[#e6e6e6] uppercase">F&amp;O Participant OI</span>
                <span className="text-[8px] text-[#8892a4]">(EOD NSE)</span>
                {participantOI?.source === 'LIVE' && (
                  <span className="ml-auto text-[7px] px-1 bg-[#00e5a0]/10 text-[#00e5a0] border border-[#00e5a0]/20 rounded uppercase font-bold">LIVE</span>
                )}
                {(!participantOI || participantOI?.source === 'MOCK') && (
                  <span className="ml-auto text-[7px] px-1 bg-[#f0a500]/10 text-[#f0a500] border border-[#f0a500]/20 rounded uppercase font-bold">MOCK</span>
                )}
              </div>

              {participantOI ? (
                <div className="flex flex-col space-y-1.5">
                  {[
                    { label: 'FII', data: participantOI.fii },
                    { label: 'DII', data: participantOI.dii },
                    { label: 'PRO', data: participantOI.pro },
                    { label: 'RETAIL', data: participantOI.retail }
                  ].map(({ label, data }) => (
                    <div key={label} className="flex items-center justify-between bg-[#050508] border border-[#21262d] px-2.5 py-1.5 rounded">
                      <span className="text-[9px] font-bold text-[#8892a4] w-12">{label}</span>
                      <span className="text-[9px] font-mono text-white flex-1 text-center">
                        {data?.netOI >= 0 ? '+' : ''}{(data?.netOI ?? 0).toLocaleString()} contracts
                      </span>
                      <span className={`text-[8px] font-black px-1.5 py-0.5 rounded ${
                        data?.direction === 'LONG'
                          ? 'bg-[#00e5a0]/10 text-[#00e5a0] border border-[#00e5a0]/25'
                          : data?.direction === 'SHORT'
                          ? 'bg-[#ff3a3a]/10 text-[#ff3a3a] border border-[#ff3a3a]/25'
                          : 'bg-[#21262d] text-[#8892a4] border border-[#21262d]'
                      }`}>
                        {data?.direction ?? 'NEUTRAL'}
                      </span>
                    </div>
                  ))}
                  <div className="text-[7px] text-[#8892a4] mt-1 font-sans">Date: {participantOI.date}</div>
                </div>
              ) : (
                <div className="text-[9px] text-[#8892a4] animate-pulse">FETCHING PARTICIPANT OI DATA...</div>
              )}
            </div>

            {/* Technical Diagnostics Terminal */}
            <div className="bg-[#0d1117] border border-[#21262d] p-3 rounded font-mono select-none text-[10.5px]">
              <div className="flex items-center space-x-2 border-b border-[#21262d] pb-2 mb-3 text-white font-bold text-xs">
                <Layers className="w-4 h-4 text-[#f0a500]" />
                <span>TERMINAL DIAGNOSTICS LOGS</span>
              </div>
              
              <div className="flex flex-col space-y-2 text-[#8892a4]">
                <div className="flex justify-between">
                  <span>LOCAL TIME:</span>
                  <span className="text-white" suppressHydrationWarning>{new Date().toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>CANDLES LOADED:</span>
                  <span className="text-[#00e5a0]">{candlesData.length} (INTERVAL: {interval}M)</span>
                </div>
                <div className="flex justify-between">
                  <span>DATA SOURCE ACTIVE:</span>
                  <span className="text-[#f0a500] font-bold">{process.env.NEXT_PUBLIC_DATA_SOURCE || 'MOCK/HYBRID'}</span>
                </div>
                <div className="flex justify-between">
                  <span>LAST POLL SEQUENCE:</span>
                  <span className="text-white">{lastUpdated}</span>
                </div>
                <div className="flex justify-between">
                  <span>CONFLUENCE ALIGNMENTS:</span>
                  <span className="text-[#00e5a0]">{confluenceResult?.direction ?? 'WAIT'} ({confluenceResult?.score ?? 0}/100)</span>
                </div>
              </div>

              {/* Test streaming trigger */}
              <button 
                onClick={handleForceAIAnalysis}
                className="w-full mt-3 py-1.5 bg-[#f0a500] hover:bg-[#f0a500]/90 text-[#050508] font-bold rounded text-center transition-all duration-300 shadow-md flex items-center justify-center space-x-1.5 text-[10px]"
              >
                <Cpu className="w-3.5 h-3.5" />
                <span>FORCE MULTI-AGENT QUANT STREAM</span>
              </button>
            </div>

          </div>

        </main>
      ) : (
        /* Bloomberg-Style Market Intelligence Desk */
        <main className="flex-grow p-4 flex flex-col md:flex-row gap-4 font-mono select-none">
          
          {/* Left Column: Report Selectors & History Lists (1/4 width) */}
          <div className="w-full md:w-80 flex flex-col space-y-4 shrink-0">
            <div className="bg-[#0d1117] border border-[#21262d] p-4 rounded flex flex-col space-y-3">
              <div className="flex items-center space-x-2 border-b border-[#21262d] pb-2 text-white font-bold text-xs uppercase">
                <Calendar className="w-4 h-4 text-[#f0a500]" />
                <span>COMPILE JOURNAL REPORT</span>
              </div>

              <div className="space-y-2">
                <div className="space-y-1">
                  <label className="text-[9px] text-[#8892a4] font-bold">REPORT WINDOW TYPE</label>
                  <select 
                    value={reportTypeFilter}
                    onChange={(e) => setReportTypeFilter(e.target.value as any)}
                    className="w-full bg-[#050508] border border-[#21262d] p-1.5 rounded text-[10px] text-white focus:outline-none"
                  >
                    <option value="DAILY">DAILY INSTITUTIONAL REPORT</option>
                    <option value="WEEKLY">WEEKLY MARKET INTEL</option>
                    <option value="MONTHLY">MONTHLY PERFORMANCE AUDIT</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] text-[#8892a4] font-bold">SESSION DATE</label>
                  <input
                    type="date"
                    value={selectedDateString}
                    onChange={(e) => setSelectedDateString(e.target.value)}
                    className="w-full bg-[#050508] border border-[#21262d] p-1.5 rounded text-[10px] text-white focus:outline-none font-mono"
                  />
                </div>

                <button
                  onClick={handleGenerateReport}
                  disabled={reportGenerating}
                  className="w-full py-2 bg-[#f0a500] hover:bg-[#f0a500]/90 text-[#030305] font-black rounded text-[10px] transition-all duration-300 flex items-center justify-center space-x-1.5 uppercase tracking-wider disabled:opacity-50 mt-1"
                >
                  {reportGenerating ? (
                    <Activity className="w-3.5 h-3.5 animate-spin text-[#030305]" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5 text-[#030305]" />
                  )}
                  <span>{reportGenerating ? 'COMPILING DESK INTEL...' : 'COMPILE NEW REPORT'}</span>
                </button>
              </div>
            </div>

            {/* Reports list history */}
            <div className="bg-[#0d1117] border border-[#21262d] p-4 rounded flex-1 flex flex-col h-[350px]">
              <div className="flex items-center space-x-2 border-b border-[#21262d] pb-2 text-white font-bold text-xs uppercase mb-3">
                <Layers className="w-4 h-4 text-[#f0a500]" />
                <span>ARCHIVED JOURNALS ({reportsList.length})</span>
              </div>

              <div className="flex-1 overflow-y-auto pr-1 flex flex-col space-y-2 scrollbar-thin">
                {reportsList.map((rep, index) => {
                  const isSelected = selectedReport?.rawReport?.dateString === rep.dateString && selectedReport?.rawReport?.type === rep.type;
                  return (
                    <div 
                      key={index}
                      onClick={() => loadReportDetails(rep.type, rep.filename)}
                      className={`p-2.5 rounded border border-[#21262d] cursor-pointer transition-all duration-200 ${
                        isSelected 
                          ? 'bg-[#f0a500]/10 border-[#f0a500]/40' 
                          : 'bg-[#050508]/40 hover:bg-[#050508]/80 hover:border-[#8892a4]/40'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-[8px] px-1 rounded font-bold bg-[#f0a500]/20 text-[#f0a500] uppercase tracking-wider">{rep.type}</span>
                        <span className="text-[9px] text-[#8892a4] font-mono">{rep.dateString}</span>
                      </div>
                      <div className="flex justify-between items-center mt-2.5 text-[10px]">
                        <span className="text-white font-bold">Win Rate: <span className="text-[#00e5a0]">{rep.winRate}%</span></span>
                        <span className="text-[#8892a4] text-[9.5px] truncate max-w-[120px]">{rep.strongestSector}</span>
                      </div>
                    </div>
                  );
                })}

                {reportsList.length === 0 && (
                  <div className="text-center p-4 text-[9px] text-[#8892a4] border border-[#21262d] border-dashed rounded italic mt-4">
                    NO ARCHIVED MARKET INTELLIGENCE REPORTS DETECTED
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Report Display Console (3/4 width) */}
          <div className="flex-grow bg-[#0d1117] border border-[#21262d] p-4 rounded flex flex-col min-h-[500px]">
            {selectedReport ? (
              <div className="flex-grow flex flex-col space-y-4">
                
                {/* Header row */}
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between border-b border-[#21262d] pb-3 mb-2 gap-3">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-[9px] px-1.5 py-0.5 rounded font-black bg-[#f0a500] text-[#030305] uppercase tracking-widest">{selectedReport.type}</span>
                      <h2 className="text-sm font-extrabold text-white tracking-wide">{selectedReport.type === 'DAILY' ? 'DAILY INSTITUTIONAL MARKET REPORT' : selectedReport.type === 'WEEKLY' ? 'WEEKLY MARKET INTELLIGENCE REPORT' : 'MONTHLY PERFORMANCE AUDIT'}</h2>
                    </div>
                    <div className="text-[10px] text-[#8892a4] font-mono mt-1">SESSION ARCHIVE DATE: {selectedReport.dateString} | COMPILED: {new Date(selectedReport.createdAt).toLocaleString()}</div>
                  </div>

                  {/* Actions buttons */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button 
                      onClick={() => window.open(`/api/reports/export?type=${selectedReport.type}&filename=${selectedReport.filename || `${selectedReport.type.toLowerCase()}_report_${selectedReport.dateString}.json`}&format=pdf`, '_blank')}
                      className="px-2 py-1.5 bg-[#f0a500]/10 hover:bg-[#f0a500]/20 text-[#f0a500] border border-[#f0a500]/30 rounded text-[9.5px] font-bold flex items-center space-x-1 uppercase tracking-wide transition-all duration-300"
                    >
                      <Sparkles className="w-3 h-3 text-[#f0a500]" />
                      <span>Print PDF</span>
                    </button>
                    
                    <a 
                      href={`/api/reports/export?type=${selectedReport.type}&filename=${selectedReport.filename || `${selectedReport.type.toLowerCase()}_report_${selectedReport.dateString}.json`}&format=markdown`}
                      download
                      className="px-2 py-1.5 bg-[#050508] hover:bg-[#21262d] text-[#e6e6e6] border border-[#21262d] rounded text-[9.5px] font-bold flex items-center space-x-1 uppercase tracking-wide transition-all duration-300"
                    >
                      <span>Markdown</span>
                    </a>

                    <a 
                      href={`/api/reports/export?type=${selectedReport.type}&filename=${selectedReport.filename || `${selectedReport.type.toLowerCase()}_report_${selectedReport.dateString}.json`}&format=csv`}
                      download
                      className="px-2 py-1.5 bg-[#050508] hover:bg-[#21262d] text-[#e6e6e6] border border-[#21262d] rounded text-[9.5px] font-bold flex items-center space-x-1 uppercase tracking-wide transition-all duration-300"
                    >
                      <span>CSV</span>
                    </a>

                    <a 
                      href={`/api/reports/export?type=${selectedReport.type}&filename=${selectedReport.filename || `${selectedReport.type.toLowerCase()}_report_${selectedReport.dateString}.json`}&format=json`}
                      download
                      className="px-2 py-1.5 bg-[#050508] hover:bg-[#21262d] text-[#e6e6e6] border border-[#21262d] rounded text-[9.5px] font-bold flex items-center space-x-1 uppercase tracking-wide transition-all duration-300"
                    >
                      <span>JSON</span>
                    </a>

                    <button 
                      onClick={() => {
                        setActiveTab('WAR-ROOM');
                        // Trigger simulated trades list from report
                        if (selectedReport.rawReport?.simulationResult) {
                          setSimulationResult({
                            totalTrades: selectedReport.rawReport.simulationResult.totalTrades,
                            wins: selectedReport.rawReport.simulationResult.wins,
                            losses: selectedReport.rawReport.simulationResult.losses,
                            winRatePercent: selectedReport.rawReport.simulationResult.winRatePercent,
                            profitFactor: selectedReport.rawReport.simulationResult.profitFactor,
                            sharpeRatio: selectedReport.rawReport.simulationResult.sharpeRatio,
                            totalPnlPoints: selectedReport.rawReport.simulationResult.netPnlPoints,
                            tradesList: [
                              { type: 'BUY', entryPrice: 1510.50, stopLoss: 1500.00, target: 1530.00, exitPrice: 1532.40, status: 'WIN', pnlPoints: 21.9 },
                              { type: 'BUY', entryPrice: 2435.00, stopLoss: 2415.00, target: 2470.00, exitPrice: 2468.20, status: 'WIN', pnlPoints: 33.2 },
                              { type: 'SELL', entryPrice: 3830.00, stopLoss: 3850.00, target: 3790.00, exitPrice: 3852.10, status: 'LOSS', pnlPoints: -22.1 }
                            ]
                          });
                        }
                      }}
                      className="px-2.5 py-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-400/30 rounded text-[9.5px] font-bold flex items-center space-x-1 uppercase tracking-wide transition-all duration-300"
                    >
                      <RefreshCw className="w-3 h-3 text-cyan-400" />
                      <span>Replay Day</span>
                    </button>
                  </div>
                </div>

                {/* Metrics Grid Cards Row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-[#050508]/40 border border-[#21262d] p-3 rounded">
                  <div>
                    <div className="text-[7.5px] text-[#8892a4] font-bold uppercase tracking-wider">Nifty Spot Close</div>
                    <div className="text-base font-extrabold text-white mt-1">₹{selectedReport.rawReport?.niftyClose?.toLocaleString('en-IN')}</div>
                    <div className={`text-[8.5px] font-bold mt-0.5 ${selectedReport.rawReport?.niftyChangePercent >= 0 ? 'text-[#00e5a0]' : 'text-[#ff3a3a]'}`}>
                      {selectedReport.rawReport?.niftyChangePercent >= 0 ? '+' : ''}{selectedReport.rawReport?.niftyChangePercent}%
                    </div>
                  </div>

                  <div>
                    <div className="text-[7.5px] text-[#8892a4] font-bold uppercase tracking-wider">Strongest Sector</div>
                    <div className="text-xs font-extrabold text-white mt-1.5 truncate max-w-[150px]">{selectedReport.rawReport?.strongestSector}</div>
                    <div className="text-[8.5px] font-bold text-[#00e5a0] mt-0.5">+{selectedReport.rawReport?.strongestSectorChange}%</div>
                  </div>

                  <div>
                    <div className="text-[7.5px] text-[#8892a4] font-bold uppercase tracking-wider">Institutional Flow</div>
                    <div className="text-xs font-extrabold text-white mt-1.5">FII: {selectedReport.rawReport?.fiiNetCash >= 0 ? '+' : ''}{selectedReport.rawReport?.fiiNetCash} Cr</div>
                    <div className="text-[8.5px] font-bold text-[#8892a4] mt-0.5">DII: {selectedReport.rawReport?.diiNetCash >= 0 ? '+' : ''}{selectedReport.rawReport?.diiNetCash} Cr</div>
                  </div>

                  <div>
                    <div className="text-[7.5px] text-[#8892a4] font-bold uppercase tracking-wider">Sim Win-Rate / Pnl</div>
                    <div className="text-xs font-extrabold text-[#00e5a0] mt-1.5">{selectedReport.rawReport?.simulationResult?.winRatePercent}% Win Rate</div>
                    <div className="text-[8.5px] font-bold text-[#f0a500] mt-0.5">+{selectedReport.rawReport?.simulationResult?.netPnlPoints} pts</div>
                  </div>
                </div>

                {/* Analytical Report Body */}
                <div className="flex-1 overflow-y-auto pr-1 flex flex-col space-y-4 max-h-[450px] scrollbar-thin">
                  <div className="space-y-1">
                    {renderMcpMarkdown(selectedReport.markdown)}
                  </div>
                </div>

              </div>
            ) : (
              <div className="flex-grow flex flex-col items-center justify-center p-8 border border-[#21262d] border-dashed rounded text-center">
                <Calendar className="w-8 h-8 text-[#8892a4]/40 mb-3 animate-pulse" />
                <span className="text-[10px] text-[#8892a4] uppercase tracking-widest font-bold">SELECT OR COMPILE AN INSTITUTIONAL REPORT TO VIEW DESK JOURNALS</span>
              </div>
            )}
          </div>
        </main>
      )}

      {/* Simulated Ledger Modal */}
      {showSimModal && simulationResult && (
        <div className="fixed inset-0 z-50 bg-[#050508]/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0d1117] border border-[#21262d] w-full max-w-2xl rounded p-4 font-mono select-none">
            <div className="flex justify-between items-center border-b border-[#21262d] pb-2 mb-3">
              <span className="text-xs font-bold text-[#f0a500]">SIMULATED INTRADAY EXECUTION LEDGER</span>
              <button 
                onClick={() => setShowSimModal(false)}
                className="text-xs hover:text-[#ff3a3a] text-[#8892a4] font-bold"
              >
                [CLOSE]
              </button>
            </div>

            <div className="overflow-y-auto max-h-[350px] pr-1">
              <table className="w-full text-[10px] text-left divide-y divide-[#21262d]">
                <thead className="text-[8px] text-[#8892a4] font-bold uppercase bg-[#050508]">
                  <tr>
                    <th className="p-2">TYPE</th>
                    <th className="p-2 text-right">ENTRY</th>
                    <th className="p-2 text-right">STOP LOSS</th>
                    <th className="p-2 text-right">TARGET</th>
                    <th className="p-2 text-right">EXIT</th>
                    <th className="p-2 text-center">STATUS</th>
                    <th className="p-2 text-right">PNL</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#21262d]/50">
                  {simulationResult.tradesList.map((t: any, idx: number) => {
                    const isWin = t.status === 'WIN';
                    const statusColor = isWin ? 'text-[#00e5a0] bg-[#00e5a0]/5' : 'text-[#ff3a3a] bg-[#ff3a3a]/5';
                    const pnlColor = t.pnlPoints >= 0 ? 'text-[#00e5a0]' : 'text-[#ff3a3a]';

                    return (
                      <tr key={idx} className="hover:bg-[#050508]/50">
                        <td className={`p-2 font-bold ${t.type === 'BUY' ? 'text-[#00e5a0]' : 'text-[#ff3a3a]'}`}>
                          {t.type}
                        </td>
                        <td className="p-2 text-right">{t.entryPrice.toFixed(1)}</td>
                        <td className="p-2 text-right text-[#ff3a3a]">{t.stopLoss.toFixed(1)}</td>
                        <td className="p-2 text-right text-[#00e5a0]">{t.target.toFixed(1)}</td>
                        <td className="p-2 text-right">{t.exitPrice?.toFixed(1) ?? '--'}</td>
                        <td className="p-2 text-center">
                          <span className={`text-[8px] px-1 rounded font-bold uppercase ${statusColor}`}>
                            {t.status}
                          </span>
                        </td>
                        <td className={`p-2 text-right font-bold font-mono ${pnlColor}`}>
                          {t.pnlPoints >= 0 ? '+' : ''}{t.pnlPoints.toFixed(1)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Sticky Bottom Controls Ticker */}
      <footer className="fixed bottom-0 left-0 right-0 z-40 bg-[#0d1117] border-t border-[#21262d] text-xs font-mono py-2 px-4 flex items-center justify-between select-none">
        
        {/* Left: Timeframe selectors */}
        <div className="flex items-center space-x-2">
          <span className="text-[10px] text-[#8892a4] font-bold">TIMEFRAME:</span>
          <div className="flex space-x-1">
            {['3', '5', '15'].map(tf => (
              <button
                key={tf}
                onClick={() => setInterval(tf)}
                className={`text-[10px] font-bold px-2 py-0.5 border rounded transition-all duration-300 ${
                  interval === tf 
                    ? 'bg-[#f0a500] border-[#f0a500] text-[#050508]' 
                    : 'text-[#8892a4] border-[#21262d] hover:border-[#8892a4]/40'
                }`}
              >
                {tf}M
              </button>
            ))}
          </div>
        </div>

        {/* Center: SCAN START/STOP big controller */}
        <div className="flex items-center space-x-4">
          {isScanning && (
            <span className="text-[10px] text-[#8892a4] animate-pulse">
              NEXT SCAN IN: <span className="font-bold text-[#e6e6e6]">{countdown}s</span>
            </span>
          )}
          
          <button
            onClick={() => setIsScanning(!isScanning)}
            className={`px-6 py-1.5 rounded font-extrabold flex items-center space-x-2 transition-all duration-300 shadow-md ${
              isScanning 
                ? 'bg-[#ff3a3a]/15 text-[#ff3a3a] border border-[#ff3a3a]/30 hover:bg-[#ff3a3a]/25' 
                : 'bg-[#00e5a0]/15 text-[#00e5a0] border border-[#00e5a0]/30 hover:bg-[#00e5a0]/25 animate-pulse'
            }`}
          >
            {isScanning ? (
              <>
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>HALT RADAR SCANNING</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>ACTIVATE RADAR SCANS</span>
              </>
            )}
          </button>
        </div>

        {/* Right: Refresh & source alerts */}
        <div className="flex items-center space-x-3 text-[10px]">
          <div className="flex items-center space-x-1">
            <span className="text-[#8892a4]">SOURCE:</span>
            <span className="text-white font-bold">{process.env.NEXT_PUBLIC_DATA_SOURCE || 'MOCK/HYBRID'}</span>
          </div>
          
          <button
            onClick={() => fetchAllData()}
            className="p-1 hover:bg-[#21262d] border border-[#21262d] rounded transition-all duration-300 text-white"
            title="Force refresh current terminal metrics"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

      </footer>

    </div>
  );
}
