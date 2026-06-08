'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { IconClock, IconSpray, IconHome } from '@tabler/icons-react';

// ── Types ─────────────────────────────────────────────────────────────────────

type Phase = 'initial' | 'pickup' | 'processing' | 'delivery' | 'reset';

const PHASE_MS: Record<Phase, number> = {
  initial:    3000,
  pickup:     1200,
  processing: 1500,  // doubled (1000) + 0.5s extra
  delivery:   3000,
  reset:       800,
};

const PHASE_ORDER: Phase[] = ['initial', 'pickup', 'processing', 'delivery', 'reset'];

const ITEMS = [
  { Icon: IconClock,  label: 'Upphämtning inom 2h',    sub: 'När det passar dig' },
  { Icon: IconSpray,  label: 'Skonsam kemtvätt',        sub: 'Förlänger livslängden' },
  { Icon: IconHome,   label: 'Leverans hem till dörren', sub: 'Alltid i tid' },
];

// Image zone height — space above/below the card where images travel
const IMG_ZONE = 110;

// ── Component ─────────────────────────────────────────────────────────────────

export default function ServiceAnimCard() {
  const [phase, setPhase] = useState<Phase>('initial');

  useEffect(() => {
    let cancelled = false;
    function step(current: Phase) {
      const timer = setTimeout(() => {
        if (cancelled) return;
        const next = PHASE_ORDER[(PHASE_ORDER.indexOf(current) + 1) % PHASE_ORDER.length];
        setPhase(next);
        step(next);
      }, PHASE_MS[current]);
      return timer;
    }
    const timer = step('initial');
    return () => { cancelled = true; clearTimeout(timer); };
  }, []);

  const activeIdx =
    phase === 'initial' || phase === 'pickup' ? 0 :
    phase === 'processing'                     ? 1 : 2;

  // ── Before image: starts above card, slides down behind card on pickup ──
  const beforeVisible = phase === 'initial';
  const beforePickup  = phase === 'pickup';
  const beforeStyle: React.CSSProperties = {
    position: 'absolute',
    // During pickup it slides down into / behind the card
    top: beforePickup ? IMG_ZONE + 20 : 12,
    left: '50%',
    transform: 'translateX(-50%)',
    opacity: beforeVisible ? 1 : 0,
    transition: beforePickup
      ? 'top 0.6s ease-in, opacity 0.45s ease-in'
      : 'opacity 0.25s ease',
    pointerEvents: 'none',
    zIndex: 1,           // behind the card (z-index 10)
  };

  // ── After image: starts hidden behind card bottom, slides out downward ──
  const afterVisible = phase === 'delivery';
  const afterStyle: React.CSSProperties = {
    position: 'absolute',
    bottom: afterVisible ? 12 : IMG_ZONE - 20, // starts near card bottom, exits downward
    left: '50%',
    transform: 'translateX(-50%)',
    opacity: afterVisible ? 1 : 0,
    transition: 'bottom 0.6s ease-out, opacity 0.5s ease-out',
    pointerEvents: 'none',
    zIndex: 1,           // behind the card
  };

  // ── Card: shake during processing ──
  const cardClass = `service-anim-card${phase === 'processing' ? ' service-anim-card--shake' : ''}`;

  return (
    // Outer wrapper has padding top/bottom = IMG_ZONE to give images travel room.
    // Images are absolutely positioned within; card is in normal flow with z-index 10.
    <div
      className="service-anim-wrap"
      style={{ paddingTop: IMG_ZONE, paddingBottom: IMG_ZONE }}
    >
      {/* Before image — travels in the top IMG_ZONE, slides under card */}
      <div style={beforeStyle}>
        <Image
          src="/before"
          alt="Smutsig tvätt"
          width={120}
          height={100}
          style={{ objectFit: 'cover', borderRadius: 12 }}
        />
      </div>

      {/* Card — higher z-index so images go behind it */}
      <div className={cardClass}>
        {ITEMS.map(({ Icon, label, sub }, i) => {
          const active = i === activeIdx;
          return (
            <div key={label} className={`service-anim-item${active ? ' service-anim-item--active' : ''}`}>
              <div className="service-anim-icon">
                <Icon size={18} stroke={1.75} />
              </div>
              <div>
                <div className="service-anim-label">{label}</div>
                <div className="service-anim-sub">{sub}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* After image — exits downward from the card's bottom edge */}
      <div style={afterStyle}>
        <Image
          src="/after.png"
          alt="Ren skjorta"
          width={120}
          height={100}
          style={{ objectFit: 'cover', borderRadius: 12 }}
        />
      </div>
    </div>
  );
}
