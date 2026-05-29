import { NextRequest, NextResponse } from 'next/server';
import { supabase, mockDb } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filterDate = searchParams.get('date');

    if (supabase) {
      let query = supabase.from('journal').select('*').order('date', { ascending: false });
      if (filterDate) {
        query = query.eq('date', filterDate);
      }
      const { data, error } = await query;
      if (error) throw error;
      return NextResponse.json({ success: true, journal: data });
    } else {
      const { data } = await mockDb.getJournal();
      const filtered = filterDate ? data.filter(d => d.date === filterDate) : data;
      return NextResponse.json({ success: true, journal: filtered });
    }
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { alertId, entryPrice, exitPrice, direction, result, pnl, rrAchieved, setupType, session, notes, emotion, rating, mistakeType, mistake_type } = body;

    const entryData = {
      alert_id: alertId || null,
      entry_price: Number(entryPrice),
      exit_price: Number(exitPrice),
      direction,
      result,
      pnl: Number(pnl),
      rr_achieved: Number(rrAchieved),
      setup_type: setupType,
      session: session || 'FIRST_WINDOW',
      notes: notes || '',
      market_condition: body.marketCondition || body.market_condition || 'SMC structural breakout',
      mistake_type: mistakeType || mistake_type || 'NONE',
      emotion: emotion || 'calm',
      rating: Number(rating) || 5
    };

    if (supabase) {
      const { data, error } = await supabase.from('journal').insert(entryData).select();
      if (error) throw error;
      return NextResponse.json({ success: true, entry: data[0] });
    } else {
      const { data } = await mockDb.insertJournal(entryData);
      return NextResponse.json({ success: true, entry: data });
    }
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Id param required' }, { status: 400 });
    }

    if (supabase) {
      const { error } = await supabase.from('journal').delete().eq('id', id);
      if (error) throw error;
    } else {
      await mockDb.deleteJournalEntry(id);
    }

    return NextResponse.json({ success: true, message: 'Journal entry removed' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
