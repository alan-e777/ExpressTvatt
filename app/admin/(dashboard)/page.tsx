import { db } from "@/lib/firebase-admin";
import DashboardMapClient from "./DashboardMapClient";
import DashboardOrdersClient from "./DashboardOrdersClient";

export default async function AdminDashboard() {
  const [ordersSnap, servicesSnap] = await Promise.all([
    db.collection("orders").get(),
    db.collection("services").get(),
  ]);

  const orders = ordersSnap.docs.map(d => d.data());
  const inProgressCount = orders.filter(o => o.status === "in_progress").length;
  const totalRevenue = orders.filter(o => o.status === "paid" || o.status === "completed").reduce((sum, o) => sum + (o.amount ?? 0), 0);

  return (
    <div>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.25rem" }}>Dashboard</h1>
      <p style={{ color: "#999", marginBottom: "2rem", fontSize: "0.875rem" }}>Welcome back. Here's what's going on.</p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem" }}>
        <StatCard label="Total Orders" value={String(orders.length)} />
        <StatCard label="In Progress" value={String(inProgressCount)} highlight={inProgressCount > 0} />
        <StatCard label="Total Revenue" value={`${(totalRevenue / 100).toLocaleString("sv-SE")} kr`} />
        <StatCard label="Services" value={String(servicesSnap.size)} />
      </div>

      <DashboardOrdersClient />
      <DashboardMapClient />
    </div>
  );
}

function StatCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div style={{ background: "#fff", border: `1px solid ${highlight ? "#fde68a" : "#eee"}`, borderRadius: "10px", padding: "1.25rem 1.5rem" }}>
      <p style={{ color: "#999", fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "0.5rem" }}>{label}</p>
      <p style={{ fontSize: "1.75rem", fontWeight: 700, color: highlight ? "#b45309" : "#1a1a1a" }}>{value}</p>
    </div>
  );
}
