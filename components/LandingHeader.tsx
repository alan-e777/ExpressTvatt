'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';

// Anchor links resolve to the landing page sections (the site root) so the
// header behaves identically on every route it's rendered on.
const NAV_LINKS = [
  { href: '/#how',     label: 'Så fungerar det' },
  { href: '/#why',     label: 'Varför oss' },
  { href: '/#reviews', label: 'Omdömen' },
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
        <Link href="/" className="lp-nav-logo" aria-label="Express Tvätt">
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
