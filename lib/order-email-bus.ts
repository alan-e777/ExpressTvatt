"use client";

/**
 * Tiny client-side pub/sub that decouples the Orders table (which knows when a
 * status changed) from the OrderStatusNotifier (which shows the 10s countdown
 * banner and fires the email). Both live in the admin client bundle, so a shared
 * module is the simplest reliable channel.
 */
export type QueuedEmail = {
  orderId: string;
  orderNo: string;
  customerName: string;
  status: string;
  statusLabel: string;
  /**
   * What the order's status was before this change. The status is written to
   * Firestore immediately and only the email is deferred, so "Ångra" has to put
   * this value back — cancelling the email alone would leave the order sitting
   * at a status the admin just said they did not want.
   */
  previousStatus: string;
};

type Listener = (payload: QueuedEmail) => void;

const listeners = new Set<Listener>();

/** Called by the Orders table when an order's status changes. */
export function queueStatusEmail(payload: QueuedEmail) {
  listeners.forEach(l => l(payload));
}

/** Subscribed to by the notifier. Returns an unsubscribe fn. */
export function onStatusEmailQueued(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
