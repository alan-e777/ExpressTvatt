// The smallest number of one product a customer may book at a time.
//
// Set per item rather than per category: a shop that will not take fewer than
// five shirts for pressing still happily takes a single coat from the same
// list. `minQty` of 1 is the ordinary case — no minimum — which is also what
// every product saved before this existed reads back as, so nothing needs
// migrating.
//
// It counts *lines*, not units of a measured product: a per-kg item already has
// its own floor in `minUnits` (lib/serviceUnits.ts), and this sits on top of it
// as "how many of these you must book at once".
//
// Enforced from this one module in both directions: the order page never lets a
// basket be built below the minimum (adding a product jumps straight to it, and
// stepping under it takes the line out), and create-cart-payment re-checks every
// line against the catalogue — the same "never trust the client" rule the prices
// themselves follow.

/** A product with no minimum. Anything ≤ this means "one is fine". */
export const NO_MIN_QTY = 1;

/** Upper bound, so a slipped keystroke cannot make an item unorderable. */
export const MAX_MIN_QTY = 99;

/**
 * Whatever the doc, the request body or the admin's input field holds, reduced
 * to a whole number of pieces we can enforce. Anything unparseable, negative or
 * fractional falls back to "no minimum" rather than blocking the product.
 */
export function normalizeMinQty(raw: unknown): number {
  const n = Math.floor(Number(typeof raw === 'string' ? raw.replace(',', '.').trim() : raw));
  if (!Number.isFinite(n) || n < NO_MIN_QTY) return NO_MIN_QTY;
  return Math.min(MAX_MIN_QTY, n);
}

/** Whether this product actually asks for more than one. */
export function hasMinQty(raw: unknown): boolean {
  return normalizeMinQty(raw) > NO_MIN_QTY;
}

/** "Minst 5 st" — the one phrasing the tile, the basket and the error share. */
export function minQtyLabel(raw: unknown): string {
  return `Minst ${normalizeMinQty(raw)} st`;
}

/**
 * What a "+" should add: the whole minimum when the line is new, one more
 * afterwards. Buying five shirts should not mean five taps.
 */
export function addStep(currentQty: number, raw: unknown): number {
  return currentQty > 0 ? 1 : normalizeMinQty(raw);
}

/**
 * What a "−" leaves behind. Below the minimum there is no valid basket to land
 * in, so the line goes altogether rather than sitting there unbookable.
 */
export function qtyAfterRemove(currentQty: number, raw: unknown): number {
  const next = currentQty - 1;
  return next < normalizeMinQty(raw) ? 0 : next;
}
