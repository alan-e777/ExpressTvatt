"use client";

import { useState, useRef, Fragment, useEffect } from "react";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase-client";
import * as XLSX from "xlsx";
import { IconDeviceMobile, IconDeviceDesktop } from "@tabler/icons-react";

export type BasketItem = { id: string; name: string; price: number; qty: number };

export type Order = {
  id: string;
  paymentIntentId: string;
  serviceName: string;
  amount: number;
  status: string;
  customerId: string;
  customerEmail: string | null;
  platform: 'mobile' | 'web';
  createdAt: string | null;
  notes: string;
  adminNotes: string;
  address: string;
  postalCode: string;
  dropoffDate: string;
  dropoffTime: string;
  customFields: Record<string, string>;
  items: BasketItem[];
  tags: string[];
  rutAvdrag: boolean;
  rutPersonnummer: string;
  rutDiscountPercent: number;
  rutRefundOre: number;
};

const STATUS_OPTIONS = [
  { value: "paid",             label: "New" },
  { value: "collected",        label: "Collected" },
  { value: "in_progress",      label: "In progress" },
  { value: "ready_for_pickup", label: "Ready for delivery" },
  { value: "delivered",        label: "Delivered" },
  { value: "completed",        label: "Completed" },
  { value: "cancelled",        label: "Cancelled" },
  { value: "payment_failed",  label: "Payment failed" },
  { value: "refunded",        label: "Refunded" },
];

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  paid:             { bg: "#dbeafe", color: "#1d4ed8" },
  in_progress:      { bg: "#fef9c3", color: "#854d0e" },
  ready_for_pickup: { bg: "#ede9fe", color: "#6d28d9" },
  delivered:        { bg: "#bbf7d0", color: "#15803d" },
  completed:        { bg: "#dcfce7", color: "#15803d" },
  collected:        { bg: "#d1fae5", color: "#065f46" },
  cancelled:        { bg: "#fee2e2", color: "#dc2626" },
  payment_failed:   { bg: "#fecaca", color: "#b91c1c" },
  refunded:         { bg: "#e5e7eb", color: "#374151" },
};

// Default: show all non-done statuses
const DEFAULT_FILTER = new Set(["paid", "collected", "in_progress", "ready_for_pickup"]);

// Default date range: 1st of current month → today
function toDateInput(d: Date) {
  return d.toISOString().slice(0, 10);
}
const _now           = new Date();
const DEFAULT_DATE_FROM = toDateInput(new Date(_now.getFullYear(), _now.getMonth(), 1));
const DEFAULT_DATE_TO   = toDateInput(_now);

const SWEDISH_MONTHS = ["januari","februari","mars","april","maj","juni","juli","augusti","september","oktober","november","december"];

function formatItemsSummary(items: BasketItem[], serviceName: string): string {
  if (!items || items.length === 0) return serviceName;
  return items.map(item => `${item.name} ×${item.qty}`).join(", ");
}

