import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase-admin";
import { isAdmin } from "@/lib/admin-auth";
import { categoryDocId, MATTVATT_CATEGORY, NEW_CATEGORY_ORDER } from "@/lib/serviceCategories";

/**
 * Upsert how one category is presented on the order page. The category itself
 * is defined by the products carrying its name, so creating one is done by
 * adding its first product — but deleting one is not, which is what DELETE
 * below is for: a category only stops existing once its products are gone.
 */
export async function PUT(request: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Session expired — please sign in again." }, { status: 403 });

  const { name, icon, desc, subtitle, order, hidden, requiresInput, inputLabel, inputPlaceholder } = await request.json();
  if (typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "Kategorinamn saknas." }, { status: 400 });
  }

  const update: Record<string, unknown> = { name: name.trim() };
  if (typeof icon === "string")     update.icon     = icon;
  if (typeof desc === "string")     update.desc     = desc.trim();
  if (typeof subtitle === "string") update.subtitle = subtitle.trim();
  // Taken off the site without deleting anything — the products stay, the
  // category simply stops being offered. create-cart-payment refuses lines from
  // a hidden category, so hiding is a real block and not only cosmetic.
  if (typeof hidden === "boolean")  update.hidden   = hidden;
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

/**
 * Delete a category outright: every product carrying its name, then its own
 * presentation doc.
 *
 * Both halves are needed. The catalogue is what defines a category, so leaving
 * the products behind would resurrect it on the next load; leaving the metadata
 * behind would silently re-apply an old icon and sort order to a category
 * recreated later under the same name.
 *
 * This is destructive and has no undo, which is why the admin panel asks for a
 * confirmation naming the product count. Hiding (`hidden` above) is the
 * reversible alternative and is what the UI recommends first.
 */
export async function DELETE(request: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Session expired — please sign in again." }, { status: 403 });

  const name = (request.nextUrl.searchParams.get("name") ?? "").trim();
  if (!name) return NextResponse.json({ error: "Kategorinamn saknas." }, { status: 400 });
  if (name === MATTVATT_CATEGORY) {
    // Mattvätt is built into the order page rather than being catalogue-backed,
    // so deleting it would leave a row the admin can no longer configure. It is
    // hidden instead — same effect for the customer, and reversible.
    return NextResponse.json(
      { error: "Mattvätt är inbyggd och kan inte tas bort — dölj den i stället." },
      { status: 400 },
    );
  }

  try {
    const products = await db
      .collection("services").doc("struken-tvatt").collection("StrukenTvatt")
      .where("category", "==", name)
      .get();

    // Chunked: a Firestore batch holds at most 500 writes, and a category with
    // a long catalogue would otherwise fail the whole delete.
    const docs = products.docs;
    for (let i = 0; i < docs.length; i += 400) {
      const batch = db.batch();
      for (const d of docs.slice(i, i + 400)) batch.delete(d.ref);
      await batch.commit();
    }

    await db.collection("service_categories").doc(categoryDocId(name)).delete();
    return NextResponse.json({ ok: true, deletedProducts: docs.length });
  } catch (err) {
    console.error("[service-categories DELETE]", err);
    return NextResponse.json({ error: "Database write failed." }, { status: 500 });
  }
}
