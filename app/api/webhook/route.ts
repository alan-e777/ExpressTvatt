import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { db } from '@/lib/firebase-admin';
import { settlePaidOrder } from '@/lib/order-fulfillment';

// Stripe sends the raw body — do not pre-parse it.
export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature') ?? '';

  console.log('[webhook] received, signature present:', !!signature);

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error('[webhook] signature validation failed:', err);
    return NextResponse.json({ error: 'Ogiltig signatur.' }, { status: 400 });
  }

  console.log('[webhook] event type:', event.type);

  if (event.type === 'payment_intent.succeeded') {
    const intent = event.data.object;
    console.log('[webhook] payment_intent.succeeded id:', intent.id, 'amount:', intent.amount);

    const { priceOre } = intent.metadata;
    if (priceOre && intent.amount !== Number(priceOre)) {
      console.warn('[webhook] price drift on order', intent.id, {
        quoted: priceOre,
        charged: intent.amount,
      });
    }

    try {
      // Shared with /api/confirm-order and the reconcile cron — idempotent, so
      // whichever of the three gets here first settles the order and sends the
      // confirmation email exactly once.
      await settlePaidOrder(intent, 'webhook');
      console.log('[webhook] order settled:', intent.id);
    } catch (err) {
      console.error('[webhook] settle failed for order', intent.id, err);
      // 500 makes Stripe retry, which is what we want — and the retry is safe
      // because settlePaidOrder is idempotent.
      return NextResponse.json({ error: 'Database write failed.' }, { status: 500 });
    }
  }

  if (event.type === 'payment_intent.payment_failed') {
    const intent = event.data.object;
    try {
      await db.collection('orders').doc(intent.id).set(
        { status: 'payment_failed' },
        { merge: true }
      );
    } catch (err) {
      console.error('[webhook] Firestore write failed for failed order', intent.id, err);
      return NextResponse.json({ error: 'Database write failed.' }, { status: 500 });
    }
  }

  if (event.type === 'charge.refunded') {
    const charge = event.data.object;
    const paymentIntentId = charge.payment_intent as string;
    if (paymentIntentId) {
      try {
        await db.collection('orders').doc(paymentIntentId).set(
          { status: 'refunded' },
          { merge: true }
        );
      } catch (err) {
        console.error('[webhook] Firestore write failed for refunded order', paymentIntentId, err);
        return NextResponse.json({ error: 'Database write failed.' }, { status: 500 });
      }
    }
  }

  return NextResponse.json({ received: true });
}
