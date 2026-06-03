import type { Metadata, Viewport } from 'next';
import './globals.css';
import ClientLayout from '@/components/ClientLayout';

export const metadata: Metadata = {
  title: 'Tvättio',
  description: 'Professionell tvätt och skrädderi',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sv">
      <body>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
