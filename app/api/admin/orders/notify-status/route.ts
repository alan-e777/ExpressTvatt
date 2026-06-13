import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase-admin";
import { isAdmin } from "@/lib/admin-auth";
import { sendStatusEmail, orderNumber } from "@/lib/order-status-email";

/**
 * Sends the "your order status changed" email to the customer.
 *
 * Called by the admin Orders UI ~10s after a status change (see
 * components/admin/OrderStatusNotifier.tsx). The order is re-read server-side so
 * we never trust client-supplied email/name, and the new status is validated.
 */
const VALID_STATUSES = ["paid", "in_progress", "ready_for_pickup", "completed", "collected", "cancelled", "delivered", "payment_failed", "refunded"];

export async function POST(request: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Session expired — please sign in again." }, { status: 403 });
  }

  let body: { orderId?: string; status?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { orderId, status } = body;
  if (!orderId || !status) {
    return NextResponse.json({ error: "orderId and status are required" }, { status: 400 });
  }
  if (!VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  try {
    const snap = await db.collection("orders").doc(orderId).get();
    if (!snap.exists) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    const order = snap.data() ?? {};

    const result = await sendStatusEmail({
      to: order.customerEmail ?? null,
      name: order.customerName ?? "",
      orderNo: orderNumber(order.paymentIntentId ?? orderId),
      status,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 502 });
    }
    return NextResponse.json({ ok: true, skipped: result.skipped ?? null });
  } catch (err) {
    console.error("[notify-status] error:", err);
    return NextResponse.json({ error: "Failed to send notification" }, { status: 500 });
  }
}
