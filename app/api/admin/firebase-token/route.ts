import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { auth as adminAuth } from '@/lib/firebase-admin';

export async function GET() {
  const cookieStore = await cookies();
  if (!cookieStore.get('admin-session')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const adminUid = process.env.ADMIN_UID;
  if (!adminUid) {
    return NextResponse.json({ error: 'ADMIN_UID not configured' }, { status: 500 });
  }

  const token = await adminAuth.createCustomToken(adminUid);
  return NextResponse.json({ token });
}
