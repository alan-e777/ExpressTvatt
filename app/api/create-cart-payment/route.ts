import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { db } from '@/lib/firebase-admin';
import { formatPersonnummer, isValidPersonnummer, RUT_DISCOUNT_PERCENT } from '@/lib/rut';
import { DISCOUNT_DEFAULTS, clampPct, discountedUnitPrice, type DiscountSettings } from '@/lib/discount';

type CartItem = {
  id:    string;
  name:  string;
  price: number;   // kr (client-provided, server-validated below)
  qty:   number;
  type:  'mattvätt' | 'struken' | 'service';
};

// Fixed mattvätt sizes — the canonical prices live here, never trusted from the client.
const MATTVATT_PRICES: Record<string, number> = {
  'matta-liten': 299,
  'matta-stor':  499,
  'matta-akta':  699,
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
    deliveryDate,
    deliveryTime,
    notes,
    platform,
    rutAvdrag,
    personnummer,
  }: {
    items: CartItem[];
    customerId?: string;
    name: string;
    careOf?: string;
    email?: string;
    phone?: string;
    address: string;
    postalCode: string;
    date: string;          // pickup (Upphämtning)
    time: string;
    deliveryDate?: string; // delivery (Avlämning)
    deliveryTime?: string;
    notes?: string;
    platform?: string;
    rutAvdrag?: boolean;
    personnummer?: string;
  } = body;

  // ── RUT-Avdrag ───────────────────────────────────────────────────────────────
  // The customer always pays the full price; RUT_DISCOUNT_PERCENT is refunded
  // manually later. We only persist the request + personnummer for the admin.
  const rutPersonnummer = rutAvdrag ? formatPersonnummer(personnummer ?? '') : '';
  if (rutAvdrag && !isValidPersonnummer(rutPersonnummer)) {
    return NextResponse.json({ error: 'Ogiltigt personnummer för RUT-avdrag.' }, { status: 400 });
  }

  if (!items?.length) {
    return NextResponse.json({ error: 'Varukorgen är tom.' }, { status: 400 });
  }

  // ── Availability: reject pickup/delivery on an admin-blocked date ─────────────
  const availSnap = await db.collection('settings').doc('availability').get();
  const blockedDates: string[] = (availSnap.exists ? availSnap.data()?.blockedDates : []) ?? [];
  if (blockedDates.includes(date) || (deliveryDate && blockedDates.includes(deliveryDate))) {
    return NextResponse.json({ error: 'Ett av de valda datumen är inte längre tillgängligt. Välj ett annat datum.' }, { status: 400 });
  }

  // ── Schedule validation: delivery must be ≥ 3 calendar days after pickup ─────
  if (deliveryDate) {
    const dayDiff = Math.round(
      (new Date(deliveryDate).getTime() - new Date(date).getTime()) / (24 * 60 * 60 * 1000)
    );
    if (dayDiff < 3) {
      return NextResponse.json({ error: 'Avlämning måste vara minst 3 dagar efter upphämtning.' }, { status: 400 });
    }
  }

  // ── Server-side price validation ────────────────────────────────────────────

  // Fetch price catalogs for struken + services + the discount/delivery settings in parallel
  const [strukenSnap, servicesSnap, discountsSnap, driverSnap] = await Promise.all([
    db.collection('services').doc('struken-tvatt').collection('StrukenTvatt').get(),
    db.collection('services').get(),
    db.collection('settings').doc('discounts').get(),
    db.collection('settings').doc('driver').get(),
  ]);

  const strukenPrices = Object.fromEntries(
    strukenSnap.docs.map(d => [d.id, d.data().price as number])
  );
  const servicePrices = Object.fromEntries(
    servicesSnap.docs.map(d => [d.id, Math.round(d.data().price_ore / 100) as number])
  );
  // Per-item discount % maps (0 when unset).
  const strukenDiscount = Object.fromEntries(
    strukenSnap.docs.map(d => [d.id, clampPct(d.data().discountPercent ?? 0)])
  );
  const serviceDiscount = Object.fromEntries(
    servicesSnap.docs.map(d => [d.id, clampPct(d.data().discountPercent ?? 0)])
  );

  // ── Discount settings + first-time eligibility ──────────────────────────────
  const discounts: DiscountSettings = {
    ...DISCOUNT_DEFAULTS,
    ...(discountsSnap.exists ? (discountsSnap.data() as Partial<DiscountSettings>) : {}),
    mattvatt: { ...DISCOUNT_DEFAULTS.mattvatt, ...(discountsSnap.data()?.mattvatt ?? {}) },
  };
  // First-timer only when a known (non-anonymous) customer has never had a paid order.
  let isFirstTime = false;
  if (customerId && customerId !== 'anonymous' && discounts.firstTimeDiscountPercent > 0) {
    const custSnap = await db.collection('customers').doc(customerId).get();
    isFirstTime = !(custSnap.exists && custSnap.data()?.hasPlacedOrder === true);
  }
  const firstTimePct = isFirstTime ? clampPct(discounts.firstTimeDiscountPercent) : 0;

  // Per-item discount % for a line, by type/id.
  const itemDiscountPct = (item: CartItem): number => {
    if (item.type === 'mattvätt') return clampPct(discounts.mattvatt[item.id as keyof typeof discounts.mattvatt] ?? 0);
    if (item.type === 'struken')  return strukenDiscount[item.id] ?? 0;
    if (item.type === 'service')  return serviceDiscount[item.id] ?? 0;
    return 0;
  };

  let totalOre = 0;
  let originalOre = 0;
  const validatedItems: (CartItem & { validatedPrice: number; discountPercent: number; discountedPrice: number })[] = [];

  for (const item of items) {
    if (item.qty < 1) continue;

    let priceKr: number | null = null;

    if (item.type === 'mattvätt') {
      // Fixed-size mattvätt (matta-liten / matta-stor / matta-akta).
      // Fall back to the legacy "Matta X m²" (kvm × 90) for older clients.
      if (MATTVATT_PRICES[item.id] !== undefined) {
        priceKr = MATTVATT_PRICES[item.id];
      } else {
        const match = item.name.match(/(\d+(?:\.\d+)?)\s*m²/i);
        const kvm   = match ? parseFloat(match[1]) : null;
        priceKr     = kvm ? Math.round(kvm) * 90 : null;
      }
    } else if (item.type === 'struken') {
      priceKr = strukenPrices[item.id] ?? null;
    } else if (item.type === 'service') {
      priceKr = servicePrices[item.id] ?? null;
    }

    if (priceKr === null) continue;

    const itemPct = itemDiscountPct(item);
    const unitKr  = discountedUnitPrice(priceKr, itemPct, firstTimePct, discounts.multipleDiscountsAllowed);

    originalOre += priceKr * 100 * item.qty;
    totalOre    += unitKr * 100 * item.qty;
    validatedItems.push({ ...item, validatedPrice: priceKr, discountPercent: itemPct, discountedPrice: unitKr });
  }

  if (totalOre === 0) {
    return NextResponse.json({ error: 'Kunde inte beräkna totalpris.' }, { status: 400 });
  }

  // ── Delivery fee ────────────────────────────────────────────────────────────
  // Pickup + delivery is free once the (discounted) order total reaches the
  // admin-set threshold; below it, a flat fee applies. Both default to 0, so the
  // charge is unchanged until an admin configures them in Inställningar.
  const driverData = driverSnap.exists ? driverSnap.data() : {};
  const freeDeliveryThresholdKr = Math.max(0, Math.round(Number(driverData?.freeDeliveryThresholdKr) || 0));
  const deliveryFeeKr           = Math.max(0, Math.round(Number(driverData?.deliveryFeeKr) || 0));
  const itemsTotalKr            = totalOre / 100;
  const appliedDeliveryFeeKr    = itemsTotalKr >= freeDeliveryThresholdKr ? 0 : deliveryFeeKr;
  const deliveryFeeOre          = appliedDeliveryFeeKr * 100;

  totalOre    += deliveryFeeOre;
  originalOre += deliveryFeeOre;

  const itemsSummary = validatedItems
    .map(i => `${i.qty}× ${i.name} (${i.discountedPrice} kr)`)
    .join(', ');

  // ── Create Stripe PaymentIntent ─────────────────────────────────────────────

  const paymentIntent = await stripe.paymentIntents.create({
    amount:   totalOre,
    currency: 'sek',
    metadata: {
      serviceId:   'cart',
      serviceName: 'Express Tvätt-korg',
      priceOre:    String(totalOre),
      customerId:  customerId ?? 'anonymous',
      items:       itemsSummary.slice(0, 500), // Stripe metadata limit
      rutAvdrag:   rutAvdrag ? 'true' : 'false',
      rutPersonnummer: rutPersonnummer,
      firstTimeDiscount: isFirstTime ? String(firstTimePct) : '0',
      deliveryFee: String(appliedDeliveryFeeKr),
    },
  });

  // ── Pre-create order in Firestore ───────────────────────────────────────────

  await db.collection('orders').doc(paymentIntent.id).set({
    id:              paymentIntent.id,
    paymentIntentId: paymentIntent.id,
    serviceId:       'cart',
    serviceName:     'Express Tvätt-korg',
    customerId:      customerId ?? 'anonymous',
    amount:          totalOre,
    originalAmount:  originalOre,
    currency:        'sek',
    status:          'pending_payment',
    // Delivery fee charged on this order (kr), 0 when free pickup/delivery applied.
    deliveryFeeKr:   appliedDeliveryFeeKr,
    deliveryFeeOre:  deliveryFeeOre,
    // Discount bookkeeping (RUT is separate — see below).
    firstTimeDiscountApplied:  isFirstTime,
    firstTimeDiscountPercent:  firstTimePct,
    discountSavingsOre:        originalOre - totalOre,
    multipleDiscountsAllowed:  discounts.multipleDiscountsAllowed,
    customerName:    name ?? '',
    careOf:          careOf ?? '',
    customerEmail:   email ?? '',
    customerPhone:   phone ?? '',
    address,
    postalCode,
    // `dropoffDate`/`dropoffTime` historically hold the scheduled pickup — kept for
    // the admin calendar/driver/orders views which key off them.
    dropoffDate:     date,
    dropoffTime:     time,
    pickupDate:      date,
    pickupTime:      time,
    deliveryDate:    deliveryDate ?? '',
    deliveryTime:    deliveryTime ?? '',
    notes:           notes ?? '',
    items:           validatedItems,
    // RUT-Avdrag: full amount is still charged; these fields drive the manual
    // refund + the admin "RUT" tag. `tags` is a free-form list independent of status.
    rutAvdrag:           !!rutAvdrag,
    rutPersonnummer:     rutPersonnummer,
    rutDiscountPercent:  rutAvdrag ? RUT_DISCOUNT_PERCENT : 0,
    rutRefundOre:        rutAvdrag ? Math.round((totalOre * RUT_DISCOUNT_PERCENT) / 100) : 0,
    tags:                rutAvdrag ? ['RUT'] : [],
    platform:        platform === 'mobile' ? 'mobile' : 'web',
    createdAt:       new Date(),
  });

  return NextResponse.json({ clientSecret: paymentIntent.client_secret, orderId: paymentIntent.id });
}
