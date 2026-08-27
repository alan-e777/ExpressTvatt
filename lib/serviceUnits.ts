// How a catalogue product is priced: per piece, per kilo or per square metre.
//
// A `st` product is the ordinary case — one price, add it to the basket. A `kg`
// or `m²` product is *measured*: its `price` is a rate, and the customer drags a
// slider between the admin's min and max to say how much they have. The line
// price is `rate × amount`, rounded to whole kronor.
//
// This generalises what settings/mattvatt does for rugs (lib/mattvatt.ts), but
// keeps that module intact: mattvätt's ids are baked into old cart lines and
// into the payment route's validation, so it stays as it is. Everything here is
// per *product*, stored on the StrukenTvatt doc itself.
//
// A measured line carries its `amount` alongside the product id in the cart, and
// app/api/create-cart-payment re-derives the price from the catalogue rather
// than trusting it — the same rule as every other product in the basket.

export type PriceUnit = 'st' | 'kg' | 'm2';

export type UnitDef = {
  id: PriceUnit;
  /** Unit as written after a price: "150 kr / m²". */
  label: string;
  /** What the admin picks in the editor. */
  adminLabel: string;
  /** Heading above the customer's slider. Empty for `st`, which has none. */
  sliderLabel: string;
  /** Slider granularity. Fixed in code, exactly like mattvätt's SQM_STEP. */
  step: number;
  /** Range a product of this unit starts with until the admin narrows it. */
  defaultMin: number;
  defaultMax: number;
};

export const PRICE_UNITS: UnitDef[] = [
  { id: 'st', label: 'st',  adminLabel: 'Styckpris', sliderLabel: '',          step: 1,   defaultMin: 1, defaultMax: 1  },
  { id: 'kg', label: 'kg',  adminLabel: 'Per kilo',  sliderLabel: 'Vikt',      step: 0.5, defaultMin: 1, defaultMax: 20 },
  { id: 'm2', label: 'm²',  adminLabel: 'Per m²',    sliderLabel: 'Storlek',   step: 0.5, defaultMin: 1, defaultMax: 25 },
];

export const DEFAULT_UNIT: PriceUnit = 'st';

/** The definition for a unit, falling back to `st` for anything unrecognised. */
export function unitDef(unit: unknown): UnitDef {
  return PRICE_UNITS.find(u => u.id === unit) ?? PRICE_UNITS[0];
}

/** Whether this unit asks the customer for an amount instead of a quantity. */
export function isMeasured(unit: unknown): boolean {
  return unitDef(unit).id !== 'st';
}

/** Whatever the doc happens to hold, reduced to a unit we can price with. */
export function normalizeUnit(raw: unknown): PriceUnit {
  return unitDef(raw).id;
}

/** Amount as the customer sees it — Swedish decimal comma, at most one decimal. */
export function formatAmount(n: number): string {
  return String(Math.round(n * 10) / 10).replace('.', ',');
}

/** Snap an amount to its unit's step and keep it strictly positive. */
export function snapAmount(raw: unknown, unit: PriceUnit, fallback: number): number {
  const step = unitDef(unit).step;
  const v = Number(String(raw).replace(',', '.'));
  if (!Number.isFinite(v) || v <= 0) return fallback;
  return Math.round(v / step) * step;
}

/**
 * The min/max a measured product's slider offers, sanitised. The max is always
 * kept at least one step above the min, otherwise the slider has no range to
 * drag — the same guard normalizeMattvattSettings applies to rugs.
 */
export function normalizeRange(
  unit: PriceUnit,
  rawMin: unknown,
  rawMax: unknown,
): { minUnits: number; maxUnits: number } {
  const def = unitDef(unit);
  // A `st` product has no slider, so its range is fixed at a single unit and
  // nothing the admin ever typed for it can leak into the price.
  if (def.id === 'st') return { minUnits: 1, maxUnits: 1 };
  const minUnits = Math.max(def.step, snapAmount(rawMin, unit, def.defaultMin));
  const maxUnits = Math.max(minUnits + def.step, snapAmount(rawMax, unit, def.defaultMax));
  return { minUnits, maxUnits };
}

/** How a product is priced, as stored on its catalogue doc. */
export type ProductPricing = {
  unit:     PriceUnit;
  minUnits: number;
  maxUnits: number;
};

/**
 * Fill in and sanity-check the pricing half of a product doc. Takes raw input —
 * a Firestore document, a request body, a product fetched by the order page —
 * so callers never have to pre-validate what they read.
 */
export function normalizePricing(
  raw: { unit?: unknown; minUnits?: unknown; maxUnits?: unknown } | null | undefined,
): ProductPricing {
  const unit = normalizeUnit(raw?.unit);
  return { unit, ...normalizeRange(unit, raw?.minUnits, raw?.maxUnits) };
}

/** Keep a requested amount inside the product's allowed range. */
export function clampAmountToRange(raw: unknown, pricing: ProductPricing): number {
  if (!isMeasured(pricing.unit)) return 1;
  const v = snapAmount(raw, pricing.unit, pricing.minUnits);
  return Math.min(pricing.maxUnits, Math.max(pricing.minUnits, v));
}

/** Line price (kr) for `amount` of a product priced at `rateKr` per unit. */
export function measuredPriceKr(rateKr: number, amount: number): number {
  return Math.round(rateKr * amount);
}

/**
 * Line name shown in the cart, the order record and on the receipt. A measured
 * line always carries the amount it was priced from, so the shop and the
 * customer read the same figure the payment route calculated with.
 */
export function measuredLineName(name: string, amount: number, unit: PriceUnit): string {
  return `${name} — ${formatAmount(amount)} ${unitDef(unit).label}`;
}

/**
 * Cart-line identity for a measured product: two sizes of the same item are two
 * lines, each with its own quantity — the rule mattvätt already follows by
 * encoding the area in its line id.
 */
export function amountKey(amount: number | undefined): string {
  return amount === undefined ? '' : String(Math.round(amount * 10) / 10);
}
