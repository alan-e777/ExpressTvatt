import { NextResponse } from "next/server";
import { db } from "@/lib/firebase-admin";

// Public, unauthenticated read of the blocked (unavailable) booking dates.
// The `settings` collection isn't client-readable per firestore.rules, so the
// customer DatePicker reaches it through this route instead of the client SDK.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const snap = await db.collection("settings").doc("availability").get();
    const blockedDates = (snap.exists ? snap.data()?.blockedDates : []) ?? [];
    return NextResponse.json({ blockedDates });
  } catch {
    // Never block bookings because availability failed to load.
    return NextResponse.json({ blockedDates: [] });
  }
}
