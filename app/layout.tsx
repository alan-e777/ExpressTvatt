import type { Metadata } from 'next';
import './globals.css';
import ClientLayout from '@/components/ClientLayout';

export const metadata: Metadata = {
  title: 'Amos Skrädderi',
  description: 'Professionellt skrädderi och tvätt sedan 1987',
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
