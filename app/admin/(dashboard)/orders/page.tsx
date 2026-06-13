import { db } from "@/lib/firebase-admin";
import { FieldPath } from "firebase-admin/firestore";
import OrdersClient, { type Order } from "./OrdersClient";

export default async function OrdersPage() {
  const snap = await db.collection("orders").orderBy("createdAt", "desc").get();

  // Collect unique customer UIDs (excluding anonymous)
  const uids = [...new Set(
    snap.docs.map(d => d.data().customerId as string).filter(id => id && id !== "anonymous")
  )];

  // Batch-fetch customer profiles (Firestore limit: 30 per 'in' query)
  const emailMap: Record<string, string> = {};
  for (let i = 0; i < uids.length; i += 30) {
    const batch = uids.slice(i, i + 30);
    const customerSnap = await db.collection("customers").where(FieldPath.documentId(), "in", batch).get();
    customerSnap.docs.forEach(d => {
      if (d.data().email) emailMap[d.id] = d.data().email;
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
      customerEmail: emailMap[uid] ?? null,
      platform:      (data.platform === 'mobile' ? 'mobile' : 'web') as 'mobile' | 'web',
      createdAt:     data.createdAt?.toDate?.()?.toISOString() ?? null,
      notes:         data.notes ?? "",
      adminNotes:    data.adminNotes ?? "",
      address:       data.address ?? "",
      postalCode:    data.postalCode ?? "",
      dropoffDate:   data.dropoffDate ?? "",
      dropoffTime:   data.dropoffTime ?? "",
      customFields:  data.customFields ?? {},
      items:         data.items ?? [],
      tags:          data.tags ?? (data.rutAvdrag ? ["RUT"] : []),
      rutAvdrag:     !!data.rutAvdrag,
      rutPersonnummer: data.rutPersonnummer ?? "",
      rutDiscountPercent: data.rutDiscountPercent ?? 0,
      rutRefundOre:  data.rutRefundOre ?? 0,
    };
  });

  return <OrdersClient initialOrders={orders} />;
}
