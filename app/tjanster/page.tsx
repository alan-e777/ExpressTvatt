'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  IconHanger, IconShirt, IconDroplet, IconShield, IconBrush,
  IconScissors, IconNeedle, IconSparkles, IconWind, IconTool, IconChevronRight,
} from '@tabler/icons-react';

type CustomField = {
  name: string; label: string; type: string; placeholder?: string;
  options?: string[]; required?: boolean;
};
type Service = { id: string; name: string; description: string; price_ore: number; icon?: string; customFields?: CustomField[] };

const CATEGORIES = ['Alla', 'Lagning', 'Ändring', 'Rengöring'];

function serviceIcon(name: string) {
  const n = name.toLowerCase();
  if (n.includes('gardin') || n.includes('hängare'))  return IconHanger;
  if (n.includes('plagg') || n.includes('skjorta'))   return IconShirt;
  if (n.includes('vatten') || n.includes('fläck') || n.includes('tvätt')) return IconDroplet;
  if (n.includes('skydd') || n.includes('impregnering') || n.includes('mott')) return IconShield;
  if (n.includes('polstring') || n.includes('möbel') || n.includes('reng'))    return IconBrush;
  if (n.includes('press') || n.includes('stryk'))     return IconWind;
  if (n.includes('matta') || n.includes('djup'))      return IconSparkles;
  if (n.includes('lagning') || n.includes('reparation') || n.includes('skada')) return IconTool;
  if (n.includes('ändring') || n.includes('söm'))     return IconNeedle;
  return IconScissors;
}

const CATEGORY_MAP: Record<string, string> = {
  'doftförbättring':             'Rengöring',
  'fläckborttagning':            'Rengöring',
  'rengöring av gardiner':       'Textil',
  'rengöring av möbelpolstring': 'Rengöring',
  'pressning och strykad':       'Ändring',
  'mottskydd & impregnering':    'Skydd',
  'tättrengöring av matta':      'Rengöring',
  'torkrengöring av plagg':      'Rengöring',
  'vattenskadoreparation':       'Lagning',
};

function serviceCategory(name: string): string {
  const key = name.toLowerCase().trim();
  if (CATEGORY_MAP[key]) return CATEGORY_MAP[key];
  if (key.includes('lagning') || key.includes('reparation') || key.includes('skada')) return 'Lagning';
  if (key.includes('ändring') || key.includes('söm') || key.includes('press')) return 'Ändring';
  return 'Rengöring';
}

function formatPrice(ore: number) { return `${ore / 100} kr`; }

function SkeletonRow() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 0' }}>
      <div className="skeleton" style={{ width: 34, height: 34, borderRadius: 9999 }} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div className="skeleton" style={{ width: '55%', height: 14 }} />
        <div className="skeleton" style={{ width: '28%', height: 10 }} />
      </div>
      <div className="skeleton" style={{ width: 44, height: 15 }} />
    </div>
  );
}

export default function TjansterPage() {
  const [services, setServices]         = useState<Service[]>([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState('Alla');

  useEffect(() => {
    fetch('/api/services')
      .then(r => { if (!r.ok) throw new Error('Kunde inte hämta tjänster.'); return r.json(); })
      .then(setServices)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = activeCategory === 'Alla'
    ? services
    : services.filter(s => serviceCategory(s.name) === activeCategory);

  return (
    <div className="service-card">
      <div className="chips-row">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            className={`chip ${activeCategory === cat ? 'active' : ''}`}
            onClick={() => setActiveCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {error && <p className="error-msg">{error}</p>}

      {loading ? (
        <div className="service-list">
          {[1, 2, 3, 4, 5, 6].map(i => <SkeletonRow key={i} />)}
        </div>
      ) : (
        <>
          <span className="section-label">{filtered.length} tjänster</span>
          <div className="service-list">
            {filtered.map(service => {
              const Icon = serviceIcon(service.name);
              return (
                <Link
                  key={service.id}
                  href={`/boka?serviceId=${service.id}`}
                  className="service-row"
                >
                  <div className="icon-circle">
                    <Icon size={16} stroke={1.5} />
                  </div>
                  <div className="service-row-text">
                    <div className="body">{service.name}</div>
                    <div className="label">{serviceCategory(service.name)}</div>
                  </div>
                  <span className="service-price">{formatPrice(service.price_ore)}</span>
                  <span className="chevron">
                    <IconChevronRight size={12} stroke={1.5} />
                  </span>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
