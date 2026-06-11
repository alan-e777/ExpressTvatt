/**
 * Seed Firestore with Struken Tvätt products.
 * Run with: npx tsx scripts/seed-struken-tvatt.ts
 *
 * Safe to re-run — overwrites existing docs by ID.
 */

import { db } from '../lib/firebase-admin';

interface Product {
  id:       string;
  name:     string;
  price:    number; // SEK
  category: string;
  order:    number; // display order within category
}

const PRODUCTS: Product[] = [
  // ── Herr ────────────────────────────────────────────────────────────────────
  { id: 'h-skjorta',     category: 'Herr',      order: 1, name: 'Skjorta',         price: 79  },
  { id: 'h-kavaj',       category: 'Herr',      order: 2, name: 'Kavaj',            price: 149 },
  { id: 'h-kostymbyxor', category: 'Herr',      order: 3, name: 'Kostymbyxor',      price: 89  },
  { id: 'h-tshirt',      category: 'Herr',      order: 4, name: 'T-shirt',          price: 49  },
  { id: 'h-polo',        category: 'Herr',      order: 5, name: 'Polo',             price: 59  },
  { id: 'h-jeans',       category: 'Herr',      order: 6, name: 'Jeans / chinos',   price: 69  },
  { id: 'h-slips',       category: 'Herr',      order: 7, name: 'Slips',            price: 39  },

  // ── Dam ─────────────────────────────────────────────────────────────────────
  { id: 'd-blus',     category: 'Dam',       order: 1, name: 'Blus',           price: 79  },
  { id: 'd-klanning', category: 'Dam',       order: 2, name: 'Klänning',       price: 109 },
  { id: 'd-kjol',     category: 'Dam',       order: 3, name: 'Kjol',           price: 69  },
  { id: 'd-byxor',    category: 'Dam',       order: 4, name: 'Byxor',          price: 89  },
  { id: 'd-kavaj',    category: 'Dam',       order: 5, name: 'Kavaj / jacka',  price: 149 },
  { id: 'd-tshirt',   category: 'Dam',       order: 6, name: 'T-shirt / topp', price: 49  },

  // ── Fest ────────────────────────────────────────────────────────────────────
  { id: 'f-smoking', category: 'Fest',      order: 1, name: 'Smokingskjorta',   price: 99  },
  { id: 'f-balkl',   category: 'Fest',      order: 2, name: 'Balklänning',      price: 199 },
  { id: 'f-festkl',  category: 'Fest',      order: 3, name: 'Festklänning',     price: 149 },
  { id: 'f-kostym',  category: 'Fest',      order: 4, name: 'Kostym (komplett)',price: 299 },
  { id: 'f-fluga',   category: 'Fest',      order: 5, name: 'Fluga / slips',    price: 49  },

  // ── Hem ─────────────────────────────────────────────────────────────────────
  { id: 'hem-lakan-d', category: 'Hem',     order: 1, name: 'Lakan (dubbel)',  price: 149 },
  { id: 'hem-lakan-e', category: 'Hem',     order: 2, name: 'Lakan (enkel)',   price: 99  },
  { id: 'hem-orngott', category: 'Hem',     order: 3, name: 'Örngott',         price: 39  },
  { id: 'hem-bordduk', category: 'Hem',     order: 4, name: 'Bordduk',         price: 89  },
  { id: 'hem-servett', category: 'Hem',     order: 5, name: 'Servett (4-pack)', price: 79  },

  // ── Utomhus ─────────────────────────────────────────────────────────────────
  { id: 'u-flanell', category: 'Utomhus',   order: 1, name: 'Flanellskjorta', price: 79  },
  { id: 'u-jacka',   category: 'Utomhus',   order: 2, name: 'Jacka',          price: 149 },
  { id: 'u-byxor',   category: 'Utomhus',   order: 3, name: 'Outdoorbyxor',   price: 99  },
  { id: 'u-shorts',  category: 'Utomhus',   order: 4, name: 'Shorts',         price: 59  },

  // ── Skrädderi ───────────────────────────────────────────────────────────────
  { id: 'sk-kostym',  category: 'Skrädderi', order: 1, name: 'Kostym (skräddarsytt)', price: 349 },
  { id: 'sk-brud',    category: 'Skrädderi', order: 2, name: 'Brudklänning',          price: 499 },
  { id: 'sk-uniform', category: 'Skrädderi', order: 3, name: 'Uniform / arbetsplagg', price: 249 },
  { id: 'sk-special', category: 'Skrädderi', order: 4, name: 'Specialplagg',          price: 299 },
];

async function seed() {
  console.log(`🌱 Seeding ${PRODUCTS.length} products into StrukenTvatt…`);

  const col = db.collection('services').doc('struken-tvatt').collection('StrukenTvatt');
  let count = 0;

  for (const product of PRODUCTS) {
    await col.doc(product.id).set(product);
    console.log(`  ✓ [${product.category}] ${product.name} — ${product.price} kr`);
    count++;
  }

  console.log(`\n✅ Done! ${count} products written.`);
  process.exit(0);
}

seed().catch(err => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
