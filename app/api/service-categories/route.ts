import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import type { CategoryMeta } from '@/lib/serviceCategories';

/**
 * Presentation metadata (icon, description, sort order) for the order page's
 * category rows. Which categories exist comes from the product catalogue —
 * `/api/struken-tvatt` — so a category missing here still renders, on the
 * defaults in `lib/serviceCategories.ts`.
 *
 * Deliberately uncached: the admin expects an edit here to show on the site on
 * the next reload, not five minutes later.
 */
export async function GET() {
  try {
    const snap = await db.collection('service_categories').get();
    const metas: CategoryMeta[] = snap.docs.map(d => {
      const data = d.data();
      return {
        name:     data.name ?? '',
        icon:     data.icon ?? '',
        desc:     data.desc ?? '',
        subtitle: data.subtitle ?? '',
        order:    typeof data.order === 'number' ? data.order : 0,
        hidden:   data.hidden === true,
        requiresInput:    !!data.requiresInput,
        inputLabel:       data.inputLabel ?? '',
        inputPlaceholder: data.inputPlaceholder ?? '',
      };
    });
    return NextResponse.json(metas.filter(m => m.name));
  } catch (err) {
    console.error('[GET /api/service-categories]', err);
    return NextResponse.json({ error: 'Could not fetch categories.' }, { status: 500 });
  }
}
