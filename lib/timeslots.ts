/**
 * Booking time windows — the hours a customer may choose for pickup and for
 * delivery. Admin-editable under Inställningar → "Tider", stored in Firestore as
 * `settings/timeslots`.
 *
 * A window is a whole-hour range `{ start, end }` and is stored on the order as
 * the span string `"HH-HH"` ("08-12") — the shape orders, the driver list and
 * the calendar have always used, so nothing downstream had to change.
 *
 * Gaps are fine: 08-12 followed by 14-16 simply means nothing can be booked
 * between 12 and 14. Overlaps are not — two windows covering the same hour let
 * the customer book a time that is served twice over, so the admin editor and
 * the API both refuse them.
 *
 * Pickup and delivery keep separate lists; the admin UI has a mirror button for
 * when they should be identical.
 */

export interface TimeSlot {
  /** Whole hour the window opens, 0–23. */
  start: number;
  /** Whole hour it closes, 1–24. Always greater than `start`. */
  end: number;
}

export interface TimeSlotSettings {
  pickup: TimeSlot[];
  delivery: TimeSlot[];
}

export type TimeSlotKind = keyof TimeSlotSettings;

/** Sanity cap — a day has 24 hours, so more rows than this is a mistake. */
export const MAX_SLOTS = 12;

/** What the site offered before the times became editable. */
export const DEFAULT_SLOTS: TimeSlot[] = [
  { start: 8,  end: 12 },
  { start: 12, end: 16 },
  { start: 16, end: 20 },
];

export const TIMESLOT_DEFAULTS: TimeSlotSettings = {
  pickup:   DEFAULT_SLOTS.map(s => ({ ...s })),
  delivery: DEFAULT_SLOTS.map(s => ({ ...s })),
};

const pad = (h: number) => String(h).padStart(2, "0");

/** `{ start: 8, end: 12 }` → `"08-12"` — the value stored on the order. */
export const slotToSpan = (slot: TimeSlot): string => `${pad(slot.start)}-${pad(slot.end)}`;

/** `"08-12"` → `{ start: 8, end: 12 }`; null for anything else. */
export function spanToSlot(span: string): TimeSlot | null {
  if (typeof span !== "string") return null;
  const m = /^(\d{1,2})-(\d{1,2})$/.exec(span.trim());
  if (!m) return null;
  const slot = { start: Number(m[1]), end: Number(m[2]) };
  return isValidSlot(slot) ? slot : null;
}

/** `"08-12"` → `"08:00–12:00"`. Anything unrecognised passes straight through. */
export function formatSpan(span: string): string {
  const slot = spanToSlot(span);
  return slot ? `${pad(slot.start)}:00–${pad(slot.end)}:00` : span;
}

export const formatSlot = (slot: TimeSlot): string => `${pad(slot.start)}:00–${pad(slot.end)}:00`;

/** Closing hour of a span, for "this window has already passed today" checks. */
export function spanEndHour(span: string): number | null {
  return spanToSlot(span)?.end ?? null;
}

export function isValidSlot(slot: TimeSlot): boolean {
  return (
    Number.isInteger(slot?.start) && Number.isInteger(slot?.end) &&
    slot.start >= 0 && slot.end <= 24 && slot.start < slot.end
  );
}

export const slotsToSpans = (slots: TimeSlot[]): string[] => slots.map(slotToSpan);

/** Windows sorted by start hour. Does not mutate the input. */
export const sortSlots = (slots: TimeSlot[]): TimeSlot[] =>
  [...slots].sort((a, b) => a.start - b.start || a.end - b.end);

/**
 * The first pair of windows that share an hour, or null when they are all
 * disjoint. Used for both the save-time rejection and the inline row warning.
 */
export function findOverlap(slots: TimeSlot[]): [TimeSlot, TimeSlot] | null {
  const sorted = sortSlots(slots.filter(isValidSlot));
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].start < sorted[i - 1].end) return [sorted[i - 1], sorted[i]];
  }
  return null;
}

