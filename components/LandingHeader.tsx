'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';

// Anchor links resolve to the landing page sections so the header works
// identically whether it's rendered on /landing or on /order.
const NAV_LINKS = [
  { href: '/landing#how',     label: 'Så fungerar det' },
  { href: '/landing#why',     label: 'Varför oss' },
  { href: '/landing#reviews', label: 'Omdömen' },
];

export default function LandingHeader() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
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
          <Link href="/profil">Profil</Link>
        </nav>

        <Link href="/order" className="lp-nav-cta">Boka upphämtning</Link>
      </div>
    </header>
  );
}
