/**
 * Seed Firestore with default services.
 * Run once with: npx ts-node scripts/seed-firestore.ts
 */

import { db } from '../lib/firebase-admin';

const DEFAULT_SERVICES = [
  {
    id: 'torrrengoring-plagg',
    name: 'Torkrengöring av plagg',
    description: 'Professionell torkrengöring för känsliga tyger.',
    price_ore: 40000,
    icon: '👔',
  },
  {
    id: 'tattrengoring-matta',
    name: 'Tättrengöring av matta',
    description: 'Grundlig rengöring av mattor och lösa textilier.',
    price_ore: 50000,
    icon: '🧺',
    customFields: [
      {
        name: 'square_meters',
        label: 'Kvadratmeter',
        type: 'number',
        placeholder: 'T.ex. 15',
        required: true,
      },
    ],
  },
  {
    id: 'flackborttagning',
    name: 'Fläckborttagning',
    description: 'Avlägsnande av fläckar och missfärgning.',
    price_ore: 30000,
    icon: '✨',
    customFields: [
      {
        name: 'stain_type',
        label: 'Typ av fläck',
        type: 'select',
        options: ['Vin/frukt', 'Kaffe/te', 'Fett/olja', 'Annat'],
        required: true,
      },
    ],
  },
  {
    id: 'pressning-skjorta',
    name: 'Pressning och strykad',
    description: 'Professionell pressning och strykad av kläder.',
    price_ore: 20000,
    icon: '👕',
  },
  {
    id: 'polstring-rengoring',
    name: 'Rengöring av möbelpolstring',
    description: 'Djuprengöring av soffor, stolar och möbler.',
    price_ore: 65000,
    icon: '🛋️',
    customFields: [
      {
        name: 'square_meters',
        label: 'Kvadratmeter',
        type: 'number',
        placeholder: 'T.ex. 8',
        required: true,
      },
      {
        name: 'condition',
        label: 'Skick',
        type: 'select',
        options: ['Bra', 'Medel', 'Dåligt'],
        required: false,
      },
    ],
  },
  {
    id: 'gardiner-rengoring',
    name: 'Rengöring av gardiner',
    description: 'Fagot och rengöring av gardiner och persienner.',
    price_ore: 35000,
    icon: '🪟',
  },
  {
    id: 'vatten-skada-behandling',
    name: 'Vattenskadoreparation',
    description: 'Behandling och restaurering efter vattenskada.',
    price_ore: 55000,
    icon: '💧',
  },
  {
    id: 'doftforbatring',
    name: 'Doftförbättring',
    description: 'Avlägsnande av obehagliga lukter från tyger.',
    price_ore: 25000,
    icon: '🌸',
  },
  {
    id: 'rotskydd-behandling',
    name: 'Mottskydd & impregnering',
    description: 'Behandling mot mott och impregnering av tyger.',
    price_ore: 38000,
    icon: '🛡️',
  },
];

async function seed() {
  console.log('🗑️  Clearing existing services...');
  const existing = await db.collection('services').get();
  for (const doc of existing.docs) {
    await doc.ref.delete();
    console.log(`  Deleted: ${doc.id}`);
  }

  console.log('🌱 Seeding Firestore with new services...');
  for (const service of DEFAULT_SERVICES) {
    await db.collection('services').doc(service.id).set(service);
    console.log(`✓ Created: ${service.name}`);
  }

  console.log('✅ Done!');
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Error:', err);
  process.exit(1);
});
