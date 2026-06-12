/**
 * Seed Firestore with the eriksbergstvätten catalogue, mirrored into the five
 * categories they use: Hushållstvätt, Hushållstvätt RUT, Hem, Tvätt.
 * (Mattvätt is intentionally NOT seeded — their Mattvätt price is shown per m²
 *  as a placeholder, so the site keeps its own fixed mattvätt sizes, defined in
 *  app/order/page.tsx.)
 *
 * Every price is their list price minus 5%, rounded to the nearest whole krona.
 * Base (their) prices live in BASE below; the discount is computed here.
 *
 * Usage:
 *   npx tsx scripts/seed-eriksberg-catalog.ts            # DRY RUN — prints the
 *                                                          computed catalogue,
 *                                                          writes nothing.
 *   npx tsx scripts/seed-eriksberg-catalog.ts --commit   # CLEARS the existing
 *                                                          StrukenTvatt catalogue
 *                                                          and writes this one.
 *
 * --commit replaces the catalogue so it mirrors theirs exactly. Review the dry
 * run first.
 */

import { db } from '../lib/firebase-admin';

const DISCOUNT = 0.05; // 5% below their list price
const discounted = (base: number) => Math.round(base * (1 - DISCOUNT));

// Their list prices (SEK). Weight-based items (Hushållstvätt / Hushållstvätt RUT)
// and "från" items (Brudklänning) use the listed base price.
const BASE: Record<string, { name: string; price: number }[]> = {
  'Hushållstvätt': [
    { name: 'Hushållstvätt (från 10 kg)', price: 680 },
    { name: 'Byxa',          price: 90 },
    { name: 'Rock',          price: 180 },
    { name: 'Tröja/Jumper',  price: 90 },
  ],
  'Hushållstvätt RUT': [
    { name: 'Hushållstvätt RUT (från 10 kg)', price: 510 },
    { name: 'Sofföverdrag',    price: 60 },
    { name: 'Dunjacka',        price: 255 },
    { name: 'Kudde',           price: 75 },
    { name: 'Duntäcke',        price: 255 },
    { name: 'Filt',            price: 135 },
    { name: 'Frackskjorta',    price: 57 },
    { name: 'Frackväst',       price: 45 },
    { name: 'Gardin',          price: 141 },
    { name: 'Jacka',           price: 180 },
    { name: 'Kappa',           price: 180 },
    { name: 'Kuddfodral',      price: 30 },
    { name: 'Madrasskydd',     price: 255 },
    { name: 'Overall',         price: 270 },
    { name: 'Överkast',        price: 255 },
    { name: 'Sängkappa',       price: 255 },
    { name: 'Skjorta',         price: 24 },
    { name: 'Skjorta i paket', price: 33 },
    { name: 'Smokingskjorta',  price: 57 },
    { name: 'T-shirt/Piké',    price: 39 },
    { name: 'Täcke',           price: 180 },
    { name: 'Väst-Dun',        price: 150 },
  ],
  'Hem': [
    { name: 'Koskinn',              price: 500 },
    { name: 'Tyngd täcke',          price: 500 },
    { name: 'Bäddmadrass (Dubbel)', price: 900 },
    { name: 'Kudde',                price: 100 },
    { name: 'Duntäcke',             price: 340 },
    { name: 'Bäddmadrass (Enkel)',  price: 700 },
    { name: 'Extra service',        price: 350 },
    { name: 'Fårskinn',             price: 200 },
    { name: 'Filt',                 price: 180 },
    { name: 'Gardin',               price: 188 },
    { name: 'Kuddfodral',           price: 40 },
    { name: 'Madrasskydd',          price: 340 },
    { name: 'Överkast',             price: 340 },
    { name: 'Sängkappa',            price: 340 },
    { name: 'Soffdyna',             price: 250 },
    { name: 'Sofföverdrag',         price: 80 },
    { name: 'Täcke',                price: 240 },
  ],
  'Tvätt': [
    { name: 'Båtkapell liten',               price: 1000 },
    { name: 'Båtkapell stor',                price: 1500 },
    { name: 'Kjol',                          price: 120 },
    { name: 'Sovsäck',                       price: 400 },
    { name: 'Special dräkt',                 price: 980 },
    { name: 'Aftonklänning',                 price: 450 },
    { name: 'Blus',                          price: 120 },
    { name: 'Brudklänning (från)',           price: 1000 },
    { name: 'Byxa',                          price: 120 },
    { name: 'Byxa -Mocka/Skinn',             price: 250 },
    { name: 'Byxdress',                      price: 200 },
    { name: 'Dunjacka',                      price: 340 },
    { name: 'Frack',                         price: 250 },
    { name: 'Frackskjorta',                  price: 76 },
    { name: 'Frackväst',                     price: 60 },
    { name: 'Halsduk',                       price: 70 },
    { name: 'Jacka',                         price: 240 },
    { name: 'Jacka -Mocka/Skinn/Päls',       price: 450 },
    { name: 'Kappa',                         price: 240 },
    { name: 'Kappa/Rock -Mocka/Skinn/Päls',  price: 590 },
    { name: 'Kavaj',                         price: 120 },
    { name: 'Kjol -Mocka/Skinn',             price: 250 },
    { name: 'Klänning',                      price: 300 },
    { name: 'Kostym',                        price: 240 },
    { name: 'Mössa/hatt',                    price: 70 },
    { name: 'Overall',                       price: 360 },
    { name: 'Rock',                          price: 240 },
    { name: 'Scarf',                         price: 50 },
    { name: 'Skjorta',                       price: 32 },
    { name: 'Skjorta -Mocka/Skinn',          price: 250 },
    { name: 'Skjorta i paket',               price: 44 },
    { name: 'Slips/Fluga',                   price: 50 },
    { name: 'Smoking',                       price: 240 },
    { name: 'Smokingskjorta',                price: 76 },
    { name: 'T-shirt/Piké',                  price: 52 },
    { name: 'Tröja/Jumper',                  price: 120 },
    { name: 'Väst',                          price: 70 },
    { name: 'Väst -Dun',                     price: 200 },
    { name: 'Väst -Mocka/Skinn/Päls',        price: 250 },
  ],
};

