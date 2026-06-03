import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { db } from '@/lib/firebase-admin';

type CartItem = {
  id:    string;
  name:  string;
  price: number;   // kr (client-provided, server-validated below)
  qty:   number;
  type:  'mattvätt' | 'struken' | 'service';
};

export async function POST(request: NextRequest) {
  const body = await request.json();
  const {
    items,
    customerId,
    name,
    careOf,
    email,
    phone,
    address,
    postalCode,
    date,
    time,
    notes,
  }: {
    items: CartItem[];
    customerId?: string;
    name: string;
    careOf?: string;
    email?: string;
    phone?: string;
    address: string;
    postalCode: string;
    date: string;
    time: string;
    notes?: string;
  } = body;

  if (!items?.length) {
    return NextResponse.json({ error: 'Varukorgen är tom.' }, { status: 400 });
  }

  // ── Server-side price validation ────────────────────────────────────────────

  // Fetch price catalogs for struken + services in parallel
  const [strukenSnap, servicesSnap] = await Promise.all([
    db.collection('services').doc('struken-tvatt').collection('StrukenTvatt').get(),
    db.collection('services').get(),
  ]);

  const strukenPrices = Object.fromEntries(
    strukenSnap.docs.map(d => [d.id, d.data().price as number])
  );
  const servicePrices = Object.fromEntries(
    servicesSnap.docs.map(d => [d.id, Math.round(d.data().price_ore / 100) as number])
  );

  let totalOre = 0;
  const validatedItems: (CartItem & { validatedPrice: number })[] = [];

  for (const item of items) {
    if (item.qty < 1) continue;

    let priceKr: number | null = null;

    if (item.type === 'mattvätt') {
      // Derive from name "Matta X m²" or trust client price (kvm × 90 is deterministic)
      const match = item.name.match(/(\d+(?:\.\d+)?)\s*m²/i);
      const kvm   = match ? parseFloat(match[1]) : null;
      priceKr     = kvm ? Math.round(kvm) * 90 : null;
    } else if (item.type === 'struken') {
      priceKr = strukenPrices[item.id] ?? null;
    } else if (item.type === 'service') {
      priceKr = servicePrices[item.id] ?? null;
    }

    if (priceKr === null) continue;

    totalOre += priceKr * 100 * item.qty;
    validatedItems.push({ ...item, validatedPrice: priceKr });
  }

  if (totalOre === 0) {
    return NextResponse.json({ error: 'Kunde inte beräkna totalpris.' }, { status: 400 });
  }

  const itemsSummary = validatedItems
    .map(i => `${i.qty}× ${i.name} (${i.validatedPrice} kr)`)
    .join(', ');

  // ── Create Stripe PaymentIntent ─────────────────────────────────────────────

  const paymentIntent = await stripe.paymentIntents.create({
    amount:   totalOre,
    currency: 'sek',
    metadata: {
      serviceId:   'cart',
      serviceName: 'Tvättio Korg',
      priceOre:    String(totalOre),
      customerId:  customerId ?? 'anonymous',
      items:       itemsSummary.slice(0, 500), // Stripe metadata limit
    },
  });

  // ── Pre-create order in Firestore ───────────────────────────────────────────

  await db.collection('orders').doc(paymentIntent.id).set({
    id:              paymentIntent.id,
    paymentIntentId: paymentIntent.id,
    serviceId:       'cart',
    serviceName:     'Tvättio Korg',
    customerId:      customerId ?? 'anonymous',
    amount:          totalOre,
    currency:        'sek',
    status:          'pending_payment',
    customerName:    name ?? '',
    careOf:          careOf ?? '',
    customerEmail:   email ?? '',
    customerPhone:   phone ?? '',
    address,
    postalCode,
    dropoffDate:     date,
    dropoffTime:     time,
    notes:           notes ?? '',
    items:           validatedItems,
    createdAt:       new Date(),
  });

  return NextResponse.json({ clientSecret: paymentIntent.client_secret });
}
