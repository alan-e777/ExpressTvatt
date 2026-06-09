'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import Link from 'next/link';
import { onAuthStateChanged } from 'firebase/auth';
import { IconShieldCheck, IconLock, IconCalendar, IconMapPin, IconClock } from '@tabler/icons-react';
import { auth } from '@/lib/firebase-client';
import AddressAutocomplete from '@/components/AddressAutocomplete';
import DatePicker from '@/components/DatePicker';
import TimePicker from '@/components/TimePicker';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

type BasketItem = { id: string; name: string; price: number; qty: number };
type Product    = { id: string; name: string; price: number; category: string; order: number };

function formatPrice(kr: number) { return `${kr} kr`; }

// ── Payment form (Stripe Elements) ──────────────────────────────────────────

function PaymentForm({ totalKr, onBack }: { totalKr: number; onBack: () => void }) {
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
    if (error) { setErrorMsg(error.message ?? 'Betalningen misslyckades.'); setStatus('error'); }
    else setStatus('success');
  }

  if (status === 'success') {
    return (
      <div className="success-box">
        <div className="success-icon-circle">✓</div>
        <div className="h2" style={{ marginBottom: 12, textAlign: 'center' }}>Betalning mottagen!</div>
        <p className="body" style={{ color: 'var(--text-muted)', textAlign: 'center', marginBottom: 32 }}>
          Tack! Vi hämtar upp dina plagg och hör av oss.
        </p>
        <Link href="/" className="btn-primary" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          Tillbaka till startsidan
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-md)' }}>
      <span className="label">Kortuppgifter</span>
      <div className="stripe-wrap"><PaymentElement /></div>
      {errorMsg && <p className="error-msg">{errorMsg}</p>}
      <button type="submit" className="btn-primary" disabled={!stripe || status === 'processing'}>
        <IconLock size={14} stroke={1.5} />
        {status === 'processing' ? 'Behandlar…' : `Betala ${formatPrice(totalKr)}`}
      </button>
      <div className="trust-row">
        <IconShieldCheck size={13} stroke={1.5} />
        <span className="micro">256-bit SSL</span>
        <span className="micro" style={{ margin: '0 8px' }}>·</span>
        <span className="micro">Säkrad via </span>
        <span className="micro" style={{ color: '#635bff' }}>stripe</span>
      </div>
      <button type="button" onClick={onBack}
        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer', marginTop: 4 }}>
        ← Ändra detaljer
      </button>
    </form>
  );
}

// ── Main booking form ────────────────────────────────────────────────────────

function BookingForm() {
  const searchParams = useSearchParams();
  const rawBasket    = searchParams.get('basket') ?? '{}';

  const [basket,   setBasket]   = useState<Record<string, number>>({});
  const [catalog,  setCatalog]  = useState<Product[]>([]);
  const [userId,   setUserId]   = useState<string | undefined>();
  const [step,     setStep]     = useState<'form' | 'payment'>('form');
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loadError,    setLoadError]    = useState<string | null>(null);

  const [address,          setAddress]          = useState('');
  const [postalCode,       setPostalCode]       = useState('');
  const [addressConfirmed, setAddressConfirmed] = useState(false);
  const [date,             setDate]             = useState('');
  const [time,       setTime]       = useState('');
  const [notes,      setNotes]      = useState('');
  const [formError,  setFormError]  = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    try { setBasket(JSON.parse(rawBasket)); } catch { setBasket({}); }
  }, [rawBasket]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => setUserId(u?.uid));
    return unsub;
  }, []);

  useEffect(() => {
    fetch('/api/struken-tvatt')
      .then(r => r.json())
      .then(setCatalog)
      .catch(() => {});
  }, []);

  const items: BasketItem[] = Object.entries(basket)
    .map(([id, qty]) => {
      const p = catalog.find(x => x.id === id);
      return p ? { id, name: p.name, price: p.price, qty } : null;
    })
    .filter(Boolean) as BasketItem[];

  const totalKr = items.reduce((s, i) => s + i.price * i.qty, 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!addressConfirmed || !address.trim()) {
      setFormError('Välj en adress från förslagslistan.');
      return;
    }
    if (!date || !time) {
      setFormError('Datum och tid krävs.');
      return;
    }
    setFormError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/create-struken-tvatt-payment', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ customerId: userId, address, postalCode, date, time, notes, items }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Fel vid betalning.');
      const data = await res.json();
      setClientSecret(data.clientSecret);
      setStep('payment');
    } catch (err: any) {
      setLoadError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  // ── Order summary card ──────────────────────────────────────────────────────
  const Summary = () => (
    <div className="order-summary" style={{ marginBottom: 'var(--sp-lg)' }}>
      <div className="body-bold" style={{ marginBottom: 'var(--sp-md)' }}>
        Struken tvätt — {items.length} typ{items.length !== 1 ? 'er' : ''}
      </div>
      {items.map(item => (
        <div key={item.id} className="summary-row">
          <span className="small">{item.qty}× {item.name}</span>
          <span className="small">{item.price * item.qty} kr</span>
        </div>
      ))}
      <div className="summary-divider" />
      <div className="summary-row">
        <span className="small">Totalt</span>
        <span className="summary-total">{formatPrice(totalKr)}</span>
      </div>
    </div>
  );

  if (step === 'payment' && clientSecret) {
    return (
      <div className="form-page">
        <Summary />
        <Elements stripe={stripePromise} options={{ clientSecret }}>
          <PaymentForm totalKr={totalKr} onBack={() => setStep('form')} />
        </Elements>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="form-page" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-md)' }}>
      <Summary />

      <div className="input-group">
        <label className="field-label">
          <IconMapPin size={11} stroke={1.5} style={{ display: 'inline', marginRight: 4 }} />
          Adress
        </label>
        <AddressAutocomplete
          value={address}
          onChange={setAddress}
          onSelect={(addr, zip) => { setAddress(addr); setPostalCode(zip); }}
          onConfirmChange={setAddressConfirmed}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-sm)' }}>
        <div className="input-group">
          <label className="field-label">
            <IconCalendar size={11} stroke={1.5} style={{ display: 'inline', marginRight: 4 }} />
            Önskad tid för hämtning
          </label>
          <DatePicker value={date} onChange={setDate} placeholder="Välj datum" minDate={new Date().toISOString().slice(0, 10)} />
        </div>
        <div className="input-group">
          <label className="field-label">
            <IconClock size={11} stroke={1.5} style={{ display: 'inline', marginRight: 4 }} />
            Tid
          </label>
          <TimePicker value={time} onChange={setTime} placeholder="Välj tid" />
        </div>
      </div>

      <div className="input-group">
        <label className="field-label">Anteckning (valfritt)</label>
        <textarea className="input textarea" placeholder="Specialinstruktioner…"
          value={notes} onChange={e => setNotes(e.target.value)} rows={3} />
      </div>

      {formError  && <p className="error-msg">{formError}</p>}
      {loadError  && <p className="error-msg">{loadError}</p>}

      <button type="submit" className="btn-primary" disabled={submitting || items.length === 0}>
        <IconLock size={14} stroke={1.5} />
        {submitting ? 'Förbereder betalning…' : `Betala ${formatPrice(totalKr)}`}
      </button>
    </form>
  );
}

export default function StrukenTvattBokaPage() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 640, margin: '0 auto' }}>
        {[1, 2, 3].map(i => (
          <div key={i} className="skeleton" style={{ height: 50, borderRadius: 'var(--radius-md)' }} />
        ))}
      </div>
    }>
      <BookingForm />
    </Suspense>
  );
}
