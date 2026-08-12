import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase-admin";
import admin from "@/lib/firebase-admin";
import { getAdminSession, ROOT_DISPLAY_NAME } from "@/lib/admin-auth";

/**
 * Shared wishlist — feature requests the shop owner raises for the developer.
 *
 * Every admin sees the same list and can add to it. Ticking an item off is
 * restricted to the developer, since "done" is a statement about work having
 * been carried out, not something the requester decides. Completed wishes are
 * kept and shown struck through rather than removed, so the requester can see
 * what has been dealt with.
 */

export const MAX_WISH_LENGTH = 500;

export type WishRow = {
  id: string;
  text: string;
  done: boolean;
  createdAt: number | null;
  createdByName: string;
  isMine: boolean;
};

export async function GET() {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const snap = await db.collection("wishes").orderBy("createdAt", "desc").get();

  const wishes: WishRow[] = snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      text: data.text ?? "",
      done: data.done === true,
      createdAt: data.createdAt?.toMillis?.() ?? null,
      createdByName: data.createdByName ?? "",
      isMine: data.createdBy === session.uid,
    };
  });

  // Open wishes first, each group newest-first, so the list reads as a worklist.
  wishes.sort((a, b) => Number(a.done) - Number(b.done) || (b.createdAt ?? 0) - (a.createdAt ?? 0));

  return NextResponse.json({
    wishes,
    // Only the developer may mark work as done.
    canComplete: session.role === "developer",
  });
}

export async function POST(request: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let text: string;
  try {
    ({ text } = await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  text = (text ?? "").trim();
  if (!text) return NextResponse.json({ error: "Skriv något först." }, { status: 400 });
  if (text.length > MAX_WISH_LENGTH) {
    return NextResponse.json(
      { error: `Max ${MAX_WISH_LENGTH} tecken.` },
      { status: 400 },
    );
  }

  const createdByName =
    session.uid === process.env.ADMIN_UID ? ROOT_DISPLAY_NAME : session.email ?? "";

  try {
    const ref = await db.collection("wishes").add({
      text,
      done: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: session.uid,
      createdByName,
    });
    return NextResponse.json({ id: ref.id, text, done: false, createdByName });
  } catch (err) {
    console.error("[wishes POST]", err);
    return NextResponse.json({ error: "Kunde inte spara önskemålet." }, { status: 500 });
  }
}
