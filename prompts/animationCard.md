# ServiceAnimCard — Animated Service Showcase Component

A looping animation card that shows three service steps with before/after images sliding behind/out of the card. No Framer Motion required — uses CSS keyframes and React state machine.

---

## Dependencies

- `next/image` (Next.js built-in)
- `@tabler/icons-react` — already installed (`npm i @tabler/icons-react`)
- Plain CSS (no extra animation libraries)

---

## File locations

| File | Purpose |
|---|---|
| `components/ServiceAnimCard.tsx` | Component |
| `app/globals.css` | All CSS classes (prefix `service-anim-`) |
| `public/before` | "Before" image (PNG, no extension) |
| `public/after.png` | "After" image |

---

## Animation phases (state machine)

The component cycles through 5 phases in order, looping infinitely:

```
initial → pickup → processing → delivery → reset → initial → ...
```

| Phase | Duration | What happens |
|---|---|---|
| `initial` | 2600ms | `before` image is visible above the card. Item 0 ("Upphämtning") is highlighted gold. |
| `pickup` | 1200ms | `before` image slides down behind the card (goes under it via z-index) and fades out. |
| `processing` | 1500ms | Item 1 ("Skonsam kemtvätt") highlighted gold. Card plays a horizontal shake animation. |
| `delivery` | 2600ms | Item 2 ("Leverans") highlighted gold. `after` image slides out downward from behind the card bottom and fades in. |
| `reset` | 800ms | All items dim. `after` image fades out in place (no upward movement). |

On loop start (`initial`): the `after` image snaps back to its resting position instantly (`transition: none`) so the next cycle begins clean.

---

## Z-index layering

- Card: `z-index: 10` (in normal flex flow, `position: relative`)
- Before image: `z-index: 1` (absolutely positioned)
- After image: `z-index: 1` (absolutely positioned)

This is what creates the "slides behind the card" effect. The images are visually behind the card even when they overlap its edges.

---

## Image positioning logic

The outer wrapper `.service-anim-wrap` has `paddingTop: IMG_ZONE` and `paddingBottom: IMG_ZONE` (both = 110px). Both images are `position: absolute` inside the wrapper. The card is in normal flow (centered by `align-items: center`).

**Before image** (`top` positioned):
- Default (not pickup): `top: -18px` — slightly above the wrapper, visible above the card
- Pickup phase: `top: IMG_ZONE + 20` (= 130px) — has slid down behind the card
- Opacity: `1` during `initial`, `0` all other phases
- Transition during pickup: `top 1.2s ease-in, opacity 0.9s ease-in`
- Transition all other times: `opacity 0.25s ease`

**After image** (`bottom` positioned):
- `afterBottom = (afterVisible || isReset) ? -60 : IMG_ZONE - 10` (= 100px)
  - Resting: `bottom: 100px` — hidden behind the card's bottom edge
  - After delivery/reset: `bottom: -60px` — exited downward below the wrapper
- Opacity: `1` during `delivery`, `0` all other phases
- Transition during `initial`: `none` (instant snap back to resting position)
- Transition during `delivery`: `bottom 0.9s ease-out, opacity 0.6s ease-out`
- Transition all other times: `opacity 0.5s ease` (fades in place, no movement)

---

## Full component code

```tsx
'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { IconClock, IconSpray, IconHome } from '@tabler/icons-react';

type Phase = 'initial' | 'pickup' | 'processing' | 'delivery' | 'reset';

const PHASE_MS: Record<Phase, number> = {
  initial:    2600,
  pickup:     1200,
  processing: 1500,
  delivery:   2600,
  reset:       800,
};

const PHASE_ORDER: Phase[] = ['initial', 'pickup', 'processing', 'delivery', 'reset'];

const ITEMS = [
  { Icon: IconClock,  label: 'Upphämtning inom 2h',     sub: 'När det passar dig' },
  { Icon: IconSpray,  label: 'Skonsam kemtvätt',         sub: 'Förlänger livslängden' },
  { Icon: IconHome,   label: 'Leverans hem till dörren', sub: 'Alltid i tid' },
];

const IMG_ZONE = 110; // px of padding above and below the card for image travel

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

  const beforeVisible = phase === 'initial';
  const beforePickup  = phase === 'pickup';
  const beforeStyle: React.CSSProperties = {
    position: 'absolute',
    top: beforePickup ? IMG_ZONE + 20 : -18,
    left: '50%',
    transform: 'translateX(-50%)',
    opacity: beforeVisible ? 1 : 0,
    transition: beforePickup
      ? 'top 1.2s ease-in, opacity 0.9s ease-in'
      : 'opacity 0.25s ease',
    pointerEvents: 'none',
    zIndex: 1,
  };

  const afterVisible = phase === 'delivery';
  const isReset      = phase === 'reset';
  const isInitial    = phase === 'initial';
  const afterBottom  = (afterVisible || isReset) ? -60 : IMG_ZONE - 10;
  const afterStyle: React.CSSProperties = {
    position: 'absolute',
    bottom: afterBottom,
    left: '50%',
    transform: 'translateX(-50%)',
    opacity: afterVisible ? 1 : 0,
    transition: isInitial
      ? 'none'
      : afterVisible
        ? 'bottom 0.9s ease-out, opacity 0.6s ease-out'
        : 'opacity 0.5s ease',
    pointerEvents: 'none',
    zIndex: 1,
  };

  const cardClass = `service-anim-card${phase === 'processing' ? ' service-anim-card--shake' : ''}`;

  return (
    <div className="service-anim-wrap" style={{ paddingTop: IMG_ZONE, paddingBottom: IMG_ZONE }}>
      <div style={beforeStyle}>
        <Image src="/before" alt="Smutsig tvätt" width={120} height={100}
          style={{ objectFit: 'cover', borderRadius: 12 }} />
      </div>

      <div className={cardClass}>
        {ITEMS.map(({ Icon, label, sub }, i) => {
          const active = i === activeIdx;
          return (
            <div key={label} className={`service-anim-item${active ? ' service-anim-item--active' : ''}`}>
              <div className="service-anim-icon"><Icon size={18} stroke={1.75} /></div>
              <div>
                <div className="service-anim-label">{label}</div>
                <div className="service-anim-sub">{sub}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div style={afterStyle}>
        <Image src="/after.png" alt="Ren skjorta" width={120} height={100}
          style={{ objectFit: 'cover', borderRadius: 12 }} />
      </div>
    </div>
  );
}
```

