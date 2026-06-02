import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';

export async function GET() {
  try {
    const snap = await db
      .collection('services')
      .doc('struken-tvatt')
      .collection('StrukenTvatt')
      .orderBy('order')
      .get();

    const products = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const response = NextResponse.json(products);
    // Cache for 5 minutes (300s) — products rarely change during a session
    response.headers.set('Cache-Control', 'public, max-age=300, s-maxage=300');
    return response;
  } catch (err) {
    console.error('[GET /api/struken-tvatt]', err);
    return NextResponse.json({ error: 'Could not fetch products.' }, { status: 500 });
  }
}
