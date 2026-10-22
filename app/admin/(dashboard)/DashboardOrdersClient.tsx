"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase-client";

/**
 * Mirrors the order document, which is what the snapshot below hands back.
 *
 * Note what is *not* here: the customer's email. It lives on `customers/{uid}`,
 * not on the order, so it needs a join — `/admin/orders` does one server-side.
 * This board reads the collection straight from the client, so it has the name
 * (every order-creating route writes `customerName` onto the order) and the
 * address, and nothing else identifying. The field used to be declared as
 * `customerEmail` and was therefore always undefined, which is why these cards
 * only ever showed an address.
 */
type Order = {
  id: string;
  customerName: string;
  address: string;
  serviceName: string;
  status: string;
  amount: number;
  createdAt: string | null;
};

const COLUMNS = [
  { status: "paid",             label: "New",                color: "#1d4ed8", bg: "#dbeafe" },
  { status: "collected",        label: "Collected",          color: "#065f46", bg: "#d1fae5" },
  { status: "in_progress",      label: "In Progress",        color: "#854d0e", bg: "#fef9c3" },
  { status: "ready_for_pickup", label: "Ready for Delivery", color: "#6d28d9", bg: "#ede9fe" },
] as const;

export default function DashboardOrdersClient() {
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, snap => {
      setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() } as Order)));
    });
    return unsub;
  }, []);

  return (
    <div
      className="admin-fill-body"
      style={{ marginTop: "3rem", marginBottom: "1.5rem", overflowX: "auto", WebkitOverflowScrolling: "touch" }}
    >
      <div className="dash-cols">
        {COLUMNS.map(col => {
          const colOrders = orders.filter(o => o.status === col.status);
          return (
            <div key={col.status} style={{ background: "#fff", border: "1px solid #eee", borderRadius: "10px", overflow: "hidden", display: "flex", flexDirection: "column" }}>
              <div style={{
                padding: "0.65rem 0.9rem",
                borderBottom: "1px solid #f0f0f0",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexShrink: 0,
              }}>
                <span style={{ fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#555" }}>
                  {col.label}
                </span>
                <span style={{
                  fontSize: "0.68rem",
                  fontWeight: 700,
                  color: col.color,
                  background: col.bg,
                  borderRadius: "999px",
                  padding: "0.15rem 0.5rem",
                  minWidth: "1.4rem",
                  textAlign: "center",
                }}>
                  {colOrders.length}
                </span>
              </div>

              <div style={{ padding: "0.5rem", display: "flex", flexDirection: "column", gap: "0.35rem", overflowY: "auto", flex: 1 }}>
                {colOrders.length === 0 ? (
                  <p style={{ color: "#ccc", fontSize: "0.72rem", textAlign: "center", padding: "0.85rem 0", margin: 0 }}>
                    —
                  </p>
                ) : (
                  colOrders.map(order => {
                    const name = (order.customerName ?? "").trim();
                    return (
                    <div key={order.id} style={{
                      background: "#fafafa",
                      border: "1px solid #f0f0f0",
                      borderRadius: "7px",
                      padding: "0.45rem 0.6rem",
                      flexShrink: 0,
                    }}>
                      <p style={{ fontSize: "0.73rem", fontWeight: 600, color: "#1a1a1a", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {name || order.serviceName || "—"}
                      </p>
                      {/* Two lines, not three: the columns are 220px at their
                          narrowest and a glance board earns its keep by staying
                          scannable. The service drops to the second line when
                          there is a name to put first — /admin/orders is where
                          the full record lives. */}
                      <p style={{ fontSize: "0.66rem", color: "#999", margin: "0.1rem 0 0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {name ? order.serviceName || order.address || "—" : order.address || "—"}
                      </p>
                    </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
