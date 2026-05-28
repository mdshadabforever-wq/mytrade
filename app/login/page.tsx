'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { Lock, Mail, Key, Cpu, Sparkles, ShieldAlert, Terminal, Activity } from 'lucide-react';

export default function TerminalLoginPage() {
  const router = useRouter();
  
  // Authentication tab mode
  const [authMode, setAuthMode] = useState<'passcode' | 'credentials'>('passcode');
  
  // Inputs
  const [passcode, setPasscode] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Dynamic UI feedback states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ssoActive, setSsoActive] = useState(false);

  const handleLoginSuccess = () => {
    router.refresh();
    router.push('/');
  };

  const handlePasscodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passcode.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const response = await axios.post('/api/auth', { passcode });
      if (response.data?.success) {
        handleLoginSuccess();
      } else {
        setError(response.data?.message || 'Access authorization rejected');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Access authorization rejected');
    } finally {
      setLoading(false);
    }
  };

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const response = await axios.post('/api/auth', { email, password });
      if (response.data?.success) {
        handleLoginSuccess();
      } else {
        setError(response.data?.message || 'Invalid credentials');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSso = async () => {
    setSsoActive(true);
    setLoading(true);
    setError(null);
    
    // Simulate standard OIDC OAuth flow
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    try {
      const response = await axios.post('/api/auth', { isGoogleSso: true });
      if (response.data?.success) {
        handleLoginSuccess();
      } else {
        setError('Google SSO authentication failed');
      }
    } catch (err: any) {
      setError('Google SSO authentication failed');
    } finally {
      setSsoActive(false);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#030305] text-[#e6e6e6] flex items-center justify-center relative overflow-hidden font-mono select-none">
      
      {/* 1. Cinematic Background Effects */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,_rgba(0,0,0,0.25)_50%),_linear-gradient(90deg,_rgba(255,0,0,0.06),_rgba(0,255,0,0.02),_rgba(0,0,255,0.06))] bg-[size:100%_4px,_6px_100%] pointer-events-none z-10" />
      <div className="absolute inset-0 opacity-[0.03] bg-[size:20px_20px] bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)]" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#f0a500]/5 rounded-full filter blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/5 rounded-full filter blur-[100px] pointer-events-none" />

      {/* 2. Main Login Container */}
      <div className="w-full max-w-md p-8 relative z-20 mx-4">
        
        {/* Futuristic Outer Glow Frame */}
        <div className="absolute inset-0 bg-[#0d1117]/60 border border-[#21262d] rounded-lg backdrop-blur-xl shadow-2xl transition-all duration-500 hover:border-[#f0a500]/30" />
        
        {/* Content */}
        <div className="relative z-10 flex flex-col space-y-6">
          
          {/* Header Branding */}
          <div className="text-center space-y-2 border-b border-[#21262d] pb-5">
            <div className="inline-flex p-3 bg-[#050508] border border-[#21262d] rounded-full shadow-inner relative overflow-hidden group">
              <div className="absolute inset-0 bg-[#f0a500]/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-full" />
              <Cpu className="w-8 h-8 text-[#f0a500] animate-pulse" />
            </div>
            <h1 className="text-base font-extrabold tracking-widest text-[#f0a500] uppercase mt-2">
              NEXUS ALPHA // TERM
            </h1>
            <p className="text-[9px] text-[#8892a4] tracking-widest">
              AI INTRADAY QUANTITATIVE INTEL RADAR
            </p>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="p-3 bg-[#ff3a3a]/10 border border-[#ff3a3a]/30 rounded text-[#ff3a3a] text-[10px] flex items-center space-x-2 animate-shake">
              <ShieldAlert className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Mode Selector Tabs */}
          <div className="grid grid-cols-2 bg-[#050508] border border-[#21262d] p-1 rounded text-[10px] font-bold">
            <button
              onClick={() => { setAuthMode('passcode'); setError(null); }}
              className={`py-1.5 rounded transition-all duration-300 flex items-center justify-center space-x-1.5 ${
                authMode === 'passcode'
                  ? 'bg-[#f0a500]/10 text-[#f0a500] border border-[#f0a500]/20'
                  : 'text-[#8892a4] hover:text-[#e6e6e6]'
              }`}
            >
              <Key className="w-3.5 h-3.5" />
              <span>PASSCODE ACCESS</span>
            </button>
            <button
              onClick={() => { setAuthMode('credentials'); setError(null); }}
              className={`py-1.5 rounded transition-all duration-300 flex items-center justify-center space-x-1.5 ${
                authMode === 'credentials'
                  ? 'bg-[#f0a500]/10 text-[#f0a500] border border-[#f0a500]/20'
                  : 'text-[#8892a4] hover:text-[#e6e6e6]'
              }`}
            >
              <Mail className="w-3.5 h-3.5" />
              <span>CREDENTIALS</span>
            </button>
          </div>

          {/* PASSCODE ACCESS FORM */}
          {authMode === 'passcode' && (
            <form onSubmit={handlePasscodeSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[9px] text-[#8892a4] font-bold uppercase tracking-wider block">
                  SECURE MASTER KEY
                </label>
                <div className="relative">
                  <input
                    type="password"
                    placeholder="ENTER PASSWORD / PASSCODE..."
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value)}
                    disabled={loading}
                    className="w-full bg-[#050508] border border-[#21262d] p-3 pl-10 rounded text-xs text-white placeholder-[#8892a4]/40 focus:outline-none focus:border-[#f0a500]/60 uppercase tracking-widest font-sans"
                  />
                  <Lock className="w-4 h-4 text-[#8892a4] absolute left-3 top-3.5" />
                </div>
                <span className="text-[8px] text-[#8892a4]/75 block pt-1 font-sans italic">
                  Local master passcode is: <span className="font-mono text-cyan-400 font-bold uppercase">admin</span>
                </span>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-[#f0a500] hover:bg-[#f0a500]/90 text-[#030305] font-black rounded text-center transition-all duration-300 shadow-lg relative overflow-hidden uppercase text-xs flex items-center justify-center space-x-2"
              >
                {loading && !ssoActive ? (
                  <Activity className="w-4 h-4 animate-spin text-[#030305]" />
                ) : (
                  <Terminal className="w-4 h-4" />
                )}
                <span>{loading && !ssoActive ? 'AUTHORIZING DESK...' : 'INITIALIZE RADAR'}</span>
              </button>
            </form>
          )}

          {/* CREDENTIALS FORM */}
          {authMode === 'credentials' && (
            <form onSubmit={handleCredentialsSubmit} className="space-y-4">
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[9px] text-[#8892a4] font-bold uppercase tracking-wider block">
                    EMAIL ADRESS
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      placeholder="ENTER REGISTERED EMAIL..."
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={loading}
                      className="w-full bg-[#050508] border border-[#21262d] p-3 pl-10 rounded text-xs text-white placeholder-[#8892a4]/40 focus:outline-none focus:border-[#f0a500]/60 font-sans"
                    />
                    <Mail className="w-4 h-4 text-[#8892a4] absolute left-3 top-3.5" />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] text-[#8892a4] font-bold uppercase tracking-wider block">
                    SECURE ACCOUNT PASSWORD
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      placeholder="ENTER ACCOUNT PASSWORD..."
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={loading}
                      className="w-full bg-[#050508] border border-[#21262d] p-3 pl-10 rounded text-xs text-white placeholder-[#8892a4]/40 focus:outline-none focus:border-[#f0a500]/60 font-sans"
                    />
                    <Lock className="w-4 h-4 text-[#8892a4] absolute left-3 top-3.5" />
                  </div>
                  <span className="text-[8px] text-[#8892a4]/75 block pt-1 font-sans italic">
                    Default local credentials: <span className="font-mono text-cyan-400 font-bold">admin@nexusalpha.ai</span> // <span className="font-mono text-cyan-400 font-bold">admin</span>
                  </span>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-[#f0a500] hover:bg-[#f0a500]/90 text-[#030305] font-black rounded text-center transition-all duration-300 shadow-lg relative overflow-hidden uppercase text-xs flex items-center justify-center space-x-2"
              >
                {loading && !ssoActive ? (
                  <Activity className="w-4 h-4 animate-spin text-[#030305]" />
                ) : (
                  <Terminal className="w-4 h-4" />
                )}
                <span>{loading && !ssoActive ? 'VERIFYING IDENTITY...' : 'CONNECT SESSION'}</span>
              </button>
            </form>
          )}

          {/* Divider */}
          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-[#21262d]"></div>
            <span className="flex-shrink mx-3 text-[8px] text-[#8892a4] font-bold tracking-widest uppercase">
              OR SECURE SSO
            </span>
            <div className="flex-grow border-t border-[#21262d]"></div>
          </div>

          {/* SSO button */}
          <button
            onClick={handleGoogleSso}
            disabled={loading}
            className="w-full py-2 bg-[#050508] border border-[#21262d] text-xs hover:border-[#8892a4]/40 text-white font-bold rounded text-center transition-all duration-300 shadow-sm flex items-center justify-center space-x-2"
          >
            {ssoActive ? (
              <Activity className="w-4 h-4 animate-spin text-white" />
            ) : (
              <Sparkles className="w-4 h-4 text-[#f0a500]" />
            )}
            <span>{ssoActive ? 'REDIRECTING TO GOOGLE...' : 'SINGLE SIGN-ON WITH GOOGLE'}</span>
          </button>

          {/* Secure indicator footer */}
          <div className="text-center pt-2 text-[8px] text-[#8892a4] border-t border-[#21262d]/50 flex items-center justify-center space-x-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-[#00e5a0]" />
            <span>SESSION KEY PERSISTENCE AND SSL ENCRYPTED CONNECTION</span>
          </div>

        </div>

      </div>

    </div>
  );
}
