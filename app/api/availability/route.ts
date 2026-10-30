import { NextResponse } from "next/server";
import { db } from "@/lib/firebase-admin";
import { expandBlockedDates, normalizeAvailability } from "@/lib/availability";

// Public, unauthenticated read of the blocked (unavailable) booking dates.
// The `settings` collection isn't client-readable per firestore.rules, so the
// customer DatePicker reaches it through this route instead of the client SDK.
//
// The weekday rules ("no Saturdays") are flattened into concrete dates here
// rather than sent as rules. That is deliberate: both pickers — the website's
// and the iOS app's — already ask this route for a list of days not to offer,
// so expanding server-side gave them the feature without either client
// changing, and without the two ever disagreeing about what a rule means.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const snap = await db.collection("settings").doc("availability").get();
    const settings = normalizeAvailability(snap.exists ? snap.data() : null);
    return NextResponse.json({
      blockedDates: expandBlockedDates(settings),
      // The rule itself, for anything that wants to explain *why* a day is
      // closed. The pickers ignore it and read `blockedDates` as before.
      blockedWeekdays: settings.blockedWeekdays,
    });
  } catch {
    // Never block bookings because availability failed to load.
    return NextResponse.json({ blockedDates: [], blockedWeekdays: [] });
  }
}
