import { NextResponse } from 'next/server';
import { fetchParticipantOI } from '@/lib/data-sources/participant-oi';

export async function GET() {
  try {
    const data = await fetchParticipantOI();
    return NextResponse.json({ success: true, ...data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
