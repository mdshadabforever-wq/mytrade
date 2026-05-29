'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { 
  ArrowLeft, Save, Eye, EyeOff, Activity, ShieldAlert, CheckCircle, 
  Sparkles, Key, Lock, Globe, Server, Database, LogOut, RefreshCw, Trash2
} from 'lucide-react';

interface HealthStatus {
  status: 'GREEN' | 'YELLOW' | 'RED' | 'IDLE' | 'CHECKING';
  message: string;
}

export default function SettingsPanel() {
  const router = useRouter();

  // Unified configurations state
  const [anthropicKey, setAnthropicKey] = useState('');
  const [anthropicModel, setAnthropicModel] = useState('claude-3-opus-20240229');
  const [anthropicToggle, setAnthropicToggle] = useState(true);

  const [kiteApiKey, setKiteApiKey] = useState('');
  const [kiteApiSecret, setKiteApiSecret] = useState('');
  const [kiteAccessToken, setKiteAccessToken] = useState('');
  const [kiteWebsocketToggle, setKiteWebsocketToggle] = useState(false);

  const [dhanClientId, setDhanClientId] = useState('');
  const [dhanToken, setDhanToken] = useState('');

  const [newsApiKey, setNewsApiKey] = useState('');
  const [newsProvider, setNewsProvider] = useState('NEWS_API');

  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseAnonKey, setSupabaseAnonKey] = useState('');

  const [redisUrl, setRedisUrl] = useState('');
  const [redisToken, setRedisToken] = useState('');

  const [kiteMcpEnabled, setKiteMcpEnabled] = useState(false);
  const [kiteMcpSyncTime, setKiteMcpSyncTime] = useState('Never');

  const [telegramBotToken, setTelegramBotToken] = useState('');
  const [telegramChatId, setTelegramChatId] = useState('');
  const [telegramToggle, setTelegramToggle] = useState(false);

  const [tradingCapital, setTradingCapital] = useState(50000);
  const [maxRiskPercent, setMaxRiskPercent] = useState(1.0);

  // Password visibility states
  const [showKeys, setShowKeys] = useState<{ [key: string]: boolean }>({});

  // Health checks connection states
  const [healthStates, setHealthStates] = useState<{ [key: string]: HealthStatus }>({
    anthropic: { status: 'IDLE', message: 'No connection test initiated.' },
    kite: { status: 'IDLE', message: 'No connection test initiated.' },
    dhan: { status: 'IDLE', message: 'No connection test initiated.' },
    news: { status: 'IDLE', message: 'No connection test initiated.' },
    supabase: { status: 'IDLE', message: 'No connection test initiated.' },
    redis: { status: 'IDLE', message: 'No connection test initiated.' },
    kiteMcp: { status: 'IDLE', message: 'No connection test initiated.' },
    telegram: { status: 'IDLE', message: 'No connection test initiated.' },
  });

  // Database cleanup states
  const [cleanupMessage, setCleanupMessage] = useState('');

  const handleDatabaseCleanup = async (action: string) => {
    if (!confirm(`Are you sure you want to perform database operation: ${action.replace(/_/g, ' ').toUpperCase()}? This will delete records permanently.`)) {
      return;
    }
    setCleanupMessage('Processing database purge...');
    try {
      const res = await axios.post('/api/settings/cleanup', { action });
      if (res.data?.success) {
        setCleanupMessage(res.data.message || 'Operation executed successfully.');
        setTimeout(() => setCleanupMessage(''), 5000);
      } else {
        setCleanupMessage('Cleanup failed: ' + (res.data?.error || 'Unknown error'));
      }
    } catch (err: any) {
      setCleanupMessage('Cleanup failed: ' + (err.response?.data?.error || err.message));
    }
  };

  // Global action loading indicators
  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Load configuration settings from server on mount
  useEffect(() => {
    async function loadConfig() {
      try {
        const response = await axios.get('/api/settings');
        if (response.data?.success && response.data?.settings) {
          const s = response.data.settings;
          setAnthropicKey(s.anthropicKey || '');
          setAnthropicModel(s.anthropicModel || 'claude-3-opus-20240229');
          setAnthropicToggle(s.anthropicToggle ?? true);

          setKiteApiKey(s.kiteApiKey || '');
          setKiteApiSecret(s.kiteApiSecret || '');
          setKiteAccessToken(s.kiteAccessToken || '');
          setKiteWebsocketToggle(s.kiteWebsocketToggle ?? false);

          setDhanClientId(s.dhanClientId || '');
          setDhanToken(s.dhanToken || '');

          setNewsApiKey(s.newsApiKey || '');
          setNewsProvider(s.newsProvider || 'NEWS_API');

          setSupabaseUrl(s.supabaseUrl || '');
          setSupabaseAnonKey(s.supabaseAnonKey || '');

          setRedisUrl(s.redisUrl || '');
          setRedisToken(s.redisToken || '');

          setKiteMcpEnabled(s.kiteMcpEnabled ?? false);
          setKiteMcpSyncTime(s.kiteMcpSyncTime || 'Never');

          setTelegramBotToken(s.telegramBotToken || '');
          setTelegramChatId(s.telegramChatId || '');
          setTelegramToggle(s.telegramToggle ?? false);

          setTradingCapital(s.tradingCapital !== undefined ? s.tradingCapital : 50000);
          setMaxRiskPercent(s.maxRiskPercent !== undefined ? s.maxRiskPercent : 1.0);
        }
      } catch (err: any) {
        console.error('[SETTINGS] Failed to load config:', err.message);
      } finally {
        setLoading(false);
      }
    }
    loadConfig();
  }, []);

  const toggleKeyVisibility = (field: string) => {
    setShowKeys(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const handleSaveSettings = async () => {
    setSaveLoading(true);
    setSaveMessage(null);

    const payload = {
      anthropicKey, anthropicModel, anthropicToggle,
      kiteApiKey, kiteApiSecret, kiteAccessToken, kiteWebsocketToggle,
      dhanClientId, dhanToken,
      newsApiKey, newsProvider,
      supabaseUrl, supabaseAnonKey,
      redisUrl, redisToken,
      kiteMcpEnabled, kiteMcpSyncTime,
      telegramBotToken, telegramChatId, telegramToggle,
      tradingCapital, maxRiskPercent
    };

    try {
      const response = await axios.post('/api/settings', payload);
      if (response.data?.success) {
        setSaveMessage({ type: 'success', text: 'All personal configurations saved and synced successfully.' });
        setTimeout(() => setSaveMessage(null), 4000);
      } else {
        setSaveMessage({ type: 'error', text: response.data?.message || 'Failed to save config.' });
      }
    } catch (err: any) {
      setSaveMessage({ type: 'error', text: err.response?.data?.message || 'Error occurred while saving configurations.' });
    } finally {
      setSaveLoading(false);
    }
  };

  const handleTestConnection = async (provider: string) => {
    setHealthStates(prev => ({
      ...prev,
      [provider]: { status: 'CHECKING', message: `Verifying handshake with ${provider} gateways...` }
    }));

    const payload: any = { provider };
    if (provider === 'anthropic') {
      payload.anthropicKey = anthropicKey;
      payload.anthropicModel = anthropicModel;
    }
    else if (provider === 'kite') {
      payload.kiteApiKey = kiteApiKey;
      payload.kiteAccessToken = kiteAccessToken;
      payload.kiteApiSecret = kiteApiSecret;
    }
    else if (provider === 'dhan') {
      payload.dhanClientId = dhanClientId;
      payload.dhanToken = dhanToken;
    }
    else if (provider === 'news') {
      payload.newsApiKey = newsApiKey;
      payload.newsProvider = newsProvider;
    }
    else if (provider === 'supabase') {
      payload.supabaseUrl = supabaseUrl;
      payload.supabaseAnonKey = supabaseAnonKey;
    }
    else if (provider === 'redis') {
      payload.redisUrl = redisUrl;
      payload.redisToken = redisToken;
    }
    else if (provider === 'kiteMcp') {
      payload.kiteMcpEnabled = kiteMcpEnabled;
    }
    else if (provider === 'telegram') {
      payload.telegramBotToken = telegramBotToken;
      payload.telegramChatId = telegramChatId;
    }

    try {
      const response = await axios.post('/api/settings/check', payload);
      if (response.data) {
        setHealthStates(prev => ({
          ...prev,
          [provider]: { 
            status: response.data.status, 
            message: response.data.message || 'Verification complete.' 
          }
        }));
      }
    } catch (err: any) {
      setHealthStates(prev => ({
        ...prev,
        [provider]: { 
          status: 'RED', 
          message: err.response?.data?.message || `Handshake failed with a network exception: ${err.message}` 
        }
      }));
    }
  };

  const handleLogout = async () => {
    try {
      const response = await axios.delete('/api/auth');
      if (response.data?.success) {
        router.refresh();
        router.push('/login');
      }
    } catch (err: any) {
      console.error('[SETTINGS] Logout failed:', err.message);
    }
  };

  const renderHealthIndicator = (state: HealthStatus) => {
    const pulseClasses = {
      GREEN: 'bg-[#00e5a0] shadow-[0_0_10px_#00e5a0]',
      YELLOW: 'bg-[#f0a500] shadow-[0_0_10px_#f0a500]',
      RED: 'bg-[#ff3a3a] shadow-[0_0_10px_#ff3a3a]',
      IDLE: 'bg-[#8892a4] shadow-none',
      CHECKING: 'bg-cyan-400 shadow-[0_0_10px_#22d3ee] animate-ping',
    };

    const textColors = {
      GREEN: 'text-[#00e5a0]',
      YELLOW: 'text-[#f0a500]',
      RED: 'text-[#ff3a3a]',
      IDLE: 'text-[#8892a4]',
      CHECKING: 'text-cyan-400',
    };

    return (
      <div className="flex items-center space-x-2 mt-2 text-[10px]">
        <span className={`h-2 w-2 rounded-full ${pulseClasses[state.status]}`} />
        <span className={`font-bold uppercase tracking-wider ${textColors[state.status]}`}>
          {state.status === 'CHECKING' ? 'TESTING...' : state.status}:
        </span>
        <span className="text-[#8892a4] truncate max-w-[280px] font-sans">{state.message}</span>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#030305] text-[#e6e6e6] flex items-center justify-center font-mono">
        <div className="flex flex-col items-center space-y-3">
          <Activity className="w-8 h-8 text-[#f0a500] animate-spin" />
          <span className="text-xs uppercase tracking-widest text-[#8892a4]">RETRIEVING DESK SETTINGS CONFIG...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#030305] text-[#e6e6e6] flex flex-col font-mono pb-24 relative select-none">
      
      {/* Cinematic grid overlays */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,_rgba(0,0,0,0.25)_50%),_linear-gradient(90deg,_rgba(255,0,0,0.06),_rgba(0,255,0,0.02),_rgba(0,0,255,0.06))] bg-[size:100%_4px,_6px_100%] pointer-events-none z-10" />
      <div className="absolute inset-0 opacity-[0.02] bg-[size:20px_20px] bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] pointer-events-none" />

      {/* Header Sticky Navigation */}
      <header className="sticky top-0 z-40 w-full bg-[#050508]/85 backdrop-blur border-b border-[#21262d] p-3 px-6 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button 
            onClick={() => router.push('/')}
            className="p-1.5 bg-[#0d1117] border border-[#21262d] rounded hover:border-[#f0a500]/50 transition-all duration-300 text-[#8892a4] hover:text-white"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-sm font-extrabold tracking-widest text-[#f0a500] uppercase">
              NEXUS ALPHA // PERSONAL CONFIGURATION DESK
            </h1>
            <p className="text-[9px] text-[#8892a4] tracking-wider uppercase">
              Paste and authenticate institutional keys in a secure local storage environment
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleLogout}
            className="px-3 py-1.5 bg-[#ff3a3a]/10 border border-[#ff3a3a]/25 text-[#ff3a3a] hover:bg-[#ff3a3a]/20 text-[10px] font-black rounded flex items-center space-x-1.5 transition-all duration-300 uppercase tracking-widest"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>TERMINATE TERMINAL</span>
          </button>
        </div>
      </header>

      {/* Main Settings Panel Wrapper */}
      <main className="max-w-5xl w-full mx-auto p-6 space-y-6 relative z-20">
        
        {/* Dynamic Save Config Feedback Toast */}
        {saveMessage && (
          <div className={`p-4 border rounded text-[11px] font-bold flex items-center space-x-3 transition-all duration-500 animate-slideDown ${
            saveMessage.type === 'success' 
              ? 'bg-[#00e5a0]/10 border-[#00e5a0]/30 text-[#00e5a0]' 
              : 'bg-[#ff3a3a]/10 border-[#ff3a3a]/30 text-[#ff3a3a]'
          }`}>
            {saveMessage.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
            <span>{saveMessage.text}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* CARD 1: ANTHROPIC CLAUDE */}
          <div className="bg-[#0d1117]/60 border border-[#21262d] p-4 rounded hover:border-[#f0a500]/25 transition-all duration-300 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-[#21262d] pb-2">
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-[#f0a500]" />
                  <span className="text-xs font-bold text-white uppercase">1. ANTHROPIC CLAUDE INTELLIGENCE</span>
                </div>
                <input 
                  type="checkbox" 
                  checked={anthropicToggle} 
                  onChange={(e) => setAnthropicToggle(e.target.checked)}
                  className="rounded bg-[#050508] border-[#21262d] text-[#f0a500] focus:ring-0 focus:ring-offset-0 cursor-pointer"
                />
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="text-[9px] text-[#8892a4] font-bold">ANTHROPIC API TOKEN</label>
                    <button 
                      onClick={() => toggleKeyVisibility('anthropic')}
                      className="text-[#8892a4] hover:text-white"
                    >
                      {showKeys['anthropic'] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <input
                    type={showKeys['anthropic'] ? 'text' : 'password'}
                    placeholder="PASTE ANTHROPIC CLIENT SECRET KEY..."
                    value={anthropicKey}
                    onChange={(e) => setAnthropicKey(e.target.value)}
                    className="w-full bg-[#050508] border border-[#21262d] p-2 rounded text-xs text-white placeholder-[#8892a4]/30 focus:outline-none focus:border-[#f0a500]/60 font-sans"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] text-[#8892a4] font-bold">ACTIVE MODEL ARCHITECTURE</label>
                  <select
                    value={anthropicModel}
                    onChange={(e) => setAnthropicModel(e.target.value)}
                    className="w-full bg-[#050508] border border-[#21262d] p-2 rounded text-xs text-[#e6e6e6] focus:outline-none"
                  >
                    <option value="claude-sonnet-4-6">Claude Sonnet 4-6 (High-Fidelity Quantitative Model)</option>
                    <option value="claude-3-opus-20240229">Claude 3 Opus (Recommended - Deep Intraday Analysis)</option>
                    <option value="claude-3-5-sonnet-20240620">Claude 3.5 Sonnet (Ultra-Fast Execution Scoring)</option>
                    <option value="claude-3-haiku-20240307">Claude 3 Haiku (Lightweight Fallback)</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="mt-4 border-t border-[#21262d]/50 pt-3">
              <button
                onClick={() => handleTestConnection('anthropic')}
                className="px-3 py-1 bg-[#050508] border border-[#21262d] text-[8px] font-extrabold hover:border-[#8892a4]/40 text-white rounded flex items-center space-x-1 uppercase"
              >
                <RefreshCw className="w-3 h-3 text-[#f0a500]" />
                <span>Test Handshake</span>
              </button>
              {renderHealthIndicator(healthStates.anthropic)}
            </div>
          </div>

          {/* CARD 2: ZERODHA KITE */}
          <div className="bg-[#0d1117]/60 border border-[#21262d] p-4 rounded hover:border-[#f0a500]/25 transition-all duration-300 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-[#21262d] pb-2">
                <div className="flex items-center space-x-2">
                  <Key className="w-4 h-4 text-[#f0a500]" />
                  <span className="text-xs font-bold text-white uppercase">2. ZERODHA KITE INTRADAY FEED</span>
                </div>
                <div className="flex items-center space-x-1.5 text-[8.5px] font-bold text-[#8892a4]">
                  <span>WS TICKER:</span>
                  <input 
                    type="checkbox" 
                    checked={kiteWebsocketToggle} 
                    onChange={(e) => setKiteWebsocketToggle(e.target.checked)}
                    className="rounded bg-[#050508] border-[#21262d] text-[#f0a500] focus:ring-0 cursor-pointer"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] text-[#8892a4] font-bold">API KEY</label>
                  <input
                    type="text"
                    placeholder="API KEY..."
                    value={kiteApiKey}
                    onChange={(e) => setKiteApiKey(e.target.value)}
                    className="w-full bg-[#050508] border border-[#21262d] p-2 rounded text-xs text-white placeholder-[#8892a4]/30 focus:outline-none focus:border-[#f0a500]/60 font-sans"
                  />
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="text-[9px] text-[#8892a4] font-bold">API SECRET</label>
                    <button onClick={() => toggleKeyVisibility('kiteSecret')} className="text-[#8892a4] hover:text-white">
                      {showKeys['kiteSecret'] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <input
                    type={showKeys['kiteSecret'] ? 'text' : 'password'}
                    placeholder="API SECRET..."
                    value={kiteApiSecret}
                    onChange={(e) => setKiteApiSecret(e.target.value)}
                    className="w-full bg-[#050508] border border-[#21262d] p-2 rounded text-xs text-white placeholder-[#8892a4]/30 focus:outline-none focus:border-[#f0a500]/60 font-sans"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-[9px] text-[#8892a4] font-bold">SESSION ACCESS TOKEN (KITE)</label>
                  <button onClick={() => toggleKeyVisibility('kiteAccess')} className="text-[#8892a4] hover:text-white">
                    {showKeys['kiteAccess'] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <input
                  type={showKeys['kiteAccess'] ? 'text' : 'password'}
                  placeholder="PASTE NEW DAILY DECODED SESSION ACCESS TOKEN..."
                  value={kiteAccessToken}
                  onChange={(e) => setKiteAccessToken(e.target.value)}
                  className="w-full bg-[#050508] border border-[#21262d] p-2 rounded text-xs text-white placeholder-[#8892a4]/30 focus:outline-none focus:border-[#f0a500]/60 font-sans"
                />
              </div>
            </div>

            <div className="mt-4 border-t border-[#21262d]/50 pt-3">
              <button
                onClick={() => handleTestConnection('kite')}
                className="px-3 py-1 bg-[#050508] border border-[#21262d] text-[8px] font-extrabold hover:border-[#8892a4]/40 text-white rounded flex items-center space-x-1 uppercase"
              >
                <RefreshCw className="w-3 h-3 text-[#f0a500]" />
                <span>Test Session</span>
              </button>
              {renderHealthIndicator(healthStates.kite)}
            </div>
          </div>

          {/* CARD 3: DHANHQ INTERFACER */}
          <div className="bg-[#0d1117]/60 border border-[#21262d] p-4 rounded hover:border-[#f0a500]/25 transition-all duration-300 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center space-x-2 border-b border-[#21262d] pb-2">
                <Lock className="w-4 h-4 text-[#f0a500]" />
                <span className="text-xs font-bold text-white uppercase">3. DHANHQ TRADING INTEL CLIENT</span>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[9px] text-[#8892a4] font-bold">CLIENT ID</label>
                  <input
                    type="text"
                    placeholder="ENTER DHAN CLIENT ID..."
                    value={dhanClientId}
                    onChange={(e) => setDhanClientId(e.target.value)}
                    className="w-full bg-[#050508] border border-[#21262d] p-2 rounded text-xs text-white placeholder-[#8892a4]/30 focus:outline-none focus:border-[#f0a500]/60 font-sans"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="text-[9px] text-[#8892a4] font-bold">DHAN PERSONAL ACCESS TOKEN</label>
                    <button onClick={() => toggleKeyVisibility('dhan')} className="text-[#8892a4] hover:text-white">
                      {showKeys['dhan'] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <input
                    type={showKeys['dhan'] ? 'text' : 'password'}
                    placeholder="ENTER SECURE DHAN API TOKEN..."
                    value={dhanToken}
                    onChange={(e) => setDhanToken(e.target.value)}
                    className="w-full bg-[#050508] border border-[#21262d] p-2 rounded text-xs text-white placeholder-[#8892a4]/30 focus:outline-none focus:border-[#f0a500]/60 font-sans"
                  />
                </div>
              </div>
            </div>

            <div className="mt-4 border-t border-[#21262d]/50 pt-3">
              <button
                onClick={() => handleTestConnection('dhan')}
                className="px-3 py-1 bg-[#050508] border border-[#21262d] text-[8px] font-extrabold hover:border-[#8892a4]/40 text-white rounded flex items-center space-x-1 uppercase"
              >
                <RefreshCw className="w-3 h-3 text-[#f0a500]" />
                <span>Test Authenticate</span>
              </button>
              {renderHealthIndicator(healthStates.dhan)}
            </div>
          </div>

          {/* CARD 4: NEWS WIRE API */}
          <div className="bg-[#0d1117]/60 border border-[#21262d] p-4 rounded hover:border-[#f0a500]/25 transition-all duration-300 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center space-x-2 border-b border-[#21262d] pb-2">
                <Globe className="w-4 h-4 text-[#f0a500]" />
                <span className="text-xs font-bold text-white uppercase">4. INSTITUTIONAL NEWS WIRE STREAM</span>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[9px] text-[#8892a4] font-bold">NEWS FEED PROD PROVIDER</label>
                  <select
                    value={newsProvider}
                    onChange={(e) => setNewsProvider(e.target.value)}
                    className="w-full bg-[#050508] border border-[#21262d] p-2 rounded text-xs text-[#e6e6e6] focus:outline-none"
                  >
                    <option value="GOOGLE_NEWS">Google News India Feed (Zero Latency, Real-Time & Free)</option>
                    <option value="NEWS_API">NewsAPI.org (Global Business Headlines)</option>
                    <option value="BLOOMBERG_FEED">Bloomberg Professional Wire Feed (Mock)</option>
                    <option value="NSE_COMMUNICATION">NSE Exchange Press Disclosures Ticker</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="text-[9px] text-[#8892a4] font-bold">NEWS FEED ACCESS KEY</label>
                    <button onClick={() => toggleKeyVisibility('news')} className="text-[#8892a4] hover:text-white">
                      {showKeys['news'] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <input
                    type={showKeys['news'] ? 'text' : 'password'}
                    placeholder="PASTE NEWS FEED AUTH ACCESS KEY..."
                    value={newsApiKey}
                    onChange={(e) => setNewsApiKey(e.target.value)}
                    className="w-full bg-[#050508] border border-[#21262d] p-2 rounded text-xs text-white placeholder-[#8892a4]/30 focus:outline-none focus:border-[#f0a500]/60 font-sans"
                  />
                </div>
              </div>
            </div>

            <div className="mt-4 border-t border-[#21262d]/50 pt-3">
              <button
                onClick={() => handleTestConnection('news')}
                className="px-3 py-1 bg-[#050508] border border-[#21262d] text-[8px] font-extrabold hover:border-[#8892a4]/40 text-white rounded flex items-center space-x-1 uppercase"
              >
                <RefreshCw className="w-3 h-3 text-[#f0a500]" />
                <span>Test News Stream</span>
              </button>
              {renderHealthIndicator(healthStates.news)}
            </div>
          </div>

          {/* CARD 5: SUPABASE CLIENT */}
          <div className="bg-[#0d1117]/60 border border-[#21262d] p-4 rounded hover:border-[#f0a500]/25 transition-all duration-300 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center space-x-2 border-b border-[#21262d] pb-2">
                <Database className="w-4 h-4 text-[#f0a500]" />
                <span className="text-xs font-bold text-white uppercase">5. SUPABASE INTEL DATA VAULT</span>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[9px] text-[#8892a4] font-bold">DATABASE ACCESS ROUTE URL</label>
                  <input
                    type="text"
                    placeholder="ENTER SUPABASE ROUTE PROJECT URL..."
                    value={supabaseUrl}
                    onChange={(e) => setSupabaseUrl(e.target.value)}
                    className="w-full bg-[#050508] border border-[#21262d] p-2 rounded text-xs text-white placeholder-[#8892a4]/30 focus:outline-none focus:border-[#f0a500]/60 font-sans"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="text-[9px] text-[#8892a4] font-bold">DATABASE REST API ANON KEY</label>
                    <button onClick={() => toggleKeyVisibility('supabase')} className="text-[#8892a4] hover:text-white">
                      {showKeys['supabase'] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <input
                    type={showKeys['supabase'] ? 'text' : 'password'}
                    placeholder="ENTER SUPABASE REST PUBLIC CLIENT ANON KEY..."
                    value={supabaseAnonKey}
                    onChange={(e) => setSupabaseAnonKey(e.target.value)}
                    className="w-full bg-[#050508] border border-[#21262d] p-2 rounded text-xs text-white placeholder-[#8892a4]/30 focus:outline-none focus:border-[#f0a500]/60 font-sans"
                  />
                </div>
              </div>
            </div>

            <div className="mt-4 border-t border-[#21262d]/50 pt-3">
              <button
                onClick={() => handleTestConnection('supabase')}
                className="px-3 py-1 bg-[#050508] border border-[#21262d] text-[8px] font-extrabold hover:border-[#8892a4]/40 text-white rounded flex items-center space-x-1 uppercase"
              >
                <RefreshCw className="w-3 h-3 text-[#f0a500]" />
                <span>Test DB Pool</span>
              </button>
              {renderHealthIndicator(healthStates.supabase)}
            </div>
          </div>

          {/* CARD 6: REDIS SERVER */}
          <div className="bg-[#0d1117]/60 border border-[#21262d] p-4 rounded hover:border-[#f0a500]/25 transition-all duration-300 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center space-x-2 border-b border-[#21262d] pb-2">
                <Server className="w-4 h-4 text-[#f0a500]" />
                <span className="text-xs font-bold text-white uppercase">6. UPSTASH REDIS LATENCY CACHE</span>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[9px] text-[#8892a4] font-bold">REDIS ACCESS ROUTE URL</label>
                  <input
                    type="text"
                    placeholder="ENTER UPSTASH REDIS HTTPS CLUSTER REST URL..."
                    value={redisUrl}
                    onChange={(e) => setRedisUrl(e.target.value)}
                    className="w-full bg-[#050508] border border-[#21262d] p-2 rounded text-xs text-white placeholder-[#8892a4]/30 focus:outline-none focus:border-[#f0a500]/60 font-sans"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="text-[9px] text-[#8892a4] font-bold">UPSTASH ACCESS SECURE AUTH TOKEN</label>
                    <button onClick={() => toggleKeyVisibility('redis')} className="text-[#8892a4] hover:text-white">
                      {showKeys['redis'] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <input
                    type={showKeys['redis'] ? 'text' : 'password'}
                    placeholder="ENTER REDIS CLUSTER REST BEARER KEY..."
                    value={redisToken}
                    onChange={(e) => setRedisToken(e.target.value)}
                    className="w-full bg-[#050508] border border-[#21262d] p-2 rounded text-xs text-white placeholder-[#8892a4]/30 focus:outline-none focus:border-[#f0a500]/60 font-sans"
                  />
                </div>
              </div>
            </div>

            <div className="mt-4 border-t border-[#21262d]/50 pt-3">
              <button
                onClick={() => handleTestConnection('redis')}
                className="px-3 py-1 bg-[#050508] border border-[#21262d] text-[8px] font-extrabold hover:border-[#8892a4]/40 text-white rounded flex items-center space-x-1 uppercase"
              >
                <RefreshCw className="w-3 h-3 text-[#f0a500]" />
                <span>Test Memory cache</span>
              </button>
              {renderHealthIndicator(healthStates.redis)}
            </div>
          </div>

          {/* CARD 7: ZERODHA KITE MCP INTEGRATION */}
          <div className="bg-[#0d1117]/60 border border-[#21262d] p-4 rounded hover:border-[#f0a500]/25 transition-all duration-300 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-[#21262d] pb-2">
                <div className="flex items-center space-x-2">
                  <Activity className="w-4 h-4 text-[#f0a500]" />
                  <span className="text-xs font-bold text-white uppercase">7. ZERODHA KITE MCP GATEWAY</span>
                </div>
                <input 
                  type="checkbox" 
                  checked={kiteMcpEnabled} 
                  onChange={(e) => setKiteMcpEnabled(e.target.checked)}
                  className="rounded bg-[#050508] border-[#21262d] text-[#f0a500] focus:ring-0 focus:ring-offset-0 cursor-pointer"
                />
              </div>

              <div className="space-y-2 text-[10.5px] text-[#8892a4] leading-normal font-sans">
                <p>
                  Integrate Model Context Protocol (MCP) as a lightweight, zero-latency account analytics layer.
                </p>
                <div className="mt-2 bg-[#050508] border border-[#21262d] p-2.5 rounded font-mono text-[9px] flex flex-col space-y-1.5 text-[#e6e6e6]">
                  <div className="flex justify-between">
                    <span>MCP CLIENT INSTANCE:</span>
                    <span className="text-[#00e5a0]">KITE-MCP-SERVER-LOCAL</span>
                  </div>
                  <div className="flex justify-between">
                    <span>ACCOUNT SYNC DEPTH:</span>
                    <span className="text-cyan-400">SESSION MEMORY / STATELITE</span>
                  </div>
                  <div className="flex justify-between">
                    <span>LAST INTEGRATION SYNC:</span>
                    <span className="text-[#f0a500]">{kiteMcpSyncTime}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 border-t border-[#21262d]/50 pt-3">
              <button
                onClick={() => handleTestConnection('kiteMcp')}
                className="px-3 py-1 bg-[#050508] border border-[#21262d] text-[8px] font-extrabold hover:border-[#8892a4]/40 text-white rounded flex items-center space-x-1 uppercase"
              >
                <RefreshCw className="w-3 h-3 text-[#f0a500]" />
                <span>Test MCP Handshake</span>
              </button>
              {renderHealthIndicator(healthStates.kiteMcp)}
            </div>
          </div>

          {/* CARD 8: TELEGRAM ALERTS GATEWAY */}
          <div className="bg-[#0d1117]/60 border border-[#21262d] p-4 rounded hover:border-[#f0a500]/25 transition-all duration-300 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-[#21262d] pb-2">
                <div className="flex items-center space-x-2">
                  <Globe className="w-4 h-4 text-[#f0a500]" />
                  <span className="text-xs font-bold text-white uppercase">8. TELEGRAM REAL-TIME ALERTS</span>
                </div>
                <input 
                  type="checkbox" 
                  checked={telegramToggle} 
                  onChange={(e) => setTelegramToggle(e.target.checked)}
                  className="rounded bg-[#050508] border-[#21262d] text-[#f0a500] focus:ring-0 focus:ring-offset-0 cursor-pointer"
                />
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="text-[9px] text-[#8892a4] font-bold">TELEGRAM BOT TOKEN</label>
                    <button onClick={() => toggleKeyVisibility('telegramToken')} className="text-[#8892a4] hover:text-white">
                      {showKeys['telegramToken'] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <input
                    type={showKeys['telegramToken'] ? 'text' : 'password'}
                    placeholder="ENTER TELEGRAM BOT API TOKEN..."
                    value={telegramBotToken}
                    onChange={(e) => setTelegramBotToken(e.target.value)}
                    className="w-full bg-[#050508] border border-[#21262d] p-2 rounded text-xs text-white placeholder-[#8892a4]/30 focus:outline-none focus:border-[#f0a500]/60 font-sans"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] text-[#8892a4] font-bold">TARGET CHAT ID / CHANNEL ID</label>
                  <input
                    type="text"
                    placeholder="ENTER CHAT ID OR @CHANNEL..."
                    value={telegramChatId}
                    onChange={(e) => setTelegramChatId(e.target.value)}
                    className="w-full bg-[#050508] border border-[#21262d] p-2 rounded text-xs text-white placeholder-[#8892a4]/30 focus:outline-none focus:border-[#f0a500]/60 font-sans"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="space-y-1">
                    <label className="text-[9px] text-[#8892a4] font-bold">TRADING CAPITAL (₹)</label>
                    <input
                      type="number"
                      placeholder="50000"
                      value={tradingCapital}
                      onChange={(e) => setTradingCapital(Number(e.target.value))}
                      className="w-full bg-[#050508] border border-[#21262d] p-2 rounded text-xs text-white focus:outline-none focus:border-[#f0a500]/60 font-sans"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] text-[#8892a4] font-bold">MAX RISK PER TRADE (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="1.0"
                      value={maxRiskPercent}
                      onChange={(e) => setMaxRiskPercent(Number(e.target.value))}
                      className="w-full bg-[#050508] border border-[#21262d] p-2 rounded text-xs text-white focus:outline-none focus:border-[#f0a500]/60 font-sans"
                    />
                  </div>
                </div>

                <div className="p-2 rounded bg-amber-500/5 border border-amber-500/10 text-[9px] text-[#8892a4] font-sans flex flex-col space-y-0.5">
                  <div className="flex justify-between">
                    <span>MAX RISK BUDGET PER SETUP:</span>
                    <span className="text-[#f0a500] font-mono font-bold">₹{((tradingCapital * maxRiskPercent) / 100).toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>CAPITAL POSITION SAFEGUARD:</span>
                    <span className="text-[#00e5a0]">Exposure auto-capped at 100% buying power</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 border-t border-[#21262d]/50 pt-3">
              <button
                onClick={() => handleTestConnection('telegram')}
                className="px-3 py-1 bg-[#050508] border border-[#21262d] text-[8px] font-extrabold hover:border-[#8892a4]/40 text-white rounded flex items-center space-x-1 uppercase"
              >
                <RefreshCw className="w-3 h-3 text-[#f0a500]" />
                <span>Test Connection</span>
              </button>
              {renderHealthIndicator(healthStates.telegram)}
            </div>
          </div>

        </div>

        {/* CARD 9: DATABASE CLEANUP & CAPACITY SAFEGUARDS */}
        <div className="bg-[#0d1117]/60 border border-[#21262d] p-4 rounded hover:border-[#ff3a3a]/25 transition-all duration-300 mt-6 relative z-20">
          <div className="flex items-center space-x-2 border-b border-[#21262d] pb-2 mb-4">
            <Trash2 className="w-4 h-4 text-[#ff3a3a]" />
            <span className="text-xs font-bold text-white uppercase">9. DATABASE CAPACITY SAFEGUARDS (FREE-TIER OPTIMIZATION)</span>
          </div>

          <p className="text-[10px] text-[#8892a4] mb-4 leading-normal font-sans">
            Supabase Free Tier limits storage space to 500 MB. To ensure database size remains well within the limit, use these clean-up tools to purge old logs periodically.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-[10px] font-bold font-mono">
            <button
              onClick={() => handleDatabaseCleanup('clear_alerts_old')}
              className="px-3 py-2 bg-amber-500/10 border border-amber-500/35 hover:bg-amber-500/20 text-[#f0a500] rounded uppercase tracking-wider transition duration-300"
            >
              Purge Alerts &gt; 15 Days
            </button>
            <button
              onClick={() => handleDatabaseCleanup('clear_alerts')}
              className="px-3 py-2 bg-[#ff3a3a]/10 border border-[#ff3a3a]/35 hover:bg-[#ff3a3a]/20 text-[#ff3a3a] rounded uppercase tracking-wider transition duration-300"
            >
              Clear All Alerts
            </button>
            <button
              onClick={() => handleDatabaseCleanup('clear_journal')}
              className="px-3 py-2 bg-[#ff3a3a]/10 border border-[#ff3a3a]/35 hover:bg-[#ff3a3a]/20 text-[#ff3a3a] rounded uppercase tracking-wider transition duration-300"
            >
              Clear All Journals
            </button>
            <button
              onClick={() => handleDatabaseCleanup('clear_reports')}
              className="px-3 py-2 bg-[#ff3a3a]/10 border border-[#ff3a3a]/35 hover:bg-[#ff3a3a]/20 text-[#ff3a3a] rounded uppercase tracking-wider transition duration-300"
            >
              Clear All Reports
            </button>
          </div>
          {cleanupMessage && (
            <p className="text-[9px] text-[#00e5a0] mt-3 font-mono">{cleanupMessage}</p>
          )}
        </div>

        {/* Action Controls Footer */}
        <div className="w-full bg-[#050508]/85 border border-[#21262d] p-4 rounded flex items-center justify-between mt-6">
          <div className="flex items-center space-x-2 text-[10px] text-[#8892a4]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#00e5a0] animate-pulse" />
            <span>ALL MODIFICATIONS ARE PROCESSED INSTANTLY ON DESK CLIENTS</span>
          </div>

          <button
            onClick={handleSaveSettings}
            disabled={saveLoading}
            className="px-6 py-2 bg-[#f0a500] hover:bg-[#f0a500]/90 text-[#030305] font-black rounded flex items-center space-x-2 text-xs transition-all duration-300 uppercase tracking-widest shadow-lg"
          >
            {saveLoading ? (
              <Activity className="w-4 h-4 animate-spin text-[#030305]" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>{saveLoading ? 'SYNCHRONIZING DESK...' : 'SAVE CONFIGURATIONS'}</span>
          </button>
        </div>

      </main>

    </div>
  );
}
