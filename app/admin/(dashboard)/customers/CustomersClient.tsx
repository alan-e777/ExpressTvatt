"use client";

import { useState, useMemo } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type CustomerRow = {
  uid:           string;
  name:          string;
  email:         string;
  phone:         string;
  createdAt:     string | null;
  orderCount:    number;
  totalSpend:    number; // öre
  lastOrderDate: string | null;
  orders: {
    id:          string;
    serviceName: string;
    status:      string;
    amount:      number;
    createdAt:   string | null;
  }[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const AVATAR_PALETTE = [
  { bg: "#E6F1FB", color: "#185FA5" },
  { bg: "#E1F5EE", color: "#0F6E56" },
  { bg: "#FAECE7", color: "#993C1D" },
  { bg: "#EEEDFE", color: "#534AB7" },
  { bg: "#FAEEDA", color: "#854F0B" },
  { bg: "#EAF3DE", color: "#3B6D11" },
];

function avatarColor(name: string) {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) & 0xffff;
  return AVATAR_PALETTE[h % AVATAR_PALETTE.length];
}

function initials(name: string) {
  return name.split(" ").map(w => w[0] ?? "").join("").toUpperCase().slice(0, 2);
}

function formatAmount(ore: number) {
  return `${(ore / 100).toLocaleString("sv-SE")} kr`;
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("sv-SE", { day: "numeric", month: "short", year: "numeric" });
}

function customerTag(c: CustomerRow) {
  if (c.orderCount === 0) return { label: "Ny",       bg: "#EAF3DE", color: "#3B6D11" };
  if (c.orderCount >= 5)  return { label: "VIP",      bg: "#EEEDFE", color: "#534AB7" };
  return                         { label: "Återkommande", bg: "#E6F1FB", color: "#185FA5" };
}

const STATUS_LABEL: Record<string, string> = {
  paid: "New", collected: "Collected", in_progress: "In progress",
  ready_for_pickup: "Ready", completed: "Completed", cancelled: "Cancelled",
  pending_payment: "Pending",
};
const STATUS_COLOR: Record<string, { bg: string; color: string }> = {
  paid:             { bg: "#dbeafe", color: "#1d4ed8" },
  in_progress:      { bg: "#fef9c3", color: "#854d0e" },
  ready_for_pickup: { bg: "#ede9fe", color: "#6d28d9" },
  completed:        { bg: "#dcfce7", color: "#15803d" },
  collected:        { bg: "#d1fae5", color: "#065f46" },
  cancelled:        { bg: "#fee2e2", color: "#dc2626" },
  pending_payment:  { bg: "#f3f4f6", color: "#374151" },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function Avatar({ name, size = 34 }: { name: string; size?: number }) {
  const { bg, color } = avatarColor(name);
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", background: bg, color,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.35, fontWeight: 600, flexShrink: 0,
    }}>
      {initials(name)}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_COLOR[status] ?? { bg: "#f3f4f6", color: "#374151" };
  return (
    <span style={{
      background: s.bg, color: s.color,
      padding: "2px 8px", borderRadius: "99px",
      fontSize: "0.7rem", fontWeight: 600,
    }}>
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

// ─── Customer list panel ──────────────────────────────────────────────────────

function CustomerList({
  rows,
  selectedUid,
  onSelect,
}: {
  rows:        CustomerRow[];
  selectedUid: string | null;
  onSelect:    (uid: string) => void;
}) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() =>
    search.trim()
      ? rows.filter(r =>
          r.name.toLowerCase().includes(search.toLowerCase()) ||
          r.email.toLowerCase().includes(search.toLowerCase()) ||
          r.phone.includes(search)
        )
      : rows,
    [rows, search]
  );

  return (
    <div style={{ background: "#fff", border: "1px solid #eee", borderRadius: "10px", overflow: "hidden", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid #f0f0f0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h2 style={{ fontSize: "1rem", fontWeight: 700, margin: 0 }}>Customers</h2>
          <p style={{ fontSize: "0.8rem", color: "#aaa", marginTop: "0.15rem" }}>
            {rows.length} registered · sorted by latest order
          </p>
        </div>
      </div>

      {/* Search */}
      <div style={{ padding: "0.75rem 1.25rem", borderBottom: "1px solid #f0f0f0" }}>
        <input
          type="text"
          placeholder="Search by name, email or phone…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: "100%", padding: "0.45rem 0.75rem",
            border: "1px solid #e5e5e5", borderRadius: "6px",
            fontSize: "0.85rem", color: "#333", outline: "none",
            boxSizing: "border-box",
          }}
        />
      </div>

      {/* List */}
      <div style={{ overflowY: "auto", maxHeight: "calc(100vh - 260px)" }}>
        {filtered.length === 0 ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "#aaa", fontSize: "0.875rem" }}>
            No customers found
          </div>
        ) : filtered.map(row => {
          const tag = customerTag(row);
          const isSelected = row.uid === selectedUid;
          return (
            <div
              key={row.uid}
              onClick={() => onSelect(row.uid)}
              style={{
                display: "flex", alignItems: "center", gap: "0.75rem",
                padding: "0.85rem 1.25rem",
                borderBottom: "1px solid #f5f5f5",
                cursor: "pointer",
                background: isSelected ? "#f8f8f8" : "transparent",
                transition: "background 0.1s",
              }}
            >
              <Avatar name={row.name} size={36} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: "0.875rem", color: "#1a1a1a" }}>{row.name}</div>
                <div style={{ fontSize: "0.75rem", color: "#888", marginTop: "0.1rem" }}>
                  <span style={{
                    background: tag.bg, color: tag.color,
                    padding: "1px 6px", borderRadius: "99px",
                    fontSize: "0.68rem", fontWeight: 600, marginRight: "0.4rem",
                  }}>
                    {tag.label}
                  </span>
                  {row.lastOrderDate
                    ? `Senaste order ${formatDate(row.lastOrderDate)}`
                    : "Inga ordrar än"}
                </div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "#333" }}>
                  {row.orderCount} {row.orderCount === 1 ? "order" : "ordrar"}
                </div>
                <div style={{ fontSize: "0.72rem", color: "#aaa", marginTop: "0.1rem" }}>
                  {formatAmount(row.totalSpend)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Customer profile panel ───────────────────────────────────────────────────

function CustomerProfile({ row }: { row: CustomerRow | null }) {
  if (!row) {
    return (
      <div style={{
        background: "#fff", border: "1px solid #eee", borderRadius: "10px",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "4rem 2rem", color: "#bbb", fontSize: "0.875rem", textAlign: "center",
      }}>
        <div>
          <div style={{ fontSize: "2rem", marginBottom: "0.5rem", opacity: 0.3 }}>👤</div>
          Välj en kund för att se profilen
        </div>
      </div>
    );
  }

  const tag = customerTag(row);

  return (
    <div style={{ background: "#fff", border: "1px solid #eee", borderRadius: "10px", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "1.1rem 1.25rem", borderBottom: "1px solid #f0f0f0", display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <Avatar name={row.name} size={42} />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: "1rem", color: "#1a1a1a" }}>{row.name}</div>
          <span style={{
            background: tag.bg, color: tag.color,
            padding: "1px 7px", borderRadius: "99px",
            fontSize: "0.7rem", fontWeight: 600,
          }}>
            {tag.label}
          </span>
        </div>
      </div>

      {/* Contact & stats */}
      <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid #f0f0f0" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.85rem" }}>
          <Field label="Telefon"       value={row.phone  || "—"} />
          <Field label="E-post"        value={row.email  || "—"} small />
          <Field label="Antal ordrar"  value={String(row.orderCount)} />
          <Field label="Total köp"     value={formatAmount(row.totalSpend)} bold />
          <Field label="Kund sedan"    value={formatDate(row.createdAt)} />
          <Field label="Senaste order" value={formatDate(row.lastOrderDate)} />
        </div>
      </div>

      {/* Order history */}
      <div style={{ padding: "1rem 1.25rem" }}>
        <p style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#aaa", marginBottom: "0.75rem" }}>
          Orderhistorik
        </p>
        {row.orders.length === 0 ? (
          <p style={{ fontSize: "0.85rem", color: "#bbb" }}>Inga ordrar än.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {row.orders.map((o, i) => (
              <div
                key={o.id}
                style={{
                  display: "flex", alignItems: "center", gap: "0.6rem",
                  padding: "0.6rem 0",
                  borderBottom: i < row.orders.length - 1 ? "1px solid #f5f5f5" : "none",
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "0.85rem", fontWeight: 500, color: "#1a1a1a" }}>
                    {o.serviceName}
                  </div>
                  <div style={{ fontSize: "0.72rem", color: "#aaa", marginTop: "0.15rem" }}>
                    {formatDate(o.createdAt)}
                  </div>
                </div>
                <StatusBadge status={o.status} />
                <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "#333", marginLeft: "0.25rem", whiteSpace: "nowrap" }}>
                  {formatAmount(o.amount)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, value, bold, small }: { label: string; value: string; bold?: boolean; small?: boolean }) {
  return (
    <div>
      <div style={{ fontSize: "0.7rem", color: "#aaa", marginBottom: "0.2rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</div>
      <div style={{ fontSize: small ? "0.78rem" : "0.875rem", fontWeight: bold ? 700 : 400, color: "#1a1a1a", wordBreak: "break-all" }}>{value}</div>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export default function CustomersClient({ initialRows }: { initialRows: CustomerRow[] }) {
  const [selectedUid, setSelectedUid] = useState<string | null>(null);
  const selected = initialRows.find(r => r.uid === selectedUid) ?? null;

  return (
    <div>
      <div style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.15rem" }}>Customers</h1>
        <p style={{ color: "#999", fontSize: "0.875rem" }}>
          {initialRows.length} registered customers · sorted by most recent order
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: "1.25rem", alignItems: "start" }}>
        <CustomerList
          rows={initialRows}
          selectedUid={selectedUid}
          onSelect={setSelectedUid}
        />
        <div style={{ position: "sticky", top: "1.5rem" }}>
          <CustomerProfile row={selected} />
        </div>
      </div>
    </div>
  );
}
