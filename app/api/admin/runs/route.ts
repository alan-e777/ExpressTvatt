import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase-admin";
import { isAdmin } from "@/lib/admin-auth";

// Driver run links stay valid for 48 hours after creation.
const RUN_LINK_TTL_MS = 48 * 60 * 60 * 1000;

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const orderIds: string[] = body.orderIds ?? [];
  const type: string = body.type ?? "dropoff";

  if (orderIds.length === 0) return NextResponse.json({ error: "No orders provided" }, { status: 400 });

  const token = crypto.randomUUID();

  await db.collection("runs").doc(token).set({
    token,
    orderIds,
    type,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + RUN_LINK_TTL_MS),
  });

  return NextResponse.json({ token });
}

// Return the most recent still-valid run token for a given type, so the admin can
// re-open / re-share a driver link that's already active (e.g. driver lost the URL).
export async function GET(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const type = req.nextUrl.searchParams.get("type") ?? "dropoff";

  // Order by createdAt only (single-field index) and filter type + expiry in memory
  // to avoid requiring a composite index.
  const snap = await db.collection("runs").orderBy("createdAt", "desc").limit(25).get();
  const now = new Date();
  const match = snap.docs.find(d => {
    const r = d.data();
    if (r.type !== type) return false;
    const expiresAt: Date | null = r.expiresAt?.toDate?.() ?? null;
    return !expiresAt || expiresAt >= now;
  });

  return NextResponse.json({ token: match ? (match.data().token as string) : null });
}
