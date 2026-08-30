import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/firebase-admin";
import {
  normalizeTimeSlotSettings, sortSlots, validateSlots,
  type TimeSlot, type TimeSlotSettings,
} from "@/lib/timeslots";

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
  return NextResponse.json(
    normalizeTimeSlotSettings(snap.exists ? (snap.data() as Partial<TimeSlotSettings>) : null)
  );
}

// Body: { pickup: TimeSlot[], delivery: TimeSlot[] }.
// Both lists are validated in full — an empty list or overlapping windows are
// rejected with the message the admin panel shows verbatim.
export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json()) as Partial<TimeSlotSettings>;
  const next: TimeSlotSettings = { pickup: [], delivery: [] };

  for (const kind of ["pickup", "delivery"] as const) {
    const slots = coerce(body[kind]);
    const error = validateSlots(slots);
    if (error) {
      return NextResponse.json({ error: `${KIND_LABEL[kind]}: ${error}` }, { status: 400 });
    }
    next[kind] = sortSlots(slots);
  }

  try {
    await DOC().set(next, { merge: true });
    return NextResponse.json(next);
  } catch (err) {
    console.error("[admin/timeslots POST] Firestore error:", err);
    return NextResponse.json({ error: "Kunde inte spara tiderna." }, { status: 500 });
  }
}
