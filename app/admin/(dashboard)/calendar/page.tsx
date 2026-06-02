import { db } from "@/lib/firebase-admin";
import CalendarClient, { type CalendarOrder } from "./CalendarClient";

export default async function CalendarPage() {
  const snap = await db.collection("orders").get();

  const uids = [...new Set(
    snap.docs.map(d => d.data().customerId as string).filter(id => id && id !== "anonymous")
  )];

  const emailMap: Record<string, string> = {};
  for (let i = 0; i < uids.length; i += 30) {
    const batch = uids.slice(i, i + 30);
    const customerSnap = await db.collection("customers").where("uid", "in", batch).get();
    customerSnap.docs.forEach(d => {
      const data = d.data();
      if (data.uid && data.email) emailMap[data.uid] = data.email;
    });
  }

  const orders: CalendarOrder[] = snap.docs
    .map(d => {
      const data = d.data();
      const uid = data.customerId ?? "anonymous";
      return {
        id:            data.id ?? d.id,
        serviceName:   data.serviceName ?? "—",
        amount:        data.amount ?? 0,
        status:        data.status ?? "paid",
        customerId:    uid,
        customerEmail: emailMap[uid] ?? null,
        dropoffDate:   data.dropoffDate ?? "",
        dropoffTime:   data.dropoffTime ?? "",
        notes:         data.notes ?? "",
      };
    })
    .filter(o => !!o.dropoffDate);

  return <CalendarClient orders={orders} />;
}
