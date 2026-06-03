import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase-admin";
import { isAdmin } from "@/lib/admin-auth";

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
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  });

  return NextResponse.json({ token });
}