// Order in which the categories appear, and which the editor/order page expect.
const CATEGORY_ORDER = ['Hushållstvätt', 'Hushållstvätt RUT', 'Hem', 'Tvätt'];

type Product = { id: string; name: string; price: number; category: string; order: number };

function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9åäö]+/gi, '-')
    .replace(/(^-|-$)/g, '');
}

function buildCatalogue(): Product[] {
  const out: Product[] = [];
  for (const category of CATEGORY_ORDER) {
    const items = BASE[category] ?? [];
    items.forEach((item, i) => {
      out.push({
        id:       `${slug(category)}-${slug(item.name)}`,
        name:     item.name,
        price:    discounted(item.price),
        category,
        order:    i + 1,
      });
    });
  }
  return out;
}

async function main() {
  const commit = process.argv.includes('--commit');
  const catalogue = buildCatalogue();
  const col = db.collection('services').doc('struken-tvatt').collection('StrukenTvatt');

  console.log(`\n📋 Eriksbergstvätten catalogue — list price −${DISCOUNT * 100}%, rounded\n`);
  for (const category of CATEGORY_ORDER) {
    const rows = catalogue.filter(p => p.category === category);
    console.log(`── ${category} (${rows.length}) ──────────────────────────────`);
    for (const p of rows) {
      const base = (BASE[category].find(b => b.name === p.name)?.price) ?? 0;
      console.log(`  ${p.name.padEnd(34)} ${String(base).padStart(5)} kr → ${String(p.price).padStart(5)} kr`);
    }
    console.log('');
  }
  console.log(`Total: ${catalogue.length} items across ${CATEGORY_ORDER.length} categories.`);
  console.log('Mattvätt is left untouched (kept as the site\'s own fixed sizes).\n');

  if (!commit) {
    console.log('🟡 DRY RUN — nothing written. Re-run with --commit to apply.\n');
    process.exit(0);
  }

  // Clear the existing catalogue so the result mirrors theirs exactly.
  const existing = await col.get();
  console.log(`🧹 Clearing ${existing.size} existing product(s)…`);
  for (let i = 0; i < existing.docs.length; i += 400) {
    const batch = db.batch();
    existing.docs.slice(i, i + 400).forEach(d => batch.delete(d.ref));
    await batch.commit();
  }

  console.log(`🌱 Writing ${catalogue.length} product(s)…`);
  for (let i = 0; i < catalogue.length; i += 400) {
    const batch = db.batch();
    catalogue.slice(i, i + 400).forEach(p => batch.set(col.doc(p.id), p));
    await batch.commit();
  }

  console.log(`\n✅ Done. Catalogue now holds ${catalogue.length} items.\n`);
  process.exit(0);
}

main().catch(err => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
