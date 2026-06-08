'use client';

import { usePathname } from 'next/navigation';
import SiteHeader from './SiteHeader';
import MobileNav from './MobileNav';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (
    pathname.startsWith('/admin') ||
    pathname.startsWith('/driver') ||
    pathname.startsWith('/landing')
  ) {
    return <>{children}</>;
  }

  return (
    <div className="site-shell">
      <SiteHeader />
      <main className="site-content">{children}</main>
      <MobileNav />
    </div>
  );
}
