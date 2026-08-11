import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/firebase-admin';
import { isFirstTimeCustomer } from '@/lib/first-time';

/**
 * Tells the checkout screen whether to display the first-time discount.
 *
 * Eligibility is decided here rather than on the client so the price shown is
 * derived from exactly the same function the payment route uses when charging.
 * Identity comes from a verified Firebase ID token, never from a caller-supplied
 * uid — otherwise anyone could ask about anyone.
 *
 * Answering "not eligible" is the safe failure mode: the customer sees full
 * price, and the payment route independently grants the discount if they really
 * are a first-timer, so nobody is ever charged more than they were shown.
 */
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const header = request.headers.get('authorization');
  if (!header?.startsWith('Bearer ')) {
    return NextResponse.json({ isFirstTime: false });
  }

  try {
    const { uid } = await auth.verifyIdToken(header.slice(7));
    return NextResponse.json({ isFirstTime: await isFirstTimeCustomer(uid) });
  } catch {
    return NextResponse.json({ isFirstTime: false });
  }
}
