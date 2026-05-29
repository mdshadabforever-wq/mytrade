import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  console.log('[DEBUG-JOURNAL] Initializing journal-test debug sequence...');
  console.log('[DEBUG-JOURNAL] isSupabaseConfigured value:', isSupabaseConfigured);
  console.log('[DEBUG-JOURNAL] supabase client instance exists:', !!supabase);

  if (!supabase) {
    console.error('[DEBUG-JOURNAL] Supabase client is not initialized!');
    return NextResponse.json({
      success: false,
      error: 'Supabase client is not initialized. Check your environment variables.',
      isSupabaseConfigured
    }, { status: 500 });
  }

  const testPayload = {
    date: new Date().toISOString().split('T')[0],
    alert_time: Date.now(),
    grade: 'A',
    confluence_score: 95,
    direction: 'BUY',
    entry_zone: '24000-24010',
    stop_loss: 23980,
    target1: 24080,
    target2: 24120,
    trader_action: 'TAKEN',
    notes: 'Live Debug Verification Insert'
  };

  console.log('[DEBUG-JOURNAL] Test payload prepared:', JSON.stringify(testPayload));

  try {
    console.log('[DEBUG-JOURNAL] Executing supabase.from(\'journal\').insert().select()...');
    const { data, error } = await supabase
      .from('journal')
      .insert(testPayload)
      .select();

    if (error) {
      console.error('[DEBUG-JOURNAL] Supabase insert failed with error:', error);
      return NextResponse.json({
        success: false,
        error: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      }, { status: 500 });
    }

    console.log('[DEBUG-JOURNAL] Supabase insert succeeded! Data returned:', JSON.stringify(data));

    if (!data || data.length === 0) {
      console.warn('[DEBUG-JOURNAL] Data returned is empty despite no error (check RLS policies).');
      return NextResponse.json({
        success: false,
        error: 'Data returned is empty. Row may have been blocked by Supabase RLS policies.'
      }, { status: 400 });
    }

    const insertedRow = data[0];
    console.log('[DEBUG-JOURNAL] Successfully inserted row ID:', insertedRow.id);

    return NextResponse.json({
      success: true,
      message: 'Test journal row successfully inserted',
      insertedId: insertedRow.id,
      insertedRow
    });

  } catch (err: any) {
    console.error('[DEBUG-JOURNAL] Exceptional runtime error inside query:', err.message);
    return NextResponse.json({
      success: false,
      error: err.message
    }, { status: 500 });
  }
}
