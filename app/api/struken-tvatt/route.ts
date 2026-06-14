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
    return NextResponse.json(products);
  } catch (err) {
    console.error('[GET /api/struken-tvatt]', err);
    return NextResponse.json({ error: 'Could not fetch products.' }, { status: 500 });
  }
}
