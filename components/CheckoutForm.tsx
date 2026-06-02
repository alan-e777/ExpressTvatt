'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js';
import { IconLock, IconShieldCheck } from '@tabler/icons-react';

type Props = {
  serviceName: string;
  priceOre:    number;
  address?:    string;
  postalCode?: string;
  date?:       string;
  time?:       string;
  notes?:      string;
};

function formatPrice(ore: number) { return `${ore / 100} kr`; }

export default function CheckoutForm({ serviceName, priceOre, address, postalCode, date, time, notes }: Props) {
  const stripe   = useStripe();
  const elements = useElements();
  const [status,   setStatus]   = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setStatus('processing');
    setErrorMsg(null);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {},
      redirect: 'if_required',
    });

    if (error) {
      setErrorMsg(error.message ?? 'Betalningen misslyckades.');
      setStatus('error');
    } else {
      setStatus('success');
    }
  }

  if (status === 'success') {
    return (
      <div className="success-box">
        <div className="success-icon-circle">✓</div>
        <div className="h2" style={{ marginBottom: 12, textAlign: 'center' }}>Betalning mottagen!</div>
        <p className="body" style={{ color: 'var(--text-muted)', textAlign: 'center', marginBottom: 32 }}>
          Tack för din bokning av <strong style={{ color: 'var(--text-dark)' }}>{serviceName}</strong>.
          <br />Skräddaren hör av sig inom kort.
        </p>
        <Link href="/" className="btn-primary" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          Tillbaka till startsidan
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="form-page" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-md)' }}>
      {/* Order summary */}
      <div className="order-summary">
        <div className="body-bold" style={{ marginBottom: 'var(--sp-md)' }}>Ordersammanfattning</div>

        <SummaryRow label="Tjänst" value={serviceName} />
        {address && <SummaryRow label="Adress" value={`${address}, ${postalCode}`} />}
        {date    && <SummaryRow label="Datum & tid" value={`${date} kl. ${time}`} />}
        {notes?.trim() && <SummaryRow label="Notering" value={notes} />}

        <div className="summary-divider" />
        <div className="summary-row">
          <span className="small">Totalt</span>
          <span className="summary-total">{formatPrice(priceOre)}</span>
        </div>
      </div>

      <span className="label" style={{ marginBottom: 'var(--sp-sm)' }}>Kortuppgifter</span>

      <div className="stripe-wrap">
        <PaymentElement />
      </div>

      {errorMsg && <p className="error-msg">{errorMsg}</p>}

      <button
        type="submit"
        className="btn-primary"
        disabled={!stripe || status === 'processing'}
      >
        <IconLock size={14} stroke={1.5} />
        {status === 'processing' ? 'Behandlar…' : `Betala ${formatPrice(priceOre)}`}
      </button>

      {/* Trust row */}
      <div className="trust-row">
        <IconShieldCheck size={13} stroke={1.5} />
        <span className="micro">256-bit SSL</span>
        <span className="micro" style={{ margin: '0 8px' }}>·</span>
        <span className="micro">Säkrad via </span>
        <span className="micro" style={{ color: '#635bff' }}>stripe</span>
      </div>
    </form>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="summary-row">
      <span className="small">{label}</span>
      <span className="small" style={{ textAlign: 'right', maxWidth: '60%' }}>{value}</span>
    </div>
  );
}
