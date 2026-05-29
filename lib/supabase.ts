import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

function getSavedSettings() {
  const filePath = path.join(process.cwd(), 'settings.json');
  if (!fs.existsSync(filePath)) return {};
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return {};
  }
}

const settings = getSavedSettings();

const supabaseUrl = process.env.SUPABASE_URL || settings.supabaseUrl || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || settings.supabaseAnonKey || '';

export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Mock database store for fallback
class MockDatabase {
  private alerts: any[] = [];
  private journal: any[] = [];
  private reports: any[] = [];

  constructor() {
    this.alerts = [
      {
        id: 'mock_alert_1',
        created_at: new Date(Date.now() - 3600000).toISOString(),
        grade: 'A_PLUS',
        direction: 'BUY',
        entry_zone: '24000 - 24020',
        stop_loss: '23980',
        target1: '24080',
        target2: '24120',
        confluence_score: 88,
        smc_signals: JSON.stringify([{ type: 'CHOCH', strength: 80 }, { type: 'BULLISH_OB', strength: 90 }]),
        layer_data: JSON.stringify({}),
        ai_explanation: 'Strong structural breakout above swing high coupled with heavy institutional buying in FII cash flows. Immediate Order block tested and mitigated.',
        status: 'PENDING'
      }
    ];

    this.journal = [
      {
        id: 'mock_journal_1',
        date: new Date().toISOString().split('T')[0],
        alert_id: 'mock_alert_1',
        entry_price: 24010,
        exit_price: 24090,
        direction: 'BUY',
        result: 'WIN',
        pnl: 2000,
        rr_achieved: 4,
        setup_type: 'Order Block Mitigation',
        session: 'FIRST_WINDOW',
        notes: 'Clean execution. Retraced perfectly into 5M bullish OB and bounced aggressively to target 1.',
        market_condition: 'Trending Up',
        emotion: 'calm',
        rating: 5
      }
    ];
  }

  async getAlerts() {
    return { data: this.alerts, error: null };
  }

  async insertAlert(alert: any) {
    const newAlert = {
      id: `alert_${Math.random().toString(36).substring(2, 9)}`,
      created_at: new Date().toISOString(),
      ...alert
    };
    this.alerts.unshift(newAlert);
    return { data: newAlert, error: null };
  }

  async updateAlertStatus(id: string, status: string) {
    const alert = this.alerts.find(a => a.id === id);
    if (alert) {
      alert.status = status;
    }
    return { error: null };
  }

  async getJournal() {
    return { data: this.journal, error: null };
  }

  async insertJournal(entry: any) {
    const newEntry = {
      id: `journal_${Math.random().toString(36).substring(2, 9)}`,
      date: new Date().toISOString().split('T')[0],
      ...entry
    };
    this.journal.unshift(newEntry);
    return { data: newEntry, error: null };
  }

  async deleteJournalEntry(id: string) {
    this.journal = this.journal.filter(j => j.id !== id);
    return { error: null };
  }
}

export const mockDb = new MockDatabase();
