import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase-admin";
import { isAdmin } from "@/lib/admin-auth";

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Session expired — please sign in again." }, { status: 403 });
  const { id } = await params;
  try {
    await db.collection("orders").doc(id).delete();
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[orders DELETE] Firestore error:", err);
    return NextResponse.json({ error: "Database delete failed." }, { status: 500 });
  }
}

const VALID_STATUSES = ["paid", "in_progress", "ready_for_pickup", "completed", "collected", "cancelled", "delivered", "payment_failed", "refunded"];

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Session expired — please sign in again." }, { status: 403 });

  const { id } = await params;
  const body = await request.json();
  const update: Record<string, unknown> = {};

  if ("status" in body) {
    if (!VALID_STATUSES.includes(body.status)) return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    update.status = body.status;
  }

  if ("adminNotes" in body) {
    update.adminNotes = String(body.adminNotes ?? "");
  }

  if (Object.keys(update).length === 0) return NextResponse.json({ error: "Nothing to update" }, { status: 400 });

  try {
    const orderRef = db.collection("orders").doc(id);

    // If setting to ready_for_pickup, check it isn't already that status before notifying
    if (update.status === "ready_for_pickup") {
      const orderSnap = await orderRef.get();
      const order = orderSnap.data();

      if (order && order.status !== "ready_for_pickup") {
        await orderRef.update(update);
        sendReadyForPickupNotification(order.customerId, order.serviceName).catch(err =>
          console.error("[push] Failed to send ready_for_pickup notification:", err)
        );
        return NextResponse.json({ ok: true });
      }
    }

    await orderRef.update(update);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[orders PATCH] Firestore error:", err);
    return NextResponse.json({ error: "Database write failed." }, { status: 500 });
  }
}

async function sendReadyForPickupNotification(customerId: string, serviceName: string) {
  if (!customerId || customerId === "anonymous") return;

  const customerSnap = await db.collection("customers").doc(customerId).get();
  const pushTokens: string[] = Object.keys(customerSnap.data()?.pushTokens ?? {});

  if (pushTokens.length === 0) return;

  const messages = pushTokens.map(token => ({
    to: token,
    sound: "default",
    title: "Din order är klar! 🎉",
    body: `${serviceName} är redo för leverans.`,
    data: { type: "ready_for_pickup" },
  }));

  await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
    },
    body: JSON.stringify(messages),
  });
}
