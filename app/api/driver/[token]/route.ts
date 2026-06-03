import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase-admin";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const runSnap = await db.collection("runs").doc(token).get();
  if (!runSnap.exists) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const run = runSnap.data()!;
  const expiresAt: Date | null = run.expiresAt?.toDate?.() ?? null;
  if (expiresAt && expiresAt < new Date()) {
    return NextResponse.json({ error: "Körningslänken har gått ut." }, { status: 410 });
  }

  const orderIds: string[] = run.orderIds ?? [];

  const orders = await Promise.all(
    orderIds.map(async (id) => {
      const snap = await db.collection("orders").doc(id).get();
      if (!snap.exists) return null;
      const data = snap.data()!;
      return {
        id,
        serviceName: data.serviceName as string,
        address: data.address as string,
        postalCode: (data.postalCode as string) ?? "",
        status: data.status as string,
        dropoffDate: (data.dropoffDate as string) ?? "",
        dropoffTime: (data.dropoffTime as string) ?? "",
      };
    })
  );

  return NextResponse.json({
    type: run.type as string,
    orders: orders.filter(Boolean),
    expiresAt: expiresAt ? expiresAt.toISOString() : null,
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const runSnap = await db.collection("runs").doc(token).get();
  if (!runSnap.exists) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const run = runSnap.data()!;
  const expiresAt: Date | null = run.expiresAt?.toDate?.() ?? null;
  if (expiresAt && expiresAt < new Date()) {
    return NextResponse.json({ error: "Körningslänken har gått ut." }, { status: 410 });
  }

  const body = await req.json();
  const { orderId, delivered }: { orderId: string; delivered: boolean } = body;

  if (!orderId || typeof delivered !== "boolean") {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (!(run.orderIds as string[]).includes(orderId)) {
    return NextResponse.json({ error: "Order not in this run" }, { status: 400 });
  }

  const revertStatus = run.type === "pickup" ? "paid" : "ready_for_pickup";
  const newStatus = delivered ? "delivered" : revertStatus;

  await db.collection("orders").doc(orderId).update({ status: newStatus });

  return NextResponse.json({ ok: true });
}
