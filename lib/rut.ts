// RUT-Avdrag (Swedish household-service tax deduction) helpers.
//
// The customer always pays the full price up front; RUT_DISCOUNT_PERCENT of that
// is later refunded manually. The percentage is provisional and may change.
export const RUT_DISCOUNT_PERCENT = 50;

// Format raw input into a Swedish personnummer: XXXXXX-XXXX (10 digits, forced dash).
// Strips everything that isn't a digit, caps at 10 digits, and inserts the dash
// after the 6th digit so the field always reads ÅÅMMDD-XXXX.
export function formatPersonnummer(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 10);
  if (digits.length <= 6) return digits;
  return `${digits.slice(0, 6)}-${digits.slice(6)}`;
}

// True once a full 10-digit personnummer has been entered.
export function isValidPersonnummer(value: string): boolean {
  return value.replace(/\D/g, '').length === 10;
}

// Amount (kr) that will be refunded for a RUT order at the current percentage.
export function rutRefundKr(totalKr: number): number {
  return Math.round((totalKr * RUT_DISCOUNT_PERCENT) / 100);
}

// Effective price (kr) after the RUT reduction — used to preview the discounted
// price on product tiles. Display only; the customer still pays full price up
// front and the refund is settled afterwards.
//
// Only call this for a line that is actually RUT-eligible; see below.
export function rutNetKr(priceKr: number): number {
  return priceKr - rutRefundKr(priceKr);
}

// ── Per-line eligibility ─────────────────────────────────────────────────────
// RUT is a household-service deduction, so not everything a laundry sells
// qualifies. The admin marks eligibility per catalogue item (and per category,
// which is a bulk write over its items) under Tjänster.
//
// Eligibility is stored only when it is turned *off*: everything written before
// this flag existed had RUT applied to it, so an absent value has to keep
// meaning "eligible" or the deduction would silently vanish from every existing
// product the first time this ships.

/** What an item with no stored flag means — RUT applies, as it always did. */
export const RUT_ELIGIBLE_DEFAULT = true;

/** Lenient read: only an explicit `false` takes an item out of RUT. */
export function normalizeRutEligible(value: unknown): boolean {
  return typeof value === 'boolean' ? value : RUT_ELIGIBLE_DEFAULT;
}
