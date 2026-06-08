'use client';

import { useEffect, useState } from 'react';
import { IconLeaf } from '@tabler/icons-react';

export default function LandingPage() {
  const [heroHidden, setHeroHidden] = useState(false);

  useEffect(() => {
    function onScroll() {
      const y = window.scrollY ?? window.pageYOffset ?? document.documentElement.scrollTop;
      setHeroHidden(y > 0);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('scroll', onScroll);
    };
  }, []);

  return (
    <div className={`landing-hero-wrap${heroHidden ? ' landing-hero-wrap--hidden' : ''}`}>
      <div className="home-hero">
        <div className="home-hero-title">
          <div>Kemtvätt.</div>
          <div className="home-hero-title-accent">Hämtning.</div>
          <div>Hemleverans.</div>
        </div>
        <div className="home-hero-tagline">
          <IconLeaf size={10} stroke={1.5} />
          <span>Miljövänliga metoder sedan 1987</span>
        </div>
        <a href="/#services" className="home-hero-cta">BOKA UPPHÄMTNING</a>
      </div>
    </div>
  );
}
