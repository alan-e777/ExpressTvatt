// Mattvätt pricing — area based (kr per m²), configured by the admin.
//
// The customer picks a rug type ("Normal" or "Äkta / orientalisk"), then drags a
// slider between the admin's min and max m². The price of one rug is
// `kr per m² × m²`, rounded to whole kronor.
//
// A cart line encodes both the type and the area in its id (`matta-normal-3.5`),
// so app/api/create-cart-payment can re-derive the price from the settings doc
// without trusting anything the client sent — the same rule as every other
// product in the basket.
//
// Settings live in Firestore at `settings/mattvatt`, served to the admin panel by
// /api/admin/mattvatt and to the customer pages by /api/mattvatt-settings.

export type MattaTypeId = 'matta-normal' | 'matta-akta';

export const MATTA_TYPES: { id: MattaTypeId; label: string; desc: string }[] = [
  { id: 'matta-normal', label: 'Normal',             desc: 'Syntet-, ull- & bomullsmattor' },
  { id: 'matta-akta',   label: 'Äkta / Orientalisk', desc: 'Handknutna mattor — skonsam specialtvätt' },
];

export interface MattvattSettings {
  /** Price per m² (kr), per rug type. */
  pricePerSqmKr: Record<MattaTypeId, number>;
  /** Smallest / largest rug the slider allows (m²). */
  minSqm: number;
  maxSqm: number;
}

export const MATTVATT_DEFAULTS: MattvattSettings = {
  pricePerSqmKr: { 'matta-normal': 150, 'matta-akta': 350 },
  minSqm: 1,
  maxSqm: 25,
};

/** Slider granularity (m²). Fixed in code — only min/max are admin-configurable. */
export const SQM_STEP = 0.5;

/** Whole, non-negative kronor. Guards against NaN, negatives and stray decimals. */
export function clampKrPerSqm(n: unknown, fallback = 0): number {
  const v = Math.round(Number(n));
  return Number.isFinite(v) && v >= 0 ? v : fallback;
}

/** Snap an area to the slider step and keep it strictly positive. */
export function clampSqm(n: unknown, fallback: number): number {
  const v = Number(n);
  if (!Number.isFinite(v) || v <= 0) return fallback;
  return Math.round(v / SQM_STEP) * SQM_STEP;
}

/** Fill in and sanity-check whatever the settings doc happens to hold. */
export function normalizeMattvattSettings(raw: Partial<MattvattSettings> | null | undefined): MattvattSettings {
  const minSqm = clampSqm(raw?.minSqm, MATTVATT_DEFAULTS.minSqm);
  // The max must stay above the min, otherwise the slider has no range to drag.
  const maxSqm = Math.max(minSqm + SQM_STEP, clampSqm(raw?.maxSqm, MATTVATT_DEFAULTS.maxSqm));
  return {
    pricePerSqmKr: {
      'matta-normal': clampKrPerSqm(raw?.pricePerSqmKr?.['matta-normal'], MATTVATT_DEFAULTS.pricePerSqmKr['matta-normal']),
      'matta-akta':   clampKrPerSqm(raw?.pricePerSqmKr?.['matta-akta'],   MATTVATT_DEFAULTS.pricePerSqmKr['matta-akta']),
    },
    minSqm,
    maxSqm,
  };
}

/** Keep a requested area inside the admin's allowed range. */
export function clampSqmToRange(sqm: unknown, settings: MattvattSettings): number {
  const v = clampSqm(sqm, settings.minSqm);
  return Math.min(settings.maxSqm, Math.max(settings.minSqm, v));
}

/** Price (kr) for one rug of `type` at `sqm` m². */
export function mattaPriceKr(settings: MattvattSettings, type: MattaTypeId, sqm: number): number {
  const perSqm = clampKrPerSqm(settings.pricePerSqmKr[type], 0);
  return Math.round(perSqm * clampSqmToRange(sqm, settings));
}

// ── Cart line encoding ───────────────────────────────────────────────────────
// One line per (type × area): `matta-normal-3.5`. Two rugs of the same type but
// different sizes are therefore separate lines, each with its own quantity.

/** Area as it appears inside a line id — always a dot, never a comma. */
function sqmKey(sqm: number): string {
  return String(Math.round(sqm * 10) / 10);
}

export function mattaLineId(type: MattaTypeId, sqm: number): string {
  return `${type}-${sqmKey(sqm)}`;
}

const LINE_ID_RE = /^(matta-normal|matta-akta)-(\d+(?:\.\d+)?)$/;

/** Decode a line id back into its type and area, or null if it isn't one. */
export function parseMattaLineId(id: string): { type: MattaTypeId; sqm: number } | null {
  const m = LINE_ID_RE.exec(id);
  if (!m) return null;
  const sqm = Number(m[2]);
  if (!Number.isFinite(sqm) || sqm <= 0) return null;
  return { type: m[1] as MattaTypeId, sqm };
}

/** Area for display — Swedish decimal comma, at most one decimal. */
export function formatSqm(sqm: number): string {
  return String(Math.round(sqm * 10) / 10).replace('.', ',');
}

export function mattaTypeLabel(type: MattaTypeId): string {
  return MATTA_TYPES.find(t => t.id === type)?.label ?? 'Matta';
}

/** Line name shown in the cart, the order record and on the receipt. */
export function mattaLineName(type: MattaTypeId, sqm: number): string {
  return `Mattvätt ${mattaTypeLabel(type)} — ${formatSqm(sqm)} m²`;
}
