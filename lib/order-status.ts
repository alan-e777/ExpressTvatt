// The statuses an order has while it is still real work for the laundry.
//
// An order is created as `pending_payment` *before* the card is charged
// (`create-cart-payment` pre-writes the row so the webhook has something to
// settle), so abandoned checkouts accumulate forever and must never be mistaken
// for bookings. `payment_failed` is the same story. At the other end,
// `delivered` / `completed` / `cancelled` / `refunded` are finished.
//
// Both admin views that answer "what is on our plate" key off this one list:
// the Orders table's default status filter and the Calendar. They were two
// hand-maintained copies of the same four strings, which is how a calendar
// quietly starts disagreeing with the orders list.
export const ACTIVE_ORDER_STATUSES = [
  'paid',
  'collected',
  'in_progress',
  'ready_for_pickup',
] as const;

export type ActiveOrderStatus = (typeof ACTIVE_ORDER_STATUSES)[number];

/** Whether an order still represents outstanding work. */
export function isActiveOrderStatus(status: string): boolean {
  return (ACTIVE_ORDER_STATUSES as readonly string[]).includes(status);
}
