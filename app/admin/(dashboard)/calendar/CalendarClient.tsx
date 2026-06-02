"use client";

import { useState, useMemo } from "react";

export type CalendarOrder = {
  id: string;
  serviceName: string;
  amount: number;
  status: string;
  customerId: string;
  customerEmail: string | null;
  dropoffDate: string;
  dropoffTime: string;
  notes: string;
};

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  paid:             { bg: "#dbeafe", color: "#1d4ed8" },
  in_progress:      { bg: "#fef9c3", color: "#854d0e" },
  ready_for_pickup: { bg: "#ede9fe", color: "#6d28d9" },
  completed:        { bg: "#dcfce7", color: "#15803d" },
  collected:        { bg: "#d1fae5", color: "#065f46" },
  cancelled:        { bg: "#fee2e2", color: "#dc2626" },
};

const STATUS_LABEL: Record<string, string> = {
  paid:             "New",
  in_progress:      "In progress",
  ready_for_pickup: "Ready",
  completed:        "Completed",
  collected:        "Collected",
  cancelled:        "Cancelled",
};

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function toYmd(date: Date) {
  return date.toISOString().slice(0, 10);
}

function parseLocalDate(ymd: string) {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export default function CalendarClient({ orders }: { orders: CalendarOrder[] }) {
  const today = new Date();
  const todayYmd = toYmd(today);

  const [year, setYear]   = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth()); // 0-indexed
  const [selectedYmd, setSelectedYmd] = useState(todayYmd);

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  }

  // Build a set of dates that have orders, per month
  const ordersByDate = useMemo(() => {
    const map: Record<string, CalendarOrder[]> = {};
    for (const o of orders) {
      if (!o.dropoffDate) continue;
      if (!map[o.dropoffDate]) map[o.dropoffDate] = [];
      map[o.dropoffDate].push(o);
    }
    return map;
  }, [orders]);

  // Days in current month view
  const firstDay = new Date(year, month, 1);
  // getDay(): 0=Sun,1=Mon…6=Sat → convert to Mon-based offset
  const startOffset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const selectedOrders = ordersByDate[selectedYmd] ?? [];
  const selectedOrders_sorted = [...selectedOrders].sort((a, b) =>
    (a.dropoffTime || "").localeCompare(b.dropoffTime || "")
  );

  function fmtSelectedDate() {
    const d = parseLocalDate(selectedYmd);
    if (selectedYmd === todayYmd) return "today";
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "long" });
  }

  function dayYmd(day: number) {
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  return (
    <div>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.25rem" }}>Calendar</h1>
      <p style={{ color: "#999", marginBottom: "1.5rem", fontSize: "0.875rem" }}>
        Upcoming orders by dropoff date
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem", alignItems: "start" }}>

        {/* Mini calendar */}
        <div style={{ background: "#fff", border: "1px solid #eee", borderRadius: "10px", overflow: "hidden" }}>
          {/* Month nav */}
          <div style={{ display: "flex", alignItems: "center", padding: "1rem 1.25rem", borderBottom: "1px solid #f0f0f0" }}>
            <button onClick={prevMonth} style={navBtnStyle}>‹</button>
            <span style={{ flex: 1, textAlign: "center", fontWeight: 600, fontSize: "0.95rem", color: "#1a1a1a" }}>
              {MONTH_NAMES[month]} {year}
            </span>
            <button onClick={nextMonth} style={navBtnStyle}>›</button>
          </div>

          {/* Day name headers */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", padding: "0.75rem 1rem 0" }}>
            {DAY_NAMES.map(d => (
              <div key={d} style={{ textAlign: "center", fontSize: "0.7rem", fontWeight: 600, color: "#aaa", paddingBottom: "0.5rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                {d}
              </div>
            ))}
          </div>

          {/* Day grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "2px", padding: "0 1rem 1rem" }}>
            {/* Blank offset cells */}
            {Array.from({ length: startOffset }, (_, i) => <div key={`blank-${i}`} />)}

            {Array.from({ length: daysInMonth }, (_, i) => {
              const day = i + 1;
              const ymd = dayYmd(day);
              const isToday = ymd === todayYmd;
              const isSelected = ymd === selectedYmd;
              const hasOrders = !!ordersByDate[ymd]?.length;
              const orderList = ordersByDate[ymd] ?? [];
              const hasCancelled = orderList.every(o => o.status === "cancelled");
              const dotColor = hasCancelled ? "#e5e5e5" : "#378ADD";

              return (
                <button
                  key={day}
                  onClick={() => setSelectedYmd(ymd)}
                  style={{
                    aspectRatio: "1",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: "8px",
                    border: "none",
                    background: isSelected
                      ? "#1a1a1a"
                      : isToday
                        ? "#f0f0f0"
                        : "transparent",
                    color: isSelected ? "#fff" : isToday ? "#1a1a1a" : hasOrders ? "#1a1a1a" : "#999",
                    fontWeight: hasOrders || isToday || isSelected ? 600 : 400,
                    fontSize: "0.825rem",
                    cursor: "pointer",
                    position: "relative",
                    paddingBottom: hasOrders ? "4px" : undefined,
                    transition: "background 0.1s",
                  }}
                >
                  {day}
                  {hasOrders && (
                    <span style={{
                      position: "absolute",
                      bottom: "4px",
                      width: "4px",
                      height: "4px",
                      borderRadius: "50%",
                      background: isSelected ? "rgba(255,255,255,0.7)" : dotColor,
                    }} />
                  )}
                </button>
              );
            })}
          </div>

          {/* Month summary */}
          <div style={{ borderTop: "1px solid #f0f0f0", padding: "0.75rem 1.25rem", display: "flex", gap: "1.5rem" }}>
            {(() => {
              const monthOrders = orders.filter(o => {
                const [y, m] = (o.dropoffDate || "").split("-").map(Number);
                return y === year && m === month + 1;
              });
              const active = monthOrders.filter(o => o.status !== "cancelled" && o.status !== "completed").length;
              return (
                <>
                  <span style={{ fontSize: "0.75rem", color: "#999" }}>
                    <span style={{ fontWeight: 600, color: "#1a1a1a" }}>{monthOrders.length}</span> orders this month
                  </span>
                  {active > 0 && (
                    <span style={{ fontSize: "0.75rem", color: "#999" }}>
                      <span style={{ fontWeight: 600, color: "#1a1a1a" }}>{active}</span> active
                    </span>
                  )}
                </>
              );
            })()}
          </div>
        </div>

        {/* Day detail panel */}
        <div style={{ background: "#fff", border: "1px solid #eee", borderRadius: "10px", overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1rem 1.25rem", borderBottom: "1px solid #f0f0f0" }}>
            <div>
              <span style={{ fontWeight: 600, fontSize: "0.95rem", color: "#1a1a1a" }}>
                Orders — {fmtSelectedDate()}
              </span>
              {selectedOrders.length > 0 && (
                <span style={{ marginLeft: "0.5rem", fontSize: "0.75rem", color: "#aaa" }}>
                  {selectedOrders.length} order{selectedOrders.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>
          </div>

          {selectedOrders_sorted.length === 0 ? (
            <div style={{ padding: "3rem 1.25rem", textAlign: "center", color: "#ccc" }}>
              <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>📅</div>
              <div style={{ fontSize: "0.875rem" }}>No orders on this day</div>
            </div>
          ) : (
            <div>
              {selectedOrders_sorted.map((order, i) => {
                const isLast = i === selectedOrders_sorted.length - 1;
                const s = STATUS_STYLE[order.status] ?? { bg: "#f3f4f6", color: "#374151" };
                const barColor = order.status === "cancelled" ? "#e5e5e5" : order.status === "completed" ? "#639922" : "#378ADD";
                const label = order.customerEmail ?? order.customerId.slice(0, 12);
                return (
                  <div
                    key={order.id}
                    style={{
                      display: "flex",
                      gap: "0.75rem",
                      alignItems: "flex-start",
                      padding: "0.9rem 1.25rem",
                      borderBottom: isLast ? "none" : "1px solid #f0f0f0",
                    }}
                  >
                    {/* Time */}
                    <div style={{ minWidth: "48px", fontSize: "0.8rem", fontWeight: 600, color: "#555", paddingTop: "2px" }}>
                      {order.dropoffTime || "—"}
                    </div>

                    {/* Color bar */}
                    <div style={{ width: "3px", borderRadius: "2px", background: barColor, minHeight: "40px", flexShrink: 0 }} />

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.2rem" }}>
                        <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "#1a1a1a" }}>
                          {order.serviceName}
                        </span>
                        <span style={{
                          background: s.bg, color: s.color,
                          borderRadius: "99px", padding: "0.1rem 0.5rem",
                          fontSize: "0.7rem", fontWeight: 600, whiteSpace: "nowrap",
                        }}>
                          {STATUS_LABEL[order.status] ?? order.status}
                        </span>
                      </div>
                      <div style={{ fontSize: "0.8rem", color: "#888", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {label === order.customerId.slice(0, 12) && order.customerId !== "anonymous"
                          ? label + "…"
                          : label === "anonymous" ? "Guest" : label}
                      </div>
                      {order.notes && (
                        <div style={{ fontSize: "0.75rem", color: "#bbb", marginTop: "0.25rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {order.notes}
                        </div>
                      )}
                    </div>

                    {/* Amount */}
                    <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "#1a1a1a", whiteSpace: "nowrap", paddingTop: "2px" }}>
                      {(order.amount / 100).toLocaleString("sv-SE")} kr
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* Upcoming orders list */}
      <div style={{ marginTop: "1.25rem", background: "#fff", border: "1px solid #eee", borderRadius: "10px", overflow: "hidden" }}>
        <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid #f0f0f0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontWeight: 600, fontSize: "0.95rem", color: "#1a1a1a" }}>Upcoming orders</span>
          <span style={{ fontSize: "0.75rem", color: "#aaa" }}>
            Sorted by dropoff date
          </span>
        </div>

        {(() => {
          const upcoming = orders
            .filter(o => o.dropoffDate >= todayYmd && o.status !== "cancelled" && o.status !== "completed")
            .sort((a, b) => {
              const dateCmp = a.dropoffDate.localeCompare(b.dropoffDate);
              if (dateCmp !== 0) return dateCmp;
              return (a.dropoffTime || "").localeCompare(b.dropoffTime || "");
            });

          if (upcoming.length === 0) {
            return (
              <div style={{ padding: "3rem 1.25rem", textAlign: "center", color: "#ccc", fontSize: "0.875rem" }}>
                No upcoming orders
              </div>
            );
          }

          return (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #eee", background: "#fafafa" }}>
                  {["Date", "Time", "Service", "Customer", "Amount", "Status"].map(h => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {upcoming.map((order, i) => {
                  const isLast = i === upcoming.length - 1;
                  const s = STATUS_STYLE[order.status] ?? { bg: "#f3f4f6", color: "#374151" };
                  const label = order.customerEmail ?? (
                    order.customerId === "anonymous" ? "Guest" : order.customerId.slice(0, 12) + "…"
                  );
                  const d = parseLocalDate(order.dropoffDate);
                  const isToday = order.dropoffDate === todayYmd;
                  const dateLabel = isToday
                    ? "Today"
                    : d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });

                  return (
                    <tr
                      key={order.id}
                      onClick={() => {
                        const [y, m] = order.dropoffDate.split("-").map(Number);
                        setYear(y); setMonth(m - 1); setSelectedYmd(order.dropoffDate);
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      style={{ borderBottom: isLast ? "none" : "1px solid #f0f0f0", cursor: "pointer" }}
                    >
                      <td style={tdStyle}>
                        <span style={{ fontWeight: isToday ? 600 : 400, color: isToday ? "#1a1a1a" : "#555" }}>
                          {dateLabel}
                        </span>
                      </td>
                      <td style={{ ...tdStyle, color: "#888" }}>{order.dropoffTime || "—"}</td>
                      <td style={{ ...tdStyle, fontWeight: 500 }}>{order.serviceName}</td>
                      <td style={{ ...tdStyle, color: "#888", fontSize: "0.8rem" }}>{label}</td>
                      <td style={{ ...tdStyle, fontWeight: 600 }}>{(order.amount / 100).toLocaleString("sv-SE")} kr</td>
                      <td style={tdStyle}>
                        <span style={{
                          background: s.bg, color: s.color,
                          borderRadius: "99px", padding: "0.1rem 0.5rem",
                          fontSize: "0.7rem", fontWeight: 600,
                        }}>
                          {STATUS_LABEL[order.status] ?? order.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          );
        })()}
      </div>
    </div>
  );
}

const navBtnStyle: React.CSSProperties = {
  width: "28px", height: "28px",
  display: "flex", alignItems: "center", justifyContent: "center",
  borderRadius: "6px", border: "1px solid #eee",
  background: "transparent", cursor: "pointer",
  fontSize: "1.1rem", color: "#555",
};

const thStyle: React.CSSProperties = {
  padding: "0.65rem 1.25rem",
  textAlign: "left",
  fontWeight: 600,
  color: "#555",
  fontSize: "0.75rem",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

const tdStyle: React.CSSProperties = {
  padding: "0.85rem 1.25rem",
  color: "#333",
};
