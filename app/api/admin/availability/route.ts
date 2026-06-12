import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

const DOC = () => db.collection("settings").doc("availability");
const YMD = /^\d{4}-\d{2}-\d{2}$/;

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const snap = await DOC().get();
  return NextResponse.json({ blockedDates: snap.data()?.blockedDates ?? [] });
}

// Toggle a single day. Body: { date: "YYYY-MM-DD", blocked: boolean }.
// blocked=true marks the day unavailable for booking; false reopens it.
export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { date, blocked } = await req.json();
  if (typeof date !== "string" || !YMD.test(date)) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }

  try {
    await DOC().set(
      { blockedDates: blocked ? FieldValue.arrayUnion(date) : FieldValue.arrayRemove(date) },
      { merge: true }
    );
    const snap = await DOC().get();
    return NextResponse.json({ blockedDates: snap.data()?.blockedDates ?? [] });
  } catch (err) {
    console.error("[availability POST] Firestore error:", err);
    return NextResponse.json({ error: "Database write failed." }, { status: 500 });
  }
}
