import { db } from "@/lib/firebase-admin";
import DriverClient, { type DriverOrder } from "./DriverClient";

export default async function DriverPage() {
  const snap = await db.collection("orders").orderBy("createdAt", "desc").get();

  const orders: DriverOrder[] = snap.docs
    .map(d => {
      const data = d.data();
      return {
        id: data.id ?? d.id,
        serviceName: data.serviceName ?? "—",
        address: data.address ?? "",
        postalCode: data.postalCode ?? "",
        status: data.status ?? "paid",
        dropoffDate: data.dropoffDate ?? "",
        dropoffTime: data.dropoffTime ?? "",
        notes: data.notes ?? "",
      };
    })
    .filter(o => o.status === "ready_for_pickup" || o.status === "paid");

  return <DriverClient initialOrders={orders} />;
}
