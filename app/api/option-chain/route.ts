import { NextResponse } from 'next/server';
import { getOptionIntelligence } from '@/lib/option-intelligence';

export async function GET() {
  try {
    const optionIntel = await getOptionIntelligence();
    return NextResponse.json(optionIntel);
  } catch (error: any) {
    console.error('[API OPTION CHAIN] Route error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
