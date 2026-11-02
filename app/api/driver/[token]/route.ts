import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase-admin";
import { resolveCustomerContact } from "@/lib/customer-contact";

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

      // The driver has to be able to ring ahead and confirm a pickup, so the
      // name and number go out with the run. `resolveCustomerContact` is the
      // same helper the payment routes use, which fills a blank phone from
      // `customers/{uid}` — it short-circuits when the order already carries
      // all three, so a modern order costs no extra read.
      const contact = await resolveCustomerContact(data.customerId as string, {
        customerName:  data.customerName as string,
        customerEmail: data.customerEmail as string,
        customerPhone: data.customerPhone as string,
      });

      // This route is public: the run token is a bearer credential, handed to
      // the driver over SMS, and anyone holding the link sees this payload.
      // Name + phone is what the job needs and the payload stops there —
      // no email, no order value, no notes, and never the RUT personnummer.
      return {
        id,
        serviceName: data.serviceName as string,
        address: data.address as string,
        postalCode: (data.postalCode as string) ?? "",
        status: data.status as string,
        dropoffDate: (data.dropoffDate as string) ?? "",
        dropoffTime: (data.dropoffTime as string) ?? "",
        customerName: contact.customerName,
        customerPhone: contact.customerPhone,
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
