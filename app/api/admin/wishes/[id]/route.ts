import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase-admin";
import admin from "@/lib/firebase-admin";
import { getAdminSession } from "@/lib/admin-auth";
import { MAX_WISH_LENGTH } from "../route";

/**
 * Edit or remove a wish.
 *
 * Any admin may reword or delete a wish — the point is to let the requester fix
 * their own mistakes without asking anyone. Toggling `done` is separate: it
 * records that the work happened, so only the developer may set it.
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const update: Record<string, unknown> = {};

  if ("text" in body) {
    const text = String(body.text ?? "").trim();
    if (!text) return NextResponse.json({ error: "Texten kan inte vara tom." }, { status: 400 });
    if (text.length > MAX_WISH_LENGTH) {
      return NextResponse.json({ error: `Max ${MAX_WISH_LENGTH} tecken.` }, { status: 400 });
    }
    update.text = text;
  }

  if ("done" in body) {
    if (session.role !== "developer") {
      return NextResponse.json(
        { error: "Bara utvecklaren kan bocka av önskemål." },
        { status: 403 },
      );
    }
    update.done = !!body.done;
    update.doneAt = body.done ? admin.firestore.FieldValue.serverTimestamp() : null;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Inget att uppdatera." }, { status: 400 });
  }

  const ref = db.collection("wishes").doc(id);
  if (!(await ref.get()).exists) {
    return NextResponse.json({ error: "Önskemålet hittades inte." }, { status: 404 });
  }

  try {
    await ref.update(update);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[wishes PATCH]", err);
    return NextResponse.json({ error: "Kunde inte spara." }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  try {
    await db.collection("wishes").doc(id).delete();
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[wishes DELETE]", err);
    return NextResponse.json({ error: "Kunde inte ta bort." }, { status: 500 });
  }
}
