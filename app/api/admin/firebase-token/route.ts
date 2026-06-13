import { NextResponse } from 'next/server';
import { auth as adminAuth } from '@/lib/firebase-admin';
import { isAdmin } from '@/lib/admin-auth';

export async function GET() {
  // Verify the session cookie cryptographically (not just its presence) before
  // minting a custom token for the admin UID — otherwise any request carrying a
  // dummy `admin-session` cookie could sign in as admin and gain full Firestore access.
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const adminUid = process.env.ADMIN_UID;
  if (!adminUid) {
    return NextResponse.json({ error: 'ADMIN_UID not configured' }, { status: 500 });
  }

  const token = await adminAuth.createCustomToken(adminUid);
  return NextResponse.json({ token });
}
