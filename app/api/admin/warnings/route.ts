import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase-admin";
import admin from "@/lib/firebase-admin";
import { isAdmin } from "@/lib/admin-auth";

/**
 * Reusable product warnings ("bra att veta").
 *
 * A warning is written once and attached to any number of products, so a remark
 * like "Vi ansvarar ej för knappar" can cover jeans, skjortor and kavajer
 * without being retyped — and editing it once updates every product that uses
 * it. Products reference warnings by id in their `warningIds` array.
 */

export const MAX_WARNING_LENGTH = 500;

export type WarningRow = { id: string; text: string; order: number };

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Session expired — please sign in again." }, { status: 403 });
  }

  const snap = await db.collection("product_warnings").orderBy("order").get();
  const warnings: WarningRow[] = snap.docs.map((d) => ({
    id: d.id,
    text: d.data().text ?? "",
    order: d.data().order ?? 0,
  }));

  return NextResponse.json({ warnings });
}

export async function POST(request: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Session expired — please sign in again." }, { status: 403 });
  }

  let body: { text?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const text = (body.text ?? "").trim();
  if (!text) {
    return NextResponse.json({ error: "Skriv en text för varningen." }, { status: 400 });
  }
  if (text.length > MAX_WARNING_LENGTH) {
    return NextResponse.json(
      { error: `Texten får vara högst ${MAX_WARNING_LENGTH} tecken.` },
      { status: 400 },
    );
  }

  try {
    const existing = await db.collection("product_warnings").get();
    const maxOrder = existing.docs.reduce((m, d) => Math.max(m, d.data().order ?? 0), 0);

    const ref = await db.collection("product_warnings").add({
      text,
      order: maxOrder + 1,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ id: ref.id, text, order: maxOrder + 1 });
  } catch (err) {
    console.error("[warnings POST]", err);
    return NextResponse.json({ error: "Database write failed." }, { status: 500 });
  }
}
