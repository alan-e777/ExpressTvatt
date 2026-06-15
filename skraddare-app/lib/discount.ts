// First-time + per-item discount math. Mirror of the website `lib/discount.ts`
// so the app's cart preview always equals the amount charged server-side
// (app/api/create-cart-payment imports the same logic with the same rounding).

export type MattvattDiscounts = {
  'matta-liten': number;
  'matta-stor':  number;
  'matta-akta':  number;
};

export interface DiscountSettings {
  firstTimeDiscountPercent: number;       // 0–100
  multipleDiscountsAllowed: boolean;
  mattvatt: MattvattDiscounts;
}

export const DISCOUNT_DEFAULTS: DiscountSettings = {
  firstTimeDiscountPercent: 0,
  multipleDiscountsAllowed: false,
  mattvatt: { 'matta-liten': 0, 'matta-stor': 0, 'matta-akta': 0 },
};

// Clamp any numeric input into a valid percentage.
export function clampPct(n: unknown): number {
  const v = Number(n);
  if (!Number.isFinite(v)) return 0;
  return Math.min(100, Math.max(0, v));
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
    const pct = Math.max(item, ft);
    price = basePriceKr * (1 - pct / 100);
  }
  return Math.round(price);
}

// Cart-summary totals (kr). `perItemPct(id)` returns the per-item discount %.
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
