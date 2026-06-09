'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  IconShieldCheck, IconSparkles, IconClock, IconHome,
  IconCalendarEvent, IconTruck, IconArrowRight, IconStarFilled,
} from '@tabler/icons-react';

// ── Content ─────────────────────────────────────────────────────────────────

const NAV_LINKS = [
  { href: '#how',  label: 'Så fungerar det' },
  { href: '#why',  label: 'Varför oss' },
  { href: '#reviews', label: 'Omdömen' },
];

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

// ── Page ──────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="lp">

      {/* ── Navigation ─────────────────────────────────────────────── */}
      <header className={`lp-nav${scrolled ? ' lp-nav--scrolled' : ''}`}>
        <div className="lp-nav-inner">
          <Link href="/landing" className="lp-nav-logo" aria-label="Express Tvätt">
            <Image src="/logo-icon.png" alt="" width={34} height={34} priority />
            <span className="lp-nav-wordmark">
              <span className="lp-nav-express">EXPRESS</span>
              <span className="lp-nav-tvatt">TVÄTT</span>
            </span>
          </Link>

          <nav className="lp-nav-links" aria-label="Sidnavigation">
            {NAV_LINKS.map(l => (
              <a key={l.href} href={l.href}>{l.label}</a>
            ))}
          </nav>

          <Link href="/" className="lp-nav-cta">Boka upphämtning</Link>
        </div>
      </header>

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
                <Link href="/" className="lp-btn lp-btn--light">Boka upphämtning</Link>
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
            {STEPS.map(({ n, Icon, title, desc }, i) => (
              <Reveal key={n} delay={i * 70} className="lp-how-step">
                <div className="lp-how-icon"><Icon size={22} stroke={1.5} /></div>
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
            <Link href="/" className="lp-btn lp-btn--dark">Boka upphämtning</Link>
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
          <Link href="/" className="lp-btn lp-btn--light lp-final-btn">
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
            <Link href="/">Boka upphämtning</Link>
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
