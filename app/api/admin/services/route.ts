import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase-admin";
import { isAdmin } from "@/lib/admin-auth";
import { clampPct } from "@/lib/discount";

export async function POST(request: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Session expired — please sign in again." }, { status: 403 });

  const { name, description, price_ore, icon, discountPercent } = await request.json();
  if (!name || !price_ore) return NextResponse.json({ error: "name and price_ore required" }, { status: 400 });

  const id = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const doc = { id, name, description: description ?? "", price_ore, icon: icon ?? "", discountPercent: clampPct(discountPercent ?? 0) };

  try {
    await db.collection("services").doc(id).set(doc);
    return NextResponse.json({ ok: true, id });
  } catch (err) {
    console.error("[services POST] Firestore error:", err);
    return NextResponse.json({ error: "Database write failed." }, { status: 500 });
  }
}
