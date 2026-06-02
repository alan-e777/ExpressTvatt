'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { IconHome, IconScissors, IconMessageCircle, IconUser } from '@tabler/icons-react';

const LINKS = [
  { href: '/',        label: 'Hem',      Icon: IconHome },
  { href: '/tjanster',label: 'Tjänster', Icon: IconScissors },
  { href: '/chatt',   label: 'Chatt',    Icon: IconMessageCircle },
  { href: '/profil',  label: 'Profil',   Icon: IconUser },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="bottom-nav">
      {LINKS.map(({ href, label, Icon }) => {
        const active = pathname === href || (href !== '/' && pathname.startsWith(href));
        return (
          <Link key={href} href={href} className={active ? 'active' : ''}>
            <Icon size={22} stroke={active ? 1.75 : 1.5} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
