'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { IconClock, IconSpray, IconHome } from '@tabler/icons-react';

// ── Types ─────────────────────────────────────────────────────────────────────

type Phase = 'initial' | 'pickup' | 'processing' | 'delivery' | 'reset';

const PHASE_MS: Record<Phase, number> = {
  initial:    1500,
  pickup:      600,
  processing:  500,
  delivery:   1500,
  reset:       400,
};

const PHASE_ORDER: Phase[] = ['initial', 'pickup', 'processing', 'delivery', 'reset'];

const ITEMS = [
  { Icon: IconClock,  label: 'Upphämtning inom 2h', sub: 'När det passar dig' },
  { Icon: IconSpray,  label: 'Skonsam kemtvätt',     sub: 'Förlänger livslängden' },
  { Icon: IconHome,   label: 'Leverans hem till dörren', sub: 'Alltid i tid' },
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function ServiceAnimCard() {
  const [phase, setPhase] = useState<Phase>('initial');

  useEffect(() => {
    let cancelled = false;

    function step(current: Phase) {
      const duration = PHASE_MS[current];
      const timer = setTimeout(() => {
        if (cancelled) return;
        const next = PHASE_ORDER[(PHASE_ORDER.indexOf(current) + 1) % PHASE_ORDER.length];
        setPhase(next);
        step(next);
      }, duration);
      return timer;
    }

    const timer = step('initial');
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  const activeIdx =
    phase === 'initial' || phase === 'pickup'    ? 0 :
    phase === 'processing'                        ? 1 : 2;

  // ── before image ──
  const beforeVisible = phase === 'initial';
  const beforePickup  = phase === 'pickup';
  const beforeStyle: React.CSSProperties = {
    position: 'absolute',
    top: beforePickup ? 60 : 0,
    left: '50%',
    transform: 'translateX(-50%)',
    opacity: beforeVisible ? 1 : 0,
    transition: beforePickup
      ? 'top 0.6s ease-in, opacity 0.6s ease-in'
      : 'opacity 0.3s ease',
    pointerEvents: 'none',
    zIndex: 2,
  };

  // ── after image — exits downward out of the card bottom ──
  const afterVisible = phase === 'delivery';
  const afterStyle: React.CSSProperties = {
    position: 'absolute',
    top: afterVisible ? 10 : -20,
    left: '50%',
    transform: 'translateX(-50%)',
    opacity: afterVisible ? 1 : 0,
    transition: 'top 0.6s ease-out, opacity 0.5s ease-out',
    pointerEvents: 'none',
    zIndex: 2,
  };

  // ── card: shake during processing ──
  const cardClass = `service-anim-card${phase === 'processing' ? ' service-anim-card--shake' : ''}`;

  return (
    <div className="service-anim-wrap">

      {/* Before image — above the card */}
      <div style={{ height: 100, position: 'relative', flexShrink: 0, width: '100%' }}>
        <div style={beforeStyle}>
          <Image
            src="/before"
            alt="Smutsig tvätt"
            width={110}
            height={90}
            style={{ objectFit: 'cover', borderRadius: 10 }}
          />
        </div>
      </div>

      {/* Card */}
      <div className={cardClass}>
        {ITEMS.map(({ Icon, label, sub }, i) => {
          const active = i === activeIdx;
          return (
            <div key={label} className={`service-anim-item${active ? ' service-anim-item--active' : ''}`}>
              <div className="service-anim-icon">
                <Icon size={16} stroke={1.75} />
              </div>
              <div>
                <div className="service-anim-label">{label}</div>
                <div className="service-anim-sub">{sub}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* After image — below the card */}
      <div style={{ height: 100, position: 'relative', flexShrink: 0, width: '100%' }}>
        <div style={afterStyle}>
          <Image
            src="/after.png"
            alt="Ren skjorta"
            width={110}
            height={90}
            style={{ objectFit: 'cover', borderRadius: 10 }}
          />
        </div>
      </div>

    </div>
  );
}
