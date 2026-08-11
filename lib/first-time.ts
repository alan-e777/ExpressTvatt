import { db } from "@/lib/firebase-admin";

/**
 * First-order eligibility for the first-time discount.
 *
 * This is the single source of truth, shared by the checkout screen (via
 * `/api/first-time-eligibility`) and by the payment routes that decide what to
 * actually charge. Keeping both on one implementation is the point: they
 * previously used different sources and could disagree, so the price on the
 * button did not always match the amount taken.
 *
 * Never derive this from `customers/{uid}.hasPlacedOrder`. That field is
 * writable by the customer through the client SDK, so it is not trustworthy for
 * pricing — it exists only as a convenience flag.
 */

/** Statuses that mean money never actually changed hands. */
const NON_COUNTING = new Set(["pending_payment", "payment_failed"]);

/**
 * True when this customer has never had an order get past the initial
 * pending/failed state. Anonymous callers are never first-time eligible, since
 * there is no identity to attach the one-off discount to.
 */
export async function isFirstTimeCustomer(uid: string | null | undefined): Promise<boolean> {
  if (!uid || uid === "anonymous") return false;

  const prior = await db.collection("orders").where("customerId", "==", uid).get();
  const hasPlacedOrder = prior.docs.some((d) => {
    const status = d.data().status as string | undefined;
    return !!status && !NON_COUNTING.has(status);
  });

  return !hasPlacedOrder;
}
