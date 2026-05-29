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

const DATA_DIR = path.join(process.cwd(), 'data');
const JOURNAL_FILE = path.join(DATA_DIR, 'journal.json');

class MockDatabase {
  private alerts: any[] = [];
  private journal: any[] = [];
  private reports: any[] = [];

  constructor() {
    // Ensure data directory exists
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    // Load from journal file if exists, else start empty
    try {
      if (fs.existsSync(JOURNAL_FILE)) {
        this.journal = JSON.parse(fs.readFileSync(JOURNAL_FILE, 'utf8'));
      } else {
        this.journal = [];
        this.saveJournalToFile();
      }
    } catch {
      this.journal = [];
    }

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
  }

  private saveJournalToFile() {
    try {
      fs.writeFileSync(JOURNAL_FILE, JSON.stringify(this.journal, null, 2), 'utf8');
    } catch (err) {
      console.error('[MOCK DB] Failed to save journal to file:', err);
    }
  }

  async getAlerts() {
    return { data: this.alerts, error: null };
  }

  async insertAlert(alert: any) {
    const newAlert = {
      id: alert.id || `alert_${Math.random().toString(36).substring(2, 9)}`,
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
      id: entry.id || `journal_${Math.random().toString(36).substring(2, 9)}`,
      date: entry.date || new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString(),
      ...entry
    };
    this.journal.unshift(newEntry);
    this.saveJournalToFile();
    return { data: newEntry, error: null };
  }

  async deleteJournalEntry(id: string) {
    this.journal = this.journal.filter(j => j.id !== id);
    this.saveJournalToFile();
    return { error: null };
  }

  async updateJournalEntryByAlertId(alertId: string, updates: any) {
    const entry = this.journal.find(j => j.alert_id === alertId);
    if (entry) {
      Object.assign(entry, updates);
      this.saveJournalToFile();
      return entry;
    }
    
    // If not found, let's create a new entry with this alertId and updates
    const newEntry = {
      id: `journal_${Math.random().toString(36).substring(2, 9)}`,
      alert_id: alertId,
      date: new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString(),
      ...updates
    };
    this.journal.unshift(newEntry);
    this.saveJournalToFile();
    return newEntry;
  }

  async updateJournalAiAnalysis(alertId: string, fullText: string) {
    const entry = this.journal.find(j => j.alert_id === alertId);
    if (entry) {
      entry.ai_analysis = fullText;
      this.saveJournalToFile();
    }
  }
}

export const mockDb = new MockDatabase();
