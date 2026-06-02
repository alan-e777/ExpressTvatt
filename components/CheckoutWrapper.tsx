'use client';

import { useEffect, useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import CheckoutForm from './CheckoutForm';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

type BookingParams = {
  serviceId:    string;
  serviceName:  string;
  priceOre:     number;
  address:      string;
  postalCode:   string;
  date:         string;
  time:         string;
  notes:        string;
  customFields: Record<string, string>;
  customerId?:  string;
};

export default function CheckoutWrapper({ bookingParams }: { bookingParams: BookingParams }) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loadError,    setLoadError]    = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/create-payment', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        serviceId:    bookingParams.serviceId,
        customerId:   bookingParams.customerId,
        address:      bookingParams.address,
        postalCode:   bookingParams.postalCode,
        date:         bookingParams.date,
        time:         bookingParams.time,
        notes:        bookingParams.notes,
        customFields: bookingParams.customFields,
      }),
    })
      .then(r => { if (!r.ok) throw new Error('Kunde inte starta betalning.'); return r.json(); })
      .then(data => setClientSecret(data.clientSecret))
      .catch((err: Error) => setLoadError(err.message));
  }, [bookingParams.serviceId]);

  if (loadError) return <p className="error-msg">{loadError}</p>;

  if (!clientSecret) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {[1, 2, 3].map(i => (
          <div key={i} className="skeleton" style={{ height: 50, borderRadius: 'var(--radius-md)' }} />
        ))}
      </div>
    );
  }

  return (
    <Elements stripe={stripePromise} options={{ clientSecret }}>
      <CheckoutForm
        serviceName={bookingParams.serviceName}
        priceOre={bookingParams.priceOre}
        address={bookingParams.address}
        postalCode={bookingParams.postalCode}
        date={bookingParams.date}
        time={bookingParams.time}
        notes={bookingParams.notes}
      />
    </Elements>
  );
}
