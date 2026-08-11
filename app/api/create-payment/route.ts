import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { db } from '@/lib/firebase-admin';
import { resolveCustomerContact } from '@/lib/customer-contact';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const {
    serviceId,
    customerId,
    address,
    postalCode,
    date,
    time,
    notes,
    customFields,
    platform,
    name,
    email,
    phone,
  } = body;

  if (!serviceId) {
    return NextResponse.json({ error: 'serviceId required.' }, { status: 400 });
  }

  // Firestore is the single source of truth for price
  const serviceDoc = await db.collection('services').doc(serviceId).get();
  if (!serviceDoc.exists) {
    return NextResponse.json({ error: 'Okänd tjänst.' }, { status: 400 });
  }
  const service = serviceDoc.data()!;

  // The Expo app posts no contact details — fill them from the stored profile so
  // the order can actually be confirmed and the customer reached.
  const contact = await resolveCustomerContact(customerId, {
    customerName:  name,
    customerEmail: email,
    customerPhone: phone,
  });

  const paymentIntent = await stripe.paymentIntents.create({
    amount: service.price_ore,
    currency: 'sek',
    receipt_email: contact.customerEmail || undefined,
    metadata: {
      serviceId: service.id,
      serviceName: service.name,
      priceOre: String(service.price_ore),
      customerId: customerId || 'anonymous',
    },
  });

  // Pre-create the order in Firestore with all booking details.
  // Webhook will update status to 'paid' on payment_intent.succeeded.
  await db.collection('orders').doc(paymentIntent.id).set({
    id: paymentIntent.id,
    paymentIntentId: paymentIntent.id,
    serviceId: service.id,
    serviceName: service.name,
    customerId: customerId || 'anonymous',
    customerName:  contact.customerName,
    customerEmail: contact.customerEmail,
    customerPhone: contact.customerPhone,
    amount: service.price_ore,
    currency: 'sek',
    status: 'pending_payment',
    // Booking details
    address:      address     ?? '',
    postalCode:   postalCode  ?? '',
    dropoffDate:  date        ?? '',
    dropoffTime:  time        ?? '',
    notes:        notes       ?? '',
    customFields: customFields ?? {},
    platform:     platform === 'mobile' ? 'mobile' : 'web',
    createdAt: new Date(),
  });

  return NextResponse.json({ clientSecret: paymentIntent.client_secret });
}
