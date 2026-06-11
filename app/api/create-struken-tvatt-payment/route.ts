import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { db } from '@/lib/firebase-admin';

type BasketItem = { id: string; name: string; price: number; qty: number };

export async function POST(request: NextRequest) {
  const body = await request.json();
  const {
    customerId,
    address,
    postalCode,
    date,
    time,
    notes,
    items,
    platform,
  }: {
    customerId?: string;
    address: string;
    postalCode: string;
    date: string;
    time: string;
    notes: string;
    items: BasketItem[];
    platform?: string;
  } = body;

  if (!items?.length) {
    return NextResponse.json({ error: 'Inga plagg valda.' }, { status: 400 });
  }

  // Validate prices server-side against Firestore
  const snap = await db
    .collection('services')
    .doc('struken-tvatt')
    .collection('StrukenTvatt')
    .get();

  const catalog = Object.fromEntries(snap.docs.map(d => [d.id, d.data().price as number]));

  let totalOre = 0;
  const validatedItems: BasketItem[] = [];
  for (const item of items) {
    const serverPrice = catalog[item.id];
    if (serverPrice === undefined) continue;
    totalOre += serverPrice * 100 * item.qty;
    validatedItems.push({ ...item, price: serverPrice });
  }

  if (totalOre === 0) {
    return NextResponse.json({ error: 'Kunde inte beräkna pris.' }, { status: 400 });
  }

  const itemsSummary = validatedItems
    .map(i => `${i.qty}× ${i.name} (${i.price} kr)`)
    .join(', ');

  const paymentIntent = await stripe.paymentIntents.create({
    amount:   totalOre,
    currency: 'sek',
    metadata: {
      serviceId:   'struken-tvatt',
      serviceName: 'Struken tvätt',
      priceOre:    String(totalOre),
      customerId:  customerId ?? 'anonymous',
      items:       itemsSummary,
    },
  });

  await db.collection('orders').doc(paymentIntent.id).set({
    id:             paymentIntent.id,
    paymentIntentId: paymentIntent.id,
    serviceId:      'struken-tvatt',
    serviceName:    'Struken tvätt',
    customerId:     customerId ?? 'anonymous',
    amount:         totalOre,
    currency:       'sek',
    status:         'pending_payment',
    address,
    postalCode,
    dropoffDate:    date,
    dropoffTime:    time,
    notes,
    items:          validatedItems,
    platform:       platform === 'mobile' ? 'mobile' : 'web',
    createdAt:      new Date(),
  });

  return NextResponse.json({ clientSecret: paymentIntent.client_secret });
}
