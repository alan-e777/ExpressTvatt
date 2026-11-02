/**
 * The same-day pickup cutoff, as copy.
 *
 * Asked for by the client (2026-11-01): the site should say that an order
 * placed before 14:00 is picked up the same day. The strings live here rather
 * than inline in four files so the landing page, `/order` and `/kassa` cannot
 * drift into advertising three different cutoffs, and so the hour itself is
 * changed in one place.
 *
 * **This is a promise, not a rule — nothing enforces it.** `minPickupDate` in
 * `app/kassa/page.tsx` keeps today selectable until the last configured pickup
 * window closes (20:00 by default), and `create-cart-payment` never looks at
 * the hour at all. So the site states the cutoff and the office honours it
 * operationally; a booking placed at 19:00 is still accepted for today.
 *
 * If the client wants it actually enforced, the hour does not belong in a
 * constant here: it belongs in Firestore `settings/` with an admin panel beside
 * the booking windows (`lib/timeslots.ts` + `TimeSlotsPanel.tsx`), fed into
 * `minPickupDate` and re-checked server-side in `create-cart-payment` the way
 * blocked dates and time windows already are. The iOS app would then need the
 * same value — see `migration.md`.
 */
export const SAME_DAY_CUTOFF_HOUR = 14;

/** The cutoff as the customer reads it. Every string below is built from it. */
export const SAME_DAY_CUTOFF_TIME = `kl. ${SAME_DAY_CUTOFF_HOUR}:00`;

/** Full sentence — the client's own wording. Used wherever there is room. */
export const SAME_DAY_NOTICE =
  `Beställningar som läggs före ${SAME_DAY_CUTOFF_TIME} hämtas upp samma dag.`;

/**
 * One-line form for the landing page's trust strip, which gets a single chip.
 * It carries the cutoff rather than claiming same-day pickup flatly: the chip
 * is read on its own, and an unqualified promise there is the one thing the
 * rest of this copy exists to avoid. Kept to the length of the chips beside it
 * so it does not wrap to two lines and unbalance the row.
 */
export const SAME_DAY_SHORT = `Samma dag före ${SAME_DAY_CUTOFF_TIME}`;
