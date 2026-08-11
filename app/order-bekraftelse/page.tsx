'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Confetti from '@/components/Confetti';

/**
 * Landing page for redirect-based payment methods (Klarna, Swish, bank
 * redirects). Stripe sends the customer back here with `payment_intent` and
 * `redirect_status` in the query string.
 *
 * Card payments never reach this page — they resolve inline via
 * `redirect: 'if_required'`. Both paths call `/api/confirm-order` so the order
 * is settled server-side even if the Stripe webhook is down.
 */

type State = 'checking' | 'success' | 'processing' | 'failed';

function ConfirmationInner() {
  const params = useSearchParams();
  const paymentIntentId = params.get('payment_intent');
  const redirectStatus  = params.get('redirect_status');

  const [state, setState] = useState<State>('checking');

  useEffect(() => {
    if (!paymentIntentId) { setState('failed'); return; }
    if (redirectStatus && redirectStatus !== 'succeeded') {
      setState(redirectStatus === 'processing' ? 'processing' : 'failed');
      return;
    }

    fetch('/api/confirm-order', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ paymentIntentId }),
    })
      .then(r => r.json())
      .then(data => setState(data.settled ? 'success' : 'processing'))
      // The webhook and the reconcile sweep are still covering us here, so a
      // network blip on this call is not a lost order.
      .catch(() => setState('processing'));
  }, [paymentIntentId, redirectStatus]);

  const orderNo = paymentIntentId ? `#${paymentIntentId.slice(-7).toUpperCase()}` : '—';

  if (state === 'checking') {
    return (
      <div className="success-box">
        <p className="body" style={{ color: 'var(--text-muted)', textAlign: 'center' }}>
          Bekräftar din betalning…
        </p>
      </div>
    );
  }

  if (state === 'failed') {
    return (
      <div className="success-box">
        <div className="h2" style={{ marginBottom: 12, textAlign: 'center' }}>
          Betalningen gick inte igenom
        </div>
        <p className="body" style={{ color: 'var(--text-muted)', textAlign: 'center', marginBottom: 28, maxWidth: 340 }}>
          Ingen betalning har dragits. Försök gärna igen, eller hör av dig till oss om problemet kvarstår.
        </p>
        <Link href="/order" className="btn-primary" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          Tillbaka till bokningen
        </Link>
      </div>
    );
  }

  if (state === 'processing') {
    return (
      <div className="success-box">
        <div className="h2" style={{ marginBottom: 12, textAlign: 'center' }}>
          Betalningen behandlas
        </div>
        <p className="body" style={{ color: 'var(--text-muted)', textAlign: 'center', marginBottom: 20, maxWidth: 340 }}>
          Din betalning är på väg att slutföras. Vi bekräftar din order via e-post så snart den är klar.
        </p>
        <div className="order-num-pill">
          <span className="order-num-label">Viktigt! Spara detta</span>
          <span className="order-num-value">{orderNo}</span>
        </div>
        <Link href="/" className="btn-primary" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 24 }}>
          Tillbaka till startsidan
        </Link>
      </div>
    );
  }

  return (
    <div className="success-box" style={{ position: 'relative', overflow: 'hidden' }}>
      <Confetti />
      <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
        <div className="success-icon-circle">✓</div>
        <div className="h2" style={{ marginBottom: 10, textAlign: 'center' }}>Din beställning är mottagen</div>
        <p className="body" style={{ color: 'var(--text-muted)', textAlign: 'center', marginBottom: 20, maxWidth: 340 }}>
          Vi har tagit hand om din order och bekräftat din upphämtning.
        </p>

        <div className="order-num-pill">
          <span className="order-num-label">Viktigt! Spara detta</span>
          <span className="order-num-value">{orderNo}</span>
        </div>

        <p className="small" style={{ color: 'var(--text-muted)', textAlign: 'center', margin: '20px 0 28px', maxWidth: 320, lineHeight: 1.6 }}>
          Du får uppdateringar i varje steg: upphämtning → tvätt → leverans.
        </p>

        <Link href="/" className="btn-primary" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          Tillbaka till startsidan
        </Link>
      </div>
    </div>
  );
}

export default function OrderConfirmationPage() {
  return (
    <div className="form-page of">
      <Suspense fallback={<div className="success-box" />}>
        <ConfirmationInner />
      </Suspense>
    </div>
  );
}
