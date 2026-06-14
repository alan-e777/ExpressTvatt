// Shared product-icon registry, used by the admin product editor (to pick an
// icon per product) and the customer order page (to render it).
//
// ── Adding a new icon ─────────────────────────────────────────────────────────
// 1. Import it from @tabler/icons-react below.
// 2. Add one entry to PRODUCT_ICONS: { key, label, Icon }.
// `key` is what gets stored in Firestore — keep it stable once products use it.
import {
  IconShirt, IconShirtSport, IconJacket, IconHanger, IconNeedle, IconNeedleThread,
  IconScissors, IconStar, IconSpray, IconWash, IconWashDryclean, IconSparkles,
  IconSteam, IconBed, IconSofa, IconWindow, IconDroplet, IconShoe, IconBath, IconHome,
} from '@tabler/icons-react';

export type ProductIconDef = {
  key:   string;
  label: string;
  Icon:  React.ComponentType<{ size: number; stroke: number }>;
};

export const PRODUCT_ICONS: ProductIconDef[] = [
  { key: 'shirt',         label: 'Plagg',        Icon: IconShirt },
  { key: 'shirt-sport',   label: 'Sportplagg',   Icon: IconShirtSport },
  { key: 'jacket',        label: 'Jacka',        Icon: IconJacket },
  { key: 'hanger',        label: 'Hängare',      Icon: IconHanger },
  { key: 'needle',        label: 'Slips',        Icon: IconNeedle },
  { key: 'needle-thread', label: 'Sömnad',       Icon: IconNeedleThread },
  { key: 'scissors',      label: 'Byxor',        Icon: IconScissors },
  { key: 'star',          label: 'Special',      Icon: IconStar },
  { key: 'spray',         label: 'Mattvätt',     Icon: IconSpray },
  { key: 'wash',          label: 'Tvätt',        Icon: IconWash },
  { key: 'dryclean',      label: 'Kemtvätt',     Icon: IconWashDryclean },
  { key: 'sparkles',      label: 'Hemtextil',    Icon: IconSparkles },
  { key: 'steam',         label: 'Strykning',    Icon: IconSteam },
  { key: 'bed',           label: 'Sängkläder',   Icon: IconBed },
  { key: 'sofa',          label: 'Möbeltextil',  Icon: IconSofa },
  { key: 'window',        label: 'Gardin',       Icon: IconWindow },
  { key: 'droplet',       label: 'Vått',         Icon: IconDroplet },
  { key: 'shoe',          label: 'Skor',         Icon: IconShoe },
  { key: 'bath',          label: 'Badtextil',    Icon: IconBath },
  { key: 'home',          label: 'Hem',          Icon: IconHome },
];

const ICON_BY_KEY = Object.fromEntries(PRODUCT_ICONS.map(i => [i.key, i.Icon]));

// Heuristic fallback for products that don't have an icon key stored yet —
// mirrors the original name-based mapping on the order page.
function iconKeyFromName(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('slips') || n.includes('halsduk') || n.includes('scarf') || n.includes('fluga')) return 'needle';
  if (n.includes('byxa') || n.includes('byxor') || n.includes('byxdress'))                         return 'scissors';
  if (n.includes('gardin') || n.includes('hängare'))                                               return 'hanger';
  if (n.includes('klänning') || n.includes('kjol') || n.includes('brud'))                          return 'star';
  if (n.includes('matta') || n.includes('koskinn') || n.includes('fårskinn'))                      return 'spray';
  return 'shirt';
}

// Resolve a product's icon component: stored key first, then name heuristic.
export function getProductIcon(iconKey?: string, name = ''): React.ComponentType<{ size: number; stroke: number }> {
  if (iconKey && ICON_BY_KEY[iconKey]) return ICON_BY_KEY[iconKey];
  return ICON_BY_KEY[iconKeyFromName(name)] ?? IconShirt;
}
