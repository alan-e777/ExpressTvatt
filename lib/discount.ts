// First-time + per-item discount math.
//
// This is the single source of truth for how discounts combine. Both the
// authoritative server price (app/api/create-cart-payment) and the customer-facing
// previews (app/order, app/kassa) import these helpers and use the same Math.round
// per-unit rounding, so the price shown always equals the amount charged.
//
// Two discount sources can apply to a line item:
//   • itemPct      — a per-item discount % set by the admin on that product.
//   • firstTimePct — the first-order discount %, only when the customer is a
//                    first-timer (firstTimePct is passed as 0 otherwise).
//
// "Multiple discounts allowed" (settings.multipleDiscountsAllowed):
//   • ON  → both apply, multiplicatively (never exceeds 100% off).
//   • OFF → only the single largest discount applies (the cheapest result).

import { parseMattaLineId } from './mattvatt';

export type MattvattDiscounts = {
  'matta-normal': number;
  'matta-akta':   number;
  // Legacy fixed-size keys. The iOS app still sells the three old fixed sizes,
  // so the APIs keep serving these — mirrored from 'matta-normal' — until it
  // moves over to the area-based lines the website now uses.
  'matta-liten':  number;
  'matta-stor':   number;
};

export interface DiscountSettings {
  firstTimeDiscountPercent: number;       // 0–100
  multipleDiscountsAllowed: boolean;
  mattvatt: MattvattDiscounts;            // per rug type %, keyed by cart line id
}

export const DISCOUNT_DEFAULTS: DiscountSettings = {
  firstTimeDiscountPercent: 0,
  multipleDiscountsAllowed: false,
  mattvatt: { 'matta-normal': 0, 'matta-akta': 0, 'matta-liten': 0, 'matta-stor': 0 },
};

// Clamp any numeric input into a valid percentage. Guards against NaN, negatives,
// and an admin accidentally typing 1000.
export function clampPct(n: unknown): number {
  const v = Number(n);
  if (!Number.isFinite(v)) return 0;
  return Math.min(100, Math.max(0, v));
}

// Per-item discount % for a mattvätt line. Area-based lines carry their rug type
// in the id (`matta-normal-3.5`); the legacy fixed sizes are looked up directly.
export function mattvattLinePct(discounts: MattvattDiscounts, lineId: string): number {
  const parsed = parseMattaLineId(lineId);
  const key = (parsed?.type ?? lineId) as keyof MattvattDiscounts;
  return clampPct(discounts[key] ?? 0);
}

// Discounted price (kr) for one unit, rounded to whole kronor.
export function discountedUnitPrice(
  basePriceKr: number,
  itemPct: number,
  firstTimePct: number,
  multipleAllowed: boolean,
): number {
  const item = clampPct(itemPct);
  const ft   = clampPct(firstTimePct);
  let price: number;
  if (multipleAllowed) {
    price = basePriceKr * (1 - item / 100) * (1 - ft / 100);
  } else {
    // Lowest cost = largest single discount.
    const pct = Math.max(item, ft);
    price = basePriceKr * (1 - pct / 100);
  }
  return Math.round(price);
}

// Cart-summary totals (kr) for the customer UI. `perItemPct(id)` returns the
// per-item discount % for a given line id (0 when none).
export function computeCartTotals(
  items: { id: string; price: number; qty: number }[],
  perItemPct: (id: string) => number,
  settings: Pick<DiscountSettings, 'multipleDiscountsAllowed'> & { firstTimeDiscountPercent: number },
  isFirstTime: boolean,
): { subtotalKr: number; totalKr: number; savingsKr: number } {
  const ft = isFirstTime ? settings.firstTimeDiscountPercent : 0;
  let subtotalKr = 0;
  let totalKr = 0;
  for (const i of items) {
    subtotalKr += i.price * i.qty;
    totalKr += discountedUnitPrice(i.price, perItemPct(i.id), ft, settings.multipleDiscountsAllowed) * i.qty;
  }
  return { subtotalKr, totalKr, savingsKr: subtotalKr - totalKr };
}
