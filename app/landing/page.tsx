'use client';

import { IconLeaf, IconStar } from '@tabler/icons-react';
import ServiceAnimCard from '@/components/ServiceAnimCard';

// ── Testimonial data ──────────────────────────────────────────────────────────

const TESTIMONIALS = [
  {
    name: 'Anna L.',
    location: 'Östermalm',
    rating: 5,
    text: 'Fantastisk service! Kostymerna kom tillbaka perfekt pressade och levererades precis i tid inför mötet. Rekommenderar varmt.',
  },
  {
    name: 'Marcus W.',
    location: 'Södermalm',
    rating: 5,
    text: 'Hämtade mattan på måndag, levererade på onsdag — renare än den var när vi köpte den. Smidigt och professionellt.',
  },
  {
    name: 'Elin K.',
    location: 'Vasastan',
    rating: 5,
    text: 'Äntligen en tvättjänst som håller vad den lovar. Miljövänliga metoder och alltid i tid. Använder dem varje månad.',
  },
];

function StarRow({ count }: { count: number }) {
  return (
    <div style={{ display: 'flex', gap: 3 }}>
      {Array.from({ length: count }).map((_, i) => (
        <IconStar key={i} size={13} stroke={0} fill="var(--earth)" />
      ))}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div className="landing-page">

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <div className="landing-hero-wrap">
        <div className="home-hero landing-hero-full">
          <div className="landing-hero-inner">

            {/* Text column */}
            <div className="landing-hero-text">
              <div className="home-hero-title">
                <div>Kemtvätt.</div>
                <div className="home-hero-title-accent">Hämtning.</div>
                <div>Hemleverans.</div>
              </div>
              <div className="home-hero-tagline" style={{ marginTop: 16 }}>
                <IconLeaf size={10} stroke={1.5} />
                <span>Miljövänliga metoder sedan 1987</span>
              </div>
              <a href="/#services" className="home-hero-cta" style={{ marginTop: 24 }}>BOKA UPPHÄMTNING</a>

              <p className="landing-hero-desc">
                Professionell kemtvätt med miljövänliga metoder. Vi hämtar din tvätt, tvättar den med omsorg, och levererar den direkt hem till din dörr. Snabbt, enkelt och tillförlitligt sedan 1987.
              </p>
            </div>

            {/* Animated card column */}
            <div className="landing-hero-card-col">
              <ServiceAnimCard />
            </div>

          </div>
        </div>
      </div>

      {/* ── Testimonials ─────────────────────────────────────────────── */}
      <section className="landing-testimonials">
        <div className="landing-testimonials-header">
          <div className="landing-testimonials-kicker">KUNDRECENSIONER</div>
          <div className="landing-testimonials-title">Vad våra kunder säger</div>
          <div className="landing-testimonials-avg">
            <StarRow count={5} />
            <span className="landing-testimonials-score">4.9 / 5</span>
            <span className="landing-testimonials-count">· 1 000+ recensioner</span>
          </div>
        </div>

        <div className="landing-testimonials-grid">
          {TESTIMONIALS.map((t) => (
            <div key={t.name} className="landing-testimonial-card">
              <StarRow count={t.rating} />
              <p className="landing-testimonial-text">&ldquo;{t.text}&rdquo;</p>
              <div className="landing-testimonial-author">
                <div className="landing-testimonial-avatar">
                  {t.name.charAt(0)}
                </div>
                <div>
                  <div className="landing-testimonial-name">{t.name}</div>
                  <div className="landing-testimonial-location">{t.location}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}