export default function OrdersClient({ initialOrders }: { initialOrders: Order[] }) {
  const [orders, setOrders]           = useState<Order[]>(initialOrders);
  const [searchQuery, setSearchQuery]         = useState("");
  const [activeFilter, setActiveFilter]       = useState<Set<string>>(DEFAULT_FILTER);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [dateFrom, setDateFrom]               = useState(DEFAULT_DATE_FROM);
  const [dateTo,   setDateTo]                 = useState(DEFAULT_DATE_TO);
  const statusDropdownRef = useRef<HTMLDivElement>(null);

  const [exportMonth, setExportMonth] = useState(_now.getMonth());
  const [exportYear,  setExportYear]  = useState(_now.getFullYear());

  function exportXLSX() {
    const monthStart = new Date(exportYear, exportMonth, 1, 0, 0, 0, 0).getTime();
    const monthEnd   = new Date(exportYear, exportMonth + 1, 0, 23, 59, 59, 999).getTime();

    const monthOrders = orders.filter(o => {
      if (!o.createdAt) return false;
      const t = new Date(o.createdAt).getTime();
      return t >= monthStart && t <= monthEnd;
    });

    const rows = monthOrders.map(o => ({
      "Datum":         o.createdAt ? o.createdAt.slice(0, 10) : "",
      "Betalnings-ID": o.paymentIntentId ?? "",
      "Tjänst":        o.serviceName ?? "",
      "Artiklar":      formatItemsSummary(o.items, o.serviceName),
      "Adress":        o.address ?? "",
      "Postnummer":    o.postalCode ?? "",
      "Belopp (kr)":   parseFloat(((o.amount ?? 0) / 100).toFixed(2)),
      "Status":        o.status ?? "",
      "RUT":           o.rutAvdrag ? "Ja" : "",
      "Personnummer":  o.rutPersonnummer ?? "",
      "RUT återbet. (kr)": o.rutAvdrag ? parseFloat(((o.rutRefundOre ?? 0) / 100).toFixed(2)) : "",
      "Anteckningar":  o.notes ?? "",
    }));

    const total = rows.reduce((s, r) => s + r["Belopp (kr)"], 0);
    rows.push({
      "Datum":         "",
      "Betalnings-ID": "",
      "Tjänst":        "TOTALT",
      "Artiklar":      "",
      "Adress":        "",
      "Postnummer":    "",
      "Belopp (kr)":   parseFloat(total.toFixed(2)),
      "Status":        "",
      "RUT":           "",
      "Personnummer":  "",
      "RUT återbet. (kr)": "",
      "Anteckningar":  "",
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Orders");

    const mm = String(exportMonth + 1).padStart(2, "0");
    XLSX.writeFile(wb, `tvattio-orders-${exportYear}-${mm}.xlsx`);
  }

  // Close dropdown on outside click
  useEffect(() => {
    if (!statusDropdownOpen) return;
    function handleClick(e: MouseEvent) {
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(e.target as Node)) {
        setStatusDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [statusDropdownOpen]);
  // Real-time listener — keeps orders in sync with Firestore (handles deletes, edits)
  useEffect(() => {
    const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, snap => {
      setOrders(snap.docs.map(d => {
        const data = d.data();
        const uid  = data.customerId ?? "—";
        return {
          id:              data.id ?? d.id,
          paymentIntentId: data.paymentIntentId ?? "",
          serviceName:     data.serviceName ?? "—",
          amount:          data.amount ?? 0,
          status:          data.status ?? "paid",
          customerId:      uid,
          customerEmail:   data.customerEmail ?? null,
          platform:        (data.platform === 'mobile' ? 'mobile' : 'web') as 'mobile' | 'web',
          createdAt:       data.createdAt?.toDate?.()?.toISOString() ?? null,
          notes:           data.notes ?? "",
          adminNotes:      data.adminNotes ?? "",
          address:         data.address ?? "",
          postalCode:      data.postalCode ?? "",
          dropoffDate:     data.dropoffDate ?? "",
          dropoffTime:     data.dropoffTime ?? "",
          customFields:    data.customFields ?? {},
          items:           data.items ?? [],
          tags:            data.tags ?? (data.rutAvdrag ? ["RUT"] : []),
          rutAvdrag:       !!data.rutAvdrag,
          rutPersonnummer: data.rutPersonnummer ?? "",
          rutDiscountPercent: data.rutDiscountPercent ?? 0,
          rutRefundOre:    data.rutRefundOre ?? 0,
        } as Order;
      }));
    });
    return unsub;
  }, []);

  const [deletingCompleted, setDeletingCompleted] = useState(false);
  const [deleteModalOpen,   setDeleteModalOpen]   = useState(false);

  async function deleteCompleted() {
    const completedOrders = orders.filter(o => o.status === "completed");
    if (completedOrders.length === 0) return;
    setDeletingCompleted(true);
    try {
      await Promise.all(
        completedOrders.map(o =>
          fetch(`/api/admin/orders/${o.id}`, { method: "DELETE" })
        )
      );
      // onSnapshot will remove them automatically
      setDeleteModalOpen(false);
    } catch {
      alert("Some deletes failed. Refresh and try again.");
    } finally {
      setDeletingCompleted(false);
    }
  }

  const [updating, setUpdating]       = useState<string | null>(null);
  const [expandedNotes, setExpandedNotes] = useState<string | null>(null);
  const [savingNotes, setSavingNotes] = useState<string | null>(null);
  const [selected, setSelected]       = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus]   = useState("in_progress");
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const noteRefs = useRef<Record<string, string>>({});

  function toggleFilter(value: string) {
    setActiveFilter(prev => {
      const next = new Set(prev);
      next.has(value) ? next.delete(value) : next.add(value);
      return next;
    });
    setSelected(new Set());
  }

  const fromMs = dateFrom ? new Date(dateFrom).setHours(0, 0, 0, 0) : null;
  const toMs   = dateTo   ? new Date(dateTo).setHours(23, 59, 59, 999) : null;

  const visible = orders.filter(o => {
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toUpperCase();
      return o.paymentIntentId.toUpperCase().includes(q);
    }
    if (activeFilter.size > 0 && !activeFilter.has(o.status)) return false;
    if (o.createdAt) {
      const t = new Date(o.createdAt).getTime();
      if (fromMs !== null && t < fromMs) return false;
      if (toMs   !== null && t > toMs)   return false;
    }
    return true;
  });
  const allSelected = visible.length > 0 && visible.every(o => selected.has(o.id));

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(visible.map(o => o.id)));
    }
  }

  async function updateStatus(id: string, status: string) {
    setUpdating(id);
    try {
      const res = await fetch(`/api/admin/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error();
      setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o));
    } catch {
      alert("Failed to update status.");
    } finally {
      setUpdating(null);
    }
  }

  async function applyBulkStatus() {
    if (selected.size === 0) return;
    setBulkUpdating(true);
    try {
      await Promise.all(
        [...selected].map(id =>
          fetch(`/api/admin/orders/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: bulkStatus }),
          })
        )
      );
      setOrders(prev => prev.map(o => selected.has(o.id) ? { ...o, status: bulkStatus } : o));
      setSelected(new Set());
    } catch {
      alert("Some updates failed. Refresh and try again.");
    } finally {
      setBulkUpdating(false);
    }
  }

  async function saveAdminNotes(id: string) {
    const adminNotes = noteRefs.current[id] ?? orders.find(o => o.id === id)?.adminNotes ?? "";
    setSavingNotes(id);
    try {
      const res = await fetch(`/api/admin/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminNotes }),
      });
      if (!res.ok) throw new Error();
      setOrders(prev => prev.map(o => o.id === id ? { ...o, adminNotes } : o));
    } catch {
      alert("Failed to save notes.");
    } finally {
      setSavingNotes(null);
    }
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: "1.25rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
          <div>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.15rem" }}>Orders</h1>
            <p style={{ color: "#999", fontSize: "0.875rem" }}>
              {visible.length} of {orders.length} shown
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
            {/* XLSX export */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
              <select
                value={exportMonth}
                onChange={e => setExportMonth(Number(e.target.value))}
                style={{ padding: "0.35rem 0.5rem", border: "1px solid #e5e5e5", borderRadius: "6px", fontSize: "0.78rem", color: "#333", background: "#fff", cursor: "pointer" }}
              >
                {SWEDISH_MONTHS.map((m, i) => (
                  <option key={i} value={i}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>
                ))}
              </select>
              <select
                value={exportYear}
                onChange={e => setExportYear(Number(e.target.value))}
                style={{ padding: "0.35rem 0.5rem", border: "1px solid #e5e5e5", borderRadius: "6px", fontSize: "0.78rem", color: "#333", background: "#fff", cursor: "pointer" }}
              >
                {[_now.getFullYear() - 1, _now.getFullYear()].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
              <button
                onClick={exportXLSX}
                style={{
                  display: "flex", alignItems: "center", gap: "0.4rem",
                  padding: "0.45rem 0.9rem",
                  background: "#fff", border: "1px solid #d1fae5",
                  borderRadius: "7px", cursor: "pointer",
                  fontSize: "0.8rem", fontWeight: 600, color: "#065f46",
                  whiteSpace: "nowrap",
                }}
              >
                ↓ Exportera {SWEDISH_MONTHS[exportMonth]} {exportYear}
              </button>
            </div>

            {orders.some(o => o.status === "completed") && (
              <button
                onClick={() => setDeleteModalOpen(true)}
                style={{
                  display: "flex", alignItems: "center", gap: "0.4rem",
                  padding: "0.45rem 0.9rem",
                  background: "#fff", border: "1px solid #fca5a5",
                  borderRadius: "7px", cursor: "pointer",
                  fontSize: "0.8rem", fontWeight: 600, color: "#dc2626",
                }}
              >
                🗑 Delete Completed ({orders.filter(o => o.status === "completed").length})
              </button>
            )}
          </div>
        </div>

        {/* Delete Completed modal */}
        {deleteModalOpen && (
          <div style={{
            position: "fixed", inset: 0, zIndex: 200,
            background: "rgba(0,0,0,0.45)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "1rem",
          }}>
            <div style={{
              background: "#fff", borderRadius: "12px",
              padding: "1.5rem", width: "100%", maxWidth: "480px",
              boxShadow: "0 8px 40px rgba(0,0,0,0.18)",
            }}>
              <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "0.25rem" }}>
                Delete completed orders
              </h2>
              <p style={{ fontSize: "0.85rem", color: "#666", marginBottom: "1rem" }}>
                The following orders will be permanently deleted. This cannot be undone.
              </p>

              {/* List of completed orders */}
              <div style={{
                border: "1px solid #fca5a5", borderRadius: "8px",
                overflow: "hidden", marginBottom: "1.25rem",
                maxHeight: "260px", overflowY: "auto",
              }}>
                {orders.filter(o => o.status === "completed").map((o, i, arr) => (
                  <div key={o.id} style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "0.65rem 0.9rem",
                    borderBottom: i < arr.length - 1 ? "1px solid #fef2f2" : "none",
                    background: i % 2 === 0 ? "#fff" : "#fff9f9",
                    fontSize: "0.825rem",
                  }}>
                    <div>
                      <span style={{ fontWeight: 600, color: "#1a1a1a" }}>{o.serviceName}</span>
                      <span style={{ color: "#aaa", marginLeft: "0.5rem", fontSize: "0.75rem" }}>
                        #{o.paymentIntentId.slice(-7).toUpperCase()}
                      </span>
                    </div>
                    <span style={{ color: "#888", fontSize: "0.75rem" }}>
                      {o.createdAt ? new Date(o.createdAt).toLocaleDateString("sv-SE") : "—"}
                    </span>
                  </div>
                ))}
              </div>

              <div style={{ display: "flex", gap: "0.65rem", justifyContent: "flex-end" }}>
                <button
                  onClick={() => setDeleteModalOpen(false)}
                  disabled={deletingCompleted}
                  style={{
                    padding: "0.5rem 1.1rem", background: "#f3f4f6",
                    border: "none", borderRadius: "7px",
                    fontSize: "0.875rem", fontWeight: 500, cursor: "pointer", color: "#333",
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={deleteCompleted}
                  disabled={deletingCompleted}
                  style={{
                    padding: "0.5rem 1.25rem", background: "#dc2626",
                    border: "none", borderRadius: "7px",
                    fontSize: "0.875rem", fontWeight: 600, cursor: "pointer", color: "#fff",
                    opacity: deletingCompleted ? 0.6 : 1,
                  }}
                >
                  {deletingCompleted ? "Deleting…" : `Delete ${orders.filter(o => o.status === "completed").length} orders`}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Order number search */}
        <div style={{ marginBottom: "0.65rem" }}>
          <input
            type="text"
            placeholder="Search order number (e.g. VZE3AEA)…"
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); setSelected(new Set()); }}
            style={{
              padding: "0.35rem 0.75rem",
              border: "1px solid #e5e5e5",
              borderRadius: "6px",
              fontSize: "0.8rem",
              color: "#333",
              background: "#fff",
              width: "280px",
              outline: "none",
            }}
          />
          {searchQuery && (
            <button
              onClick={() => { setSearchQuery(""); setSelected(new Set()); }}
              style={{ marginLeft: "0.4rem", background: "none", border: "none", color: "#aaa", cursor: "pointer", fontSize: "0.75rem" }}
            >
              Clear
            </button>
          )}
        </div>

        {/* Date range */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.65rem" }}>
          <span style={{ fontSize: "0.75rem", color: "#aaa", fontWeight: 500 }}>Datum:</span>
          <input
            type="date"
            value={dateFrom}
            onChange={e => { setDateFrom(e.target.value); setSelected(new Set()); }}
            style={dateInputStyle}
          />
          <span style={{ fontSize: "0.75rem", color: "#ccc" }}>–</span>
          <input
            type="date"
            value={dateTo}
            min={dateFrom || undefined}
            onChange={e => { setDateTo(e.target.value); setSelected(new Set()); }}
            style={dateInputStyle}
          />
          {(dateFrom !== DEFAULT_DATE_FROM || dateTo !== DEFAULT_DATE_TO) && (
            <button
              onClick={() => { setDateFrom(DEFAULT_DATE_FROM); setDateTo(DEFAULT_DATE_TO); setSelected(new Set()); }}
              style={{ background: "none", border: "none", color: "#aaa", cursor: "pointer", fontSize: "0.75rem", padding: "0 0.2rem" }}
            >
              Återställ
            </button>
          )}
        </div>

        {/* Status filter dropdown */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ fontSize: "0.75rem", color: "#aaa", fontWeight: 500 }}>Status:</span>

          <div ref={statusDropdownRef} style={{ position: "relative" }}>
            {/* Trigger button */}
            <button
              onClick={() => setStatusDropdownOpen(v => !v)}
              style={{
                display: "flex", alignItems: "center", gap: "0.4rem",
                padding: "0.3rem 0.75rem",
                border: "1px solid #e5e5e5", borderRadius: "6px",
                background: "#fff", cursor: "pointer",
                fontSize: "0.8rem", color: "#333", fontWeight: 500,
              }}
            >
              {activeFilter.size === 0 || activeFilter.size === STATUS_OPTIONS.length
                ? "All statuses"
                : activeFilter.size === 1
                  ? STATUS_OPTIONS.find(o => activeFilter.has(o.value))?.label
                  : `${activeFilter.size} selected`}
              <span style={{ fontSize: "0.6rem", color: "#aaa", marginLeft: "0.1rem" }}>▼</span>
            </button>

            {/* Dropdown panel */}
            {statusDropdownOpen && (
              <div style={{
                position: "absolute", top: "calc(100% + 4px)", left: 0, zIndex: 50,
                background: "#fff", border: "1px solid #e5e5e5", borderRadius: "8px",
                boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
                minWidth: "190px", padding: "0.4rem 0",
              }}>
                {STATUS_OPTIONS.map(opt => {
                  const on = activeFilter.has(opt.value);
                  const s  = STATUS_STYLE[opt.value] ?? { bg: "#f3f4f6", color: "#374151" };
                  const count = orders.filter(o => o.status === opt.value).length;
                  return (
                    <Fragment key={opt.value}>
                      {/* Divider before secondary statuses */}
                      {opt.value === "completed" && (
                        <div style={{ borderTop: "1px solid #f0f0f0", margin: "0.3rem 0" }} />
                      )}
                    <button
                      onClick={() => toggleFilter(opt.value)}
                      style={{
                        display: "flex", alignItems: "center", gap: "0.6rem",
                        width: "100%", padding: "0.5rem 0.9rem",
                        background: "none", border: "none", cursor: "pointer",
                        textAlign: "left",
                      }}
                    >
                      {/* Checkbox */}
                      <span style={{
                        width: 14, height: 14, borderRadius: 3, flexShrink: 0,
                        border: on ? "none" : "1.5px solid #ddd",
                        background: on ? "#1a1a1a" : "transparent",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        {on && <span style={{ color: "#fff", fontSize: 9, lineHeight: 1 }}>✓</span>}
                      </span>

                      {/* Label */}
                      <span style={{ flex: 1, fontSize: "0.825rem", color: "#333" }}>{opt.label}</span>

                      {/* Status pill + count */}
                      <span style={{
                        background: s.bg, color: s.color,
                        borderRadius: "99px", padding: "0.1rem 0.5rem",
                        fontSize: "0.7rem", fontWeight: 600, whiteSpace: "nowrap",
                      }}>
                        {count}
                      </span>
                    </button>
                    </Fragment>
                  );
                })}

                {/* Divider + quick actions */}
                <div style={{ borderTop: "1px solid #f0f0f0", margin: "0.3rem 0" }} />
                <div style={{ display: "flex", gap: 0 }}>
                  <button
                    onClick={() => { setActiveFilter(new Set(STATUS_OPTIONS.map(o => o.value))); setSelected(new Set()); }}
                    style={{ flex: 1, padding: "0.4rem 0.9rem", background: "none", border: "none", cursor: "pointer", fontSize: "0.75rem", color: "#888", textAlign: "left" }}
                  >
                    Select all
                  </button>
                  <button
                    onClick={() => { setActiveFilter(new Set()); setSelected(new Set()); }}
                    style={{ flex: 1, padding: "0.4rem 0.9rem", background: "none", border: "none", cursor: "pointer", fontSize: "0.75rem", color: "#888", textAlign: "left" }}
                  >
                    Clear all
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div style={{
          display: "flex", alignItems: "center", gap: "0.75rem",
          background: "#1a1a1a", borderRadius: "8px", padding: "0.6rem 1rem",
          marginBottom: "0.75rem",
        }}>
          <span style={{ color: "#fff", fontSize: "0.875rem", fontWeight: 600, marginRight: "0.25rem" }}>
            {selected.size} selected
          </span>
          <select
            value={bulkStatus}
            onChange={e => setBulkStatus(e.target.value)}
            style={{ padding: "0.3rem 0.6rem", borderRadius: "6px", border: "none", fontSize: "0.8rem", cursor: "pointer" }}
          >
            {STATUS_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <button
            onClick={applyBulkStatus}
            disabled={bulkUpdating}
            style={{ padding: "0.3rem 0.9rem", background: "#fff", color: "#1a1a1a", border: "none", borderRadius: "6px", fontSize: "0.8rem", fontWeight: 600, cursor: "pointer", opacity: bulkUpdating ? 0.6 : 1 }}
          >
            {bulkUpdating ? "Applying…" : "Apply"}
          </button>
          <button
            onClick={() => setSelected(new Set())}
            style={{ marginLeft: "auto", background: "transparent", border: "none", color: "#888", cursor: "pointer", fontSize: "0.8rem" }}
          >
            Deselect all
          </button>
        </div>
      )}

      {visible.length === 0 ? (
        <div style={{ textAlign: "center", padding: "4rem", color: "#aaa", background: "#fff", borderRadius: "10px", border: "1px solid #eee" }}>
          {orders.length === 0 ? "No orders yet." : "No active orders."}
        </div>
      ) : (
        <div style={{ background: "#fff", border: "1px solid #eee", borderRadius: "10px", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #eee", background: "#fafafa" }}>
                <th style={{ padding: "0.75rem 0 0.75rem 1.25rem", width: "2.5rem" }}>
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleSelectAll}
                    style={{ cursor: "pointer", accentColor: "#1a1a1a" }}
                  />
                </th>
                <Th>Order #</Th>
                <Th>Date</Th>
                <Th>Service</Th>
                <Th>Amount</Th>
                <Th>Customer</Th>
                <Th>Status</Th>
                <Th>Notes</Th>
              </tr>
            </thead>
            <tbody>
              {visible.map((order, i) => {
                const isLast         = i === visible.length - 1;
                const isExpanded     = expandedNotes === order.id;
                const hasAdminNotes  = !!order.adminNotes.trim();
                const isSelected     = selected.has(order.id);

                return (
                  <Fragment key={order.id}>
                    <tr style={{
                      borderBottom: isExpanded || !isLast ? "1px solid #f0f0f0" : "none",
                      backgroundColor: isSelected ? "#f8f8f8" : order.rutAvdrag ? "#fff8ec" : "transparent",
                      boxShadow: order.rutAvdrag ? "inset 3px 0 0 #d4a017" : undefined,
                    }}>
                      <td style={{ padding: "0.9rem 0 0.9rem 1.25rem" }}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(order.id)}
                          style={{ cursor: "pointer", accentColor: "#1a1a1a" }}
                        />
                      </td>
                      <Td style={{ fontFamily: "monospace", fontSize: "0.8rem", color: "#555", whiteSpace: "nowrap" }}>
                        {order.paymentIntentId ? `#${order.paymentIntentId.slice(-7).toUpperCase()}` : "—"}
                      </Td>
                      <Td>{order.createdAt ? formatDate(order.createdAt) : "—"}</Td>
                      <Td>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                          {order.serviceName}
                          {order.tags.map(tag => <TagPill key={tag} tag={tag} />)}
                        </span>
                      </Td>
                      <Td style={{ fontWeight: 600 }}>{formatAmount(order.amount)}</Td>
                      <Td style={{ fontSize: "0.8rem" }}>
                        <span style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                          {order.platform === "mobile"
                            ? <IconDeviceMobile size={14} color="#888" />
                            : <IconDeviceDesktop size={14} color="#888" />
                          }
                          {order.customerId === "anonymous"
                            ? <span style={{ color: "#aaa" }}>Guest</span>
                            : order.customerEmail
                              ? <span style={{ color: "#333" }}>{order.customerEmail}</span>
                              : <span style={{ color: "#aaa", fontFamily: "monospace" }}>{order.customerId.slice(0, 12)}…</span>
                          }
                        </span>
                      </Td>
                      <Td>
                        <StatusSelect
                          value={order.status}
                          disabled={updating === order.id}
                          onChange={v => updateStatus(order.id, v)}
                        />
                      </Td>
                      <Td>
                        <button
                          onClick={() => setExpandedNotes(isExpanded ? null : order.id)}
                          style={{
                            padding: "0.25rem 0.6rem",
                            borderRadius: "6px",
                            border: "1px solid #e5e5e5",
                            background: isExpanded ? "#f5f5f5" : "transparent",
                            cursor: "pointer",
                            fontSize: "0.75rem",
                            color: hasAdminNotes ? "#1a1a1a" : "#aaa",
                            fontWeight: hasAdminNotes ? 600 : 400,
                            display: "flex",
                            alignItems: "center",
                            gap: "0.3rem",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {hasAdminNotes && <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#f59e0b", display: "inline-block", flexShrink: 0 }} />}
                          {hasAdminNotes ? "View note" : "Add note"}
                        </button>
                      </Td>
                    </tr>

                    {isExpanded && (
                      <tr style={{ borderBottom: isLast ? "none" : "1px solid #f0f0f0" }}>
                        <td colSpan={8} style={{ padding: "0.25rem 1.25rem 1.25rem 1.25rem", background: "#fafafa" }}>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                            {/* Booking details */}
                            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                              <p style={detailHeading}>Booking details</p>
                              {order.paymentIntentId && (
                                <DetailRow label="Order #" value={`#${order.paymentIntentId.slice(-7).toUpperCase()}`} />
                              )}
                              {order.address && (
                                <DetailRow label="Address" value={`${order.address}${order.postalCode ? ", " + order.postalCode : ""}`} />
                              )}
                              {order.dropoffDate && (
                                <DetailRow label="Dropoff date" value={order.dropoffDate} />
                              )}
                              {order.dropoffTime && (
                                <DetailRow label="Dropoff time" value={order.dropoffTime} />
                              )}
                              {order.rutAvdrag && (
                                <div style={{
                                  marginTop: "0.25rem", padding: "0.6rem 0.75rem",
                                  background: "#fff8ec", border: "1px solid #f0d9a8",
                                  borderRadius: "8px", display: "flex", flexDirection: "column", gap: "0.4rem",
                                }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                    <TagPill tag="RUT" />
                                    <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#8a6d1b", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                                      RUT-Avdrag
                                    </span>
                                  </div>
                                  <DetailRow label="Personnummer" value={order.rutPersonnummer || "—"} />
                                  <DetailRow label="Refund" value={`${order.rutDiscountPercent || 0}% · ${formatAmount(order.rutRefundOre)}`} />
                                </div>
                              )}
                              {Object.entries(order.customFields ?? {}).map(([key, value]) => (
                                <DetailRow key={key} label={key} value={String(value)} />
                              ))}
                              {!order.address && !order.dropoffDate && Object.keys(order.customFields ?? {}).length === 0 && (order.items ?? []).length === 0 && (
                                <p style={{ fontSize: "0.8rem", color: "#bbb" }}>No booking details saved</p>
                              )}

                              {/* Struken Tvätt basket items */}
                              {(order.items ?? []).length > 0 && (
                                <div style={{ marginTop: "0.5rem" }}>
                                  <p style={{ ...detailHeading, marginBottom: "0.5rem" }}>Plagg</p>
                                  <div style={{
                                    background: "#fff",
                                    border: "1px solid #e5e5e5",
                                    borderRadius: "8px",
                                    overflow: "hidden",
                                  }}>
                                    {order.items.map((item, idx) => (
                                      <div key={item.id} style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        padding: "0.45rem 0.75rem",
                                        borderBottom: idx < order.items.length - 1 ? "1px solid #f5f5f5" : "none",
                                        fontSize: "0.825rem",
                                      }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                          <span style={{
                                            background: "#f3f4f6",
                                            borderRadius: "4px",
                                            padding: "0.1rem 0.4rem",
                                            fontWeight: 600,
                                            fontSize: "0.75rem",
                                            color: "#555",
                                            minWidth: "1.4rem",
                                            textAlign: "center",
                                          }}>
                                            {item.qty}×
                                          </span>
                                          <span style={{ color: "#1a1a1a" }}>{item.name}</span>
                                        </div>
                                        <span style={{ color: "#666", whiteSpace: "nowrap" }}>
                                          {item.price * item.qty} kr
                                        </span>
                                      </div>
                                    ))}
                                    <div style={{
                                      display: "flex",
                                      justifyContent: "space-between",
                                      padding: "0.45rem 0.75rem",
                                      borderTop: "1px solid #e5e5e5",
                                      background: "#fafafa",
                                      fontSize: "0.825rem",
                                      fontWeight: 600,
                                      color: "#1a1a1a",
                                    }}>
                                      <span>Totalt</span>
                                      <span>{order.items.reduce((s, i) => s + i.price * i.qty, 0)} kr</span>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Customer description (read-only) */}
                            <div>
                              <p style={detailHeading}>Description</p>
                              {order.notes.trim() ? (
                                <p style={{
                                  fontSize: "0.875rem", color: "#333", lineHeight: 1.6,
                                  background: "#fff", border: "1px solid #e5e5e5",
                                  borderRadius: "8px", padding: "0.6rem 0.75rem",
                                  whiteSpace: "pre-wrap", margin: 0,
                                }}>
                                  {order.notes}
                                </p>
                              ) : (
                                <p style={{ fontSize: "0.8rem", color: "#bbb" }}>No description from customer</p>
                              )}
                            </div>

                            {/* Admin private note */}
                            <div>
                              <p style={detailHeading}>
                                Private note
                                <span style={{ marginLeft: "0.4rem", fontSize: "0.65rem", color: "#bbb", fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>
                                  — only visible to you
                                </span>
                              </p>
                              <textarea
                                defaultValue={order.adminNotes}
                                placeholder="Add a private note…"
                                rows={4}
                                onChange={e => { noteRefs.current[order.id] = e.target.value; }}
                                onBlur={() => saveAdminNotes(order.id)}
                                style={{
                                  width: "100%", padding: "0.6rem 0.75rem",
                                  border: "1px solid #e5e5e5", borderRadius: "8px",
                                  fontSize: "0.875rem", fontFamily: "inherit",
                                  resize: "vertical", boxSizing: "border-box",
                                  outline: "none", color: "#333", lineHeight: 1.5,
                                  background: "#fff",
                                }}
                              />
                              <p style={{ fontSize: "0.75rem", color: "#bbb", marginTop: "0.3rem" }}>
                                {savingNotes === order.id ? "Saving…" : "Auto-saves on click away"}
                              </p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StatusSelect({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled: boolean }) {
  const style = STATUS_STYLE[value] ?? { bg: "#f3f4f6", color: "#374151" };
  return (
    <select
      value={value}
      disabled={disabled}
      onChange={e => onChange(e.target.value)}
      style={{
        padding: "0.25rem 0.5rem", paddingRight: "1.25rem",
        borderRadius: "99px", border: "none",
        backgroundColor: style.bg, color: style.color,
        fontSize: "0.75rem", fontWeight: 600,
        cursor: "pointer", appearance: "none",
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23666' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
        backgroundRepeat: "no-repeat", backgroundPosition: "right 0.4rem center",
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {STATUS_OPTIONS.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  );
}

// Free-form order tags (independent of status). Currently only "RUT", but the
// styling falls back to a neutral pill for any future tag.
const TAG_STYLE: Record<string, { bg: string; color: string }> = {
  RUT: { bg: "#fbe6bf", color: "#8a6d1b" },
};
function TagPill({ tag }: { tag: string }) {
  const s = TAG_STYLE[tag] ?? { bg: "#e5e7eb", color: "#374151" };
  return (
    <span style={{
      background: s.bg, color: s.color,
      borderRadius: "99px", padding: "0.1rem 0.5rem",
      fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.03em",
      whiteSpace: "nowrap",
    }}>
      {tag}
    </span>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th style={{ padding: "0.75rem 1.25rem", textAlign: "left", fontWeight: 600, color: "#555", fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>
      {children}
    </th>
  );
}

function Td({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <td style={{ padding: "0.9rem 1.25rem", color: "#333", ...style }}>{children}</td>;
}

const dateInputStyle: React.CSSProperties = {
  padding: "0.3rem 0.6rem",
  border: "1px solid #e5e5e5",
  borderRadius: "6px",
  fontSize: "0.8rem",
  color: "#333",
  background: "#fff",
  cursor: "pointer",
};

const ghostBtn: React.CSSProperties = {
  padding: "0.45rem 1rem", background: "transparent",
  border: "1px solid #ddd", borderRadius: "6px",
  fontSize: "0.8rem", fontWeight: 500, cursor: "pointer", color: "#555",
};

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", gap: "0.5rem", fontSize: "0.825rem" }}>
      <span style={{ color: "#999", minWidth: "90px", flexShrink: 0, textTransform: "capitalize" }}>{label}</span>
      <span style={{ color: "#1a1a1a", fontWeight: 500 }}>{value}</span>
    </div>
  );
}

const detailHeading: React.CSSProperties = {
  fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase",
  letterSpacing: "0.06em", color: "#aaa", marginBottom: "0.4rem",
};

function formatAmount(ore: number) {
  return `${(ore / 100).toLocaleString("sv-SE")} kr`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("sv-SE", { day: "numeric", month: "short", year: "numeric" });
}
