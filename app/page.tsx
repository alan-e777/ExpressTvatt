import type { Metadata } from 'next';
import LandingPage from '@/components/LandingPage';
import { SITE_URL } from '@/lib/site-url';

/**
 * The landing page itself is a client component (scroll reveals, the parcel
 * animation, the header's active-section observer), and a client component
 * cannot export `metadata`. This server wrapper exists only to carry the
 * homepage's SEO tags — in particular the canonical, which must point at `/`
 * and must NOT be inherited by every other route the way a tag set in
 * `app/layout.tsx` would be.
 */
export const metadata: Metadata = {
  title: 'Kemtvätt i Stockholm med Hämtning & Hemleverans | ExpressTvätt',
  description:
    'Professionell kemtvätt i Stockholm med snabb upphämtning och hemleverans. Vi hämtar dina plagg, rengör dem med omsorg och levererar tillbaka dem direkt till din dörr.',
  alternates: { canonical: '/' },
  openGraph: {
    title: 'Kemtvätt i Stockholm med Hämtning & Hemleverans',
    description:
      'Snabb och professionell kemtvätt i Stockholm. Upphämtning och leverans direkt till dörren.',
    url: `${SITE_URL}/`,
    type: 'website',
    siteName: 'Express Tvätt',
    locale: 'sv_SE',
  },
};

export default function Page() {
  return <LandingPage />;
}
