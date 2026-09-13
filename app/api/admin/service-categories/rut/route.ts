import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase-admin";
import { isAdmin } from "@/lib/admin-auth";
import { categoryDocId } from "@/lib/serviceCategories";

/**
 * Turn RUT-avdrag on or off for a whole category — the category's own flag plus
 * every product carrying its name.
 *
 * This is a **bulk write, not an inherited setting**. `rutEligible` on the
 * product is the only thing pricing ever reads, so the category toggle has to
 * physically set it on each item; that is what lets a single product be flipped
 * back afterwards without the category overruling it. A category whose products
 * disagree therefore has no single state, which the panel shows as "delvis".
 *
 * Kept apart from the PUT on the parent route because that one upserts
 * presentation only and must never fan out across the catalogue.
 */
export async function POST(request: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Session expired — please sign in again." }, { status: 403 });

  const { name, rutEligible } = await request.json();
  if (typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "Kategorinamn saknas." }, { status: 400 });
  }
  if (typeof rutEligible !== "boolean") {
    return NextResponse.json({ error: "rutEligible måste vara true eller false." }, { status: 400 });
  }

  const category = name.trim();

  try {
    const products = await db
      .collection("services").doc("struken-tvatt").collection("StrukenTvatt")
      .where("category", "==", category)
      .get();

    // Chunked at 400: a Firestore batch takes at most 500 writes, and a long
    // catalogue would otherwise fail the toggle outright.
    const docs = products.docs;
    for (let i = 0; i < docs.length; i += 400) {
      const batch = db.batch();
      for (const d of docs.slice(i, i + 400)) batch.update(d.ref, { rutEligible });
      await batch.commit();
    }

    // The category's own flag is written last and is what Mattvätt — priced from
    // settings, with no products at all — is driven by entirely.
    await db.collection("service_categories").doc(categoryDocId(category))
      .set({ name: category, rutEligible }, { merge: true });

    return NextResponse.json({ ok: true, updatedProducts: docs.length });
  } catch (err) {
    console.error("[service-categories/rut POST]", err);
    return NextResponse.json({ error: "Database write failed." }, { status: 500 });
  }
}
