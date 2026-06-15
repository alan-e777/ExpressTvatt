// RUT-Avdrag (Swedish household-service tax deduction) helpers.
// Mirror of the website `lib/rut.ts` so the app's price preview matches the
// amount the server (app/api/create-cart-payment) actually charges.
//
// The customer pays the discounted price directly; RUT_DISCOUNT_PERCENT is
// deducted from the items portion (never delivery). The percentage is provisional.
export const RUT_DISCOUNT_PERCENT = 50;

// Format raw input into a Swedish personnummer: ÅÅMMDD-XXXX (10 digits, forced dash).
export function formatPersonnummer(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 10);
  if (digits.length <= 6) return digits;
  return `${digits.slice(0, 6)}-${digits.slice(6)}`;
}

// True once a full 10-digit personnummer has been entered.
export function isValidPersonnummer(value: string): boolean {
  return value.replace(/\D/g, '').length === 10;
}

// Amount (kr) deducted for a RUT order at the current percentage.
export function rutRefundKr(totalKr: number): number {
  return Math.round((totalKr * RUT_DISCOUNT_PERCENT) / 100);
}

// Effective price (kr) after the RUT reduction — used to preview the discounted
// price on product tiles.
export function rutNetKr(priceKr: number): number {
  return priceKr - rutRefundKr(priceKr);
}
