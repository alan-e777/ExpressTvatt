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
      {/* Left: back arrow on detail pages */}
      {backHref && (
        <div className="header-left">
          <Link href={backHref} className="header-back" aria-label="Tillbaka">
            <IconArrowLeft size={20} stroke={1.5} />
          </Link>
        </div>
      )}

      {/* Center: branded wordmark (always visible, clickable to home) */}
      <Link href="/" className="header-wordmark" aria-label="Express Tvätt – startsida">
        <span className="header-wordmark-express">EXPRESS</span>
        <Image
          src="/logo-icon.png"
          alt=""
          height={125}
          width={125}
          style={{ objectFit: 'contain' }}
          priority
        />
        <span className="header-wordmark-tvatt">TVÄTT</span>
      </Link>

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
