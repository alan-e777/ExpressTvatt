'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  IconShieldCheck, IconSparkles, IconClock, IconHome,
  IconCalendarEvent, IconTruck, IconArrowRight, IconStarFilled,
} from '@tabler/icons-react';
import LandingHeader from '@/components/LandingHeader';

// ── Content ─────────────────────────────────────────────────────────────────

const TRUST = [
  { Icon: IconShieldCheck, label: 'Försäkrade plagg' },
  { Icon: IconSparkles,    label: 'Professionell plaggvård' },
  { Icon: IconClock,       label: 'Upphämtning inom 2h' },
  { Icon: IconHome,        label: 'Hemleverans' },
];

const STEPS = [
  { n: '01', Icon: IconCalendarEvent, title: 'Boka',      desc: 'Välj tid för upphämtning på under en minut.' },
  { n: '02', Icon: IconTruck,         title: 'Hämtning',  desc: 'Vi hämtar dina plagg direkt vid din dörr.' },
  { n: '03', Icon: IconSparkles,      title: 'Rengöring', desc: 'Professionell behandling med spårbar hantering.' },
  { n: '04', Icon: IconHome,          title: 'Leverans',  desc: 'Rent och pressat, tillbaka när det passar dig.' },
];

const BENEFITS = [
  { title: 'Upphämtning på dina villkor', desc: 'Boka en tid som passar ditt schema. Vi anpassar oss efter dig.' },
  { title: 'Professionell plaggvård',     desc: 'Varje plagg hanteras individuellt av utbildade specialister.' },
  { title: 'Spårbar logistik',            desc: 'Du följer dina plagg genom hela processen, i realtid.' },
  { title: 'Transparent prissättning',    desc: 'Inga dolda avgifter. Hämtning och leverans ingår alltid.' },
];

const REVIEWS = [
  { text: 'Hämtade på morgonen, tillbaka nästa dag — pressat och perfekt. Jag tänker aldrig på tvätt längre.', name: 'Anna L.', city: 'Östermalm' },
  { text: 'Behandlade min kostym bättre än någon kemtvätt jag använt. Logistiken är felfri.', name: 'Marcus H.', city: 'Vasastan' },
  { text: 'Punktliga, diskreta och proffsiga. Precis vad man vill ha av en tjänst för dyra plagg.', name: 'Sofia B.', city: 'Kungsholmen' },
];

// ── Reveal — minimal opacity + translateY on scroll ──────────────────────────

