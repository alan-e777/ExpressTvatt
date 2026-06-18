'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  IconShieldCheck, IconSparkles, IconClock, IconHome,
  IconCalendarEvent, IconTruck, IconArrowRight,
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


// ── Reveal — minimal opacity + translateY on scroll ──────────────────────────

type RevealVariant = 'up' | 'scale';

function Reveal({
  children,
  delay = 0,
  variant = 'up',
  className = '',
}: {
  children: React.ReactNode;
  delay?: number;
  variant?: RevealVariant;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setShown(true); io.disconnect(); } },
      { threshold: 0.15, rootMargin: '0px 0px -8% 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`lp-reveal lp-reveal--${variant}${shown ? ' lp-reveal--in' : ''} ${className}`}
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

  // Measure the live icon centres so the travelling parcel maps to wherever the
  // icons actually sit — a horizontal row on desktop, a vertical left column on
  // mobile. Both axes are animated, so each layout only moves on its own axis.
  const animRef  = useRef<HTMLDivElement>(null);
  const iconRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [centers, setCenters] = useState<{ x: number; y: number }[]>([]);

  const measure = () => {
    const anim = animRef.current;
    if (!anim) return;
    const ar = anim.getBoundingClientRect();
    setCenters(iconRefs.current.map(el => {
      if (!el) return { x: 0, y: 0 };
      const r = el.getBoundingClientRect();
      return { x: r.left - ar.left + r.width / 2, y: r.top - ar.top + r.height / 2 };
    }));
  };

  useEffect(() => {
    measure();
    const t = setTimeout(measure, 700); // re-measure once the reveal transforms settle
    window.addEventListener('resize', measure);
    // Re-measure on scroll so that if the section scrolls into view mid-cycle
    // (causing Reveal transitions to fire and shift icon positions), the parcel
    // snaps to the correct position rather than the stale pre-reveal coordinates.
    window.addEventListener('scroll', measure, { passive: true });
    return () => {
      clearTimeout(t);
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure);
    };
  }, []);
  // Self-heal each loop (cheap, and only when the parcel is at rest).
  useEffect(() => { if (howPhase === 'initial') measure(); }, [howPhase]);

  // before parcel: rests behind Hämtning (idx 1), slides behind Rengöring (idx 2).
  const beforeIdx = howPhase === 'initial' ? 1 : 2;
  // after parcel: emerges behind Rengöring (idx 2), slides behind Leverans (idx 3).
  const afterIdx  = howPhase === 'delivery' || howPhase === 'reset' ? 3 : 2;
  const bc = centers[beforeIdx] ?? { x: 0, y: 28 };
  const ac = centers[afterIdx]  ?? { x: 0, y: 28 };

  const beforeStyle: React.CSSProperties = {
    position: 'absolute',
    left: bc.x,
    top: bc.y,
    transform: 'translate(-50%, -50%)',
    opacity: howPhase === 'initial' || howPhase === 'pickup' ? 1 : 0,
    transition:
      howPhase === 'pickup'  ? 'left 1.2s ease-in-out, top 1.2s ease-in-out' :
      howPhase === 'initial' ? 'none' :
                               'opacity 0.3s ease',
    zIndex: 1,
    pointerEvents: 'none',
  };

  const afterStyle: React.CSSProperties = {
    position: 'absolute',
    left: ac.x,
    top: ac.y,
    transform: 'translate(-50%, -50%)',
    opacity: howPhase === 'delivery' ? 1 : 0,
    transition:
      howPhase === 'delivery' ? 'left 1.2s ease-in-out, top 1.2s ease-in-out, opacity 0.5s ease' :
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
        <div className="lp-hero-bg" aria-hidden />
        <div className="lp-hero-scrim" aria-hidden />
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
            <div className="lp-how-anim" aria-hidden ref={animRef}>
              <div style={beforeStyle}>
                <img src="/tinybefore.png" alt="" className="lp-how-anim-img" loading="eager" />
              </div>
              <div style={afterStyle}>
                <img src="/tinyafter.png" alt="" className="lp-how-anim-img" loading="eager" />
              </div>
            </div>

            {STEPS.map(({ n, Icon, title, desc }, i) => (
              <Reveal key={n} delay={i * 70} className="lp-how-step">
                <div
                  ref={el => { iconRefs.current[i] = el; }}
                  className={`lp-how-icon${activeIcon === i ? ' lp-how-icon--active' : ''}${shakeIcon === i ? ' lp-how-icon--shake' : ''}`}
                >
                  <Icon size={22} stroke={1.5} />
                </div>
                <div className="lp-how-text">
                  <div className="lp-how-n">{n}</div>
                  <div className="lp-how-title">{title}</div>
                  <div className="lp-how-desc">{desc}</div>
                </div>
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

      {/* ── Membership / certification ─────────────────────────────── */}
      <section className="lp-forbund" id="reviews">
        <div className="lp-section-inner">
          <div className="lp-forbund-card">
            <Reveal variant="scale" className="lp-forbund-badge">
              <Image
                src="/tvatteriforbundet-member.webp"
                alt="Medlemsmärke — Sveriges Tvätteriförbund"
                width={220}
                height={220}
                className="lp-forbund-badge-img"
              />
            </Reveal>

            <Reveal className="lp-forbund-body">
              <div className="lp-kicker">Kvalitet & ansvar</div>
              <h2 className="lp-forbund-title">Medlem i Sveriges Tvätteriförbund</h2>
              <p className="lp-forbund-text">
                Vi är anslutna till branschorganisationen för Sveriges tvätt- och
                textilservice. Medlemskapet är en kvalitetsstämpel — det innebär
                godkänd auktorisationskontroll, yrkeskunnig hantering och ett
                miljömedvetet arbetssätt i varje led.
              </p>
              <ul className="lp-forbund-points">
                <li>
                  <strong>T-märkt kvalitet</strong>
                  Auktoriserad plaggvård efter förbundets kontroll.
                </li>
                <li>
                  <strong>Yrkeskunskap</strong>
                  Utbildade specialister behandlar varje plagg rätt.
                </li>
                <li>
                  <strong>Miljömedvetet</strong>
                  Effektiv resurshantering enligt branschens riktlinjer.
                </li>
              </ul>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── Final CTA ──────────────────────────────────────────────── */}
      <section className="lp-final">
        <div className="lp-final-pattern" aria-hidden />
        <Reveal className="lp-final-inner">
          <h2 className="lp-final-title">Sluta tänka på tvätten.</h2>
          <p className="lp-final-sub">
            Boka på under en minut. Vi hämtar, rengör och levererar — du gör ingenting.
          </p>
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
            <a href="mailto:info@expresstvatt.se">info@expresstvatt.se</a>
            <a href="tel:+4681800077">08-18 00 77</a>
            <span>Svandammsvägen 20, 126 34 Hägersten</span>
          </div>

          <div className="lp-footer-col">
            <div className="lp-footer-h">Företaget</div>
            <span>Expresstvätt AB</span>
            <span>Org.nr 556097-5640</span>
          </div>
        </div>
        <div className="lp-footer-base">
          © {new Date().getFullYear()} Expresstvätt AB
          <span style={{ color: "rgba(255,255,255,0.02)", fontSize: "0.65rem", marginLeft: "1.5rem", userSelect: "none" }}>Made by Carl Nilsson</span>
        </div>
      </footer>

    </div>
  );
}
