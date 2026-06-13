"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";

type RunOrder = {
  id: string;
  serviceName: string;
  address: string;
  postalCode: string;
  status: string;
  dropoffDate: string;
  dropoffTime: string;
};

type RunData = {
  type: "dropoff" | "pickup";
  orders: RunOrder[];
  expiresAt: string | null;
};

export default function DriverRunPage() {
  const { token } = useParams<{ token: string }>();
  const [run, setRun] = useState<RunData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchRun = useCallback(async () => {
    const resp = await fetch(`/api/driver/${token}`);
    if (resp.status === 410) {
      setError("Den här körningslänken har gått ut.");
      setLoading(false);
      return;
    }
    if (!resp.ok) {
      setError("Körningen hittades inte.");
      setLoading(false);
      return;
    }
    const data = await resp.json();
    setRun(data);
    setLoading(false);
  }, [token]);

  useEffect(() => { fetchRun(); }, [fetchRun]);

  async function toggleDelivered(orderId: string, delivered: boolean) {
    setUpdating(orderId);
    await fetch(`/api/driver/${token}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId, delivered }),
    });
    await fetchRun();
    setUpdating(null);
  }

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", fontFamily: "system-ui" }}>
        <p style={{ color: "#999", fontSize: "0.875rem" }}>Laddar körning…</p>
      </div>
    );
  }

  if (error || !run) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", fontFamily: "system-ui" }}>
        <p style={{ color: "#999", fontSize: "0.875rem" }}>{error ?? "Körningen hittades inte."}</p>
      </div>
    );
  }

  const deliveredCount = run.orders.filter(o => o.status === "delivered").length;
  const total = run.orders.length;
  const allDone = deliveredCount === total && total > 0;

  return (
    <div style={{ minHeight: "100vh", background: "#f9f9f8", fontFamily: "system-ui, sans-serif" }}>
      {/* Header */}
      <div style={{ background: "#1a1a1a", color: "#fff", padding: "1.25rem 1.25rem 1.5rem" }}>
        <p style={{ fontSize: "0.65rem", color: "#666", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.35rem" }}>
          Express Tvätt · {run.type === "dropoff" ? "Utkörning" : "Upphämtning"}
        </p>
        <h1 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.85rem" }}>
          Dagens körning
        </h1>
        {/* Progress bar */}
        <div style={{ background: "#333", borderRadius: "99px", height: "4px", marginBottom: "0.6rem" }}>
          <div style={{
            background: allDone ? "#16a34a" : "#fff",
            borderRadius: "99px",
            height: "100%",
            width: total > 0 ? `${(deliveredCount / total) * 100}%` : "0%",
            transition: "width 0.4s ease, background 0.3s ease",
          }} />
        </div>
        <p style={{ fontSize: "0.8rem", color: allDone ? "#4ade80" : "#aaa" }}>
          {allDone ? "✓ Alla levererade!" : `${deliveredCount} av ${total} klara`}
        </p>
        {run.expiresAt && (
          <p style={{ fontSize: "0.7rem", color: "#555", marginTop: "0.5rem" }}>
            Länken går ut {new Date(run.expiresAt).toLocaleString("sv-SE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
          </p>
        )}
      </div>

      {/* Order list */}
      <div style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "0.65rem" }}>
        {run.orders.map(order => {
          const isDelivered = order.status === "delivered";
          const isUpdating = updating === order.id;

          return (
            <div
              key={order.id}
              style={{
                background: "#fff",
                border: `1.5px solid ${isDelivered ? "#bbf7d0" : "#eee"}`,
                borderRadius: "12px",
                padding: "1rem 1rem 1rem 1.1rem",
                display: "flex",
                alignItems: "center",
                gap: "0.9rem",
                transition: "border-color 0.25s",
              }}
            >
              {/* Status circle */}
              <div style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: isDelivered ? "#16a34a" : "#f0f0f0",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                transition: "background 0.25s",
              }}>
                {isDelivered && (
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{
                  fontSize: "0.95rem",
                  fontWeight: 600,
                  color: isDelivered ? "#aaa" : "#1a1a1a",
                  marginBottom: "0.15rem",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  textDecoration: isDelivered ? "line-through" : "none",
                }}>
                  {order.address}{order.postalCode ? `, ${order.postalCode}` : ""}
                </p>
                <p style={{ fontSize: "0.78rem", color: "#bbb", marginBottom: "0.1rem" }}>
                  {order.serviceName}
                </p>
                {order.dropoffDate && (
                  <p style={{ fontSize: "0.72rem", color: "#ccc" }}>
                    {order.dropoffDate}{order.dropoffTime ? ` kl. ${order.dropoffTime}` : ""}
                  </p>
                )}
              </div>

              {/* Action button */}
              <button
                onClick={() => toggleDelivered(order.id, !isDelivered)}
                disabled={isUpdating}
                style={{
                  padding: "0.6rem 1rem",
                  background: isDelivered ? "transparent" : "#1a1a1a",
                  color: isDelivered ? "#999" : "#fff",
                  border: isDelivered ? "1px solid #e5e5e5" : "none",
                  borderRadius: "9px",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  cursor: isUpdating ? "not-allowed" : "pointer",
                  opacity: isUpdating ? 0.45 : 1,
                  flexShrink: 0,
                  whiteSpace: "nowrap",
                  transition: "opacity 0.15s",
                  minWidth: "4.5rem",
                  textAlign: "center",
                }}
              >
                {isUpdating ? "…" : isDelivered ? "Ångra" : "Levererad"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
