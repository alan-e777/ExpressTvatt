import { NextResponse } from 'next/server';
import { auth as adminAuth } from '@/lib/firebase-admin';
import { getAdminSession } from '@/lib/admin-auth';

/**
 * Mints a Firebase custom token so an admin's browser can talk to Firestore and
 * the Realtime Database directly (the live orders listener and the chat).
 *
 * The token is minted for the **signed-in admin's own uid**, carrying an
 * `admin: true` custom claim that the security rules check.
 *
 * It previously always minted a token for ADMIN_UID regardless of who was
 * signed in, which had two consequences: live Firestore listeners were denied
 * for every other admin (the rules only knew that one uid), and any admin who
 * opened the chat page had their browser re-authenticated as the owner — giving
 * them full client-side read/write over Firestore, including the ability to
 * edit `admins/{uid}` and grant themselves a role the server would refuse.
 */
export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // The claim mirrors the session that was already verified server-side; the
  // role travels with it so rules can be tightened per-role later without
  // another round of token changes.
  const token = await adminAuth.createCustomToken(session.uid, {
    admin: true,
    adminRole: session.role,
  });

  return NextResponse.json({ token });
}
