import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/firebase-admin";
import { settlePaidOrder } from "@/lib/order-fulfillment";

/**
 * Periodic reconciliation between Stripe and Firestore.
 *
 * Stripe is the authority on who paid. This sweep walks every PaymentIntent
 * that succeeded in the last `LOOKBACK_HOURS` and settles any whose order is
 * still sitting in `pending_payment` — the case neither the webhook nor the
 * browser callback can cover, e.g. the customer closes the tab the instant the
 * payment clears while the webhook endpoint is also down.
 *
 * Scheduled from `vercel.json`. Vercel Cron sends `Authorization: Bearer
 * $CRON_SECRET`, so set CRON_SECRET in the Vercel project env.
 */

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const LOOKBACK_HOURS = 48;

function authorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  // Fail closed: without a configured secret the endpoint stays shut rather
  // than exposing a route that mutates orders.
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const since = Math.floor(Date.now() / 1000) - LOOKBACK_HOURS * 60 * 60;

  const repaired: string[] = [];
  const orphaned: string[] = [];
  let scanned = 0;

  try {
    // auto-pagination stops at the lookback window via the `created` filter.
    for await (const intent of stripe.paymentIntents.list({
      created: { gte: since },
      limit: 100,
    })) {
      if (intent.status !== "succeeded") continue;
      scanned++;

      const snap = await db.collection("orders").doc(intent.id).get();
      const status = snap.exists ? (snap.data()?.status as string | undefined) : undefined;

      // Already settled by the webhook or the browser — the common case.
      if (status && status !== "pending_payment" && status !== "payment_failed") continue;

      // Deliberately deleted by an admin — leave it deleted.
      if (!snap.exists && (await db.collection("deleted_orders").doc(intent.id).get()).exists) continue;

      const result = await settlePaidOrder(intent, "reconcile");
      if (result.created) orphaned.push(intent.id);
      else if (result.changed) repaired.push(intent.id);
    }
  } catch (err) {
    console.error("[reconcile] sweep failed:", err);
    return NextResponse.json({ error: "Reconcile failed." }, { status: 500 });
  }

  if (repaired.length || orphaned.length) {
    // Loud on purpose: a non-empty result means an order was paid for and the
    // primary paths did not record it. Recurring hits mean the webhook is broken.
    console.error("[reconcile] repaired paid-but-unrecorded orders", { repaired, orphaned });
  }

  return NextResponse.json({
    scanned,
    repaired: repaired.length,
    orphaned: orphaned.length,
    repairedIds: repaired,
    orphanedIds: orphaned,
  });
}
