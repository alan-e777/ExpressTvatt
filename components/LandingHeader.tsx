'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { getReviews } from '@/lib/reviews-client';

// Anchor links resolve to the landing page sections (the site root) so the
// header behaves identically on every route it's rendered on.
const NAV_LINKS = [
  { id: 'how',        href: '/#how',        label: 'Så fungerar det' },
  { id: 'why',        href: '/#why',        label: 'Varför oss' },
  { id: 'certifikat', href: '/#certifikat', label: 'Certifikat' },
];

/* Added only when Google actually returns reviews. The section hides itself
   when there are none, so a permanent tab here would be a link that scrolls
   nowhere — which is the state the site is in until GOOGLE_PLACE_ID is set and
   the Places reviews SKU is enabled. */
const REVIEWS_LINK = { id: 'reviews', href: '/#reviews', label: 'Omdömen' };

export default function LandingHeader() {
  const pathname = usePathname();
  const onLanding = pathname === '/';

  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [hasReviews, setHasReviews] = useState(false);

  // Same shared request the reviews section makes.
  useEffect(() => {
    let alive = true;
    getReviews().then(d => { if (alive) setHasReviews(d.reviews.length > 0); });
    return () => { alive = false; };
  }, []);

  // Omdömen sits last, immediately before Profil.
  const links = useMemo(
    () => (hasReviews ? [...NAV_LINKS, REVIEWS_LINK] : NAV_LINKS),
    [hasReviews],
  );

  // Glass effect kicks in after a short scroll.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Active-section indication — only meaningful on the landing page, where the
  // sections actually exist. The section nearest the upper third wins.
  useEffect(() => {
    if (!onLanding) return;
    const sections = links
      .map(l => document.getElementById(l.id))
      .filter((el): el is HTMLElement => el !== null);
    if (!sections.length) return;

    const order = links.map(l => l.id);
    const inView = new Set<string>();
    const io = new IntersectionObserver(
      entries => {
        for (const e of entries) {
          if (e.isIntersecting) inView.add(e.target.id);
          else inView.delete(e.target.id);
        }
        // Topmost section in view wins; nothing in view → clear (we're in the hero).
        const next = order.find(id => inView.has(id)) ?? null;
        setActive(next);
      },
      { rootMargin: '-45% 0px -50% 0px', threshold: 0 },
    );
    sections.forEach(s => io.observe(s));
    return () => io.disconnect();
    // `links` is in here on purpose: the reviews section mounts after its fetch
    // resolves, so the observer has to be rebuilt once it exists.
  }, [onLanding, links]);

  // Lock body scroll while the mobile menu is open.
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  return (
    <header className={`lp-nav${scrolled ? ' lp-nav--scrolled' : ''}${menuOpen ? ' lp-nav--menu-open' : ''}`}>
      <div className="lp-nav-inner">
        <Link href="/" className="lp-nav-logo" aria-label="Express Tvätt" onClick={() => setMenuOpen(false)}>
          <Image src="/logo-icon.png" alt="" width={42} height={42} priority />
          <span className="lp-nav-wordmark">
            <span className="lp-nav-express">EXPRESS</span>
            <span className="lp-nav-tvatt">TVÄTT</span>
          </span>
        </Link>

        <nav className="lp-nav-links" aria-label="Sidnavigation">
          {links.map(l => (
            <a
              key={l.href}
              href={l.href}
              className={onLanding && active === l.id ? 'is-active' : undefined}
              aria-current={onLanding && active === l.id ? 'true' : undefined}
            >
              {l.label}
            </a>
          ))}
          <Link href="/profil">Profil</Link>
        </nav>

        <Link href="/order" className="lp-nav-cta">Boka upphämtning</Link>

        <button
          type="button"
          className="lp-nav-burger"
          aria-label={menuOpen ? 'Stäng meny' : 'Öppna meny'}
          aria-expanded={menuOpen}
          aria-controls="lp-mobile-menu"
          onClick={() => setMenuOpen(o => !o)}
        >
          <span className="lp-nav-burger-bars" aria-hidden />
        </button>
      </div>

      {/* Mobile menu — gives section links a home on small screens */}
      <div
        id="lp-mobile-menu"
        className={`lp-nav-mobile${menuOpen ? ' lp-nav-mobile--open' : ''}`}
        hidden={!menuOpen}
      >
        <nav className="lp-nav-mobile-links" aria-label="Mobilnavigation">
          {links.map(l => (
            <a
              key={l.href}
              href={l.href}
              className={onLanding && active === l.id ? 'is-active' : undefined}
              onClick={() => setMenuOpen(false)}
            >
              {l.label}
            </a>
          ))}
          <Link href="/profil" onClick={() => setMenuOpen(false)}>Profil</Link>
        </nav>
        <Link href="/order" className="lp-btn lp-btn--dark lp-nav-mobile-cta" onClick={() => setMenuOpen(false)}>
          Boka upphämtning
        </Link>
      </div>

      {/* Click-away backdrop */}
      <button
        type="button"
        className={`lp-nav-scrim${menuOpen ? ' lp-nav-scrim--show' : ''}`}
        tabIndex={-1}
        aria-hidden
        onClick={() => setMenuOpen(false)}
      />
    </header>
  );
}
