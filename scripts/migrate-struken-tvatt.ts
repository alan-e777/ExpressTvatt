/**
 * Migrates top-level "StrukenTvatt" collection into
 * services/struken-tvatt/StrukenTvatt subcollection.
 *
 * Run: npx tsx scripts/migrate-struken-tvatt.ts
 * Safe to re-run — uses set() with the same document IDs.
 */

import { db } from '../lib/firebase-admin';

async function migrate() {
  const oldRef = db.collection('StrukenTvatt');
  const newRef = db.collection('services').doc('struken-tvatt').collection('StrukenTvatt');

  const snap = await oldRef.get();
  if (snap.empty) {
    console.log('StrukenTvatt collection is empty — nothing to migrate.');
    return;
  }

  const batch = db.batch();
  for (const doc of snap.docs) {
    batch.set(newRef.doc(doc.id), doc.data());
  }
  await batch.commit();

  console.log(`✓ Migrated ${snap.size} documents → services/struken-tvatt/StrukenTvatt`);
}

migrate().catch(err => { console.error(err); process.exit(1); });
