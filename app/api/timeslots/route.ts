import { NextResponse } from "next/server";
import { db } from "@/lib/firebase-admin";
import { normalizeTimeSlotSettings, TIMESLOT_DEFAULTS, type TimeSlotSettings } from "@/lib/timeslots";

// Public, unauthenticated read of the bookable pickup/delivery windows.
// The `settings` collection isn't client-readable per firestore.rules, so the
// customer TimePicker reaches it through this route instead of the client SDK.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const snap = await db.collection("settings").doc("timeslots").get();
    return NextResponse.json(
      normalizeTimeSlotSettings(snap.exists ? (snap.data() as Partial<TimeSlotSettings>) : null)
    );
  } catch {
    // Never leave the checkout with nothing to book because settings failed to load.
    return NextResponse.json(TIMESLOT_DEFAULTS);
  }
}
