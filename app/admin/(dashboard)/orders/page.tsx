import { db } from "@/lib/firebase-admin";
import { FieldPath } from "firebase-admin/firestore";
import OrdersClient, { type Order } from "./OrdersClient";

// Never prerender this page: the unbounded `orders` read, plus a `customers`
// lookup per batch, would otherwise run at build time, baking a snapshot into
// the deploy and risking the 60s per-page build limit. See CLAUDE.md,
// "Admin pages are never prerendered".
export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const snap = await db.collection("orders").orderBy("createdAt", "desc").get();

  // Collect unique customer UIDs (excluding anonymous)
  const uids = [...new Set(
    snap.docs.map(d => d.data().customerId as string).filter(id => id && id !== "anonymous")
  )];

  // Batch-fetch customer profiles (Firestore limit: 30 per 'in' query).
  // The phone comes along with the email: a number is only stamped onto the
  // order document by the payment routes, so an order placed before that — or
  // by a client that never sent one — has nothing to show unless the profile
  // is consulted, exactly as the email already is.
  const contactMap: Record<string, { email?: string; phone?: string }> = {};
  for (let i = 0; i < uids.length; i += 30) {
    const batch = uids.slice(i, i + 30);
    const customerSnap = await db.collection("customers").where(FieldPath.documentId(), "in", batch).get();
    customerSnap.docs.forEach(d => {
      const profile = d.data();
      contactMap[d.id] = { email: profile.email, phone: profile.phone };
    });
  }

  const orders: Order[] = snap.docs.map(d => {
    const data = d.data();
    const uid  = data.customerId ?? "—";
    return {
      id:            data.id ?? d.id,
      paymentIntentId: data.paymentIntentId ?? "",
      serviceName:   data.serviceName ?? "—",
      amount:        data.amount ?? 0,
      status:        data.status ?? "paid",
      customerId:    uid,
      customerName:  data.customerName ?? "",
      customerEmail: contactMap[uid]?.email ?? null,
      customerPhone: data.customerPhone || contactMap[uid]?.phone || "",
      platform:      (data.platform === 'mobile' ? 'mobile' : 'web') as 'mobile' | 'web',
      createdAt:     data.createdAt?.toDate?.()?.toISOString() ?? null,
      notes:         data.notes ?? "",
      adminNotes:    data.adminNotes ?? "",
      address:       data.address ?? "",
      postalCode:    data.postalCode ?? "",
      dropoffDate:   data.dropoffDate ?? "",
      dropoffTime:   data.dropoffTime ?? "",
      pickupDate:    data.pickupDate ?? data.dropoffDate ?? "",
      pickupTime:    data.pickupTime ?? data.dropoffTime ?? "",
      deliveryDate:  data.deliveryDate ?? "",
      deliveryTime:  data.deliveryTime ?? "",
      customFields:  data.customFields ?? {},
      items:         data.items ?? [],
      // `at` is a Firestore Timestamp — a class instance, which cannot cross the
      // Server → Client Component boundary. Flattened like createdAt above.
      confirmationNotice: data.confirmationNotice
        ? { ...data.confirmationNotice, at: data.confirmationNotice.at?.toDate?.()?.toISOString() ?? null }
        : null,
      tags:          data.tags ?? (data.rutAvdrag ? ["RUT"] : []),
      rutAvdrag:     !!data.rutAvdrag,
      rutVerified:   !!data.rutVerified,
      rutPersonnummer: data.rutPersonnummer ?? "",
      rutDiscountPercent: data.rutDiscountPercent ?? 0,
      rutRefundOre:  data.rutRefundOre ?? 0,
    };
  });

  return <OrdersClient initialOrders={orders} />;
}
