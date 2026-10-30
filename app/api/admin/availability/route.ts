import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/firebase-admin";
import { normalizeAvailability, weekdayOf, type AvailabilitySettings } from "@/lib/availability";

const DOC = () => db.collection("settings").doc("availability");
const YMD = /^\d{4}-\d{2}-\d{2}$/;

async function read(): Promise<AvailabilitySettings> {
  const snap = await DOC().get();
  return normalizeAvailability(snap.exists ? snap.data() : null);
}

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await read());
}

/**
 * Toggle a single day. Body: `{ date: "YYYY-MM-DD", blocked: boolean }`.
 *
 * Rule-aware, because a day can be closed two different ways and the obvious
 * implementation gets it wrong. Closing a day that a weekday rule already
 * closes must not also write an explicit block: the admin would then have a
 * day that stays shut after the rule is lifted, which is not what clicking a
 * day that already looked shut could possibly have meant. So:
 *
 *  - **open a day** → drop any explicit block, and if a weekday rule still
 *    closes it, record an exception.
 *  - **close a day** → drop any exception first; only add an explicit block if
 *    the day would otherwise still be open.
 *
 * Read-modify-write rather than arrayUnion/arrayRemove, since the right edit
 * depends on the rules currently stored.
 */
export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { date, blocked } = await req.json();
  if (typeof date !== "string" || !YMD.test(date)) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }
  if (typeof blocked !== "boolean") {
    return NextResponse.json({ error: "Invalid blocked flag" }, { status: 400 });
  }

  try {
    const current = await read();
    const blockedDates = new Set(current.blockedDates);
    const allowedDates = new Set(current.allowedDates);
    const ruleCloses = current.blockedWeekdays.includes(weekdayOf(date));

    if (blocked) {
      allowedDates.delete(date);
      if (!ruleCloses) blockedDates.add(date);
      else blockedDates.delete(date);
    } else {
      blockedDates.delete(date);
      if (ruleCloses) allowedDates.add(date);
      else allowedDates.delete(date);
    }

    const next: AvailabilitySettings = {
      blockedDates: [...blockedDates].sort(),
      blockedWeekdays: current.blockedWeekdays,
      allowedDates: [...allowedDates].sort(),
    };
    await DOC().set(next, { merge: true });
    return NextResponse.json(next);
  } catch (err) {
    console.error("[availability POST] Firestore error:", err);
    return NextResponse.json({ error: "Database write failed." }, { status: 500 });
  }
}

/**
 * Set the standing weekday rules. Body: `{ blockedWeekdays: number[] }`,
 * 0 = Sunday … 6 = Saturday.
 *
 * Exceptions are left alone on purpose. Turning Saturdays back on makes every
 * Saturday exception moot, but deleting them would silently throw away the
 * admin's own "except the 15th" decisions — and they come back correctly if
 * Saturdays are closed again. Stale entries have no effect while the rule is
 * off, since `isDateBlocked` only consults them against a live rule.
 */
export async function PUT(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const raw = body?.blockedWeekdays;
  if (!Array.isArray(raw) || raw.some(d => !Number.isInteger(d) || d < 0 || d > 6)) {
    return NextResponse.json({ error: "Invalid weekdays" }, { status: 400 });
  }

  try {
    const current = await read();
    const next: AvailabilitySettings = {
      ...current,
      blockedWeekdays: [...new Set(raw as number[])].sort((a, b) => a - b),
    };
    await DOC().set(next, { merge: true });
    return NextResponse.json(next);
  } catch (err) {
    console.error("[availability PUT] Firestore error:", err);
    return NextResponse.json({ error: "Database write failed." }, { status: 500 });
  }
}
