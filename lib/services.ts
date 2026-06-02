export type Service = {
  id: string;
  name: string;
  description: string;
  price_ore: number; // Stripe uses smallest currency unit (öre)
};

export const SERVICES: Service[] = [
  {
    id: 'torrrengoring-plagg',
    name: 'Torkrengöring av plagg',
    description: 'Professionell torkrengöring för känsliga tyger.',
    price_ore: 40000,
  },
  {
    id: 'tattrengoring-matta',
    name: 'Tättrengöring av matta',
    description: 'Grundlig rengöring av mattor och lösa textilier.',
    price_ore: 50000,
  },
  {
    id: 'flackborttagning',
    name: 'Fläckborttagning',
    description: 'Avlägsnande av fläckar och missfärgning.',
    price_ore: 30000,
  },
  {
    id: 'pressning-skjorta',
    name: 'Pressning och strykad',
    description: 'Professionell pressning och strykad av kläder.',
    price_ore: 20000,
  },
  {
    id: 'polstring-rengoring',
    name: 'Rengöring av möbelpolstring',
    description: 'Djuprengöring av soffor, stolar och möbler.',
    price_ore: 65000,
  },
  {
    id: 'gardiner-rengoring',
    name: 'Rengöring av gardiner',
    description: 'Fagot och rengöring av gardiner och persienner.',
    price_ore: 35000,
  },
  {
    id: 'vatten-skada-behandling',
    name: 'Vattenskadoreparation',
    description: 'Behandling och restaurering efter vattenskada.',
    price_ore: 55000,
  },
  {
    id: 'doftforbatring',
    name: 'Doftförbättring',
    description: 'Avlägsnande av obehagliga lukter från tyger.',
    price_ore: 25000,
  },
  {
    id: 'rotskydd-behandling',
    name: 'Mottskydd & impregnering',
    description: 'Behandling mot mott och impregnering av tyger.',
    price_ore: 38000,
  },
];

export function getService(id: string): Service | undefined {
  return SERVICES.find((s) => s.id === id);
}

export function formatPrice(ore: number): string {
  return `${ore / 100} kr`;
}
