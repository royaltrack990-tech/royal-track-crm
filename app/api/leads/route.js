import { kv } from '@vercel/kv';
import { NextResponse } from 'next/server';

// Force this route to never cache
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET /api/leads — fetch all leads
export async function GET() {
  try {
    const leads = (await kv.get('royal-track-leads')) || [];
    return NextResponse.json(
      { leads },
      {
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      }
    );
  } catch (error) {
    console.error('KV GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leads', details: error.message },
      { status: 500 }
    );
  }
}

// POST /api/leads — replace all leads (full upsert)
export async function POST(request) {
  try {
    const body = await request.json();
    if (!body.leads || !Array.isArray(body.leads)) {
      return NextResponse.json(
        { error: 'Invalid payload: expected { leads: [...] }' },
        { status: 400 }
      );
    }
    await kv.set('royal-track-leads', body.leads);
    return NextResponse.json({ success: true, count: body.leads.length });
  } catch (error) {
    console.error('KV POST error:', error);
    return NextResponse.json(
      { error: 'Failed to save leads', details: error.message },
      { status: 500 }
    );
  }
}
