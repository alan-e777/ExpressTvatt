/**
 * Which days can be booked.
 *
 * Three pieces, in order of authority:
 *
 *  1. `blockedDates` — single days the admin closed by clicking them. Always
 *     wins.
 *  2. `allowedDates` — single days the admin re-opened *despite* a weekday
 *     rule. "Generally no Saturdays, but I can do the 15th."
 *  3. `blockedWeekdays` — a standing rule, e.g. "no Saturdays". Applies to
 *     every date with that weekday, with no end: it is evaluated when a date
 *     is read, not written out in advance, so turning Saturdays off closes
 *     every future Saturday at once and turning it back on reopens them.
 *
 * The exception list is what makes (3) usable. A rule that could only be
 * escaped by deleting the rule would be no good to a shop that closes most
 * Saturdays but takes the occasional one.
 *
 * Client-safe — no firebase-admin — so the customer pickers, the admin
 * calendar and `create-cart-payment` all decide this the same way.
 */

export type AvailabilitySettings = {
  /** "YYYY-MM-DD" days closed individually. Beats everything else. */
  blockedDates: string[];
  /** 0 = Sunday … 6 = Saturday, matching `Date.prototype.getDay()`. */
  blockedWeekdays: number[];
  /** "YYYY-MM-DD" days kept open against a `blockedWeekdays` rule. */
  allowedDates: string[];
};

export const AVAILABILITY_DEFAULTS: AvailabilitySettings = {
  blockedDates: [],
  blockedWeekdays: [],
  allowedDates: [],
};

const YMD = /^\d{4}-\d{2}-\d{2}$/;

/** Monday-first, for the admin UI. `value` is the stored `getDay()` number. */
export const WEEKDAYS: Array<{ value: number; short: string; long: string }> = [
  { value: 1, short: 'Mon', long: 'Mondays' },
  { value: 2, short: 'Tue', long: 'Tuesdays' },
  { value: 3, short: 'Wed', long: 'Wednesdays' },
  { value: 4, short: 'Thu', long: 'Thursdays' },
  { value: 5, short: 'Fri', long: 'Fridays' },
  { value: 6, short: 'Sat', long: 'Saturdays' },
  { value: 0, short: 'Sun', long: 'Sundays' },
];

export function weekdayLongName(value: number): string {
  return WEEKDAYS.find(w => w.value === value)?.long ?? '';
}

function isYmd(value: unknown): value is string {
  return typeof value === 'string' && YMD.test(value);
}

function uniqueYmds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return [...new Set(raw.filter(isYmd))];
}

/**
 * Lenient read: a malformed document must never make the calendar unbookable,
 * so anything unrecognised is dropped rather than throwing.
 */
export function normalizeAvailability(raw: unknown): AvailabilitySettings {
  const data = (raw ?? {}) as Partial<Record<keyof AvailabilitySettings, unknown>>;
  const weekdays = Array.isArray(data.blockedWeekdays)
    ? [...new Set(data.blockedWeekdays.filter(
        (d): d is number => typeof d === 'number' && Number.isInteger(d) && d >= 0 && d <= 6,
      ))]
    : [];
  return {
    blockedDates: uniqueYmds(data.blockedDates),
    blockedWeekdays: weekdays.sort((a, b) => a - b),
    allowedDates: uniqueYmds(data.allowedDates),
  };
}

/**
 * The weekday of a "YYYY-MM-DD", read in local time.
 *
 * Deliberately not `new Date(ymd)`: that parses a bare date as UTC, so west of
 * Greenwich it lands on the previous day and a "no Saturdays" rule would close
 * Fridays. Building the date from its parts keeps it local wherever this runs.
 */
export function weekdayOf(ymd: string): number {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, m - 1, d).getDay();
}

/** Local "YYYY-MM-DD" for a Date — never `toISOString()`, which is UTC. */
export function toYmd(date: Date): string {
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${m}-${d}`;
}

export function isDateBlocked(ymd: string, settings: AvailabilitySettings): boolean {
  // An explicitly closed day stays closed, whatever the weekday rules say.
  if (settings.blockedDates.includes(ymd)) return true;
  // An explicit exception beats the standing rule — that is its whole job.
  if (settings.allowedDates.includes(ymd)) return false;
  return settings.blockedWeekdays.includes(weekdayOf(ymd));
}

/** Why a day is closed, for the admin UI to explain itself. */
export function blockReason(
  ymd: string,
  settings: AvailabilitySettings,
): 'date' | 'weekday' | null {
  if (settings.blockedDates.includes(ymd)) return 'date';
  if (settings.allowedDates.includes(ymd)) return null;
  return settings.blockedWeekdays.includes(weekdayOf(ymd)) ? 'weekday' : null;
}

/** Days ahead that `expandBlockedDates` writes out. Bookings never reach this far. */
export const BLOCKED_HORIZON_DAYS = 400;

/**
 * Flattens the rules into the plain date list the customer pickers already
 * consume.
 *
 * Expanding server-side is what let the weekday rule ship without touching the
 * website picker or the iOS app: both still ask `/api/availability` for
 * `blockedDates` and still get a list of days not to offer. The horizon is
 * finite because the rule itself is not — a standing "no Saturdays" has no end
 * date, and the list has to stop somewhere.
 */
export function expandBlockedDates(
  settings: AvailabilitySettings,
  from: Date = new Date(),
  days: number = BLOCKED_HORIZON_DAYS,
): string[] {
  const out = new Set(settings.blockedDates);
  if (settings.blockedWeekdays.length > 0) {
    const cursor = new Date(from.getFullYear(), from.getMonth(), from.getDate());
    for (let i = 0; i < days; i++) {
      const ymd = toYmd(cursor);
      if (settings.blockedWeekdays.includes(cursor.getDay()) && !settings.allowedDates.includes(ymd)) {
        out.add(ymd);
      }
      cursor.setDate(cursor.getDate() + 1);
    }
  }
  return [...out].sort();
}
