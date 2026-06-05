'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { IconArrowLeft, IconSettings, IconHome, IconMessageCircle, IconUser } from '@tabler/icons-react';

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

export default function SiteHeader() {
  const pathname = usePathname();
  const title    = TITLES[pathname];
  const backHref = BACK_TO[pathname];
  const isHome   = pathname === '/';

  return (
    <header className="site-header">
      {/* Left: back arrow on detail pages, logo on home */}
      <div className="header-left">
        {backHref ? (
          <Link href={backHref} className="header-back" aria-label="Tillbaka">
            <IconArrowLeft size={20} stroke={1.5} />
          </Link>
        ) : isHome ? (
          <Link href="/" aria-label="Express Tvätt – startsida">
            <Image
              src="/logo.png"
              alt="Express Tvätt"
              height={36}
              width={120}
              style={{ objectFit: 'contain', objectPosition: 'left center' }}
              priority
            />
          </Link>
        ) : null}
      </div>

      {/* Center: page title (hidden on home where logo is shown) */}
      {!isHome && <span className="header-title">{title ?? 'Express Tvätt'}</span>}
      {isHome && <span style={{ flex: 1 }} />}

      {/* Right: desktop nav OR mobile settings */}
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

      {/* Mobile: settings button (hidden on desktop where nav shows) */}
      {!backHref && (
        <button className="header-settings" aria-label="Inställningar">
          <IconSettings size={16} stroke={1.5} />
        </button>
      )}
    </header>
  );
}
