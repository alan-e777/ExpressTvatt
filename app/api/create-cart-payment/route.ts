import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { db, auth } from '@/lib/firebase-admin';
import { isAdminUid } from '@/lib/admin-auth';
import { orderNumber, sendStatusEmail } from '@/lib/order-status-email';
import { sendStatusSms } from '@/lib/order-status-sms';
import { formatPersonnummer, isValidPersonnummer, rutRefundKr, RUT_DISCOUNT_PERCENT } from '@/lib/rut';
import { DISCOUNT_DEFAULTS, clampPct, discountedUnitPrice, mattvattLinePct, type DiscountSettings } from '@/lib/discount';
import { mattaLineName, mattaPriceKr, normalizeMattvattSettings, parseMattaLineId, type MattvattSettings } from '@/lib/mattvatt';
import { isFirstTimeCustomer } from '@/lib/first-time';
import { MATTVATT_CATEGORY } from '@/lib/serviceCategories';
import { clampAmountToRange, isMeasured, measuredLineName, measuredPriceKr, normalizePricing } from '@/lib/serviceUnits';

type CartItem = {
  id:    string;
  name:  string;
  price: number;   // kr (client-provided, server-validated below)
  qty:   number;
  type:  'mattvätt' | 'struken' | 'service';
  /**
   * The customer's instruction for this line ("korta 2 cm"), asked for by
   * categories with `requiresInput`. Free text with no effect on price — it is
   * carried onto the order so the shop knows what to do with the garment.
   */
  note?: string;
  /**
   * How much of a per-kg / per-m² product this line is for. Like `price`, it is
   * client-supplied and not trusted: it is snapped to the product's own step and
   * clamped into the admin's range before anything is priced from it.
   */
  amount?: number;
};

