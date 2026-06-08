'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { IconLeaf, IconMapPin, IconClock, IconAlignLeft } from '@tabler/icons-react';
import { auth } from '@/lib/firebase-client';
import AddressAutocomplete from '@/components/AddressAutocomplete';
import DatePicker from '@/components/DatePicker';
import TimePicker from '@/components/TimePicker';

type CustomField = {
  name: string; label: string; type: string; placeholder?: string;
  options?: string[]; required?: boolean;
};
type Service = { id: string; name: string; description: string; price_ore: number; icon?: string; customFields?: CustomField[] };

function formatPrice(ore: number) { return `${ore / 100} kr`; }

function isSqmField(field: CustomField) {
  return (
    field.type === 'number' &&
    (field.name.toLowerCase().includes('kvadrat') ||
     field.label.toLowerCase().includes('kvadrat') ||
     field.placeholder?.toLowerCase().includes('m²') ||
     field.placeholder?.toLowerCase().includes('m2'))
  );
}

function SquareMeterSlider({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const sizeLabels: Record<number, string> = {
    1:'1×1 m', 2:'1×2 m', 3:'1.5×2 m', 4:'2×2 m', 5:'2×2.5 m',
    6:'2×3 m', 8:'2.5×3 m', 10:'2.5×4 m', 12:'3×4 m', 15:'3×5 m',
    20:'4×5 m', 24:'4×6 m', 25:'5×5 m', 30:'5×6 m',
  };
  function closestLabel(v: number) {
    const keys = Object.keys(sizeLabels).map(Number).sort((a, b) => a - b);
    let best = keys[0];
    for (const k of keys) { if (Math.abs(k - v) < Math.abs(best - v)) best = k; }
    return sizeLabels[best] ?? `${v} m²`;
  }

  return (
    <div style={{
      background: 'var(--linen)', borderRadius: 'var(--radius-lg)',
      padding: '16px', marginBottom: 'var(--sp-sm)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
        <span style={{ fontFamily: 'Playfair Display, serif', fontSize: 24, fontWeight: 500, color: 'var(--text-dark)' }}>
          {value} m²
        </span>
        <span className="small">{closestLabel(value)}</span>
      </div>
      <input
        type="range" min={1} max={30} step={1} value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ width: '100%', accentColor: 'var(--forest-dark)' }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
        <span className="micro">1 m²</span>
        <span className="micro">30 m²</span>
      </div>
    </div>
  );
}

function BookForm() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const serviceId    = searchParams.get('serviceId') ?? '';

  const [service, setService] = useState<Service | null>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId]   = useState<string | undefined>();

  const [address,          setAddress]          = useState('');
  const [postalCode,       setPostalCode]       = useState('');
  const [addressConfirmed, setAddressConfirmed] = useState(false);
  const [date,             setDate]             = useState('');
  const [time,       setTime]       = useState('');
  const [notes,      setNotes]      = useState('');
  const [fieldVals,  setFieldVals]  = useState<Record<string, string>>({});
  const [sqmVals,    setSqmVals]    = useState<Record<string, number>>({});
  const [error,      setError]      = useState('');

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => setUserId(u?.uid));
    return unsub;
  }, []);

  useEffect(() => {
    if (!serviceId) return;
    fetch('/api/services')
      .then(r => r.json())
      .then((list: Service[]) => {
        const found = list.find(s => s.id === serviceId);
        setService(found ?? null);
      })
      .finally(() => setLoading(false));
  }, [serviceId]);

  function setField(name: string, value: string) {
    setFieldVals(prev => ({ ...prev, [name]: value }));
  }
  function setSqm(name: string, value: number) {
    setSqmVals(prev => ({ ...prev, [name]: value }));
    setFieldVals(prev => ({ ...prev, [name]: String(value) }));
  }

  function handleNext(e: React.FormEvent) {
    e.preventDefault();
    if (!service) return;
    if (!addressConfirmed || !address.trim()) {
      setError('Välj en adress från förslagslistan.');
      return;
    }
    if (!date.trim() || !time.trim()) {
      setError('Datum och tid krävs.');
      return;
    }
    if (service.customFields) {
      for (const field of service.customFields) {
        if (field.required && !fieldVals[field.name]?.trim()) {
          setError(`${field.label} är obligatorisk.`);
          return;
        }
      }
    }
    setError('');

    const params = new URLSearchParams({
      serviceId:    service.id,
      serviceName:  service.name,
      priceOre:     String(service.price_ore),
      address,
      postalCode,
      date,
      time,
      notes,
      customFields: JSON.stringify(fieldVals),
      ...(userId ? { customerId: userId } : {}),
    });
    router.push(`/checkout?${params.toString()}`);
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {[1, 2, 3].map(i => (
          <div key={i} className="skeleton" style={{ height: 50, borderRadius: 'var(--radius-md)' }} />
        ))}
      </div>
    );
  }

  if (!service) {
    return <p className="error-msg">Tjänsten hittades inte.</p>;
  }

  const price = service.price_ore / 100;

  return (
    <form onSubmit={handleNext} className="form-page form-card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-md)' }}>
      {/* Service summary */}
      <div className="summary-card">
        <div className="summary-icon">
          <IconLeaf size={22} stroke={1.5} style={{ color: 'var(--forest-mid)' }} />
        </div>
        <div>
          <div className="h3">{service.name}</div>
          <div className="small" style={{ marginTop: 4 }}>{formatPrice(service.price_ore)}</div>
        </div>
      </div>

      <div className="input-group">
        <label className="field-label">
          <IconMapPin size={12} stroke={1.5} style={{ display: 'inline', marginRight: 4 }} />
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
            <IconClock size={12} stroke={1.5} style={{ display: 'inline', marginRight: 4 }} />
            Tid
          </label>
          <TimePicker value={time} onChange={setTime} placeholder="Välj tid" />
        </div>
      </div>

      <div className="input-group">
        <label className="field-label">
          <IconAlignLeft size={12} stroke={1.5} style={{ display: 'inline', marginRight: 4 }} />
          Beskrivning (valfritt)
        </label>
        <textarea className="input textarea" placeholder="Beskriv vad som behöver göras…"
          value={notes} onChange={e => setNotes(e.target.value)} rows={4} />
      </div>

      {service.customFields?.map(field => (
        <div key={field.name} className="input-group">
          <label className="field-label">{field.label}{field.required ? ' *' : ''}</label>

          {isSqmField(field) ? (
            <SquareMeterSlider
              value={sqmVals[field.name] ?? 5}
              onChange={v => setSqm(field.name, v)}
            />
          ) : field.type === 'select' ? (
            <select className="select-btn input"
              value={fieldVals[field.name] ?? ''}
              onChange={e => setField(field.name, e.target.value)}
            >
              <option value="">{field.placeholder ?? 'Välj…'}</option>
              {field.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          ) : (
            <input className="input"
              placeholder={field.placeholder}
              value={fieldVals[field.name] ?? ''}
              onChange={e => setField(field.name, e.target.value)}
              type={field.type === 'number' ? 'number' : 'text'}
            />
          )}
        </div>
      ))}

      {/* Eco badge */}
      <div className="eco-badge">
        <IconLeaf size={14} stroke={1.5} style={{ flexShrink: 0, marginTop: 2 }} />
        <span className="small">
          <strong style={{ fontWeight: 500, color: 'var(--text-dark)' }}>Eco-tvättmedel</strong>{' '}
          ingår alltid · Svanenmärkt · 30°
        </span>
      </div>

      {/* Live price */}
      <div className="live-price-card">
        <div>
          <div className="price-label">PRIS</div>
          <div className="price-value">{price} kr</div>
        </div>
        <div>
          <div className="pickup-label">Hämtning ingår</div>
          <div className="pickup-label" style={{ fontSize: 9, opacity: 0.5 }}>Inom 2–3 dagar</div>
        </div>
      </div>

      {error && <p className="error-msg">{error}</p>}

      <button type="submit" className="btn-primary">
        Gå till betalning
      </button>
    </form>
  );
}

export default function BookPage() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {[1, 2, 3].map(i => (
          <div key={i} className="skeleton" style={{ height: 50, borderRadius: 'var(--radius-md)' }} />
        ))}
      </div>
    }>
      <BookForm />
    </Suspense>
  );
}
