// Bookable pickup/delivery windows. Mirror of the website `lib/timeslots.ts`,
// trimmed to the read path the app needs — the admin edits the windows in the
// dashboard (settings/timeslots) and both clients fetch the same list, so the
// app can never offer a time create-cart-payment will reject.
//
// A window is a whole-hour range and is sent to the server as the span string
// "HH-HH" ("08-12"), which is what the order stores.

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

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

const pad = (h: number) => String(h).padStart(2, '0');

export const slotToSpan = (slot: TimeSlot): string => `${pad(slot.start)}-${pad(slot.end)}`;

export function spanToSlot(span: string): TimeSlot | null {
  if (typeof span !== 'string') return null;
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

export function isValidSlot(slot: TimeSlot): boolean {
  return (
    Number.isInteger(slot?.start) && Number.isInteger(slot?.end) &&
    slot.start >= 0 && slot.end <= 24 && slot.start < slot.end
  );
}

/** Coerce whatever the API returned into a usable list; never throws. */
export function normalizeSlots(raw: unknown, fallback: TimeSlot[] = DEFAULT_SLOTS): TimeSlot[] {
  if (!Array.isArray(raw)) return fallback.map(s => ({ ...s }));
  const parsed = raw
    .map(entry => {
      if (typeof entry === 'string') return spanToSlot(entry);
      const slot = { start: Number((entry as TimeSlot)?.start), end: Number((entry as TimeSlot)?.end) };
      return isValidSlot(slot) ? slot : null;
    })
    .filter((s): s is TimeSlot => s !== null)
    .sort((a, b) => a.start - b.start || a.end - b.end);

  const kept: TimeSlot[] = [];
  for (const slot of parsed) {
    if (kept.length && slot.start < kept[kept.length - 1].end) continue; // drop overlap
    kept.push(slot);
  }
  return kept.length ? kept : fallback.map(s => ({ ...s }));
}

export function normalizeTimeSlotSettings(raw: Partial<TimeSlotSettings> | null | undefined): TimeSlotSettings {
  return { pickup: normalizeSlots(raw?.pickup), delivery: normalizeSlots(raw?.delivery) };
}

// Fetched once per app session and shared: the checkout renders two pickers and
// reads the pickup list itself to decide the earliest bookable date.
let _cache: TimeSlotSettings | null = null;
let _inflight: Promise<TimeSlotSettings> | null = null;

export function fetchTimeSlots(): Promise<TimeSlotSettings> {
  if (_cache) return Promise.resolve(_cache);
  if (_inflight) return _inflight;
  _inflight = fetch(`${API_URL}/api/timeslots`)
    .then(r => (r.ok ? r.json() : null))
    .then(d => { _cache = normalizeTimeSlotSettings(d); return _cache; })
    .catch(() => { _cache = normalizeTimeSlotSettings(null); return _cache; })
    .finally(() => { _inflight = null; });
  return _inflight;
}
