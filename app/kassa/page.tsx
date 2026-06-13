'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import Link from 'next/link';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc, getDoc, arrayUnion } from 'firebase/firestore';
import { IconShieldCheck, IconLock, IconMapPin, IconClock, IconUser, IconMail, IconPhone, IconShoppingBag, IconArrowRight, IconCalendar, IconNotes, IconChevronUp, IconX, IconCheck } from '@tabler/icons-react';
import { auth, db } from '@/lib/firebase-client';
import AddressAutocomplete from '@/components/AddressAutocomplete';
import DatePicker from '@/components/DatePicker';
import TimePicker from '@/components/TimePicker';
import Confetti from '@/components/Confetti';
import { formatPersonnummer, isValidPersonnummer, rutRefundKr, RUT_DISCOUNT_PERCENT } from '@/lib/rut';
import { DISCOUNT_DEFAULTS, computeCartTotals, type DiscountSettings } from '@/lib/discount';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

type CartItem = { id: string; name: string; price: number; qty: number; type: string };
type SavedAddress = { address: string; postalCode: string; deliveryNote?: string };

function formatPrice(kr: number) { return `${kr} kr`; }

// ── Pickup / delivery scheduling helpers ────────────────────────────────────
const pad2 = (n: number) => String(n).padStart(2, '0');

