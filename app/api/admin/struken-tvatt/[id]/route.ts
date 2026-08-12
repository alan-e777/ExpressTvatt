import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase-admin";
import { isAdmin } from "@/lib/admin-auth";
import { clampPct } from "@/lib/discount";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Session expired — please sign in again." }, { status: 403 });

  const { id } = await params;
  const body = await request.json();
  const update: Record<string, unknown> = {};

  if ("name" in body && body.name?.trim()) update.name  = body.name.trim();
  // A negative price is not merely odd — the payment route treats the catalogue
  // as authoritative, so a mistyped "-50" would quietly subtract from the rest
  // of the customer's basket.
  if ("price" in body) {
    const price = Number(body.price);
    if (!Number.isFinite(price) || price <= 0) {
      return NextResponse.json({ error: "Priset måste vara större än 0." }, { status: 400 });
    }
    update.price = price;
  }
  if ("discountPercent" in body) update.discountPercent = clampPct(body.discountPercent);
  if ("icon" in body && typeof body.icon === "string") update.icon = body.icon;
  // Which reusable warnings apply to this specific garment. Set per item, not
  // per category, so "Hem" can hold items with entirely different remarks.
  if ("warningIds" in body && Array.isArray(body.warningIds)) {
    update.warningIds = body.warningIds.filter((w: unknown) => typeof w === "string");
  }

  if (Object.keys(update).length === 0) return NextResponse.json({ error: "Nothing to update." }, { status: 400 });

  try {
    await db.collection("services").doc("struken-tvatt").collection("StrukenTvatt").doc(id).update(update);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[struken-tvatt PATCH]", err);
    return NextResponse.json({ error: "Database write failed." }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Session expired — please sign in again." }, { status: 403 });

  const { id } = await params;
  try {
    await db.collection("services").doc("struken-tvatt").collection("StrukenTvatt").doc(id).delete();
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[struken-tvatt DELETE]", err);
    return NextResponse.json({ error: "Database write failed." }, { status: 500 });
  }
}
