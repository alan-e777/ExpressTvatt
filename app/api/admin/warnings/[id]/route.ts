import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase-admin";
import admin from "@/lib/firebase-admin";
import { isAdmin } from "@/lib/admin-auth";
import { MAX_WARNING_LENGTH } from "../route";

const STRUKEN = () =>
  db.collection("services").doc("struken-tvatt").collection("StrukenTvatt");

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Session expired — please sign in again." }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const text = (body.text ?? "").trim();

  if (!text) return NextResponse.json({ error: "Skriv en text för varningen." }, { status: 400 });
  if (text.length > MAX_WARNING_LENGTH) {
    return NextResponse.json(
      { error: `Texten får vara högst ${MAX_WARNING_LENGTH} tecken.` },
      { status: 400 },
    );
  }

  try {
    // Products store only the id, so editing here updates every product at once.
    await db.collection("product_warnings").doc(id).update({ text });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[warnings PATCH]", err);
    return NextResponse.json({ error: "Database write failed." }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Session expired — please sign in again." }, { status: 403 });
  }

  const { id } = await params;

  try {
    // Detach from every product first, so no product is left pointing at a
    // warning that no longer exists.
    const attached = await STRUKEN().where("warningIds", "array-contains", id).get();
    for (let i = 0; i < attached.docs.length; i += 400) {
      const batch = db.batch();
      attached.docs.slice(i, i + 400).forEach((d) =>
        batch.update(d.ref, { warningIds: admin.firestore.FieldValue.arrayRemove(id) }),
      );
      await batch.commit();
    }

    await db.collection("product_warnings").doc(id).delete();
    return NextResponse.json({ ok: true, detachedFrom: attached.size });
  } catch (err) {
    console.error("[warnings DELETE]", err);
    return NextResponse.json({ error: "Database write failed." }, { status: 500 });
  }
}
