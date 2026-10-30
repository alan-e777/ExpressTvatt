import type { Metadata, Viewport } from 'next';
import { Poppins, Inter } from 'next/font/google';
import './globals.css';
import ClientLayout from '@/components/ClientLayout';
import TrackingPixel from '@/components/TrackingPixel';
import CookieBanner from '@/components/CookieBanner';
import { SITE_URL } from '@/lib/site-url';

/* Self-hosted at build time. These used to be two @import lines at the top of
   globals.css, which meant every page load — public, admin and driver — hit
   fonts.googleapis.com before the visitor had answered the cookie banner.
   next/font downloads the files during the build and serves them from our own
   origin, so there is no runtime request to Google at all.
   latin-ext is included alongside latin for the Swedish å/ä/ö. */
const poppins = Poppins({
  subsets: ['latin', 'latin-ext'],
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-poppins',
});

const inter = Inter({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-inter',
});

/* Site-wide defaults. The homepage overrides title/description/OG and adds the
   canonical in `app/page.tsx` — a canonical set here would be inherited by
   every route and point them all at `/`. `metadataBase` is what lets relative
   URLs in child metadata resolve to the live domain. */
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Kemtvätt i Stockholm med Hämtning & Hemleverans | ExpressTvätt',
    template: '%s | Express Tvätt',
  },
  description:
    'Professionell kemtvätt i Stockholm med snabb upphämtning och hemleverans. Vi hämtar dina plagg, rengör dem med omsorg och levererar tillbaka dem direkt till din dörr.',
  keywords: [
    'kemtvätt Stockholm',
    'kemtvätt med hemleverans',
    'kemtvätt med upphämtning',
    'tvättservice Stockholm',
    'express tvätt',
    'plaggvård',
    'kemtvätt Hägersten',
    'skjorttvätt',
    'kostymtvätt',
  ],
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

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sv" className={`${poppins.variable} ${inter.variable}`}>
      <body>
        <TrackingPixel />
        <CookieBanner />
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
