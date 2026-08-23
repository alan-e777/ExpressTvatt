import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/firebase-admin';
import { isAdminUid } from '@/lib/admin-auth';

/**
 * Whether the caller may see and order 0 kr test items.
 *
 * Test items live in the ordinary catalogue, so the order page needs to know
 * whether to show them — a customer must never be offered a 0 kr tile they
 * would only be refused at checkout. This is presentation only; the binding
 * check is the identical one in `create-cart-payment`.
 */
export async function GET(request: NextRequest) {
  const header = request.headers.get('authorization');
  if (!header?.startsWith('Bearer ')) return NextResponse.json({ enabled: false });

  try {
    const { uid } = await auth.verifyIdToken(header.slice(7));
    return NextResponse.json({ enabled: await isAdminUid(uid) });
  } catch {
    return NextResponse.json({ enabled: false });
  }
}
