import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/firebase-admin";
import {
  normalizeTimeSlotSettings, sortSlots, validateSlots,
  type TimeSlot, type TimeSlotSettings,
} from "@/lib/timeslots";
import {
  normalizeSameDayRule, validateSameDayRule, type SameDayRule,
} from "@/lib/sameDay";

/**
 * The same-day lead time rides in this same document. It belongs with the
 * windows because it is only meaningful against them — it decides which of
 * them are still bookable today — and one panel saves both in one request.
 */
type TimeSlotPayload = Partial<TimeSlotSettings> & { sameDay?: SameDayRule };

const DOC = () => db.collection("settings").doc("timeslots");

const KIND_LABEL: Record<keyof TimeSlotSettings, string> = {
  pickup:   "Upphämtning",
  delivery: "Avlämning",
};

/** Trust nothing from the client: hours become integers here or the save fails. */
function coerce(raw: unknown): TimeSlot[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(entry => ({
    start: Math.round(Number((entry as TimeSlot)?.start)),
    end:   Math.round(Number((entry as TimeSlot)?.end)),
  }));
}

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const snap = await DOC().get();
  const data = snap.exists ? (snap.data() as TimeSlotPayload) : null;
  return NextResponse.json({
    ...normalizeTimeSlotSettings(data),
    sameDay: normalizeSameDayRule(data?.sameDay),
  });
}

// Body: { pickup: TimeSlot[], delivery: TimeSlot[], sameDay?: { leadHours } }.
// Both lists are validated in full — an empty list or overlapping windows are
// rejected with the message the admin panel shows verbatim.
export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json()) as TimeSlotPayload;
  const next: TimeSlotSettings = { pickup: [], delivery: [] };

  for (const kind of ["pickup", "delivery"] as const) {
    const slots = coerce(body[kind]);
    const error = validateSlots(slots);
    if (error) {
      return NextResponse.json({ error: `${KIND_LABEL[kind]}: ${error}` }, { status: 400 });
    }
    next[kind] = sortSlots(slots);
  }

  // Absent `sameDay` keeps whatever is stored rather than resetting it: an
  // older client that only knows about the windows must not silently wipe the
  // lead time back to the default.
  //
  // Validated on the raw value, deliberately *not* through
  // `normalizeSameDayRule` first — normalizing clamps anything bad to the
  // default, so checking afterwards could never fail and a typo would be
  // silently saved as 2 hours instead of being shown to the admin.
  let sameDay: SameDayRule | null = null;
  if (body.sameDay !== undefined) {
    const candidate: SameDayRule = { leadHours: Math.round(Number(body.sameDay?.leadHours)) };
    const error = validateSameDayRule(candidate);
    if (error) return NextResponse.json({ error: `Samma dag: ${error}` }, { status: 400 });
    sameDay = candidate;
  }

  try {
    await DOC().set(sameDay ? { ...next, sameDay } : next, { merge: true });
    const stored = sameDay ?? normalizeSameDayRule((await DOC().get()).data()?.sameDay);
    return NextResponse.json({ ...next, sameDay: stored });
  } catch (err) {
    console.error("[admin/timeslots POST] Firestore error:", err);
    return NextResponse.json({ error: "Kunde inte spara tiderna." }, { status: 500 });
  }
}
