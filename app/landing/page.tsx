import { redirect } from 'next/navigation';

// The landing page now lives at the site root. Keep /landing working for
// any existing links by redirecting to /.
export default function LandingRedirect() {
  redirect('/');
}
