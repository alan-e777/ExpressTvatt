import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase-admin";
import { isAdmin } from "@/lib/admin-auth";
import { categoryDocId, NEW_CATEGORY_ORDER } from "@/lib/serviceCategories";

/**
 * Upsert how one category is presented on the order page. The category itself
 * is defined by the products carrying its name, so there is no create/delete
 * here — writing metadata for a name with no products simply has no effect
 * until a product uses it.
 */
export async function PUT(request: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Session expired — please sign in again." }, { status: 403 });

  const { name, icon, desc, subtitle, order, requiresInput, inputLabel, inputPlaceholder } = await request.json();
  if (typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "Kategorinamn saknas." }, { status: 400 });
  }

  const update: Record<string, unknown> = { name: name.trim() };
  if (typeof icon === "string")     update.icon     = icon;
  if (typeof desc === "string")     update.desc     = desc.trim();
  if (typeof subtitle === "string") update.subtitle = subtitle.trim();
  // Whether items here ask the customer for a note before they can be added.
  if (typeof requiresInput === "boolean")  update.requiresInput    = requiresInput;
  if (typeof inputLabel === "string")      update.inputLabel       = inputLabel.trim();
  if (typeof inputPlaceholder === "string") update.inputPlaceholder = inputPlaceholder.trim();
  if (order !== undefined) {
    const n = Number(order);
    update.order = Number.isFinite(n) ? Math.round(n) : NEW_CATEGORY_ORDER;
  }

  try {
    await db.collection("service_categories").doc(categoryDocId(name)).set(update, { merge: true });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[service-categories PUT]", err);
    return NextResponse.json({ error: "Database write failed." }, { status: 500 });
  }
}
