import type Stripe from "stripe";
import { db } from "@/lib/firebase-admin";
import { sendStatusEmail, orderNumber } from "@/lib/order-status-email";
import { sendStatusSms } from "@/lib/order-status-sms";

/**
 * Single source of truth for "this PaymentIntent succeeded — settle the order".
 *
 * Three independent callers converge here, by design:
 *
 *   1. `POST /api/webhook`          — Stripe's own `payment_intent.succeeded`
 *   2. `POST /api/confirm-order`    — the browser, right after confirmPayment()
 *   3. `GET  /api/cron/reconcile-orders` — a periodic sweep over Stripe
 *
 * Any one of them alone is enough to settle an order, so a customer can never
 * be charged and end up with an order stuck in `pending_payment` — which is
 * indistinguishable from an abandoned checkout in the dashboard.
 *
 * That redundancy only works because this function is idempotent: it is safe to
 * call repeatedly and concurrently for the same intent. A transaction decides
 * exactly once whether *this* caller is the one that sends the confirmation
 * email, so the customer never receives duplicates.
 */

/** Statuses that mean the order has already moved past payment. Never overwrite. */
const SETTLED_STATUSES = new Set([
  "paid",
  "collected",
  "in_progress",
  "ready_for_pickup",
  "delivered",
  "completed",
  "cancelled",
  "refunded",
]);

export type SettleResult = {
  /** False when another caller had already settled this order. */
  changed: boolean;
  /** True when the order doc was missing entirely — see `orphaned` below. */
  created: boolean;
  /** True when this call sent the confirmation email. */
  emailed: boolean;
  status: string;
};

/**
 * Marks the order behind `intent` as paid, and sends the confirmation email if
 * nobody has sent it yet.
 *
 * `source` is recorded on the order purely for diagnostics — it tells you after
 * the fact whether the webhook, the browser, or the reconcile sweep got there
 * first, which is how you find out a production webhook is misconfigured.
 */
export async function settlePaidOrder(
  intent: Stripe.PaymentIntent,
  source: "webhook" | "client" | "reconcile",
): Promise<SettleResult> {
  const ref = db.collection("orders").doc(intent.id);
  const tombstoneRef = db.collection("deleted_orders").doc(intent.id);

  const outcome = await db.runTransaction(async (tx) => {
    // Firestore requires every read before any write.
    const [snap, tombstone] = await Promise.all([tx.get(ref), tx.get(tombstoneRef)]);

    // An admin deleted this order deliberately. Recreating it would undo that,
    // and would do so repeatedly on every sweep.
    if (!snap.exists && tombstone.exists) {
      return { changed: false, created: false, emailed: false, status: "deleted", data: null };
    }

    const data = snap.exists ? snap.data()! : null;
    const current = (data?.status as string | undefined) ?? null;

    // Preserve any status the admin has already advanced the order to; only
    // pending_payment / payment_failed / missing should be promoted to `paid`.
    const alreadySettled = !!current && SETTLED_STATUSES.has(current);
    const nextStatus = alreadySettled ? current : "paid";

    // Exactly one caller wins the right to email, decided inside the transaction.
    const emailed = !data?.confirmationEmailSentAt;

    const update: Record<string, unknown> = {
      status: nextStatus,
      amount: intent.amount,
      currency: intent.currency,
      paidAt: data?.paidAt ?? new Date(),
      settledBy: data?.settledBy ?? source,
    };
    if (emailed) update.confirmationEmailSentAt = new Date();

    if (!snap.exists) {
      // The pre-create write in create-*-payment failed but the customer was
      // still charged. Everything we know is in the intent's metadata, so stamp
      // that on and flag the order loudly — it has no address and cannot be
      // fulfilled until someone contacts the customer.
      update.id = intent.id;
      update.paymentIntentId = intent.id;
      update.orphaned = true;
      update.serviceId = intent.metadata?.serviceId ?? "unknown";
      update.serviceName = intent.metadata?.serviceName ?? "Okänd order";
      update.customerId = intent.metadata?.customerId ?? "anonymous";
      update.customerEmail = intent.receipt_email ?? "";
      update.notes =
        "⚠️ Ordern skapades aldrig i databasen trots genomförd betalning. " +
        "Kontakta kunden för adress och detaljer.";
      update.createdAt = new Date();
    }

    tx.set(ref, update, { merge: true });

    return { changed: !alreadySettled, created: !snap.exists, emailed, status: nextStatus, data };
  });

  if (outcome.emailed) {
    // Both channels, fired together — the same pair the admin's status changes
    // send from /api/admin/orders/notify-status, so "order received" reaches the
    // customer the same way every later status does. `confirmationEmailSentAt`
    // gates both, so exactly one caller notifies even when the webhook, the
    // browser and the reconcile sweep all arrive at once.
    //
    // Best-effort: a failed send must never cause the caller to retry and
    // re-settle, and must never fail a Stripe webhook.
    const order = outcome.data ?? {};
    const orderNo = orderNumber(intent.id);
    const name = (order.customerName as string) ?? "";
    await Promise.all([
      sendStatusEmail({
        to: (order.customerEmail as string) ?? intent.receipt_email ?? null,
        name,
        orderNo,
        status: "order_received",
      }).catch((err) =>
        console.error("[fulfillment] confirmation email failed for", intent.id, err),
      ),
      sendStatusSms({
        to: (order.customerPhone as string) ?? null,
        name,
        orderNo,
        status: "order_received",
      }).catch((err) =>
        console.error("[fulfillment] confirmation sms failed for", intent.id, err),
      ),
    ]);
  }

  // First order flips the customer out of first-time-discount eligibility.
  const customerId = intent.metadata?.customerId;
  if (outcome.changed && customerId && customerId !== "anonymous") {
    await db
      .collection("customers")
      .doc(customerId)
      .set({ hasPlacedOrder: true }, { merge: true })
      .catch((err) => console.error("[fulfillment] hasPlacedOrder failed for", customerId, err));
  }

  return {
    changed: outcome.changed,
    created: outcome.created,
    emailed: outcome.emailed,
    status: outcome.status,
  };
}
