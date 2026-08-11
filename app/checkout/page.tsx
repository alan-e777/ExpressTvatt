import { redirect } from 'next/navigation';

/** Retired checkout path — superseded by `/order → /kassa`. See `app/tjanster/page.tsx`. */
export default function CheckoutPage() {
  redirect('/order');
}
