import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase-admin";
import { isAdmin } from "@/lib/admin-auth";
import { sendStatusEmail, orderNumber } from "@/lib/order-status-email";
import { sendStatusSms } from "@/lib/order-status-sms";

/**
 * Notifies the customer that their order status changed — by email (Resend) and
 * SMS (46elks), fired together.
 *
 * Called by the admin Orders UI ~10s after a status change (see
 * components/admin/OrderStatusNotifier.tsx). The order is re-read server-side
 * and the recipient's email/phone/name come from their `customers/{uid}`
 * profile, so we never trust client-supplied contact details. The new status is
 * validated. Both channels are best-effort: a missing key or recipient is
 * skipped, and one channel failing never blocks the other.
 */
const VALID_STATUSES = ["paid", "in_progress", "ready_for_pickup", "completed", "collected", "cancelled", "delivered", "payment_failed", "refunded"];

export async function POST(request: NextRequest) {
  console.log("[notify-status] POST received");
  if (!(await isAdmin())) {
    console.log("[notify-status] not admin");
    return NextResponse.json({ error: "Session expired — please sign in again." }, { status: 403 });
  }

  let body: { orderId?: string; status?: string };
  try {
    body = await request.json();
  } catch {
    console.log("[notify-status] invalid json");
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { orderId, status } = body;
  console.log("[notify-status] orderId:", orderId, "status:", status);
  if (!orderId || !status) {
    return NextResponse.json({ error: "orderId and status are required" }, { status: 400 });
  }
  if (!VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  try {
    const snap = await db.collection("orders").doc(orderId).get();
    if (!snap.exists) {
      console.log("[notify-status] order not found");
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    const order = snap.data() ?? {};

    // Contact details live on the customer profile, not the order doc. Re-read
    // them server-side; fall back to anything denormalised onto the order.
    let email: string | null = order.customerEmail ?? null;
    let phone: string | null = order.customerPhone ?? null;
    let name: string = order.customerName ?? "";
    const customerId = order.customerId;
    if (customerId && customerId !== "anonymous") {
      const custSnap = await db.collection("customers").doc(customerId).get();
      const cust = custSnap.data();
      if (cust) {
        email = cust.email ?? email;
        phone = cust.phone ?? phone;
        name = cust.name ?? name;
      }
    }
    console.log("[notify-status] resolved recipient — email:", email, "phone:", phone, "name:", name);

    const orderNo = orderNumber(order.paymentIntentId ?? orderId);

    // Fire email + SMS together; neither blocks the other.
    const [emailResult, smsResult] = await Promise.all([
      sendStatusEmail({ to: email, name, orderNo, status }),
      sendStatusSms({ to: phone, name, orderNo, status }),
    ]);

    console.log("[notify-status] email result:", emailResult, "sms result:", smsResult);

    // Surface a failure only if a configured channel actually errored.
    if (!emailResult.ok || !smsResult.ok) {
      const error = [
        !emailResult.ok ? `e-post: ${emailResult.error}` : null,
        !smsResult.ok ? `sms: ${smsResult.error}` : null,
      ].filter(Boolean).join("; ");
      return NextResponse.json({ error }, { status: 502 });
    }
    return NextResponse.json({
      ok: true,
      email: { skipped: emailResult.skipped ?? null },
      sms: { skipped: smsResult.skipped ?? null },
    });
  } catch (err) {
    console.error("[notify-status] error:", err);
    return NextResponse.json({ error: "Failed to send notification" }, { status: 500 });
  }
}
