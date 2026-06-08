'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { IconArrowLeft, IconMenu2, IconX, IconHome, IconMessageCircle, IconUser, IconFlag } from '@tabler/icons-react';

const NAV_LINKS = [
  { href: '/landing', label: 'Landing', Icon: IconFlag },
  { href: '/',        label: 'Hem',     Icon: IconHome },
  { href: '/chatt',   label: 'Chatt',   Icon: IconMessageCircle },
  { href: '/profil',  label: 'Profil',  Icon: IconUser },
];

const BACK_TO: Record<string, string> = {
  '/boka':               '/tjanster',
  '/checkout':           '/tjanster',
  '/struken-tvatt':      '/',
  '/struken-tvatt/boka': '/struken-tvatt',
};

export default function SiteHeader() {
  const pathname = usePathname();
  const backHref = BACK_TO[pathname];
  const [menuOpen, setMenuOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setMenuOpen(false); }, [pathname]);

  // Shop page only: header slides away after ~50px of downward scroll
  useEffect(() => {
    if (pathname !== '/') { setHidden(false); return; }
    const onScroll = () => setHidden(window.scrollY > 50);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpen]);

  return (
    <header className={`site-header${hidden ? ' site-header--hidden' : ''}`}>
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

      {/* Mobile: hamburger button + dropdown */}
      {!backHref && (
        <div className="header-burger-wrap" ref={menuRef}>
          <button
            className="header-burger"
            aria-label={menuOpen ? 'Stäng meny' : 'Öppna meny'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(v => !v)}
          >
            {menuOpen ? <IconX size={20} stroke={1.5} /> : <IconMenu2 size={20} stroke={1.5} />}
          </button>

          {menuOpen && (
            <nav className="burger-menu" aria-label="Mobilmeny">
              {NAV_LINKS.map(({ href, label, Icon }) => {
                const active = pathname === href || (href !== '/' && pathname.startsWith(href));
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`burger-menu-link${active ? ' active' : ''}`}
                    onClick={() => setMenuOpen(false)}
                  >
                    <Icon size={18} stroke={active ? 1.75 : 1.5} />
                    <span>{label}</span>
                  </Link>
                );
              })}
            </nav>
          )}
        </div>
      )}
    </header>
  );
}