function Reveal({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setShown(true); io.disconnect(); } },
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`lp-reveal${shown ? ' lp-reveal--in' : ''} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

// ── "How it works" flow animation ────────────────────────────────────────────
// before.png travels from the Hämtning icon (idx 1) into/behind the Rengöring
// icon (idx 2), which shakes; then after.png emerges from behind Rengöring and
// slides into/behind the Leverans icon (idx 3). Loops forever.

type HowPhase = 'initial' | 'pickup' | 'processing' | 'delivery' | 'reset';

const HOW_MS: Record<HowPhase, number> = {
  initial:    1700,
  pickup:     1300,
  processing: 1200,
  delivery:   1400,
  reset:       700,
};
const HOW_ORDER: HowPhase[] = ['initial', 'pickup', 'processing', 'delivery', 'reset'];

// Horizontal centres of the four step icons. Icons are 56px, left-aligned in
// each 1fr column (gap 32px), so centre_i = i*(colW+32) + 28 = i*25% + (i*8+28)px.
const ICON_X = ['28px', 'calc(25% + 36px)', 'calc(50% + 44px)', 'calc(75% + 52px)'];

function useHowFlow() {
  const [phase, setPhase] = useState<HowPhase>('initial');
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    function step(current: HowPhase) {
      timer = setTimeout(() => {
        if (cancelled) return;
        const next = HOW_ORDER[(HOW_ORDER.indexOf(current) + 1) % HOW_ORDER.length];
        setPhase(next);
        step(next);
      }, HOW_MS[current]);
    }
    step('initial');
    return () => { cancelled = true; clearTimeout(timer); };
  }, []);
  return phase;
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const howPhase = useHowFlow();

  // Which icon glows gold this phase, and which one shakes.
  const activeIcon =
    howPhase === 'initial'                            ? 1 :
    howPhase === 'pickup' || howPhase === 'processing' ? 2 :
    howPhase === 'delivery'                           ? 3 : -1;
  const shakeIcon = howPhase === 'processing' ? 2 : -1;

  // before.png: rests behind Hämtning (idx 1), slides behind Rengöring (idx 2).
  const beforeStyle: React.CSSProperties = {
    position: 'absolute',
    top: 28,
    left: howPhase === 'initial' ? ICON_X[1] : ICON_X[2],
    transform: 'translate(-50%, -50%)',
    opacity: howPhase === 'initial' || howPhase === 'pickup' ? 1 : 0,
    transition:
      howPhase === 'pickup'  ? 'left 1.2s ease-in-out' :
      howPhase === 'initial' ? 'none' :
                               'opacity 0.3s ease',
    zIndex: 1,
    pointerEvents: 'none',
  };

  // after.png: emerges from behind Rengöring (idx 2), slides behind Leverans (idx 3).
  const afterStyle: React.CSSProperties = {
    position: 'absolute',
    top: 28,
    left: howPhase === 'delivery' || howPhase === 'reset' ? ICON_X[3] : ICON_X[2],
    transform: 'translate(-50%, -50%)',
    opacity: howPhase === 'delivery' ? 1 : 0,
    transition:
      howPhase === 'delivery' ? 'left 1.2s ease-in-out, opacity 0.5s ease' :
      howPhase === 'initial'  ? 'none' :
                                'opacity 0.4s ease',
    zIndex: 1,
    pointerEvents: 'none',
  };

  return (
    <div className="lp">

      {/* ── Navigation (shared with /order) ─────────────────────────── */}
      <LandingHeader />

      {/* ── Hero ───────────────────────────────────────────────────── */}
      <section className="lp-hero">
        <div className="lp-hero-pattern" aria-hidden />
        <div className="lp-hero-inner">

          <div className="lp-hero-text">
            <Reveal>
              <h1 className="lp-hero-title">
                Kemtvättat.<br /><span className="lp-hero-title-gold">Upphämtning.</span><br />Levererat.
              </h1>
            </Reveal>
            <Reveal delay={80}>
              <p className="lp-hero-sub">
                Vi hämtar dina plagg, rengör dem med professionell omsorg och
                levererar dem hem till din dörr. En logistiktjänst byggd för
                garderober du bryr dig om.
              </p>
            </Reveal>
            <Reveal delay={160}>
              <div className="lp-hero-cta-group">
                <Link href="/order" className="lp-btn lp-btn--light">Boka upphämtning</Link>
                <a href="#how" className="lp-btn lp-btn--ghost">Så fungerar det</a>
              </div>
            </Reveal>
          </div>

          <Reveal delay={120} className="lp-hero-visual-col">
            <div className="lp-hero-visual">
              <div className="lp-hero-visual-glow" aria-hidden />
              <div className="lp-hero-ring" aria-hidden />
              <Image
                src="/logo-icon.png"
                alt="Express Tvätt"
                width={240}
                height={216}
                className="lp-hero-mark"
                priority
              />
            </div>
          </Reveal>

        </div>
      </section>

      {/* ── Trust bar ──────────────────────────────────────────────── */}
      <section className="lp-trust">
        <div className="lp-trust-inner">
          {TRUST.map(({ Icon, label }) => (
            <div key={label} className="lp-trust-item">
              <Icon size={20} stroke={1.5} />
              <span>{label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ───────────────────────────────────────────── */}
      <section className="lp-how" id="how">
        <div className="lp-section-inner">
          <Reveal>
            <div className="lp-kicker">Så fungerar det</div>
            <h2 className="lp-section-title">Fyra steg. Noll krångel.</h2>
          </Reveal>

          <div className="lp-how-grid">
            <div className="lp-how-line" aria-hidden />

            {/* Animated parcel flow: tinybefore.png → behind Rengöring → tinyafter.png → behind Leverans */}
            <div className="lp-how-anim" aria-hidden>
              <div style={beforeStyle}>
                <img src="/tinybefore.png" alt="" className="lp-how-anim-img" loading="eager" />
              </div>
              <div style={afterStyle}>
                <img src="/tinyafter.png" alt="" className="lp-how-anim-img" loading="eager" />
              </div>
            </div>

            {STEPS.map(({ n, Icon, title, desc }, i) => (
              <Reveal key={n} delay={i * 70} className="lp-how-step">
                <div className={`lp-how-icon${activeIcon === i ? ' lp-how-icon--active' : ''}${shakeIcon === i ? ' lp-how-icon--shake' : ''}`}>
                  <Icon size={22} stroke={1.5} />
                </div>
                <div className="lp-how-n">{n}</div>
                <div className="lp-how-title">{title}</div>
                <div className="lp-how-desc">{desc}</div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why customers choose us ────────────────────────────────── */}
      <section className="lp-why" id="why">
        <div className="lp-section-inner lp-why-inner">
          <Reveal className="lp-why-left">
            <div className="lp-kicker">Varför oss</div>
            <h2 className="lp-section-title">
              Byggt som en logistik&shy;tjänst — inte ett tvätteri.
            </h2>
            <p className="lp-why-lead">
              Precision i varje led. Vi behandlar dina plagg som värdefull last:
              spårad, försäkrad och hanterad av specialister från upphämtning
              till leverans.
            </p>
            <Link href="/order" className="lp-btn lp-btn--dark">Boka upphämtning</Link>
          </Reveal>

          <div className="lp-why-right">
            {BENEFITS.map((b, i) => (
              <Reveal key={b.title} delay={i * 60} className="lp-benefit">
                <div className="lp-benefit-title">{b.title}</div>
                <div className="lp-benefit-desc">{b.desc}</div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Social proof ───────────────────────────────────────────── */}
      <section className="lp-reviews" id="reviews">
        <div className="lp-section-inner">
          <Reveal className="lp-reviews-head">
            <div className="lp-kicker">Omdömen</div>
            <div className="lp-reviews-score">
              <span className="lp-reviews-num">4,9</span>
              <span className="lp-reviews-stars" aria-label="4,9 av 5">
                {Array.from({ length: 5 }).map((_, i) => <IconStarFilled key={i} size={15} />)}
              </span>
              <span className="lp-reviews-count">· 1 200+ upphämtningar</span>
            </div>
          </Reveal>

          <div className="lp-reviews-grid">
            {REVIEWS.map((r, i) => (
              <Reveal key={r.name} delay={i * 70} className="lp-review">
                <p className="lp-review-text">{r.text}</p>
                <div className="lp-review-author">
                  <span className="lp-review-name">{r.name}</span>
                  <span className="lp-review-city">{r.city}</span>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ──────────────────────────────────────────────── */}
      <section className="lp-final">
        <div className="lp-final-pattern" aria-hidden />
        <Reveal className="lp-final-inner">
          <h2 className="lp-final-title">Sluta tänka på tvätten.</h2>
          <Link href="/order" className="lp-btn lp-btn--light lp-final-btn">
            Boka upphämtning <IconArrowRight size={18} stroke={2} />
          </Link>
        </Reveal>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────── */}
      <footer className="lp-footer">
        <div className="lp-footer-pattern" aria-hidden />
        <div className="lp-footer-inner">
          <div className="lp-footer-brand">
            <span className="lp-nav-wordmark">
              <span className="lp-nav-express">EXPRESS</span>
              <span className="lp-nav-tvatt">TVÄTT</span>
            </span>
            <p>Kemtvätt med logistik i världsklass.</p>
          </div>

          <div className="lp-footer-col">
            <div className="lp-footer-h">Tjänst</div>
            <Link href="/order">Boka upphämtning</Link>
            <a href="#how">Så fungerar det</a>
            <a href="#why">Varför oss</a>
          </div>

          <div className="lp-footer-col">
            <div className="lp-footer-h">Kontakt</div>
            <a href="mailto:hej@expresstvatt.se">hej@expresstvatt.se</a>
            <a href="tel:+46812345678">08-123 456 78</a>
            <span>Stockholm</span>
          </div>

          <div className="lp-footer-col">
            <div className="lp-footer-h">Företaget</div>
            <span>Express Tvätt AB</span>
            <span>Org.nr 556000-0000</span>
            <span>Sedan 1987</span>
          </div>
        </div>
        <div className="lp-footer-base">© {new Date().getFullYear()} Express Tvätt AB</div>
      </footer>

    </div>
  );
}
