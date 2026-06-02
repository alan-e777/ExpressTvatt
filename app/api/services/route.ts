import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';

export async function GET() {
  try {
    const snapshot = await db.collection('services').get();
    const services = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    const response = NextResponse.json(services);
    // Cache for 5 minutes (300s) — services rarely change during a session
    response.headers.set('Cache-Control', 'public, max-age=300, s-maxage=300');
    return response;
  } catch (error) {
    console.error('Error fetching services:', error);
    return NextResponse.json({ error: 'Could not fetch services' }, { status: 500 });
  }
}

// POST: Create/update service (admin only — checked by custom claims)
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.split('Bearer ')[1];
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decodedToken = await require('@/lib/firebase-admin').auth.verifyIdToken(token);
    if (!decodedToken.admin) {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }

    const body = await request.json();
    const { id, name, description, price_ore, icon } = body;

    if (!id || !name || !price_ore) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    await db.collection('services').doc(id).set(
      {
        id,
        name,
        description,
        price_ore,
        icon,
        createdAt: new Date(),
      },
      { merge: true }
    );

    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error('Error creating service:', error);
    return NextResponse.json({ error: 'Could not create service' }, { status: 500 });
  }
}
