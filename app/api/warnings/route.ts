import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';

/**
 * Public warning texts, keyed by id.
 *
 * Products expose only `warningIds`; the customer app resolves them through
 * this route. Kept separate from `/api/struken-tvatt` so that route keeps
 * returning a plain product array to its existing callers.
 */
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const snap = await db.collection('product_warnings').orderBy('order').get();
    const warnings: Record<string, string> = {};
    snap.docs.forEach(d => { warnings[d.id] = d.data().text ?? ''; });
    return NextResponse.json(warnings);
  } catch (err) {
    console.error('[GET /api/warnings]', err);
    // Never break the product list over a missing remark.
    return NextResponse.json({});
  }
}
