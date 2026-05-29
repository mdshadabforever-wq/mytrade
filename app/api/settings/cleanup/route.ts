import { NextRequest, NextResponse } from 'next/server';
import { supabase, mockDb } from '@/lib/supabase';
import fs from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (!action) {
      return NextResponse.json({ success: false, error: 'Action parameter is required' }, { status: 400 });
    }

    if (supabase) {
      if (action === 'clear_alerts') {
        const { error } = await supabase.from('alerts').delete().neq('id', '');
        if (error) throw error;
      } 
      else if (action === 'clear_alerts_old') {
        const fifteenDaysAgo = new Date();
        fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
        const { error } = await supabase.from('alerts').delete().lt('created_at', fifteenDaysAgo.toISOString());
        if (error) throw error;
      }
      else if (action === 'clear_journal') {
        const { error } = await supabase.from('journal').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        if (error) throw error;
      }
      else if (action === 'clear_reports') {
        // Clear Supabase reports
        const { error } = await supabase.from('daily_reports').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        if (error) throw error;

        // Also clear local files backup
        const reportsDir = path.join(process.cwd(), 'reports');
        const clearFolder = (folderPath: string) => {
          if (fs.existsSync(folderPath)) {
            const files = fs.readdirSync(folderPath);
            for (const file of files) {
              if (file.endsWith('.json')) {
                fs.unlinkSync(path.join(folderPath, file));
              }
            }
          }
        };
        clearFolder(path.join(reportsDir, 'daily'));
        clearFolder(path.join(reportsDir, 'weekly'));
        clearFolder(path.join(reportsDir, 'monthly'));
      }
    } else {
      // Mock db fallbacks
      if (action === 'clear_alerts') {
        const res = await mockDb.getAlerts();
        if (res.data) res.data.length = 0;
      } 
      else if (action === 'clear_journal') {
        const res = await mockDb.getJournal();
        if (res.data) res.data.length = 0;
      }
    }

    return NextResponse.json({ success: true, message: `Database operation '${action}' successfully executed.` });
  } catch (error: any) {
    console.error('[CLEANUP API ERROR]', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
