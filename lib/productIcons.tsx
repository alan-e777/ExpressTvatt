// Shared product-icon registry, used by the admin product editor (to pick an
// icon per product) and the customer order page (to render it).
//
// ── Adding a new icon ─────────────────────────────────────────────────────────
// 1. Import it from @tabler/icons-react, or — if Tabler has nothing for it, which
//    is common for garments — draw it in lib/customIcons.tsx and import it there.
// 2. Add one entry to PRODUCT_ICONS: { key, label, Icon }.
// `key` is what gets stored in Firestore — keep it stable once products use it.
import {
  IconShirt, IconShirtSport, IconJacket, IconHanger, IconNeedle, IconNeedleThread,
  IconScissors, IconStar, IconSpray, IconWash, IconWashDryclean, IconSparkles,
  IconSteam, IconBed, IconSofa, IconWindow, IconDroplet, IconShoe, IconBath, IconHome,
  IconPillow, IconTie, IconTent,
  // Additional tailor / laundry / garment icons (all @tabler outline style).
  IconHanger2, IconClothesRack, IconSock, IconMoodKid, IconRuler, IconRulerMeasure,
  IconWashMachine, IconWashTumbleDry, IconWashHand, IconWashGentle, IconWashEco,
  IconIroning, IconIroningSteam, IconBasket, IconCrown, IconDiamond, IconShoppingBag,
  IconBriefcase, IconBackpack, IconWind,
  // Laundry-care symbols Tabler does have and the catalogue can use.
  IconWashPress, IconWashDryHang, IconWashDryFlat,
} from '@tabler/icons-react';
// Garments and tailoring tools Tabler has no icon for — drawn in its own style
// rather than mixing a second library into the same picker. See lib/customIcons.
import {
  IconRug, IconTrousers, IconSkirt, IconDress, IconCoat, IconHat, IconFabric,
  IconButton, IconZipper, IconThreadSpool, IconTowel, IconDuvet,
} from '@/lib/customIcons';

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
  { key: 'scissors',      label: 'Sax & lagning', Icon: IconScissors },
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
  { key: 'pillow',        label: 'Sänglinne',    Icon: IconPillow },
  { key: 'tie',          label: 'Kostym',        Icon: IconTie },
  { key: 'tent',         label: 'Uteplagg',      Icon: IconTent },
  { key: 'hanger2',       label: 'Galge',         Icon: IconHanger2 },
  { key: 'clothes-rack',  label: 'Klädställ',     Icon: IconClothesRack },
  { key: 'sock',          label: 'Strumpor',      Icon: IconSock },
  { key: 'mood-kid',      label: 'Barnkläder',    Icon: IconMoodKid },
  { key: 'ruler',         label: 'Mått',          Icon: IconRuler },
  { key: 'ruler-measure', label: 'Uppmätning',    Icon: IconRulerMeasure },
  { key: 'wash-machine',  label: 'Tvättmaskin',   Icon: IconWashMachine },
  { key: 'tumble-dry',    label: 'Torktumling',   Icon: IconWashTumbleDry },
  { key: 'wash-hand',     label: 'Handtvätt',     Icon: IconWashHand },
  { key: 'wash-gentle',   label: 'Skontvätt',     Icon: IconWashGentle },
  { key: 'wash-eco',      label: 'Miljötvätt',    Icon: IconWashEco },
  { key: 'ironing',       label: 'Strykjärn',     Icon: IconIroning },
  { key: 'ironing-steam', label: 'Ångstrykning',  Icon: IconIroningSteam },
  { key: 'basket',        label: 'Tvättkorg',     Icon: IconBasket },
  { key: 'crown',         label: 'Lyx',           Icon: IconCrown },
  { key: 'diamond',       label: 'Premium',       Icon: IconDiamond },
  { key: 'shopping-bag',  label: 'Kasse',         Icon: IconShoppingBag },
  { key: 'briefcase',     label: 'Portfölj',      Icon: IconBriefcase },
  { key: 'backpack',      label: 'Ryggsäck',      Icon: IconBackpack },
  { key: 'wind',          label: 'Lufttork',      Icon: IconWind },
  { key: 'wash-press',    label: 'Pressning',     Icon: IconWashPress },
  { key: 'dry-hang',      label: 'Hängtorkning',  Icon: IconWashDryHang },
  { key: 'dry-flat',      label: 'Plantorkning',  Icon: IconWashDryFlat },

  // ── Garments & tailoring (custom, see lib/customIcons.tsx) ────────────────
  { key: 'matta',         label: 'Matta',         Icon: IconRug },
  { key: 'byxor',         label: 'Byxor',         Icon: IconTrousers },
  { key: 'kjol',          label: 'Kjol',          Icon: IconSkirt },
  { key: 'klanning',      label: 'Klänning',      Icon: IconDress },
  { key: 'kappa',         label: 'Kappa & rock',  Icon: IconCoat },
  { key: 'mossa',         label: 'Mössa & hatt',  Icon: IconHat },
  { key: 'tyg',           label: 'Tyg & sjal',    Icon: IconFabric },
  { key: 'knapp',         label: 'Knapp',         Icon: IconButton },
  { key: 'blixtlas',      label: 'Blixtlås',      Icon: IconZipper },
  { key: 'tradrulle',     label: 'Trådrulle',     Icon: IconThreadSpool },
  { key: 'handduk',       label: 'Handduk',       Icon: IconTowel },
  { key: 'tacke',         label: 'Täcke',         Icon: IconDuvet },
];

const ICON_BY_KEY = Object.fromEntries(PRODUCT_ICONS.map(i => [i.key, i.Icon]));

// Heuristic fallback for products that don't have an icon key stored yet —
// mirrors the original name-based mapping on the order page.
function iconKeyFromName(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('slips') || n.includes('fluga'))                                                  return 'needle';
  if (n.includes('halsduk') || n.includes('scarf') || n.includes('sjal'))                           return 'tyg';
  if (n.includes('byxa') || n.includes('byxor') || n.includes('byxdress'))                          return 'byxor';
  if (n.includes('gardin') || n.includes('hängare'))                                                return 'hanger';
  if (n.includes('kjol'))                                                                           return 'kjol';
  if (n.includes('klänning') || n.includes('brud'))                                                 return 'klanning';
  if (n.includes('kappa') || n.includes('rock'))                                                    return 'kappa';
  if (n.includes('mössa') || n.includes('hatt'))                                                    return 'mossa';
  if (n.includes('matta') || n.includes('koskinn') || n.includes('fårskinn'))                       return 'matta';
  if (n.includes('täcke') || n.includes('duntäcke'))                                                return 'tacke';
  if (n.includes('handduk'))                                                                        return 'handduk';
  if (n.includes('blixtlås'))                                                                       return 'blixtlas';
  return 'shirt';
}

// Resolve a product's icon component: stored key first, then name heuristic.
export function getProductIcon(iconKey?: string, name = ''): React.ComponentType<{ size: number; stroke: number }> {
  if (iconKey && ICON_BY_KEY[iconKey]) return ICON_BY_KEY[iconKey];
  return ICON_BY_KEY[iconKeyFromName(name)] ?? IconShirt;
}