---

## Required CSS (add to globals.css)

```css
@keyframes card-shake {
  0%,100% { transform: translateX(0); }
  15%      { transform: translateX(-5px); }
  30%      { transform: translateX(5px); }
  45%      { transform: translateX(-4px); }
  60%      { transform: translateX(4px); }
  75%      { transform: translateX(-2px); }
  90%      { transform: translateX(2px); }
}

.service-anim-wrap {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 320px;
  overflow: visible;
}

.service-anim-card {
  position: relative;
  z-index: 10;
  width: 100%;
  background: #ffffff;
  border: 0.5px solid rgba(6, 63, 65, 0.10);
  border-radius: 20px;
  padding: 28px 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  box-shadow: 0 8px 32px rgba(6, 63, 65, 0.14);
}

.service-anim-card--shake {
  animation: card-shake 0.5s ease-in-out;
}

.service-anim-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  transition: opacity 0.3s ease;
  opacity: 0.5;
}

.service-anim-item--active {
  opacity: 1;
}

.service-anim-icon {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  background: rgba(6, 63, 65, 0.06);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: var(--text-muted);
  transition: color 0.3s ease, background 0.3s ease;
}

.service-anim-item--active .service-anim-icon {
  color: #D4AF37;
  background: rgba(212, 175, 55, 0.10);
}

.service-anim-label {
  font-family: 'Poppins', sans-serif;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-muted);
  transition: color 0.3s ease;
  line-height: 1.3;
}

.service-anim-item--active .service-anim-label {
  color: #D4AF37;
}

.service-anim-sub {
  font-family: 'Poppins', sans-serif;
  font-size: 11px;
  font-weight: 400;
  color: rgba(6, 63, 65, 0.35);
  margin-top: 2px;
  transition: color 0.3s ease;
}

.service-anim-item--active .service-anim-sub {
  color: rgba(212, 175, 55, 0.7);
}
```

---

## How to place it on a page

The component is standalone — just import and render it. Place it inside a two-column layout alongside the hero text:

```tsx
import ServiceAnimCard from '@/components/ServiceAnimCard';

// In your JSX:
<div className="landing-hero-inner">
  <div className="landing-hero-text">
    {/* headline, tagline, CTA */}
  </div>
  <div className="landing-hero-card-col">
    <ServiceAnimCard />
  </div>
</div>
```

Required layout CSS:

```css
.landing-hero-inner {
  display: flex;
  flex-direction: column;
  gap: 40px;
  width: 100%;
  padding: 0 20%;
}

@media (min-width: 800px) {
  .landing-hero-inner {
    flex-direction: row;
    align-items: center;
    gap: 60px;
  }
  .landing-hero-text { flex: 1; }
  .landing-hero-card-col { flex-shrink: 0; }
}
```

The parent container must **not** have `overflow: hidden` — the images extend outside the card via absolute positioning and will be clipped if any ancestor hides overflow.

---

## Customising the items

Edit the `ITEMS` array. Each entry needs:
- `Icon` — any `@tabler/icons-react` component
- `label` — primary text (shown in gold when active)
- `sub` — secondary text below the label

## Customising the images

- `before` image: replace `public/before` (no extension required, but `.png` also works if you update the `src`)
- `after` image: replace `public/after.png`
- Adjust `IMG_ZONE` (default `110`) if your images are taller and need more travel space

## Customising the timings

Edit `PHASE_MS`. All values are milliseconds:

```ts
const PHASE_MS = {
  initial:    2600,  // how long before.png is shown at rest
  pickup:     1200,  // how long the slide-down takes
  processing: 1500,  // how long the shake/middle item is shown
  delivery:   2600,  // how long after.png is shown at rest
  reset:       800,  // fade-out duration before loop restart
};
```
