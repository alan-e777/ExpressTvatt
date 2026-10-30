import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase-admin";
import { consentChangeFields } from "@/lib/newsletter";
import { guestOptOutKey, unsubscribeConfigured, verifyGuestUnsubscribeToken, verifyUnsubscribeToken } from "@/lib/unsubscribe";

/**
 * Turns marketing consent off from a link in an email. No session required —
 * the token in the URL is the authorisation.
 *
 * **POST, not GET, and that is not a style preference.** Mail clients, link
 * scanners and security gateways fetch every URL in a message to check it.
 * If a GET switched the flag, a customer could be silently unsubscribed by
 * their own employer's spam filter — and the shop would never know why their
 * list was draining. A mutation behind POST is not prefetched.
 *
 * Deliberately answers the same way whether or not the uid exists, so the
 * endpoint cannot be used to test which customer ids are real.
 */
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!unsubscribeConfigured()) {
    // Failing loudly here is right: silently reporting success would tell a
    // customer they had opted out when nothing was written.
    console.error("[unsubscribe] UNSUBSCRIBE_SECRET is not set — cannot verify links");
    return NextResponse.json({ ok: false, error: "not_configured" }, { status: 503 });
  }

  let uid = "";
  let email = "";
  let token = "";
  try {
    const body = await req.json();
    uid = String(body?.uid ?? "").trim();
    email = String(body?.email ?? "").trim();
    token = String(body?.token ?? "").trim();
  } catch {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }

  // ── Guests ────────────────────────────────────────────────────────────────
  // No account, so nothing to flip: the opt-out is recorded on its own and the
  // export reads it. Kept separate from the uid path rather than folded into
  // it, so a guest token can never authorise a write to a customer document.
  if (email && !uid) {
    if (!verifyGuestUnsubscribeToken(email, token)) {
      return NextResponse.json({ ok: false, error: "invalid_link" }, { status: 403 });
    }
    try {
      await db.collection("marketing_optouts").doc(guestOptOutKey(email)).set({
        email: email.toLowerCase(),
        optedOutAt: new Date().toISOString(),
        source: "guest_link",
      });
      return NextResponse.json({ ok: true });
    } catch (err) {
      console.error("[unsubscribe] guest", err);
      return NextResponse.json({ ok: false, error: "write_failed" }, { status: 500 });
    }
  }

  if (!verifyUnsubscribeToken(uid, token)) {
    return NextResponse.json({ ok: false, error: "invalid_link" }, { status: 403 });
  }

  try {
    const ref = db.collection("customers").doc(uid);
    const snap = await ref.get();

    // Already gone, or never existed. Report success either way: the caller
    // holds a valid token, the outcome they asked for is the outcome they have,
    // and distinguishing the two would leak which ids exist.
    if (!snap.exists) {
      console.warn(`[unsubscribe] valid token for a customer that no longer exists: ${uid}`);
      return NextResponse.json({ ok: true });
    }

    // merge, not set: this touches the consent fields and nothing else.
    await ref.set(consentChangeFields(false, "web"), { merge: true });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[unsubscribe]", err);
    return NextResponse.json({ ok: false, error: "write_failed" }, { status: 500 });
  }
}
