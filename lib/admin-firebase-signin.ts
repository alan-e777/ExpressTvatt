import { signInWithCustomToken, type User } from 'firebase/auth';
import { auth } from '@/lib/firebase-client';

/**
 * Ensures the browser holds a Firebase session carrying the `admin` claim.
 *
 * The admin login page signs in with email/password, which produces a perfectly
 * valid session that has no `admin` claim — and the security rules key off that
 * claim. So being "signed in" is not enough; the claim has to be present, or
 * every direct Firestore/RTDB read (live orders, chat) is denied.
 *
 * Safe to call repeatedly: it only swaps the session when the claim is missing.
 */
export async function ensureAdminFirebaseAuth(user: User | null): Promise<void> {
  if (user) {
    try {
      const { claims } = await user.getIdTokenResult();
      if (claims.admin === true) return;
    } catch {
      /* fall through and re-authenticate */
    }
  }

  const res = await fetch('/api/admin/firebase-token');
  if (!res.ok) throw new Error(`Token request failed: ${res.status}`);
  const { token } = await res.json();
  if (!token) throw new Error('No token returned');
  await signInWithCustomToken(auth, token);
}
