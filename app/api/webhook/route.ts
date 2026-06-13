import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { db } from '@/lib/firebase-admin';
import { sendStatusEmail, orderNumber } from '@/lib/order-status-email';

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
      // The order doc was pre-created by create-payment with all booking details.
      // We just update the payment fields — merge keeps booking data intact.
      await db.collection('orders').doc(intent.id).set(
        {
          status: 'paid',
          amount: intent.amount,      // confirmed charged amount
          currency: intent.currency,
          paidAt: new Date(),
        },
        { merge: true }
      );
      console.log('[webhook] order updated to paid:', intent.id);

      // Send order confirmation email — best-effort, never fail the webhook.
      const orderSnap = await db.collection('orders').doc(intent.id).get();
      const order = orderSnap.data() ?? {};
      sendStatusEmail({
        to: order.customerEmail ?? null,
        name: order.customerName ?? '',
        orderNo: orderNumber(order.paymentIntentId ?? intent.id),
        status: 'order_received',
      }).catch(err => console.error('[webhook] order confirmation email failed:', err));
    } catch (err) {
      console.error('[webhook] Firestore write failed for order', intent.id, err);
      return NextResponse.json({ error: 'Database write failed.' }, { status: 500 });
    }

    // Mark the customer as having placed an order so the first-time discount only
    // applies once. Best-effort — never fail the webhook over this.
    const customerId = intent.metadata?.customerId;
    if (customerId && customerId !== 'anonymous') {
      try {
        await db.collection('customers').doc(customerId).set({ hasPlacedOrder: true }, { merge: true });
        console.log('[webhook] customer marked hasPlacedOrder:', customerId);
      } catch (err) {
        console.error('[webhook] failed to set hasPlacedOrder for', customerId, err);
      }
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
