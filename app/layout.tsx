import type { Metadata, Viewport } from 'next';
import { Poppins, Inter } from 'next/font/google';
import './globals.css';
import ClientLayout from '@/components/ClientLayout';
import TrackingPixel from '@/components/TrackingPixel';
import CookieBanner from '@/components/CookieBanner';

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

export const metadata: Metadata = {
  title: 'Express Tvätt',
  description: 'Kemtvätt. Upphämtning. Hemleverans.',
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
