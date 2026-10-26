import { NextRequest, NextResponse } from "next/server";
import { db, auth, rtdb } from "@/lib/firebase-admin";

/**
 * Customer-initiated account deletion.
 *
 * App Store guideline 5.1.1(v) requires any app that can create an account to
 * let the customer delete it from inside the app — a "mail us" link is a
 * rejection. The deletion runs server-side rather than through the client SDK's
 * `deleteUser()` because that one fails with `auth/requires-recent-login` for
 * anyone who has not just signed in, which is almost everybody.
 *
 * Orders are anonymised, not deleted: bokföringslagen requires the accounting
 * record to survive for seven years, so the amounts, dates and line items stay
 * while every direct identifier on them is stripped.
 */
export const dynamic = "force-dynamic";

/** Statuses where the laundry still physically holds the customer's clothes. */
const ACTIVE_STATUSES = new Set([
  "paid",
  "collected",
  "in_progress",
  "ready_for_pickup",
]);

/** Order fields that identify a person and are not needed for the books. */
const IDENTIFYING_ORDER_FIELDS = [
  "customerName",
  "customerEmail",
  "customerPhone",
  "careOf",
  "address",
  "postalCode",
  "notes",
  "rutPersonnummer",
] as const;

export async function POST(request: NextRequest) {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Inte inloggad." }, { status: 401 });
  }

  let uid: string;
  try {
    ({ uid } = await auth.verifyIdToken(header.slice(7)));
  } catch {
    return NextResponse.json({ error: "Inte inloggad." }, { status: 401 });
  }

  try {
    const orders = await db.collection("orders").where("customerId", "==", uid).get();

    // Refuse while the laundry still has their clothes — deleting the contact
    // details mid-run would strand the order with nobody to deliver it to.
    const active = orders.docs.filter(d =>
      ACTIVE_STATUSES.has(String(d.data()?.status ?? "")),
    );
    if (active.length) {
      return NextResponse.json(
        {
          error:
            active.length === 1
              ? "Du har en pågående order. Kontot kan raderas när den är levererad."
              : `Du har ${active.length} pågående ordrar. Kontot kan raderas när de är levererade.`,
          activeOrders: active.length,
        },
        { status: 409 },
      );
    }

    // Anonymise the historical orders in batches — Firestore caps a batch at 500
    // writes and a heavy customer can exceed that.
    const deletedAt = new Date();
    for (let i = 0; i < orders.docs.length; i += 400) {
      const batch = db.batch();
      for (const doc of orders.docs.slice(i, i + 400)) {
        const scrubbed: Record<string, unknown> = {
          customerId: "deleted",
          customerDeletedAt: deletedAt,
          rutAvdrag: false,
        };
        for (const field of IDENTIFYING_ORDER_FIELDS) scrubbed[field] = "";
        batch.update(doc.ref, scrubbed);
      }
      await batch.commit();
    }

    // The customer record itself carries saved addresses and push tokens, so it
    // goes entirely.
    await db.collection("customers").doc(uid).delete();

    // Support chat lives in the Realtime Database, outside Firestore.
    await rtdb().ref(`chats/${uid}`).remove();

    // Last, so a failure above leaves an account that can still sign in and
    // retry rather than an orphaned login.
    await auth.deleteUser(uid);

    return NextResponse.json({ ok: true, anonymisedOrders: orders.size });
  } catch (err) {
    console.error("[account delete]", err);
    return NextResponse.json(
      { error: "Kunde inte radera kontot. Försök igen." },
      { status: 500 },
    );
  }
}