/** Indices (into the original array) of every row involved in an overlap. */
export function overlappingIndices(slots: TimeSlot[]): Set<number> {
  const bad = new Set<number>();
  for (let i = 0; i < slots.length; i++) {
    for (let j = i + 1; j < slots.length; j++) {
      const a = slots[i], b = slots[j];
      if (!isValidSlot(a) || !isValidSlot(b)) continue;
      if (a.start < b.end && b.start < a.end) { bad.add(i); bad.add(j); }
    }
  }
  return bad;
}

/**
 * Strict check for the write path. Returns a Swedish message to show the admin,
 * or null when the list is safe to save.
 */
export function validateSlots(slots: TimeSlot[]): string | null {
  if (!Array.isArray(slots) || slots.length === 0) {
    return "Minst en tid krävs — annars kan kunden inte boka.";
  }
  if (slots.length > MAX_SLOTS) {
    return `Högst ${MAX_SLOTS} tider per lista.`;
  }
  for (const slot of slots) {
    if (!Number.isInteger(slot?.start) || !Number.isInteger(slot?.end) || slot.start < 0 || slot.end > 24) {
      return "Tiderna måste vara hela timmar mellan 00 och 24.";
    }
    if (slot.start >= slot.end) {
      return `Sluttiden måste vara efter starttiden (${pad(slot.start)}:00–${pad(slot.end)}:00).`;
    }
  }
  const overlap = findOverlap(slots);
  if (overlap) {
    return `Tiderna får inte överlappa: ${formatSlot(overlap[0])} krockar med ${formatSlot(overlap[1])}.`;
  }
  return null;
}

/**
 * Lenient read path: coerce whatever is in Firestore into a usable list.
 * Garbage rows are dropped rather than thrown on, and an empty result falls back
 * to the defaults — a broken settings doc must never leave the checkout with
 * nothing to book.
 */
export function normalizeSlots(raw: unknown, fallback: TimeSlot[] = DEFAULT_SLOTS): TimeSlot[] {
  if (!Array.isArray(raw)) return fallback.map(s => ({ ...s }));

  const parsed = raw
    .map(entry => {
      if (typeof entry === "string") return spanToSlot(entry);
      const slot = { start: Number((entry as TimeSlot)?.start), end: Number((entry as TimeSlot)?.end) };
      return isValidSlot(slot) ? slot : null;
    })
    .filter((s): s is TimeSlot => s !== null);

  const kept: TimeSlot[] = [];
  for (const slot of sortSlots(parsed)) {
    if (kept.length && slot.start < kept[kept.length - 1].end) continue; // drop overlap
    kept.push(slot);
    if (kept.length === MAX_SLOTS) break;
  }
  return kept.length ? kept : fallback.map(s => ({ ...s }));
}

export function normalizeTimeSlotSettings(raw: Partial<TimeSlotSettings> | null | undefined): TimeSlotSettings {
  return {
    pickup:   normalizeSlots(raw?.pickup),
    delivery: normalizeSlots(raw?.delivery),
  };
}

// ── Client-side fetch ────────────────────────────────────────────────────────
// `settings` is not client-readable per firestore.rules, so the pickers reach
// the windows through /api/timeslots. Fetched once and shared: the cart renders
// two TimePickers and reads the pickup list itself to decide the earliest date.

let _cache: TimeSlotSettings | null = null;
let _inflight: Promise<TimeSlotSettings> | null = null;

export function fetchTimeSlots(): Promise<TimeSlotSettings> {
  if (_cache) return Promise.resolve(_cache);
  if (_inflight) return _inflight;
  _inflight = fetch("/api/timeslots")
    .then(r => (r.ok ? r.json() : null))
    .then(d => { _cache = normalizeTimeSlotSettings(d); return _cache; })
    .catch(() => { _cache = normalizeTimeSlotSettings(null); return _cache; })
    .finally(() => { _inflight = null; });
  return _inflight;
}

/** Drops the cache so a fresh save is picked up without a reload. */
export function clearTimeSlotCache() {
  _cache = null;
}
