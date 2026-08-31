import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { normalizePricing } from '@/lib/serviceUnits';
import { normalizeMinQty } from '@/lib/minOrderQty';

/**
 * The public product catalogue. Every distinct `category` here is a category on
 * the order page, so this is also what decides which rows the customer sees.
 *
 * Products in a hidden category are dropped server-side rather than filtered in
 * the page: the iOS app reads this same route, and hiding a category has to take
 * it off both surfaces without either of them having to know about the flag.
 */
export async function GET() {
  try {
    const [snap, catsSnap] = await Promise.all([
      db.collection('services').doc('struken-tvatt').collection('StrukenTvatt').orderBy('order').get(),
      db.collection('service_categories').get(),
    ]);

    const hidden = new Set(
      catsSnap.docs.filter(d => d.data().hidden === true).map(d => d.data().name as string),
    );

    const products = snap.docs
      .map(doc => {
        const data = doc.data();
        // Pricing and the order minimum are normalized here rather than on each
        // client: a per-kg item saved before the range existed still comes back
        // with a usable slider range, a `st` item can never carry a stray one,
        // and an item saved before minimums existed reads back as "one is fine".
        return { id: doc.id, ...data, ...normalizePricing(data), minQty: normalizeMinQty(data.minQty) };
      })
      .filter(p => !hidden.has((p as { category?: string }).category ?? ''));

    return NextResponse.json(products);
  } catch (err) {
    console.error('[GET /api/struken-tvatt]', err);
    return NextResponse.json({ error: 'Could not fetch products.' }, { status: 500 });
  }
}
