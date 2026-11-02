/**
 * `tel:` links for the surfaces that have to be able to ring a customer: the
 * driver's run page, the admin dispatcher panel and the order detail panel.
 *
 * Swedish numbers are typed every which way — `070-123 45 67`,
 * `+46 70 123 45 67`, `08 123 456` — so the href has to come down to digits
 * with at most a leading `+`, while the link text keeps the readable original.
 * A plain `\D` strip would eat the `+` and break every international number,
 * which is why the plus is preserved separately rather than kept in the class.
 *
 * Returns `null` when there is nothing to dial, so the caller can render `—`
 * instead of an anchor. A `tel:` link with no number is a dead tap, and a
 * driver tapping it in the van learns nothing from it.
 */
export function telHref(phone: string | null | undefined): string | null {
  const raw = (phone ?? "").trim();
  if (!raw) return null;

  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;

  // Only a leading `+` carries meaning; one typed mid-string is formatting.
  return `tel:${raw.startsWith("+") ? "+" : ""}${digits}`;
}
