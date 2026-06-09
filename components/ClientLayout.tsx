'use client';

import { usePathname } from 'next/navigation';
import SiteHeader from './SiteHeader';
import LandingHeader from './LandingHeader';
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

  // /order keeps the site-shell styling (so the booking UI is unchanged) but
  // wears the landing page's header + branding.
  const isOrder = pathname.startsWith('/order');

  return (
    <div className={`site-shell${isOrder ? ' order-shell' : ''}`}>
      {isOrder ? <LandingHeader /> : <SiteHeader />}
      <main className="site-content">{children}</main>
      <MobileNav />
    </div>
  );
}
