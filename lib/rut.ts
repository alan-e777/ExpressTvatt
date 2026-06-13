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
export function rutNetKr(priceKr: number): number {
  return priceKr - rutRefundKr(priceKr);
}
