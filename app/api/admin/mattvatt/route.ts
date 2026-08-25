import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/firebase-admin";
import { normalizeMattvattSettings, type MattvattSettings } from "@/lib/mattvatt";

// Mattvätt price per m² + the smallest/largest rug the size slider offers.
const DOC = () => db.collection("settings").doc("mattvatt");

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const snap = await DOC().get();
  return NextResponse.json(normalizeMattvattSettings(snap.exists ? (snap.data() as Partial<MattvattSettings>) : null));
}

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body: Partial<MattvattSettings> = await req.json();
  // Normalized before it is stored, so the customer pages and the payment route
  // can never read a min/max that crosses over or a negative price.
  const settings = normalizeMattvattSettings(body);
  await DOC().set(settings, { merge: true });
  // Echoed back so the editor can adopt the normalized values rather than keep
  // showing whatever was typed — a crossed-over range comes back corrected.
  return NextResponse.json({ ok: true, settings });
}
