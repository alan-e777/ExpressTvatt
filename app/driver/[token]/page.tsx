"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { telHref } from "@/lib/phone";

type RunOrder = {
  id: string;
  serviceName: string;
  address: string;
  postalCode: string;
  status: string;
  dropoffDate: string;
  dropoffTime: string;
  customerName: string;
  customerPhone: string;
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

          const phoneHref = telHref(order.customerPhone);

          return (
            <div
              key={order.id}
              style={{
                background: "#fff",
                border: `1.5px solid ${isDelivered ? "#bbf7d0" : "#eee"}`,
                borderRadius: "12px",
                display: "flex",
                flexDirection: "column",
                transition: "border-color 0.25s",
              }}
            >
              <div style={{
                padding: "1rem 1rem 1rem 1.1rem",
                display: "flex",
                alignItems: "center",
                gap: "0.9rem",
              }}>
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

              {/* Ring kunden — a real `tel:` anchor, full width and 44px tall,
                  because it is tapped with a thumb from the driver's seat. It
                  sits in its own strip rather than inside the row above: on a
                  phone a third element in that flex row squeezes the address
                  to nothing. Styled blue so it reads as a link next to the
                  muted greys around it. */}
              {phoneHref ? (
                <a
                  href={phoneHref}
                  onClick={e => e.stopPropagation()}
                  style={{
                    borderTop: "1px solid #f3f3f3",
                    padding: "0 1.1rem",
                    minHeight: 46,
                    display: "flex",
                    alignItems: "center",
                    gap: "0.55rem",
                    color: isDelivered ? "#9ca3af" : "#1d4ed8",
                    fontSize: "0.95rem",
                    fontWeight: 600,
                    textDecoration: "none",
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                  <span style={{ flexShrink: 0 }}>{order.customerPhone}</span>
                  {order.customerName && (
                    <span style={{ color: "#bbb", fontWeight: 400, fontSize: "0.8rem", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {order.customerName}
                    </span>
                  )}
                </a>
              ) : (
                <div style={{
                  borderTop: "1px solid #f3f3f3",
                  padding: "0 1.1rem",
                  minHeight: 46,
                  display: "flex",
                  alignItems: "center",
                  color: "#ccc",
                  fontSize: "0.85rem",
                }}>
                  Telefon —
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
