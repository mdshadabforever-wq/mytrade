import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const SETTINGS_FILE_PATH = path.join(process.cwd(), 'settings.json');

// Helper to load settings from settings.json
function loadSettings() {
  if (!fs.existsSync(SETTINGS_FILE_PATH)) {
    return {};
  }
  try {
    const rawData = fs.readFileSync(SETTINGS_FILE_PATH, 'utf8');
    return JSON.parse(rawData);
  } catch (error) {
    console.error('[SETTINGS API] Failed to parse settings file:', error);
    return {};
  }
}

// Helper to save settings to settings.json
function saveSettings(settings: any) {
  try {
    fs.writeFileSync(SETTINGS_FILE_PATH, JSON.stringify(settings, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('[SETTINGS API] Failed to write settings file:', error);
    return false;
  }
}

// Mask key for safety when transmitting to UI
function maskKey(key: string | undefined): string {
  if (!key) return '';
  if (key.length <= 8) return '••••••••';
  return `${key.substring(0, 4)}••••••••${key.substring(key.length - 4)}`;
}

export async function GET() {
  try {
    const rawSettings = loadSettings();
    
    // Mask sensitive keys before returning to client
    const clientSettings = {
      anthropicKey: rawSettings.anthropicKey ? maskKey(rawSettings.anthropicKey) : '',
      anthropicModel: rawSettings.anthropicModel || 'claude-3-opus-20240229',
      anthropicToggle: rawSettings.anthropicToggle ?? true,
      
      kiteApiKey: rawSettings.kiteApiKey ? maskKey(rawSettings.kiteApiKey) : '',
      kiteApiSecret: rawSettings.kiteApiSecret ? maskKey(rawSettings.kiteApiSecret) : '',
      kiteAccessToken: rawSettings.kiteAccessToken ? maskKey(rawSettings.kiteAccessToken) : '',
      kiteWebsocketToggle: rawSettings.kiteWebsocketToggle ?? false,
      
      dhanClientId: rawSettings.dhanClientId || '',
      dhanToken: rawSettings.dhanToken ? maskKey(rawSettings.dhanToken) : '',
      
      newsApiKey: rawSettings.newsApiKey ? maskKey(rawSettings.newsApiKey) : '',
      newsProvider: rawSettings.newsProvider || 'NEWS_API',
      
      supabaseUrl: rawSettings.supabaseUrl || '',
      supabaseAnonKey: rawSettings.supabaseAnonKey ? maskKey(rawSettings.supabaseAnonKey) : '',
      
      redisUrl: rawSettings.redisUrl || '',
      redisToken: rawSettings.redisToken ? maskKey(rawSettings.redisToken) : '',

      kiteMcpEnabled: rawSettings.kiteMcpEnabled ?? false,
      kiteMcpSyncTime: rawSettings.kiteMcpSyncTime || 'Never',

      telegramBotToken: rawSettings.telegramBotToken ? maskKey(rawSettings.telegramBotToken) : '',
      telegramChatId: rawSettings.telegramChatId || '',
      telegramToggle: rawSettings.telegramToggle ?? false,

      tradingCapital: rawSettings.tradingCapital ?? 50000,
      maxRiskPercent: rawSettings.maxRiskPercent ?? 1.0,
    };

    return NextResponse.json({ success: true, settings: clientSettings });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const existingSettings = loadSettings();

    // Reconstruct settings, only updating keys if they are not masked representations
    const isMasked = (val: string) => val && val.includes('••••');

    const updatedSettings = {
      ...existingSettings,
      
      anthropicKey: isMasked(body.anthropicKey) ? existingSettings.anthropicKey : body.anthropicKey,
      anthropicModel: body.anthropicModel,
      anthropicToggle: body.anthropicToggle,

      kiteApiKey: isMasked(body.kiteApiKey) ? existingSettings.kiteApiKey : body.kiteApiKey,
      kiteApiSecret: isMasked(body.kiteApiSecret) ? existingSettings.kiteApiSecret : body.kiteApiSecret,
      kiteAccessToken: isMasked(body.kiteAccessToken) ? existingSettings.kiteAccessToken : body.kiteAccessToken,
      kiteWebsocketToggle: body.kiteWebsocketToggle,

      dhanClientId: body.dhanClientId,
      dhanToken: isMasked(body.dhanToken) ? existingSettings.dhanToken : body.dhanToken,

      newsApiKey: isMasked(body.newsApiKey) ? existingSettings.newsApiKey : body.newsApiKey,
      newsProvider: body.newsProvider,

      supabaseUrl: body.supabaseUrl,
      supabaseAnonKey: isMasked(body.supabaseAnonKey) ? existingSettings.supabaseAnonKey : body.supabaseAnonKey,

      redisUrl: body.redisUrl,
      redisToken: isMasked(body.redisToken) ? existingSettings.redisToken : body.redisToken,

      kiteMcpEnabled: body.kiteMcpEnabled ?? false,
      kiteMcpSyncTime: body.kiteMcpSyncTime || 'Never',

      telegramBotToken: isMasked(body.telegramBotToken) ? existingSettings.telegramBotToken : body.telegramBotToken,
      telegramChatId: body.telegramChatId,
      telegramToggle: body.telegramToggle ?? false,

      tradingCapital: body.tradingCapital !== undefined ? Number(body.tradingCapital) : 50000,
      maxRiskPercent: body.maxRiskPercent !== undefined ? Number(body.maxRiskPercent) : 1.0,
    };

    const saved = saveSettings(updatedSettings);
    if (!saved) {
      return NextResponse.json({ success: false, message: 'Failed to write configuration file' }, { status: 500 });
    }

    // Set process.env options dynamically for runtime clients
    if (updatedSettings.anthropicKey) process.env.ANTHROPIC_API_KEY = updatedSettings.anthropicKey;
    if (updatedSettings.kiteApiKey) process.env.KITE_API_KEY = updatedSettings.kiteApiKey;
    if (updatedSettings.kiteAccessToken) process.env.KITE_ACCESS_TOKEN = updatedSettings.kiteAccessToken;
    if (updatedSettings.telegramBotToken) process.env.TELEGRAM_BOT_TOKEN = updatedSettings.telegramBotToken;
    if (updatedSettings.telegramChatId) process.env.TELEGRAM_CHAT_ID = updatedSettings.telegramChatId;

    return NextResponse.json({ success: true, message: 'Settings saved successfully' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
