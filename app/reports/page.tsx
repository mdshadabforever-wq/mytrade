'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FileText, Cpu, RefreshCw, BarChart2, TrendingUp, Sparkles } from 'lucide-react';

export default function ReportsCenter() {
  const [reports, setReports] = useState<any[]>([]);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [reportType, setReportType] = useState<'DAILY' | 'WEEKLY' | 'MONTHLY'>('DAILY');
  const [dateString, setDateString] = useState(new Date().toISOString().split('T')[0]);
  const [generating, setGenerating] = useState(false);

  // Fetch reports list
  const fetchReports = async () => {
    try {
      const res = await axios.get('/api/reports');
      if (res.data?.success) {
        setReports(res.data.reports);
        if (res.data.reports.length > 0 && !selectedReport) {
          loadReportDetails(res.data.reports[0].type, res.data.reports[0].filename);
        }
      }
    } catch (err) {
      console.error('Failed to fetch reports:', err);
    }
  };

  const loadReportDetails = async (type: string, filename: string) => {
    try {
      const res = await axios.get(`/api/reports?type=${type}&filename=${filename}`);
      if (res.data?.success) {
        setSelectedReport(res.data.report);
      }
    } catch (err) {
      console.error('Failed to load report detail:', err);
    }
  };

  const handleGenerateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenerating(true);
    try {
      const res = await axios.post('/api/reports', { type: reportType, dateString });
      if (res.data?.success) {
        fetchReports();
        if (res.data.report) {
          setSelectedReport(res.data.report);
        }
      }
    } catch (err) {
      console.error('Failed to generate report:', err);
    } finally {
      setGenerating(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  return (
    <div className="min-h-screen bg-[#050508] text-[#e6e6e6] p-6 font-mono relative">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,_rgba(0,0,0,0.25)_50%),_linear-gradient(90deg,_rgba(255,0,0,0.06),_rgba(0,255,0,0.02),_rgba(0,0,255,0.06))] bg-[size:100%_4px,_6px_100%] pointer-events-none z-10" />

      {/* Header Sticky Navigation */}
      <header className="sticky top-0 z-40 bg-[#050508] border-b border-[#21262d] p-3 flex items-center justify-between">
        <div>
          <h1 className="text-sm font-extrabold tracking-widest text-[#f0a500] uppercase">
            NEXUS ALPHA // INTELLIGENCE REPORTS HUB
          </h1>
          <p className="text-[9px] text-[#8892a4] tracking-wider uppercase">
            Deep-dive multi-agent quant evaluations, expectancy matrices, and pattern audits
          </p>
        </div>
      </header>

      <main className="max-w-6xl w-full mx-auto grid grid-cols-1 lg:grid-cols-4 gap-6 mt-6 relative z-20">
        
        {/* Left Column: Report compilation trigger & List of historical journals */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Action Trigger Block */}
          <div className="bg-[#0d1117]/60 border border-[#21262d] p-4 rounded hover:border-[#f0a500]/25 transition-all duration-300">
            <h2 className="text-[10px] font-bold text-[#f0a500] uppercase border-b border-[#21262d] pb-1.5 mb-3 flex items-center space-x-1.5">
              <Cpu className="w-4 h-4" />
              <span>TRIGGER NEW REPORT</span>
            </h2>

            <form onSubmit={handleGenerateReport} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="text-[9px] text-[#8892a4] font-bold">REPORT TYPE</label>
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value as any)}
                  className="w-full bg-[#050508] border border-[#21262d] p-2 rounded text-white focus:outline-none"
                >
                  <option value="DAILY">DAILY REPORT (SESSION)</option>
                  <option value="WEEKLY">WEEKLY PATTERNS</option>
                  <option value="MONTHLY">EXPECTANCY STATS</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] text-[#8892a4] font-bold">TARGET DATE</label>
                <input
                  type="date"
                  value={dateString}
                  onChange={(e) => setDateString(e.target.value)}
                  className="w-full bg-[#050508] border border-[#21262d] p-2 rounded text-white focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={generating}
                className="w-full bg-[#f0a500] hover:bg-[#f0a500]/95 disabled:bg-[#f0a500]/50 text-[#030305] font-black py-2 rounded text-xs transition uppercase tracking-widest flex items-center justify-center space-x-1.5"
              >
                {generating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                <span>{generating ? 'COMPILING INTELLIGENCE...' : 'COMPILE REPORT'}</span>
              </button>
            </form>
          </div>

          {/* List of compiled journals */}
          <div className="bg-[#0d1117]/60 border border-[#21262d] p-4 rounded hover:border-[#f0a500]/25 transition-all duration-300">
            <h2 className="text-[10px] font-bold text-white uppercase border-b border-[#21262d] pb-1.5 mb-3">
              JOURNAL LOG HISTORY
            </h2>

            {reports.length === 0 ? (
              <p className="text-[9px] text-[#8892a4] py-8 text-center">No reports compiled yet.</p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {reports.map((r, i) => (
                  <button
                    key={i}
                    onClick={() => loadReportDetails(r.type, r.filename)}
                    className={`w-full text-left bg-[#050508] border p-2.5 rounded text-xs flex items-center justify-between hover:border-[#f0a500]/40 transition ${selectedReport?.dateString === r.dateString && selectedReport?.type === r.type ? 'border-[#f0a500] bg-[#f0a500]/5' : 'border-[#21262d]'}`}
                  >
                    <div>
                      <div className="font-bold text-white uppercase flex items-center space-x-1">
                        <FileText className="w-3.5 h-3.5 text-[#f0a500]" />
                        <span>{r.type}</span>
                      </div>
                      <span className="text-[9px] text-[#8892a4]">{r.dateString}</span>
                    </div>
                    {r.niftyChangePercent !== undefined && (
                      <span className={`text-[9px] font-bold ${r.niftyChangePercent >= 0 ? 'text-[#00e5a0]' : 'text-[#ff3a3a]'}`}>
                        {r.niftyChangePercent >= 0 ? '+' : ''}{r.niftyChangePercent}%
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Columns: Compiled Report Display Panel (Bloomberg aesthetic style) */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-[#0d1117]/60 border border-[#21262d] p-5 rounded hover:border-[#f0a500]/25 transition-all duration-300 min-h-[500px]">
            {selectedReport ? (
              <div className="space-y-6 text-xs leading-relaxed">
                
                {/* Meta stats banner */}
                <div className="bg-[#050508] border border-[#21262d] p-4 rounded grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="space-y-0.5">
                    <span className="text-[9px] text-[#8892a4] uppercase font-bold">REPORT CLASSIFICATION</span>
                    <div className="text-white font-extrabold flex items-center space-x-1.5 mt-0.5">
                      <FileText className="w-4 h-4 text-[#f0a500]" />
                      <span className="uppercase">{selectedReport.type}</span>
                    </div>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[9px] text-[#8892a4] uppercase font-bold">TARGET FRAME DATE</span>
                    <div className="text-white font-extrabold flex items-center space-x-1.5 mt-0.5">
                      <span>{selectedReport.dateString}</span>
                    </div>
                  </div>
                  {selectedReport.rawReport?.niftyClose && (
                    <div className="space-y-0.5">
                      <span className="text-[9px] text-[#8892a4] uppercase font-bold">NIFTY CLOSE INDEX</span>
                      <div className="text-[#00e5a0] font-extrabold flex items-center mt-0.5">
                        <span>₹{selectedReport.rawReport.niftyClose.toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  )}
                  {selectedReport.rawReport?.simulationResult?.winRatePercent !== undefined && (
                    <div className="space-y-0.5">
                      <span className="text-[9px] text-[#8892a4] uppercase font-bold">SIMULATED WIN RATE</span>
                      <div className="text-cyan-400 font-extrabold flex items-center mt-0.5">
                        <span>{selectedReport.rawReport.simulationResult.winRatePercent}%</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Markdown text section */}
                <div className="prose prose-invert max-w-none text-[#e6e6e6] space-y-4 font-sans text-xs">
                  {selectedReport.markdown.split('\n').map((line: string, idx: number) => {
                    const trimmed = line.trim();
                    if (trimmed.startsWith('# ')) {
                      return <h1 key={idx} className="text-sm font-extrabold tracking-widest text-[#f0a500] uppercase border-b border-[#21262d] pb-2 mt-6 mb-4">{trimmed.replace('# ', '')}</h1>;
                    }
                    if (trimmed.startsWith('## ')) {
                      return <h2 key={idx} className="text-xs font-bold text-white uppercase border-b border-[#21262d]/50 pb-1 mt-4 mb-2">{trimmed.replace('## ', '')}</h2>;
                    }
                    if (trimmed.startsWith('> [!NOTE]') || trimmed.startsWith('> [!IMPORTANT]') || trimmed.startsWith('> [!TIP]')) {
                      return (
                        <div key={idx} className="p-3 my-3 bg-[#f0a500]/5 border-l-2 border-[#f0a500] rounded-r font-mono text-[9px] leading-relaxed text-[#8892a4]">
                          {trimmed.replace(/>\s*\[!(NOTE|IMPORTANT|TIP)\]\s*/i, '')}
                        </div>
                      );
                    }
                    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
                      // basic table rendering
                      const cells = trimmed.split('|').map(c => c.trim()).filter((_, i, arr) => i > 0 && i < arr.length - 1);
                      if (cells.every(c => c.startsWith(':') || c.startsWith('-'))) return null;
                      return (
                        <div key={idx} className="w-full overflow-x-auto my-1 border border-[#21262d] rounded bg-[#050508]/50">
                          <table className="w-full text-[9px] font-mono text-left">
                            <tbody>
                              <tr className="hover:bg-[#0d1117]/60 text-white">
                                {cells.map((cell, cIdx) => (
                                  <td key={cIdx} className="p-1.5 px-3 border-r border-[#21262d] last:border-0">{cell}</td>
                                ))}
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      );
                    }
                    if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
                      return (
                        <div key={idx} className="pl-4 relative text-[11px] text-[#8892a4] my-1 font-sans">
                          <span className="absolute left-1.5 top-2 h-1 w-1 bg-[#f0a500] rounded-full" />
                          {trimmed.substring(1).trim()}
                        </div>
                      );
                    }
                    if (!trimmed) return <div key={idx} className="h-2" />;
                    return (
                      <p key={idx} className="text-[#8892a4] leading-relaxed text-[11px] font-sans">
                        {trimmed}
                      </p>
                    );
                  })}
                </div>

              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[400px] text-center space-y-3">
                <BarChart2 className="w-12 h-12 text-[#8892a4]/40" />
                <span className="text-xs uppercase tracking-widest text-[#8892a4]">SELECT OR GENERATE AN INTELLIGENCE JOURNAL</span>
              </div>
            )}
          </div>
        </div>

      </main>
    </div>
  );
}
