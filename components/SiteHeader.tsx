'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { IconArrowLeft, IconSettings, IconHome, IconMessageCircle, IconUser, IconLeaf } from '@tabler/icons-react';

const NAV_LINKS = [
  { href: '/',       label: 'Hem',    Icon: IconHome },
  { href: '/chatt',  label: 'Chatt',  Icon: IconMessageCircle },
  { href: '/profil', label: 'Profil', Icon: IconUser },
];

const TITLES: Record<string, string> = {
  '/tjanster':            'Tjänster',
  '/boka':                'Boka tjänst',
  '/checkout':            'Betala',
  '/chatt':               'Chatt',
  '/profil':              'Min profil',
  '/struken-tvatt':       'Struken tvätt',
  '/struken-tvatt/boka':  'Boka & betala',
};

const BACK_TO: Record<string, string> = {
  '/boka':                '/tjanster',
  '/checkout':            '/tjanster',
  '/struken-tvatt':       '/',
  '/struken-tvatt/boka':  '/struken-tvatt',
};

// Must match --header-hero-h in globals.css
const HERO_H = 320;

export default function SiteHeader() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const title    = TITLES[pathname];
  const backHref = BACK_TO[pathname];
  const isHome   = pathname === '/';

  useEffect(() => {
    // Set initial padding-top on the content via CSS custom property
    if (isHome) {
      document.documentElement.style.setProperty('--current-header-h', `${HERO_H}px`);
    }

    function onScroll() {
      // window.pageYOffset is the iOS-safe fallback for window.scrollY
      const scrollY = window.scrollY ?? window.pageYOffset ?? document.documentElement.scrollTop;
      const isScrolled = scrollY > 20;
      setScrolled(isScrolled);
      if (isHome) {
        document.documentElement.style.setProperty(
          '--current-header-h',
          isScrolled ? '54px' : `${HERO_H}px`,
        );
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    // document fires on iOS when window doesn't
    document.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('scroll', onScroll);
      document.documentElement.style.removeProperty('--current-header-h');
    };
  }, [isHome]);

  return (
    <header className={`site-header${isHome ? ' has-hero' : ''}${scrolled ? ' scrolled' : ''}`}>

      {/* ── Topbar — always visible ──────────────────────────────────────── */}
      <div className="header-topbar">
        {backHref && (
          <div className="header-left">
            <Link href={backHref} className="header-back" aria-label="Tillbaka">
              <IconArrowLeft size={20} stroke={1.5} />
            </Link>
          </div>
        )}

        {/* Center: branded wordmark */}
        <Link href="/" className="header-wordmark" aria-label="Express Tvätt – startsida">
          <span className="header-wordmark-express">EXPRESS</span>
          <Image
            src="/logo-icon.png"
            alt=""
            height={50}
            width={50}
            style={{ objectFit: 'contain', width: '50px', height: '50px', maxWidth: '50px' }}
            priority
          />
          <span className="header-wordmark-tvatt">TVÄTT</span>
        </Link>

        {/* Right: desktop nav */}
        <nav className="header-nav" aria-label="Huvudnavigation">
          {NAV_LINKS.map(({ href, label, Icon }) => {
            const active = pathname === href || (href !== '/' && pathname.startsWith(href));
            return (
              <Link key={href} href={href} className={`header-nav-link${active ? ' active' : ''}`}>
                <Icon size={18} stroke={active ? 1.75 : 1.5} className="header-nav-icon" />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Mobile: settings button */}
        {!backHref && (
          <button className="header-settings" aria-label="Inställningar">
            <IconSettings size={16} stroke={1.5} />
          </button>
        )}
      </div>

      {/* ── Hero — home page only, fades out on scroll ───────────────────── */}
      {isHome && (
        <div className="header-hero">
          <div className="header-hero-title">
            <div>Kemtvätt.</div>
            <div className="header-hero-title-accent">Hämtning.</div>
            <div>Hemleverans.</div>
          </div>
          <div className="header-hero-tagline">
            <IconLeaf size={10} stroke={1.5} />
            <span>Miljövänliga metoder sedan 1987</span>
          </div>
          <a href="#services" className="header-hero-cta">BOKA UPPHÄMTNING</a>
        </div>
      )}

    </header>
  );
}
