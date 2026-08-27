import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase-admin";
import { isAdmin } from "@/lib/admin-auth";
import { clampPct } from "@/lib/discount";
import { normalizePricing, normalizeUnit } from "@/lib/serviceUnits";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Session expired — please sign in again." }, { status: 403 });

  const { id } = await params;
  const body = await request.json();
  const update: Record<string, unknown> = {};

  if ("name" in body && body.name?.trim()) update.name  = body.name.trim();
  // A negative price is not merely odd — the payment route treats the catalogue
  // as authoritative, so a mistyped "-50" would quietly subtract from the rest
  // of the customer's basket. 0 is allowed: it marks a test item (see POST).
  if ("price" in body) {
    const price = Number(body.price);
    if (!Number.isFinite(price) || price < 0) {
      return NextResponse.json({ error: "Priset kan inte vara negativt." }, { status: 400 });
    }
    update.price = price;
  }
  if ("discountPercent" in body) update.discountPercent = clampPct(body.discountPercent);
  if ("icon" in body && typeof body.icon === "string") update.icon = body.icon;
  // Per-item overrides of the category's customer-input requirement.
  if ("inputDisabled" in body)    update.inputDisabled    = !!body.inputDisabled;
  if ("inputPlaceholder" in body && typeof body.inputPlaceholder === "string") {
    update.inputPlaceholder = body.inputPlaceholder.trim();
  }
  // Pricing unit and, for a measured one, the range its slider offers. Sent as a
  // set rather than field-by-field: the range only means anything next to the
  // unit it belongs to, so changing to `st` must also drop a leftover 1–25 range
  // rather than leave it behind for the price calculation to pick up.
  if ("unit" in body || "minUnits" in body || "maxUnits" in body) {
    const current = await db.collection("services").doc("struken-tvatt").collection("StrukenTvatt").doc(id).get();
    const stored  = current.exists ? current.data() ?? {} : {};
    const unit    = "unit" in body ? normalizeUnit(body.unit) : normalizeUnit(stored.unit);
    Object.assign(update, normalizePricing({
      unit,
      minUnits: "minUnits" in body ? body.minUnits : stored.minUnits,
      maxUnits: "maxUnits" in body ? body.maxUnits : stored.maxUnits,
    }));
  }
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
