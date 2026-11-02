import { db } from "@/lib/firebase-admin";
import DriverClient, { type DriverOrder } from "./DriverClient";

// Never prerender this page: the unbounded `orders` read would otherwise run
// at build time, baking a snapshot into the deploy and risking the 60s
// per-page build limit. See CLAUDE.md, "Admin pages are never prerendered".
export const dynamic = "force-dynamic";

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
        customerName: data.customerName ?? "",
        customerPhone: data.customerPhone ?? "",
      };
    })
    .filter(o => o.status === "ready_for_pickup" || o.status === "paid");

  return <DriverClient initialOrders={orders} />;
}
