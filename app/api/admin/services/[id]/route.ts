import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase-admin";
import { isAdmin } from "@/lib/admin-auth";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Session expired — please sign in again." }, { status: 403 });

  const { id } = await params;
  const body = await request.json();
  const allowed = ["name", "description", "price_ore", "icon"];
  const update: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) update[key] = body[key];
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  try {
    await db.collection("services").doc(id).set(update, { merge: true });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[services PATCH] Firestore error:", err);
    return NextResponse.json({ error: "Database write failed." }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Session expired — please sign in again." }, { status: 403 });
  const { id } = await params;
  try {
    await db.collection("services").doc(id).delete();
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[services DELETE] Firestore error:", err);
    return NextResponse.json({ error: "Database write failed." }, { status: 500 });
  }
}
