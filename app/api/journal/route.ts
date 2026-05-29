import { NextRequest, NextResponse } from 'next/server';
import { supabase, mockDb } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filterDate = searchParams.get('date');

    if (supabase) {
      let query = supabase.from('journal').select('*').order('created_at', { ascending: false });
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
    
    // Auto-save fields mapping
    const entryData = {
      date: body.date || new Date().toISOString().split('T')[0],
      alert_time: body.alert_time || body.alertTime || Date.now(),
      grade: body.grade || 'A',
      confluence_score: Number(body.confluence_score ?? body.confluenceScore ?? 0),
      direction: body.direction || 'BUY',
      entry_zone: body.entry_zone || body.entryZone || '',
      stop_loss: Number(body.stop_loss ?? body.stopLoss ?? 0),
      target1: Number(body.target1 ?? 0),
      target2: Number(body.target2 ?? 0),
      
      layer1_macro_score: Number(body.layer1_macro_score ?? body.layer1MacroScore ?? 0),
      layer1_macro_reason: body.layer1_macro_reason || body.layer1MacroReason || '',
      layer2_institutional_score: Number(body.layer2_institutional_score ?? body.layer2InstitutionalScore ?? 0),
      layer2_fii_flow: body.layer2_fii_flow || body.layer2FiiFlow || '',
      layer2_dii_flow: body.layer2_dii_flow || body.layer2DiiFlow || '',
      layer2_participant_oi: body.layer2_participant_oi || body.layer2ParticipantOI || '',
      layer3_options_score: Number(body.layer3_options_score ?? body.layer3OptionsScore ?? 0),
      layer3_pcr: Number(body.layer3_pcr ?? body.layer3Pcr ?? 1.0),
      layer3_vix: Number(body.layer3_vix ?? body.layer3Vix ?? 14.5),
      layer3_max_pain: Number(body.layer3_max_pain ?? body.layer3MaxPain ?? 24000),
      layer4_smc_score: Number(body.layer4_smc_score ?? body.layer4SmcScore ?? 0),
      layer4_signals: body.layer4_signals || body.layer4Signals || [],
      layer5_risk_score: Number(body.layer5_risk_score ?? body.layer5RiskScore ?? 0),
      layer5_session: body.layer5_session || body.layer5Session || '',
      
      gift_nifty_gap: body.gift_nifty_gap || body.giftNiftyGap || '',
      global_bias: body.global_bias || body.globalBias || '',
      sector_leading: body.sector_leading || body.sectorLeading || '',
      
      ai_analysis: body.ai_analysis || body.aiAnalysis || '',
      
      trader_action: body.trader_action || body.traderAction || 'PENDING',
      skip_reason: body.skip_reason || body.skipReason || null,
      
      entry_price: body.entry_price !== undefined && body.entry_price !== null ? Number(body.entry_price) : null,
      exit_price: body.exit_price !== undefined && body.exit_price !== null ? Number(body.exit_price) : null,
      exit_time: body.exit_time || null,
      result: body.result || null,
      pnl_points: body.pnl_points !== undefined && body.pnl_points !== null ? Number(body.pnl_points) : null,
      rr_achieved: body.rr_achieved !== undefined && body.rr_achieved !== null ? Number(body.rr_achieved) : null,
      mistake_type: body.mistake_type || body.mistakeType || null,
      notes: body.notes || null,
      
      kite_trade_id: body.kite_trade_id || body.kiteTradeId || null,
      kite_auto_fetched: !!(body.kite_auto_fetched || body.kiteAutoFetched),
      
      alert_id: body.alert_id || body.alertId || null
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

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { alert_id, alertId, ...updates } = body;
    const targetAlertId = alert_id || alertId;

    if (!targetAlertId) {
      return NextResponse.json({ success: false, error: 'alert_id is required for updates' }, { status: 400 });
    }

    // Clean up updates object to ensure correct numeric fields and correct naming
    const cleanUpdates: any = {};
    const fieldMapping: Record<string, string> = {
      traderAction: 'trader_action',
      skipReason: 'skip_reason',
      entryPrice: 'entry_price',
      exitPrice: 'exit_price',
      exitTime: 'exit_time',
      pnlPoints: 'pnl_points',
      rrAchieved: 'rr_achieved',
      mistakeType: 'mistake_type',
      kiteTradeId: 'kite_trade_id',
      kiteAutoFetched: 'kite_auto_fetched'
    };

    for (const [key, value] of Object.entries(updates)) {
      const mappedKey = fieldMapping[key] || key;
      if (['entry_price', 'exit_price', 'pnl_points', 'rr_achieved'].includes(mappedKey)) {
        cleanUpdates[mappedKey] = value !== null ? Number(value) : null;
      } else if (mappedKey === 'kite_auto_fetched') {
        cleanUpdates[mappedKey] = !!value;
      } else {
        cleanUpdates[mappedKey] = value;
      }
    }

    if (supabase) {
      const { data, error } = await supabase.from('journal').update(cleanUpdates).eq('alert_id', targetAlertId).select();
      if (error) throw error;
      return NextResponse.json({ success: true, entry: data[0] });
    } else {
      const data = await mockDb.updateJournalEntryByAlertId(targetAlertId, cleanUpdates);
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