function toYMD(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
function addDaysYMD(ymd: string, n: number): string {
  const [y, mo, da] = ymd.split('-').map(Number);
  const d = new Date(y, mo - 1, da);
  d.setDate(d.getDate() + n);
  return toYMD(d);
}

function SuccessCard({ orderId }: { orderId: string | null }) {
  const orderNo = orderId ? `#${orderId.slice(-7).toUpperCase()}` : '—';
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

function PaymentForm({ totalKr, orderId, onBack, onPaid }: { totalKr: number; orderId: string | null; onBack: () => void; onPaid: () => void }) {
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
    else { setStatus('success'); onPaid(); }
  }

  if (status === 'success') {
    return <SuccessCard orderId={orderId} />;
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-md)' }}>
      <span className="label">Kortuppgifter</span>
      <div className="stripe-wrap"><PaymentElement /></div>
      {errorMsg && <p className="error-msg">{errorMsg}</p>}
      <button
        type="submit"
        className="btn-primary"
        disabled={!stripe || status === 'processing'}
        style={{ background: 'var(--forest-light)', color: 'var(--forest-dark)' }}
      >
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
  const [orderId,      setOrderId]      = useState<string | null>(null);
  const [paid,         setPaid]         = useState(false);
  const [loadError,    setLoadError]    = useState<string | null>(null);
  const [submitting,   setSubmitting]   = useState(false);

  const [name,             setName]             = useState('');
  const [email,            setEmail]            = useState('');
  const [phone,            setPhone]            = useState('');

  const [address,          setAddress]          = useState('');
  const [postalCode,       setPostalCode]       = useState('');
  const [addressConfirmed, setAddressConfirmed] = useState(false);
  const [pickupDate,       setPickupDate]       = useState('');
  const [pickupTime,       setPickupTime]       = useState('');
  const [deliveryDate,     setDeliveryDate]     = useState('');
  const [deliveryTime,     setDeliveryTime]     = useState('');
  const [notes,            setNotes]            = useState('');
  const [rutAvdrag,        setRutAvdrag]        = useState(false);
  const [personnummer,     setPersonnummer]     = useState('');
  const [formError,        setFormError]        = useState('');
  const [savedAddresses,   setSavedAddresses]   = useState<SavedAddress[]>([]);
  const [savedPick,        setSavedPick]        = useState<SavedAddress | null>(null);
  const [profileCard,      setProfileCard]      = useState<{ name: string; email: string; phone: string } | null>(null);
  const [editingContact,   setEditingContact]   = useState(false);
  const [sheetOpen,        setSheetOpen]        = useState(false);
  const [discountSettings, setDiscountSettings] = useState<DiscountSettings>(DISCOUNT_DEFAULTS);
  const [strukenDiscounts, setStrukenDiscounts] = useState<Record<string, number>>({});
  const [hasPlacedOrder,   setHasPlacedOrder]   = useState<boolean | null>(null);
  const [deliverySettings, setDeliverySettings] = useState<{ freeDeliveryThresholdKr: number; deliveryFeeKr: number }>({ freeDeliveryThresholdKr: 0, deliveryFeeKr: 0 });

  useEffect(() => {
    try {
      const raw = searchParams.get('cart') ?? '[]';
      setItems(JSON.parse(decodeURIComponent(raw)));
    } catch { setItems([]); }
    // Carry the RUT choice over from the service-selection screen.
    if (searchParams.get('rut') === '1') setRutAvdrag(true);
  }, [searchParams]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => setUserId(u?.uid));
    return unsub;
  }, []);

  // Discount settings (public) + per-item struken discounts, to mirror what the
  // server will charge. Mattvätt discounts come from the settings doc.
  useEffect(() => {
    fetch('/api/discount-settings')
      .then(r => r.json() as Promise<DiscountSettings>)
      .then(setDiscountSettings)
      .catch(() => {});
    fetch('/api/struken-tvatt')
      .then(r => r.json() as Promise<{ id: string; discountPercent?: number }[]>)
      .then(products => {
        const map: Record<string, number> = {};
        for (const p of products) map[p.id] = p.discountPercent ?? 0;
        setStrukenDiscounts(map);
      })
      .catch(() => {});
    fetch('/api/delivery-settings')
      .then(r => r.json() as Promise<{ freeDeliveryThresholdKr: number; deliveryFeeKr: number }>)
      .then(setDeliverySettings)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!userId) { setSavedAddresses([]); setProfileCard(null); return; }
    const u = auth.currentUser;
    getDoc(doc(db, 'customers', userId)).then(snap => {
      const data = snap.exists() ? snap.data() : {};
      setHasPlacedOrder(snap.exists() ? data.hasPlacedOrder === true : false);
      setSavedAddresses((data.addresses ?? []) as SavedAddress[]);
      const n = u?.displayName || data.name || '';
      const e = u?.email       || data.email || '';
      const p = data.phone     || '';
      if (n || e || p) {
        setProfileCard({ name: n, email: e, phone: p });
        if (n) setName(n);
        if (e) setEmail(e);
        if (p) setPhone(p);
      }
      // Pre-fill RUT from the saved profile preference.
      if (data.rutEnabled) {
        setRutAvdrag(true);
        if (data.personnummer) setPersonnummer(formatPersonnummer(data.personnummer));
      }
    }).catch(() => {});
  }, [userId]);

  // First-timer = logged in and never completed an order. Must match the server's
  // create-cart-payment check so the displayed total equals the charged amount.
  const isFirstTime = !!userId && hasPlacedOrder === false;
  const perItemPct = (id: string) =>
    id.startsWith('matta-')
      ? (discountSettings.mattvatt[id as keyof typeof discountSettings.mattvatt] ?? 0)
      : (strukenDiscounts[id] ?? 0);
  const { subtotalKr, totalKr, savingsKr } = computeCartTotals(
    items,
    perItemPct,
    { firstTimeDiscountPercent: discountSettings.firstTimeDiscountPercent, multipleDiscountsAllowed: discountSettings.multipleDiscountsAllowed },
    isFirstTime,
  );

  // Delivery fee — free once the discounted total reaches the admin threshold.
  // Mirrors create-cart-payment so the displayed total equals the charged amount.
  const deliveryFeeKr = items.length > 0 && totalKr < deliverySettings.freeDeliveryThresholdKr
    ? deliverySettings.deliveryFeeKr
    : 0;
  const grandTotalKr = totalKr + deliveryFeeKr;

  // Pickup can be booked today if any time span is still open (last span ends 20:00).
  const now = new Date();
  const minPickupDate = now.getHours() < 20 ? toYMD(now) : toYMD(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1));

  // Disable pickup spans that have already ended today.
  const disabledPickupSpans: string[] = pickupDate === toYMD(now)
    ? ['08-12', '12-16', '16-20'].filter(s => now.getHours() >= Number(s.split('-')[1]))
    : [];

  // Delivery must be at least 3 calendar days after pickup.
  const earliestDeliveryDate = pickupDate ? addDaysYMD(pickupDate, 3) : addDaysYMD(minPickupDate, 3);

  // When pickup date changes, bump delivery date forward if it's no longer valid.
  useEffect(() => {
    if (!pickupDate) return;
    const minDelivery = addDaysYMD(pickupDate, 3);
    if (deliveryDate && deliveryDate >= minDelivery) return;
    setDeliveryDate(minDelivery);
    setDeliveryTime('');
  }, [pickupDate]);

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
    if (!pickupDate || !pickupTime) {
      setFormError('Välj datum och tid för upphämtning.');
      return;
    }
    if (!deliveryDate || !deliveryTime) {
      setFormError('Välj datum och tid för avlämning.');
      return;
    }
    const dayDiff = Math.round(
      (new Date(deliveryDate).getTime() - new Date(pickupDate).getTime()) / (24 * 60 * 60 * 1000)
    );
    if (dayDiff < 3) {
      setFormError('Avlämning måste vara minst 3 dagar efter upphämtning.');
      return;
    }
    if (rutAvdrag && !isValidPersonnummer(personnummer)) {
      setFormError('Ange ett giltigt 10-siffrigt personnummer för RUT-avdrag.');
      return;
    }
    setFormError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/create-cart-payment', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ customerId: userId, name: name.trim(), email: email.trim(), phone: phone.trim(), address, postalCode, date: pickupDate, time: pickupTime, deliveryDate, deliveryTime, notes: notes.trim(), items, rutAvdrag, personnummer: rutAvdrag ? personnummer : '' }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Fel vid betalning.');
      const data = await res.json();
      setClientSecret(data.clientSecret);
      setOrderId(data.orderId ?? null);
      setStep('payment');
      if (userId) {
        setDoc(doc(db, 'customers', userId), {
          addresses: arrayUnion({ address, postalCode, deliveryNote: savedPick?.deliveryNote ?? '' }),
        }, { merge: true }).catch(() => {});
      }
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
      {savingsKr > 0 && (
        <>
          <div className="summary-row">
            <span className="small">Delsumma</span>
            <span className="small">{formatPrice(subtotalKr)}</span>
          </div>
          <div className="summary-row">
            <span className="small" style={{ color: 'var(--forest-dark)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              Rabatt
              {isFirstTime && (
                <span style={{ background: 'var(--forest-dark)', color: 'var(--moss)', borderRadius: 'var(--radius-pill)', padding: '1px 7px', fontSize: 10, fontWeight: 600 }}>
                  Förstagångsrabatt
                </span>
              )}
            </span>
            <span className="small" style={{ color: 'var(--forest-dark)', fontWeight: 600 }}>−{formatPrice(savingsKr)}</span>
          </div>
        </>
      )}
      <div className="summary-row">
        <span className="small">Leverans</span>
        <span className="small">{deliveryFeeKr > 0 ? formatPrice(deliveryFeeKr) : 'Gratis'}</span>
      </div>
      <div className="summary-row">
        <span className="small">Totalt</span>
        <span className="summary-total">{formatPrice(grandTotalKr)}</span>
      </div>
    </div>
  );

  if (items.length === 0) {
    return (
      <div className="form-page of">
        <div className="success-box">
          <div
            className="success-icon-circle"
            style={{ background: 'var(--linen)', color: 'var(--forest-dark)' }}
          >
            <IconShoppingBag size={30} stroke={1.5} />
          </div>
          <div className="h2" style={{ marginBottom: 10, textAlign: 'center' }}>
            Din varukorg är tom
          </div>
          <p className="body" style={{ color: 'var(--text-muted)', textAlign: 'center', marginBottom: 28, maxWidth: 320 }}>
            Lägg till en tjänst så hämtar vi upp, tvättar och levererar tillbaka — hela vägen hem till din dörr.
          </p>
          <Link
            href="/order"
            className="btn-primary"
            style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          >
            Boka en tjänst
            <IconArrowRight size={16} stroke={2} />
          </Link>
        </div>
      </div>
    );
  }

  if (step === 'payment' && clientSecret) {
    return (
      <div className="form-page of">
        {!paid && <Summary />}
        <Elements stripe={stripePromise} options={{ clientSecret }}>
          <PaymentForm totalKr={grandTotalKr} orderId={orderId} onBack={() => setStep('form')} onPaid={() => setPaid(true)} />
        </Elements>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="form-page of of-flow has-bar">
      <div className="checkout-card" style={{ padding: 'var(--sp-xl)' }}>
      <div className="of-form">

      {/* ── Contact ──────────────────────────────────────────────────── */}
      <div className="of-section">
      {profileCard && !editingContact ? (
        <div style={{
          background: 'var(--linen)',
          borderRadius: 'var(--radius-md)',
          border: '0.5px solid rgba(74,124,89,0.12)',
          padding: 'var(--sp-md) var(--sp-lg)',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--sp-md)',
          marginBottom: 'var(--sp-md)',
        }}>
          <div style={{
            width: 38,
            height: 38,
            borderRadius: '50%',
            background: 'var(--forest-dark)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            <span style={{ fontFamily: 'Playfair Display, serif', fontSize: 15, color: 'var(--moss)', fontWeight: 500 }}>
              {profileCard.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?'}
            </span>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <span className="section-label" style={{ marginBottom: 4 }}>Dina uppgifter</span>
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 14, fontWeight: 500, color: 'var(--text-dark)', margin: 0 }}>
              {name || profileCard.name}
            </p>
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: 'var(--text-muted)', margin: '2px 0 0', lineHeight: 1.4 }}>
              {email || profileCard.email}{phone ? ` · ${phone}` : (profileCard.phone ? ` · ${profileCard.phone}` : '')}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setEditingContact(true)}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer', padding: 0, fontFamily: 'DM Sans, sans-serif', flexShrink: 0 }}
          >
            Ändra
          </button>
        </div>
      ) : (
        <>
          {profileCard && editingContact && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--sp-xs)' }}>
              <span className="section-label" style={{ margin: 0 }}>Dina uppgifter</span>
              <button
                type="button"
                onClick={() => setEditingContact(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer', padding: 0, fontFamily: 'DM Sans, sans-serif' }}
              >
                ← Avbryt
              </button>
            </div>
          )}
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
        </>
      )}
      </div>

      {/* ── Adress ───────────────────────────────────────────────────── */}
      <div className="of-section">
      <div className="input-group">
        <label className="field-label">
          <IconMapPin size={11} stroke={1.5} style={{ display: 'inline', marginRight: 4 }} />
          Adress
        </label>
        {savedAddresses.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif' }}>Sparade:</span>
            {savedAddresses.map((sa, i) => (
              <button
                key={i}
                type="button"
                onClick={() => { setSavedPick(sa); setAddress(sa.address); setPostalCode(sa.postalCode); setAddressConfirmed(true); setNotes(sa.deliveryNote || ''); }}
                style={{
                  background: savedPick?.address === sa.address ? 'var(--forest-dark)' : 'var(--linen)',
                  color: savedPick?.address === sa.address ? 'var(--moss)' : 'var(--text-dark)',
                  border: '0.5px solid transparent',
                  borderRadius: 'var(--radius-pill)',
                  padding: '3px 10px',
                  fontSize: 12,
                  fontFamily: 'DM Sans, sans-serif',
                  cursor: 'pointer',
                }}
              >
                {sa.address}
              </button>
            ))}
          </div>
        )}
        {savedPick ? (
          <div className="input" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 15, fontFamily: 'DM Sans, sans-serif', color: 'var(--text-dark)' }}>
              {savedPick.address}{savedPick.postalCode ? `, ${savedPick.postalCode}` : ''}
            </span>
            <button
              type="button"
              onClick={() => { setSavedPick(null); setAddress(''); setPostalCode(''); setAddressConfirmed(false); setNotes(''); }}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer', padding: 0, fontFamily: 'DM Sans, sans-serif', flexShrink: 0, marginLeft: 8 }}
            >
              Ändra
            </button>
          </div>
        ) : (
          <AddressAutocomplete
            value={address}
            onChange={setAddress}
            onSelect={(addr, zip) => { setAddress(addr); setPostalCode(zip); }}
            onConfirmChange={setAddressConfirmed}
          />
        )}
      </div>
      </div>

      {/* ── Upphämtning & Avlämning — two vertical cards ─────────────── */}
      <div className="of-section">
      <div className="of-dt-cards">
        {/* Upphämtning (pickup) */}
        <div className="of-dt-card">
          <div className="of-dt-title"><IconCalendar size={14} stroke={1.5} /> Upphämtning</div>
          <div className="input-group" style={{ marginBottom: 'var(--sp-sm)' }}>
            <label className="field-label">Datum</label>
            <DatePicker value={pickupDate} onChange={setPickupDate} placeholder="Välj datum" minDate={minPickupDate} />
          </div>
          <div className="input-group" style={{ marginBottom: 0 }}>
            <label className="field-label">
              <IconClock size={11} stroke={1.5} style={{ display: 'inline', marginRight: 4 }} />
              Tid
            </label>
            <TimePicker value={pickupTime} onChange={setPickupTime} placeholder="Välj tid" disabledOptions={disabledPickupSpans} />
          </div>
        </div>

        {/* Avlämning (delivery) */}
        <div className="of-dt-card">
          <div className="of-dt-title"><IconCalendar size={14} stroke={1.5} /> Avlämning</div>
          <div className="input-group" style={{ marginBottom: 'var(--sp-sm)' }}>
            <label className="field-label">Datum</label>
            <DatePicker value={deliveryDate} onChange={setDeliveryDate} placeholder="Välj datum" minDate={earliestDeliveryDate} />
          </div>
          <div className="input-group" style={{ marginBottom: 0 }}>
            <label className="field-label">
              <IconClock size={11} stroke={1.5} style={{ display: 'inline', marginRight: 4 }} />
              Tid
            </label>
            <TimePicker value={deliveryTime} onChange={setDeliveryTime} placeholder="Välj tid" />
          </div>
          <p className="micro" style={{ color: 'var(--text-muted)', margin: 'var(--sp-sm) 0 0' }}>
            Minst 3 dagar efter upphämtning.
          </p>
        </div>
      </div>
      </div>

      {/* ── Anteckning ───────────────────────────────────────────────── */}
      <div className="of-section">
      <div className="input-group" style={{ marginBottom: 0 }}>
        <label className="field-label">
          <IconNotes size={11} stroke={1.5} style={{ display: 'inline', marginRight: 4 }} />
          Anteckning (valfritt)
        </label>
        <textarea className="input textarea" placeholder="t.ex. C/O, Specialinstruktioner mm..."
          value={notes} onChange={e => setNotes(e.target.value)} rows={3} />
      </div>
      </div>

      {/* ── RUT-Avdrag ───────────────────────────────────────────────── */}
      <div className="of-section">
      <div style={{
        border: `0.5px solid ${rutAvdrag ? 'var(--moss)' : 'rgba(74,124,89,0.18)'}`,
        borderRadius: 'var(--radius-md)',
        background: rutAvdrag ? 'var(--linen)' : 'transparent',
        padding: 'var(--sp-md) var(--sp-lg)',
        transition: 'background 0.15s ease, border-color 0.15s ease',
      }}>
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--sp-md)', cursor: 'pointer' }}>
          <span
            aria-hidden="true"
            style={{
              width: 22, height: 22, borderRadius: 6, flexShrink: 0, marginTop: 1,
              border: rutAvdrag ? 'none' : '1.5px solid rgba(74,124,89,0.4)',
              background: rutAvdrag ? 'var(--forest-dark)' : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            {rutAvdrag && <IconCheck size={14} stroke={2.5} color="var(--moss)" />}
          </span>
          <input
            type="checkbox"
            checked={rutAvdrag}
            onChange={e => setRutAvdrag(e.target.checked)}
            style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="body-bold" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              RUT-Avdrag
              <span style={{
                background: 'var(--forest-dark)', color: 'var(--moss)',
                borderRadius: 'var(--radius-pill)', padding: '1px 8px',
                fontSize: 11, fontWeight: 600, fontFamily: 'DM Sans, sans-serif',
              }}>
                −{RUT_DISCOUNT_PERCENT}%
              </span>
            </div>
            <p className="micro" style={{ color: 'var(--text-muted)', margin: '4px 0 0', lineHeight: 1.5 }}>
              Du betalar fullt pris nu och vi återbetalar {RUT_DISCOUNT_PERCENT}% (cirka {rutRefundKr(grandTotalKr)} kr) som skattereduktion i efterhand.
            </p>
          </div>
        </label>

        {rutAvdrag && (
          <div className="input-group" style={{ marginBottom: 0, marginTop: 'var(--sp-md)' }}>
            <label className="field-label">10-siffrigt Personnummer</label>
            <input
              className="input"
              type="text"
              inputMode="numeric"
              placeholder="ÅÅMMDD-XXXX"
              value={personnummer}
              onChange={e => setPersonnummer(formatPersonnummer(e.target.value))}
              maxLength={11}
              autoComplete="off"
            />
          </div>
        )}
      </div>
      </div>

      {(formError || loadError) && (
        <div style={{ paddingTop: 'var(--sp-md)' }}>
          {formError && <p className="error-msg">{formError}</p>}
          {loadError && <p className="error-msg">{loadError}</p>}
        </div>
      )}
      </div>
      </div>

      {/* ── Fixed bottom bar — tappable total + pay CTA ──────────────── */}
      <div className="of-bar of-bar--narrow">
        <div className="of-bar-inner">
          <button type="button" className="of-bar-summary" onClick={() => setSheetOpen(true)} aria-label="Visa bokning">
            <span className="of-bar-count">{items.length} {items.length === 1 ? 'produkt' : 'produkter'}{deliveryFeeKr > 0 ? ` · +${deliveryFeeKr} kr leverans` : ''}</span>
            <span className="of-bar-total">{grandTotalKr} kr <IconChevronUp size={15} stroke={2} /></span>
          </button>
          <button type="submit" className="of-bar-cta" disabled={submitting}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <IconLock size={14} stroke={1.5} />
              {submitting ? 'Förbereder…' : `Betala ${formatPrice(grandTotalKr)}`}
            </span>
          </button>
        </div>
      </div>

      {/* ── Bottom sheet — booking line items ────────────────────────── */}
      {sheetOpen && (
        <>
          <div className="of-sheet-scrim" onClick={() => setSheetOpen(false)} />
          <div className="of-sheet" role="dialog" aria-modal="true" aria-label="Din bokning">
            <div className="of-grabber" />
            <div className="of-sheet-head">
              <span className="of-sheet-title">Din bokning</span>
              <button type="button" className="of-sheet-close" onClick={() => setSheetOpen(false)} aria-label="Stäng">
                <IconX size={18} stroke={1.75} />
              </button>
            </div>
            <div className="of-sheet-body">
              {items.map(item => (
                <div key={item.id} className="of-sheet-row">
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="of-sheet-row-name">{item.qty}× {item.name}</div>
                    <div className="of-sheet-row-per">{item.price} kr / st</div>
                  </div>
                  <span className="of-sheet-line">{item.price * item.qty} kr</span>
                </div>
              ))}
              {savingsKr > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 'var(--sp-md)' }}>
                  <span className="small" style={{ color: 'var(--forest-dark)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    Rabatt
                    {isFirstTime && (
                      <span style={{ background: 'var(--forest-dark)', color: 'var(--moss)', borderRadius: 'var(--radius-pill)', padding: '1px 7px', fontSize: 10, fontWeight: 600 }}>
                        Förstagångsrabatt
                      </span>
                    )}
                  </span>
                  <span className="small" style={{ color: 'var(--forest-dark)', fontWeight: 600 }}>−{formatPrice(savingsKr)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 'var(--sp-md)' }}>
                <span className="small">Leverans</span>
                <span className="small">{deliveryFeeKr > 0 ? formatPrice(deliveryFeeKr) : 'Gratis'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingTop: 'var(--sp-md)' }}>
                <span className="small" style={{ fontWeight: 600, color: 'var(--text-dark)' }}>Totalt</span>
                <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-dark)' }}>{formatPrice(grandTotalKr)}</span>
              </div>
              {rutAvdrag && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 4 }}>
                  <span className="micro" style={{ color: 'var(--moss)' }}>RUT-avdrag (återbetalas senare)</span>
                  <span className="micro" style={{ color: 'var(--moss)', fontWeight: 600 }}>−{formatPrice(rutRefundKr(grandTotalKr))}</span>
                </div>
              )}
            </div>
          </div>
        </>
      )}
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
