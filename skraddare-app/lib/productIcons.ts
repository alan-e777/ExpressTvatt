// Product-icon registry for the app — mirrors the website `lib/productIcons.tsx`.
// Products store an `icon` key in Firestore (set in the admin product editor);
// this resolves that key to a @tabler/icons-react-native component, with the same
// name-based fallback the website uses for products that have no key yet.
import {
  IconShirt, IconShirtSport, IconJacket, IconHanger, IconNeedle, IconNeedleThread,
  IconScissors, IconStar, IconSpray, IconWash, IconWashDryclean, IconSparkles,
  IconSteam, IconBed, IconSofa, IconWindow, IconDroplet, IconShoe, IconBath, IconHome,
  IconPillow, IconTie, IconTent,
} from '@tabler/icons-react-native';

export type IconComp = React.ComponentType<{ size: number; color: string; strokeWidth: number }>;

const ICON_BY_KEY: Record<string, IconComp> = {
  'shirt':         IconShirt,
  'shirt-sport':   IconShirtSport,
  'jacket':        IconJacket,
  'hanger':        IconHanger,
  'needle':        IconNeedle,
  'needle-thread': IconNeedleThread,
  'scissors':      IconScissors,
  'star':          IconStar,
  'spray':         IconSpray,
  'wash':          IconWash,
  'dryclean':      IconWashDryclean,
  'sparkles':      IconSparkles,
  'steam':         IconSteam,
  'bed':           IconBed,
  'sofa':          IconSofa,
  'window':        IconWindow,
  'droplet':       IconDroplet,
  'shoe':          IconShoe,
  'bath':          IconBath,
  'home':          IconHome,
  'pillow':        IconPillow,
  'tie':           IconTie,
  'tent':          IconTent,
};

// Name heuristic — mirrors the website fallback.
function iconKeyFromName(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('slips') || n.includes('halsduk') || n.includes('scarf') || n.includes('fluga')) return 'needle';
  if (n.includes('byxa') || n.includes('byxor') || n.includes('byxdress'))                         return 'scissors';
  if (n.includes('gardin') || n.includes('hängare'))                                               return 'hanger';
  if (n.includes('klänning') || n.includes('kjol') || n.includes('brud'))                          return 'star';
  if (n.includes('matta') || n.includes('koskinn') || n.includes('fårskinn'))                      return 'spray';
  return 'shirt';
}

export function getProductIcon(iconKey?: string, name = ''): IconComp {
  if (iconKey && ICON_BY_KEY[iconKey]) return ICON_BY_KEY[iconKey];
  return ICON_BY_KEY[iconKeyFromName(name)] ?? IconShirt;
}
