'use client';

import { usePathname } from 'next/navigation';
import LandingHeader from './LandingHeader';
import MobileNav from './MobileNav';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Full-bleed routes that render their own chrome:
  //  - '/'        → the landing page (own header + footer)
  //  - '/landing' → redirects to '/'
  //  - admin / driver → separate apps
  if (
    pathname === '/' ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/driver') ||
    pathname.startsWith('/landing')
  ) {
    return <>{children}</>;
  }

  // Every other section wears the same landing-page header for one
  // consistent look across the whole site.
  return (
    <div className="site-shell">
      <LandingHeader />
      <main className="site-content">{children}</main>
      <MobileNav />
    </div>
  );
}