// Legacy fixed mattvätt sizes. The website now sends area-based lines
// (`matta-normal-3.5`, priced from settings/mattvatt), but the iOS app still
// sells these three fixed sizes — so their canonical prices stay here.
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
  // RUT_DISCOUNT_PERCENT is deducted directly from the charged amount (the
  // business reclaims it from Skatteverket). The deduction itself is computed
  // further down once the item subtotal is known.
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
  const [strukenSnap, servicesSnap, discountsSnap, driverSnap, mattvattSnap, categoriesSnap] = await Promise.all([
    db.collection('services').doc('struken-tvatt').collection('StrukenTvatt').get(),
    db.collection('services').get(),
    db.collection('settings').doc('discounts').get(),
    db.collection('settings').doc('driver').get(),
    db.collection('settings').doc('mattvatt').get(),
    db.collection('service_categories').get(),
  ]);

  // Categories the admin has hidden. Hiding takes a service off the site, so it
  // has to take it out of the basket too — otherwise an old cart link, or a tab
  // left open since before it was hidden, could still book the work.
  const hiddenCategories = new Set(
    categoriesSnap.docs.filter(d => d.data().hidden === true).map(d => d.data().name as string),
  );

  // Mattvätt: kr per m² + the allowed size range. The client's chosen area is
  // clamped back into that range here, so a hand-edited cart link cannot buy a
  // 100 m² rug at the small-rug price.
  const mattvattSettings: MattvattSettings = normalizeMattvattSettings(
    mattvattSnap.exists ? (mattvattSnap.data() as Partial<MattvattSettings>) : null,
  );

  // Full docs, not just prices: a measured product prices as rate × amount, and
  // its unit, range and name all come from the catalogue rather than the client.
  const strukenById = Object.fromEntries(
    strukenSnap.docs.map(d => {
      const data = d.data();
      return [d.id, {
        price:    data.price as number,
        name:     (data.name as string) ?? '',
        category: (data.category as string) ?? '',
        pricing:  normalizePricing(data),
      }];
    })
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
  // Verify the caller's Firebase ID token. The first-time discount is granted ONLY
  // to a verified, logged-in customer — never on the client-supplied customerId,
  // which an anonymous user could spoof to claim the discount.
  let verifiedUid: string | null = null;
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    try {
      verifiedUid = (await auth.verifyIdToken(authHeader.slice(7))).uid;
    } catch {
      verifiedUid = null;
    }
  }
  // Attribute the order to the verified UID when present, so hasPlacedOrder is
  // flipped on the same account the discount eligibility was checked against.
  const effectiveCustomerId = verifiedUid ?? customerId ?? 'anonymous';

  // First-timer only when a verified, logged-in customer has never placed an
  // order. `isFirstTimeCustomer` is the same function /api/first-time-eligibility
  // serves to the checkout screen, so the displayed price and the charged amount
  // can never disagree about this.
  const isFirstTime =
    discounts.firstTimeDiscountPercent > 0 && (await isFirstTimeCustomer(verifiedUid));
  const firstTimePct = isFirstTime ? clampPct(discounts.firstTimeDiscountPercent) : 0;

  // Per-item discount % for a line, by type/id.
  const itemDiscountPct = (item: CartItem): number => {
    if (item.type === 'mattvätt') return mattvattLinePct(discounts.mattvatt, item.id);
    if (item.type === 'struken')  return strukenDiscount[item.id] ?? 0;
    if (item.type === 'service')  return serviceDiscount[item.id] ?? 0;
    return 0;
  };

  // Lines whose category has been hidden since the basket was filled. Collected
  // rather than skipped: quietly dropping them would charge less than the
  // customer was shown and deliver less than they ordered, so the whole booking
  // is refused with something they can act on instead.
  const unavailable: string[] = [];
  // Measured lines from a client that does not understand units — today that is
  // the iOS app, which renders every product as a piece price and sends no
  // amount. Pricing those at the minimum would charge more than the app showed,
  // so they are refused rather than guessed at.
  const unsupported: string[] = [];

  let totalOre = 0;
  let originalOre = 0;
  const validatedItems: (CartItem & { validatedPrice: number; discountPercent: number; discountedPrice: number })[] = [];

  for (const item of items) {
    if (item.qty < 1) continue;

    let priceKr: number | null = null;
    let lineName = item.name;
    // Set only for a measured line, and only to the value the price was actually
    // calculated from — never to what the client sent.
    let measuredAmount: number | undefined;

    if (item.type === 'mattvätt') {
      if (hiddenCategories.has(MATTVATT_CATEGORY)) { unavailable.push(item.name); continue; }
      // Area-based line (`matta-normal-3.5`) → kr per m² × m², both from settings.
      // Older clients fall back to the fixed sizes, then to the legacy
      // "Matta X m²" name (kvm × 90).
      const matta = parseMattaLineId(item.id);
      if (matta) {
        priceKr  = mattaPriceKr(mattvattSettings, matta.type, matta.sqm);
        // Name it from the parsed line too — the order record and the receipt
        // should never show an area the price was not calculated from.
        lineName = mattaLineName(matta.type, matta.sqm, mattvattSettings);
      } else if (MATTVATT_PRICES[item.id] !== undefined) {
        priceKr = MATTVATT_PRICES[item.id];
      } else {
        const match = item.name.match(/(\d+(?:\.\d+)?)\s*m²/i);
        const kvm   = match ? parseFloat(match[1]) : null;
        priceKr     = kvm ? Math.round(kvm) * 90 : null;
      }
    } else if (item.type === 'struken') {
      const product = strukenById[item.id];
      if (product && hiddenCategories.has(product.category)) { unavailable.push(product.name || item.name); continue; }
      if (product && isMeasured(product.pricing.unit)) {
        if (item.amount === undefined || item.amount === null) {
          unsupported.push(product.name || item.name);
          continue;
        }
        // rate × amount, both re-derived here: the amount is snapped to the
        // product's step and clamped into the admin's range, so a hand-edited
        // cart cannot buy 100 kg at the price shown for 5.
        const amount = clampAmountToRange(item.amount, product.pricing);
        priceKr        = measuredPriceKr(product.price, amount);
        lineName       = measuredLineName(product.name, amount, product.pricing.unit);
        measuredAmount = amount;
      } else {
        priceKr = product?.price ?? null;
      }
    } else if (item.type === 'service') {
      priceKr = servicePrices[item.id] ?? null;
    }

    // Drop anything that isn't a sane price. Negative would subtract from the
    // rest of the basket rather than simply being ignored. 0 is kept on purpose:
    // it is how a test item is priced (see isTestOrder below).
    if (priceKr === null || !Number.isFinite(priceKr) || priceKr < 0) continue;

    const itemPct = itemDiscountPct(item);
    const unitKr  = discountedUnitPrice(priceKr, itemPct, firstTimePct, discounts.multipleDiscountsAllowed);

    originalOre += priceKr * 100 * item.qty;
    totalOre    += unitKr * 100 * item.qty;
    // The client's own `amount` is dropped rather than merged: only the figure
    // the price was calculated from belongs on the order, and a stray one on a
    // non-measured line would be an undefined field Firestore refuses to write.
    const { amount: _clientAmount, ...lineFields } = item;
    validatedItems.push({
      ...lineFields,
      name: lineName,
      ...(measuredAmount !== undefined ? { amount: measuredAmount } : {}),
      // Trimmed and length-capped: it is free text from the client and ends up
      // on the order record the shop reads off.
      note: typeof item.note === 'string' ? item.note.trim().slice(0, 300) : '',
      validatedPrice: priceKr, discountPercent: itemPct, discountedPrice: unitKr,
    });
  }

  if (unsupported.length > 0) {
    return NextResponse.json(
      { error: `${unsupported.join(', ')} kan inte beställas härifrån — priset sätts efter vikt eller yta. Beställ på webbplatsen i stället.` },
      { status: 400 },
    );
  }

  if (unavailable.length > 0) {
    return NextResponse.json(
      { error: `${unavailable.join(', ')} är inte längre tillgänglig${unavailable.length > 1 ? 'a' : ''}. Ta bort den från varukorgen och försök igen.` },
      { status: 400 },
    );
  }

  // ── Test orders ─────────────────────────────────────────────────────────────
  // A basket of nothing but 0 kr lines is a test order. Stripe cannot take a
  // 0 kr payment at all — its SEK minimum is 3 kr — so these never reach Stripe:
  // the order is written straight to Firestore already settled. That is what
  // makes an end-to-end test disposable: delete the order, no refund, no fees.
  const isTestOrder = validatedItems.length > 0 && validatedItems.every(i => i.validatedPrice === 0);

  // 0 kr items are hidden from the public catalogue, but that is only cosmetic —
  // a hand-edited cart link would otherwise let anyone book real work for free.
  // The verified ID token is the actual gate.
  if (isTestOrder && !(verifiedUid && (await isAdminUid(verifiedUid)))) {
    return NextResponse.json(
      { error: 'Testartiklar kan bara beställas av en inloggad administratör.' },
      { status: 403 },
    );
  }

  if (totalOre === 0 && !isTestOrder) {
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
  // A test order pays nothing at all — a delivery fee would push it back over 0
  // and straight into Stripe, which is exactly what it exists to avoid.
  const appliedDeliveryFeeKr    = isTestOrder ? 0
    : itemsTotalKr >= freeDeliveryThresholdKr ? 0 : deliveryFeeKr;
  const deliveryFeeOre          = appliedDeliveryFeeKr * 100;

  totalOre    += deliveryFeeOre;
  originalOre += deliveryFeeOre;

  // Savings from item-level + first-time discounts only (computed before RUT).
  const discountSavingsOre = originalOre - totalOre;

  // ── RUT-Avdrag — deducted directly from the charged amount ───────────────────
  // Whole-kr deduction on the items portion only (never the delivery fee), mirrored
  // exactly on the client so the displayed total equals the charged amount.
  const rutDiscountKr  = rutAvdrag ? rutRefundKr((totalOre - deliveryFeeOre) / 100) : 0;
  const rutDiscountOre = rutDiscountKr * 100;
  totalOre -= rutDiscountOre;

  const itemsSummary = validatedItems
    .map(i => `${i.qty}× ${i.name}${i.note ? ` [${i.note}]` : ''} (${i.discountedPrice} kr)`)
    .join(', ');

  // ── Create Stripe PaymentIntent (skipped entirely for a test order) ─────────

  let orderId: string;
  let clientSecret: string | null = null;

  if (isTestOrder) {
    // Its own id namespace, so a test order is recognisable at a glance and can
    // never collide with a real `pi_…`.
    orderId = `test_${randomUUID().replace(/-/g, '').slice(0, 20)}`;
  } else {
    const paymentIntent = await stripe.paymentIntents.create({
      amount:   totalOre,
      currency: 'sek',
      // Stripe's own receipt is an independent backstop: the customer gets proof
      // of payment even if Resend is misconfigured.
      receipt_email: email?.trim() || undefined,
      metadata: {
        serviceId:   'cart',
        serviceName: 'Express Tvätt-korg',
        priceOre:    String(totalOre),
        customerId:  effectiveCustomerId,
        items:       itemsSummary.slice(0, 500), // Stripe metadata limit
        rutAvdrag:   rutAvdrag ? 'true' : 'false',
        rutPersonnummer: rutPersonnummer,
        firstTimeDiscount: isFirstTime ? String(firstTimePct) : '0',
        rutDiscount: String(rutDiscountKr),
        deliveryFee: String(appliedDeliveryFeeKr),
      },
    });
    orderId      = paymentIntent.id;
    clientSecret = paymentIntent.client_secret;
  }

  // ── Pre-create order in Firestore ───────────────────────────────────────────

  await db.collection('orders').doc(orderId).set({
    id:              orderId,
    // Kept equal to the order id for a test order too, so everything that keys
    // off it (order numbers, the reconcile sweep's tombstones) still works.
    paymentIntentId: orderId,
    serviceId:       'cart',
    serviceName:     'Express Tvätt-korg',
    customerId:      effectiveCustomerId,
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
    discountSavingsOre:        discountSavingsOre,
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
    // RUT-Avdrag: deducted directly from the charged amount. `rutRefundOre` holds
    // the deducted amount (what the business reclaims from Skatteverket) and drives
    // the admin "RUT" tag. `tags` is a free-form list independent of status.
    rutAvdrag:           !!rutAvdrag,
    rutPersonnummer:     rutPersonnummer,
    rutDiscountPercent:  rutAvdrag ? RUT_DISCOUNT_PERCENT : 0,
    rutRefundOre:        rutDiscountOre,
    tags:                [...(rutAvdrag ? ['RUT'] : []), ...(isTestOrder ? ['TEST'] : [])],
    platform:        platform === 'mobile' ? 'mobile' : 'web',
    createdAt:       new Date(),
    // A test order has nothing to settle — no PaymentIntent will ever succeed
    // for it — so it is born paid. `settlePaidOrder` is never involved.
    ...(isTestOrder ? {
      status:                  'paid',
      isTestOrder:             true,
      paidAt:                  new Date(),
      settledBy:               'test',
      confirmationEmailSentAt: new Date(),
    } : {}),
  });

  if (isTestOrder) {
    // The exact pair a real order sends from settlePaidOrder — email *and* SMS.
    // A test that skipped a channel would not be testing the thing that matters,
    // so this deliberately mirrors it rather than being cheaper.
    // Best-effort: a failed send must not fail the order.
    const testOrderNo = orderNumber(orderId);
    const [emailResult, smsResult] = await Promise.all([
      sendStatusEmail({
        to:      email?.trim() || null,
        name:    name ?? '',
        orderNo: testOrderNo,
        status:  'order_received',
      }).catch(err => ({ ok: false, error: String(err) })),
      sendStatusSms({
        to:      phone?.trim() || null,
        name:    name ?? '',
        orderNo: testOrderNo,
        status:  'order_received',
      }).catch(err => ({ ok: false, error: String(err) })),
    ]);
    // Logged *and* stamped on the order. A test order exists to be inspected, and
    // a channel that silently skips (no 46elks key, no phone, Resend refusing the
    // recipient) is otherwise invisible — especially on Vercel, where there are no
    // logs to go back to. Never fails the order; the order itself is the artefact.
    console.log('[create-cart-payment] test order', testOrderNo,
      '— email:', JSON.stringify(emailResult), 'sms:', JSON.stringify(smsResult));
    await db.collection('orders').doc(orderId).set({
      confirmationNotice: {
        at:    new Date(),
        from:  process.env.RESEND_FROM ?? '',
        email: { ok: emailResult.ok, to: email?.trim() ?? '', error: (emailResult as { error?: string }).error ?? '', skipped: (emailResult as { skipped?: string }).skipped ?? '' },
        sms:   { ok: smsResult.ok,   to: phone?.trim() ?? '', error: (smsResult   as { error?: string }).error ?? '', skipped: (smsResult   as { skipped?: string }).skipped ?? '' },
      },
    }, { merge: true }).catch(err => console.error('[create-cart-payment] could not record notification outcome', err));

    // Deliberately NOT flipping `hasPlacedOrder`: a test must stay repeatable,
    // and burning the account's first-time discount would make it a one-shot.
    return NextResponse.json({ testOrder: true, orderId });
  }

  return NextResponse.json({ clientSecret, orderId });
}
