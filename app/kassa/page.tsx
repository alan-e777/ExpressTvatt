'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import Link from 'next/link';
import { onAuthStateChanged } from 'firebase/auth';
import { IconShieldCheck, IconLock, IconMapPin, IconClock, IconUser, IconMail, IconPhone } from '@tabler/icons-react';
import { auth } from '@/lib/firebase-client';
import AddressAutocomplete from '@/components/AddressAutocomplete';
import DatePicker from '@/components/DatePicker';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

type CartItem = { id: string; name: string; price: number; qty: number; type: string };

function formatPrice(kr: number) { return `${kr} kr`; }

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
          Tack! Vi hämtar upp dina saker och hör av oss.
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

function CheckoutForm() {
  const searchParams = useSearchParams();

  const [items,        setItems]        = useState<CartItem[]>([]);
  const [userId,       setUserId]       = useState<string | undefined>();
  const [step,         setStep]         = useState<'form' | 'payment'>('form');
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loadError,    setLoadError]    = useState<string | null>(null);
  const [submitting,   setSubmitting]   = useState(false);

  const [name,             setName]             = useState('');
  const [careOf,           setCareOf]           = useState('');
  const [email,            setEmail]            = useState('');
  const [phone,            setPhone]            = useState('');
  const [address,          setAddress]          = useState('');
  const [postalCode,       setPostalCode]       = useState('');
  const [addressConfirmed, setAddressConfirmed] = useState(false);
  const [date,             setDate]             = useState('');
  const [time,             setTime]             = useState('');
  const [notes,            setNotes]            = useState('');
  const [formError,        setFormError]        = useState('');

  useEffect(() => {
    try {
      const raw = searchParams.get('cart') ?? '[]';
      setItems(JSON.parse(decodeURIComponent(raw)));
    } catch { setItems([]); }
  }, [searchParams]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => setUserId(u?.uid));
    return unsub;
  }, []);

  const totalKr = items.reduce((s, i) => s + i.price * i.qty, 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setFormError('Namn krävs.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setFormError('Ange en giltig e-postadress.');
      return;
    }
    if (!phone.trim()) {
      setFormError('Telefonnummer krävs.');
      return;
    }
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
      const res = await fetch('/api/create-cart-payment', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ customerId: userId, name: name.trim(), careOf: careOf.trim(), email: email.trim(), phone: phone.trim(), address, postalCode, date, time, notes, items }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Fel vid betalning.');
      const data = await res.json();
      setClientSecret(data.clientSecret);
      setStep('payment');
    } catch (err: unknown) {
      setLoadError(err instanceof Error ? err.message : 'Något gick fel.');
    } finally {
      setSubmitting(false);
    }
  }

  const Summary = () => (
    <div className="order-summary" style={{ marginBottom: 'var(--sp-lg)' }}>
      <div className="body-bold" style={{ marginBottom: 'var(--sp-md)' }}>
        Din bokning
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

  if (items.length === 0) {
    return (
      <div className="form-page">
        <p className="error-msg">
          Varukorgen är tom.{' '}
          <Link href="/" style={{ color: 'var(--forest-mid)' }}>Gå tillbaka</Link>
        </p>
      </div>
    );
  }

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

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-sm)' }}>
        <div className="input-group">
          <label className="field-label">
            <IconUser size={11} stroke={1.5} style={{ display: 'inline', marginRight: 4 }} />
            Namn
          </label>
          <input
            className="input"
            type="text"
            placeholder="För- och efternamn"
            value={name}
            onChange={e => setName(e.target.value)}
            autoComplete="name"
          />
        </div>
        <div className="input-group">
          <label className="field-label">C/O (valfritt)</label>
          <input
            className="input"
            type="text"
            placeholder="c/o Andersson"
            value={careOf}
            onChange={e => setCareOf(e.target.value)}
            autoComplete="off"
          />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-sm)' }}>
        <div className="input-group">
          <label className="field-label">
            <IconMail size={11} stroke={1.5} style={{ display: 'inline', marginRight: 4 }} />
            E-post
          </label>
          <input
            className="input"
            type="email"
            placeholder="din@mail.se"
            value={email}
            onChange={e => setEmail(e.target.value)}
            autoComplete="email"
          />
        </div>
        <div className="input-group">
          <label className="field-label">
            <IconPhone size={11} stroke={1.5} style={{ display: 'inline', marginRight: 4 }} />
            Telefon
          </label>
          <input
            className="input"
            type="tel"
            placeholder="070 000 00 00"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            autoComplete="tel"
          />
        </div>
      </div>

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
          <label className="field-label">Datum</label>
          <DatePicker value={date} onChange={setDate} placeholder="Välj datum" />
        </div>
        <div className="input-group">
          <label className="field-label">
            <IconClock size={11} stroke={1.5} style={{ display: 'inline', marginRight: 4 }} />
            Tid
          </label>
          <input className="input" type="time" value={time} onChange={e => setTime(e.target.value)} />
        </div>
      </div>

      <div className="input-group">
        <label className="field-label">Anteckning (valfritt)</label>
        <textarea className="input textarea" placeholder="Specialinstruktioner…"
          value={notes} onChange={e => setNotes(e.target.value)} rows={3} />
      </div>

      {formError && <p className="error-msg">{formError}</p>}
      {loadError && <p className="error-msg">{loadError}</p>}

      <button type="submit" className="btn-primary" disabled={submitting}>
        <IconLock size={14} stroke={1.5} />
        {submitting ? 'Förbereder betalning…' : `Betala ${formatPrice(totalKr)}`}
      </button>
    </form>
  );
}

export default function KassaPage() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 640, margin: '0 auto' }}>
        {[1, 2, 3].map(i => (
          <div key={i} className="skeleton" style={{ height: 50, borderRadius: 'var(--radius-md)' }} />
        ))}
      </div>
    }>
      <CheckoutForm />
    </Suspense>
  );
}
