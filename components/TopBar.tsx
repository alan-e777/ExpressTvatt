'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { IconArrowLeft, IconSettings } from '@tabler/icons-react';

const TITLED_ROUTES: Record<string, string> = {
  '/tjanster': 'Tjänster',
  '/boka':     'Boka tjänst',
  '/checkout': 'Betala',
  '/chatt':    'Chatt',
  '/profil':   'Min profil',
};

const BACK_ROUTES: Record<string, string> = {
  '/boka':     '/tjanster',
  '/checkout': '/',
};

export default function TopBar() {
  const pathname = usePathname();

  const title    = TITLED_ROUTES[pathname] ?? 'Express Tvätt';
  const backHref = BACK_ROUTES[pathname];

  return (
    <header className="topbar">
      <div className="topbar-side">
        {backHref ? (
          <Link href={backHref} className="topbar-back" aria-label="Tillbaka">
            <IconArrowLeft size={20} stroke={1.5} />
          </Link>
        ) : (
          <span className="topbar-logo">Express Tvätt</span>
        )}
      </div>

      <span className="topbar-title">{title}</span>

      <div className="topbar-side">
        {!backHref && (
          <button className="topbar-settings" aria-label="Inställningar">
            <IconSettings size={16} stroke={1.5} />
          </button>
        )}
      </div>
    </header>
  );
}
