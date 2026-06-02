import { db } from "@/lib/firebase-admin";
import CustomersClient, { type CustomerRow } from "./CustomersClient";

export default async function CustomersPage() {
  // Fetch all customers and all orders in parallel
  const [customerSnap, orderSnap] = await Promise.all([
    db.collection("customers").get(),
    db.collection("orders").get(),
  ]);

  // Build order lookup keyed by customerId
  type RawOrder = {
    id: string; serviceName: string; status: string;
    amount: number; createdAt: string | null;
  };
  const ordersByCustomer: Record<string, RawOrder[]> = {};
  for (const d of orderSnap.docs) {
    const data = d.data();
    const cid  = data.customerId as string;
    if (!cid || cid === "anonymous") continue;
    const entry: RawOrder = {
      id:          d.id,
      serviceName: data.serviceName ?? "—",
      status:      data.status ?? "paid",
      amount:      data.amount ?? 0,
      createdAt:   data.createdAt?.toDate?.()?.toISOString() ?? null,
    };
    (ordersByCustomer[cid] ??= []).push(entry);
  }

  // Build customer rows, joined with order stats
  const rows: CustomerRow[] = customerSnap.docs.map(d => {
    const data   = d.data();
    const uid    = d.id;
    const orders = ordersByCustomer[uid] ?? [];

    const totalSpend    = orders.reduce((s, o) => s + o.amount, 0);
    const lastOrderDate = orders.reduce<string | null>((latest, o) => {
      if (!o.createdAt) return latest;
      if (!latest) return o.createdAt;
      return o.createdAt > latest ? o.createdAt : latest;
    }, null);

    return {
      uid,
      name:          data.name ?? "Unknown",
      email:         data.email ?? "",
      phone:         data.phone ?? "",
      createdAt:     data.createdAt?.toDate?.()?.toISOString() ?? null,
      orderCount:    orders.length,
      totalSpend,
      lastOrderDate,
      orders:        orders.sort((a, b) =>
        (b.createdAt ?? "").localeCompare(a.createdAt ?? "")
      ),
    };
  });

  // Sort by most recent order first; customers with no orders go to the bottom
  rows.sort((a, b) => {
    if (!a.lastOrderDate && !b.lastOrderDate) return 0;
    if (!a.lastOrderDate) return 1;
    if (!b.lastOrderDate) return -1;
    return b.lastOrderDate.localeCompare(a.lastOrderDate);
  });

  return <CustomersClient initialRows={rows} />;
}
