/**
 * The same-day pickup cutoff — the copy *and*, since 2026-11-02, the rule.
 *
 * Asked for by the client (2026-11-01): the site should say that an order placed
 * before 14:00 is picked up the same day. The strings live here rather than
 * inline in four files so the landing page, `/order` and `/kassa` cannot drift
 * into advertising three different cutoffs.
 *
 * It used to stop there — the site stated the cutoff and nothing checked it, so
 * a 19:00 order could still ask for a pickup the same day. Today is now removed
 * from the pickup date picker once the cutoff has passed, and the choice is
 * re-checked in `create-cart-payment` so it holds for a hand-made request too.
 *
 * Two numbers decide it, and only one of them is editable:
 *
 * - **The cutoff, 14:00, is fixed here.** It is the client's stated business
 *   rule and it is the number the marketing copy below is built from. Making it
 *   admin-editable would mean the landing page could advertise 14:00 while the
 *   checkout enforced 12:00 — the copy would have to be fed the configured hour
 *   on all three surfaces first. Until then, this constant is the one truth.
 * - **The lead time is the admin's**, in `settings/timeslots.sameDay`, edited on
 *   the slider in `TimeSlotsPanel`. It is how much notice the driver needs: a
 *   window is only bookable today if it closes more than this many hours from
 *   now. Without it, an order placed at 13:50 could claim a window closing at
 *   14:00 and be "same day" by ten minutes.
 *
 * Everything here works from a Stockholm wall-clock hour, never the host's.
 * The server runs in UTC on Vercel, so comparing `getHours()` against the
 * cutoff there would let same-day orders through until 15:00 in winter and
 * 16:00 in summer. `nowInSweden()` is what both sides must use, so the client's
 * greyed-out windows and the server's rejection can never disagree.
 */

// ── Copy ─────────────────────────────────────────────────────────────────────

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

/** Shown under the date field once the cutoff has passed for the day. */
export const SAME_DAY_CLOSED_NOTICE =
  `Det är efter ${SAME_DAY_CUTOFF_TIME} — upphämtning samma dag går inte längre att boka.`;

// ── The rule ─────────────────────────────────────────────────────────────────

export const SAME_DAY_TIMEZONE = "Europe/Stockholm";

export interface SameDayRule {
  /**
   * Hours of notice the driver needs. A pickup window counts as bookable today
   * only while it closes more than this many hours from now. `0` means any
   * window that has not yet closed, which is the old behaviour.
   */
  leadHours: number;
}

/**
 * 2 hours, chosen deliberately: the client has not given a figure yet, and a
 * non-techy owner may never open this panel, so whatever ships is in practice
 * permanent. 2h is short enough not to kill same-day bookings and long enough
 * that the driver is not promised an impossible run.
 */
export const SAME_DAY_DEFAULTS: SameDayRule = { leadHours: 2 };

/** Past this the slider stops being a lead time and starts being a closed day. */
export const MAX_LEAD_HOURS = 12;

/** Lenient read path — a corrupt or absent value must never block checkout. */
export function normalizeSameDayRule(raw: unknown): SameDayRule {
  const value = Number((raw as SameDayRule)?.leadHours);
  if (!Number.isFinite(value)) return { ...SAME_DAY_DEFAULTS };
  const leadHours = Math.round(value);
  if (leadHours < 0 || leadHours > MAX_LEAD_HOURS) return { ...SAME_DAY_DEFAULTS };
  return { leadHours };
}

/** Strict check for the write path. Swedish message to show the admin, or null. */
export function validateSameDayRule(rule: SameDayRule): string | null {
  const value = Number(rule?.leadHours);
  if (!Number.isInteger(value)) return "Framförhållningen måste vara ett helt antal timmar.";
  if (value < 0) return "Framförhållningen kan inte vara negativ.";
  if (value > MAX_LEAD_HOURS) return `Framförhållningen kan som mest vara ${MAX_LEAD_HOURS} timmar.`;
  return null;
}

/**
 * The current date and hour on a Swedish wall clock, whatever the host's zone.
 *
 * Built from `Intl` parts rather than `getHours()` / `toISOString()` for the
 * same reason `weekdayOf` in `lib/availability.ts` is: the server is UTC, and a
 * date or hour derived from it is shifted by one or two hours against the
 * customer and the office.
 */
export function nowInSweden(at: Date = new Date()): { ymd: string; hour: number } {
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: SAME_DAY_TIMEZONE,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", hour12: false,
  }).formatToParts(at);

  const part = (type: string) => parts.find(p => p.type === type)?.value ?? "";
  // Some engines render midnight as "24" under hour12: false.
  const hour = Number(part("hour")) % 24;

  return { ymd: `${part("year")}-${part("month")}-${part("day")}`, hour };
}

/**
 * The earliest hour a pickup window may *close* and still be bookable today.
 *
 * Feeds `TimePicker`'s `minEndHour`, which greys out any window whose `end` is
 * at or below it — so this is the whole lead-time rule as far as the picker is
 * concerned.
 */
export function sameDayMinEndHour(nowHour: number, rule: SameDayRule): number {
  return nowHour + rule.leadHours;
}

/**
 * Whether today can still be booked for pickup at all.
 *
 * False once the cutoff has passed, and false when every remaining window
 * closes too soon to give the driver their notice — a day whose last window
 * ends at 16:00 stops being bookable at 14:00 with a 2-hour lead, not at 16:00.
 */
export function isSameDayPickupOpen(
  nowHour: number,
  pickupSlots: ReadonlyArray<{ end: number }>,
  rule: SameDayRule,
): boolean {
  if (nowHour >= SAME_DAY_CUTOFF_HOUR) return false;
  const minEnd = sameDayMinEndHour(nowHour, rule);
  return pickupSlots.some(slot => slot.end > minEnd);
}

// ── Client-side fetch ────────────────────────────────────────────────────────
// The rule rides along in the `settings/timeslots` document and is served by
// /api/timeslots, because `settings` is not client-readable per firestore.rules.
// It is fetched separately from `fetchTimeSlots()` rather than being returned by
// it: that function lives in `lib/timeslots.ts`, which is one of the byte-
// identical mirrors `npm run check:mirrors` guards, and widening its return type
// would drag the iOS app into a change it does not need yet. The cost is one
// extra small GET of a route the page was already calling.

let _cache: SameDayRule | null = null;
let _inflight: Promise<SameDayRule> | null = null;

export function fetchSameDayRule(): Promise<SameDayRule> {
  if (_cache) return Promise.resolve(_cache);
  if (_inflight) return _inflight;
  _inflight = fetch("/api/timeslots")
    .then(r => (r.ok ? r.json() : null))
    .then(d => { _cache = normalizeSameDayRule(d?.sameDay); return _cache; })
    .catch(() => { _cache = { ...SAME_DAY_DEFAULTS }; return _cache; })
    .finally(() => { _inflight = null; });
  return _inflight;
}

/** Drops the cache so a fresh save is picked up without a reload. */
export function clearSameDayCache() {
  _cache = null;
}
