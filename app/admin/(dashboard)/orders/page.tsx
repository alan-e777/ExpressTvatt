import { db } from "@/lib/firebase-admin";
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
    const customerSnap = await db.collection("customers").where("uid", "in", batch).get();
    customerSnap.docs.forEach(d => {
      const data = d.data();
      if (data.uid && data.email) emailMap[data.uid] = data.email;
    });
  }

  const orders: Order[] = snap.docs.map(d => {
    const data = d.data();
    const uid  = data.customerId ?? "—";
    return {
      id:            data.id ?? d.id,
      serviceName:   data.serviceName ?? "—",
      amount:        data.amount ?? 0,
      status:        data.status ?? "paid",
      customerId:    uid,
      customerEmail: emailMap[uid] ?? null,
      createdAt:     data.createdAt?.toDate?.()?.toISOString() ?? null,
      notes:         data.notes ?? "",
      adminNotes:    data.adminNotes ?? "",
      address:       data.address ?? "",
      postalCode:    data.postalCode ?? "",
      dropoffDate:   data.dropoffDate ?? "",
      dropoffTime:   data.dropoffTime ?? "",
      customFields:  data.customFields ?? {},
      items:         data.items ?? [],
    };
  });

  return <OrdersClient initialOrders={orders} />;
}
