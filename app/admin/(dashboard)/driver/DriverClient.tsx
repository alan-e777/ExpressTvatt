"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase-client";

export type DriverOrder = {
  id: string;
  serviceName: string;
  address: string;
  postalCode: string;
  status: string;
  dropoffDate: string;
  dropoffTime: string;
  notes: string;
};

type Tab = "dropoff" | "pickup";

type Endpoints = {
  startAddr: string;
  includeStart: boolean;
  stopAddr: string;
  includeStop: boolean;
};

function fullAddress(order: DriverOrder): string {
  return [order.address, order.postalCode].filter(Boolean).join(", ");
}

function buildMapsUrl(addresses: string[]): string {
  if (addresses.length === 0) return "";
  if (addresses.length === 1) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addresses[0])}`;
  }
  const origin = encodeURIComponent(addresses[0]);
  const destination = encodeURIComponent(addresses[addresses.length - 1]);
  const middle = addresses.slice(1, -1);
  let url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=driving`;
  if (middle.length > 0) {
    url += `&waypoints=${middle.map(a => encodeURIComponent(a)).join("|")}`;
  }
  return url;
}

const emptyEndpoints = (): Endpoints => ({
  startAddr: "",
  includeStart: false,
  stopAddr: "",
  includeStop: false,
});

export default function DriverClient({ initialOrders }: { initialOrders: DriverOrder[] }) {
  const [orders, setOrders] = useState<DriverOrder[]>(initialOrders);

  // Real-time listener — only fetch statuses relevant to the driver view
  useEffect(() => {
    const q = query(
      collection(db, "orders"),
      where("status", "in", ["ready_for_pickup", "paid"])
    );
    return onSnapshot(q, snap => {
      setOrders(snap.docs.map(d => {
        const data = d.data();
        return {
          id:          data.id ?? d.id,
          serviceName: data.serviceName ?? "—",
          address:     data.address ?? "",
          postalCode:  data.postalCode ?? "",
          status:      data.status ?? "paid",
          dropoffDate: data.dropoffDate ?? "",
          dropoffTime: data.dropoffTime ?? "",
          notes:       data.notes ?? "",
        };
      }));
    });
  }, []);

  const [tab, setTab] = useState<Tab>("dropoff");

  // Per-tab queues
  const [otwList,    setOtwList]    = useState<DriverOrder[]>([]);
  const [pickupList, setPickupList] = useState<DriverOrder[]>([]);

  // Per-tab start/stop config — addresses loaded from settings
  const [dropoffEP, setDropoffEP] = useState<Endpoints>(emptyEndpoints);
  const [pickupEP,  setPickupEP]  = useState<Endpoints>(emptyEndpoints);

  // Per-tab optimisation results
  const [dropoffResult, setDropoffResult] = useState<{ orderedAddresses: string[]; algorithm: string } | null>(null);
  const [pickupResult,  setPickupResult]  = useState<{ orderedAddresses: string[]; algorithm: string } | null>(null);
  const [mapsUrlDropoff, setMapsUrlDropoff] = useState<string | null>(null);
  const [mapsUrlPickup,  setMapsUrlPickup]  = useState<string | null>(null);

  const [optimizing, setOptimizing] = useState(false);
  const [copied,     setCopied]     = useState(false);
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  // Per-tab run links
  const [dropoffRunLink, setDropoffRunLink] = useState<string | null>(null);
  const [pickupRunLink,  setPickupRunLink]  = useState<string | null>(null);
  const [generatingLink, setGeneratingLink] = useState(false);
  const [linkCopied,     setLinkCopied]     = useState(false);

  // Load start/stop from settings on mount
  useEffect(() => {
    fetch("/api/admin/settings")
      .then(r => r.json())
      .then(data => {
        const addr = { startAddr: data.startAddr ?? "", stopAddr: data.stopAddr ?? "" };
        setDropoffEP(p => ({ ...p, ...addr }));
        setPickupEP(p  => ({ ...p, ...addr }));
        setSettingsLoaded(true);
      })
      .catch(() => setSettingsLoaded(true));
  }, []);

  // Derived state for active tab
  const ep            = tab === "dropoff" ? dropoffEP   : pickupEP;
  const setEP         = tab === "dropoff" ? setDropoffEP : setPickupEP;
  const activeQueue   = tab === "dropoff" ? otwList      : pickupList;
  const activeResult  = tab === "dropoff" ? dropoffResult  : pickupResult;
  const activeMapsUrl = tab === "dropoff" ? mapsUrlDropoff : mapsUrlPickup;

  const readyOrders = orders.filter(
    o => o.status === "ready_for_pickup" && !otwList.find(r => r.id === o.id)
  );
  const paidOrders = orders.filter(
    o => o.status === "paid" && !pickupList.find(r => r.id === o.id)
  );
  const available = tab === "dropoff" ? readyOrders : paidOrders;

  // ── Queue mutations ──────────────────────────────────────────────────────────

  function addToDropoff(order: DriverOrder) {
    setOtwList(prev => [...prev, order]);
    setDropoffResult(null); setMapsUrlDropoff(null);
  }
  function removeFromDropoff(id: string) {
    setOtwList(prev => prev.filter(o => o.id !== id));
    setDropoffResult(null); setMapsUrlDropoff(null);
  }
  function addToPickup(order: DriverOrder) {
    setPickupList(prev => [...prev, order]);
    setPickupResult(null); setMapsUrlPickup(null);
  }
  function removeFromPickup(id: string) {
    setPickupList(prev => prev.filter(o => o.id !== id));
    setPickupResult(null); setMapsUrlPickup(null);
  }

  function clearResult() {
    if (tab === "dropoff") { setDropoffResult(null); setMapsUrlDropoff(null); }
    else                   { setPickupResult(null);  setMapsUrlPickup(null);  }
  }

  // ── Route optimisation ───────────────────────────────────────────────────────

  async function buildRoute() {
    if (activeQueue.length === 0) return;
    setOptimizing(true);
    try {
      const stops = activeQueue.map(fullAddress).filter(Boolean);
      const origin      = ep.includeStart && ep.startAddr.trim() ? ep.startAddr.trim() : undefined;
      const destination = ep.includeStop  && ep.stopAddr.trim()  ? ep.stopAddr.trim()  : undefined;

      const resp = await fetch("/api/admin/driver/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stops, origin, destination }),
      });
      const data = await resp.json();

      if (data.error) { alert(data.error); return; }

      const url = buildMapsUrl(data.orderedAddresses);
      if (tab === "dropoff") {
        setDropoffResult(data); setMapsUrlDropoff(url);
      } else {
        setPickupResult(data);  setMapsUrlPickup(url);
      }
    } catch {
      alert("Misslyckades att optimera rutten. Kontrollera nätverksanslutningen.");
    } finally {
      setOptimizing(false);
    }
  }

  async function generateRunLink() {
    if (activeQueue.length === 0) return;
    setGeneratingLink(true);
    try {
      const resp = await fetch("/api/admin/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderIds: activeQueue.map(o => o.id), type: tab }),
      });
      const data = await resp.json();
      if (data.token) {
        const link = `${window.location.origin}/driver/${data.token}`;
        if (tab === "dropoff") setDropoffRunLink(link);
        else setPickupRunLink(link);
      }
    } catch {
      alert("Misslyckades att generera körningslänk.");
    } finally {
      setGeneratingLink(false);
    }
  }

  function copyRunLink() {
    const link = tab === "dropoff" ? dropoffRunLink : pickupRunLink;
    if (!link) return;
    navigator.clipboard.writeText(link).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    });
  }

  function copyUrl() {
    if (!activeMapsUrl) return;
    navigator.clipboard.writeText(activeMapsUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  // ── Display order ────────────────────────────────────────────────────────────

  const deliveryAddressesInResult: string[] = (() => {
    if (!activeResult) return [];
    const all = activeResult.orderedAddresses;
    const startIdx = ep.includeStart && ep.startAddr.trim() ? 1 : 0;
    const endIdx   = ep.includeStop  && ep.stopAddr.trim()  ? all.length - 1 : all.length;
    return all.slice(startIdx, endIdx);
  })();

  const displayQueue: Array<DriverOrder & { routePos: number }> = (() => {
    if (!activeResult || deliveryAddressesInResult.length === 0) {
      return activeQueue.map((o, i) => ({ ...o, routePos: i + 1 }));
    }
    return [...activeQueue]
      .map(order => {
        const addr = fullAddress(order);
        const pos  = deliveryAddressesInResult.indexOf(addr);
        return { ...order, routePos: pos >= 0 ? pos + 1 : activeQueue.length + 1 };
      })
      .sort((a, b) => a.routePos - b.routePos);
  })();

  const activeRunLink = tab === "dropoff" ? dropoffRunLink : pickupRunLink;

  const stopCount = activeQueue.length
    + (ep.includeStart && ep.startAddr.trim() ? 1 : 0)
    + (ep.includeStop  && ep.stopAddr.trim()  ? 1 : 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.2rem" }}>Driver</h1>
        <p style={{ color: "#999", fontSize: "0.875rem" }}>Planera körningar och dela ruttlänk med chauffören</p>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", marginBottom: "1.5rem", borderBottom: "2px solid #eee" }}>
        <TabBtn label="Utkörning"   active={tab === "dropoff"} count={otwList.length}    onClick={() => setTab("dropoff")} />
        <TabBtn label="Upphämtning" active={tab === "pickup"}  count={pickupList.length} onClick={() => setTab("pickup")}  />
      </div>

      {tab === "pickup" && (
        <div style={{ background: "#fef9c3", border: "1px solid #fde68a", borderRadius: "8px", padding: "0.7rem 1rem", marginBottom: "1.25rem", fontSize: "0.825rem", color: "#854d0e" }}>
          Upphämtning — chauffören hämtar plagg hos kund och lämnar till skräddaren. Visar betalda ordrar som ännu ej samlats in.
        </div>
      )}

      {/* Two-column layout */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem", alignItems: "start", flex: 1, minHeight: 0, overflow: "hidden" }}>

        {/* ── Left: available orders ─────────────────────────────────────────── */}
        <section style={{ minWidth: 0, display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
          <SectionLabel
            title={tab === "dropoff" ? "Redo för utkörning" : "Väntar på upphämtning"}
            count={available.length}
            onAddAll={() => available.forEach(o => tab === "dropoff" ? addToDropoff(o) : addToPickup(o))}
          />
          <div style={{ background: "#fff", border: "1px solid #eee", borderRadius: "10px", overflow: "auto", flex: 1, minHeight: 0 }}>
            {available.length === 0 ? (
              <EmptyState text={tab === "dropoff" ? "Inga ordrar redo för utkörning" : "Inga ordrar väntar på upphämtning"} />
            ) : (
              available.map((order, i) => (
                <OrderRow
                  key={order.id}
                  order={order}
                  isLast={i === available.length - 1}
                  actionLabel="Lägg till →"
                  onAction={() => tab === "dropoff" ? addToDropoff(order) : addToPickup(order)}
                />
              ))
            )}
          </div>
        </section>

        {/* ── Right: queue + route builder ──────────────────────────────────── */}
        <section style={{ minWidth: 0, display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
          <SectionLabel
            title={tab === "dropoff" ? "Ska köras ut" : "Ska hämtas upp"}
            count={activeQueue.length}
          />

          {/* Queue list */}
          <div style={{ background: "#fff", border: "1px solid #eee", borderRadius: "10px", overflowY: "auto", marginBottom: "1rem", maxHeight: "35vh" }}>
            {activeQueue.length === 0 ? (
              <EmptyState text="Lägg till ordrar från listan till vänster" />
            ) : (
              <>
                {ep.includeStart && ep.startAddr.trim() && (
                  <AnchorRow label="Start" address={ep.startAddr} isLast={false} color="#4b8c5c" />
                )}
                {displayQueue.map((order, i) => (
                  <OrderRow
                    key={order.id}
                    order={order}
                    isLast={i === displayQueue.length - 1 && !(ep.includeStop && ep.stopAddr.trim())}
                    routePos={order.routePos}
                    actionLabel="Ta bort"
                    actionDanger
                    onAction={() => tab === "dropoff" ? removeFromDropoff(order.id) : removeFromPickup(order.id)}
                  />
                ))}
                {ep.includeStop && ep.stopAddr.trim() && (
                  <AnchorRow label="Stopp" address={ep.stopAddr} isLast color="#c0392b" />
                )}
              </>
            )}
          </div>

          {/* Route builder */}
          <div style={{ background: "#fff", border: "1px solid #eee", borderRadius: "10px", padding: "1rem" }}>
            <p style={sectionLabelStyle}>Ruttplanering</p>

            {/* Start anchor — read-only, togglable */}
            <AnchorToggle
              label="Startplats"
              dotColor="#4b8c5c"
              addr={ep.startAddr}
              included={ep.includeStart}
              loaded={settingsLoaded}
              onToggle={v => { setEP(p => ({ ...p, includeStart: v })); clearResult(); }}
            />

            {/* Stop anchor — read-only, togglable */}
            <AnchorToggle
              label="Slutplats"
              dotColor="#c0392b"
              addr={ep.stopAddr}
              included={ep.includeStop}
              loaded={settingsLoaded}
              onToggle={v => { setEP(p => ({ ...p, includeStop: v })); clearResult(); }}
            />

            <div style={{ fontSize: "0.72rem", color: "#bbb", marginBottom: "0.65rem" }}>
              Ändra adresser i{" "}
              <Link href="/admin/settings" style={{ color: "#4b8c5c", textDecoration: "underline" }}>
                Inställningar
              </Link>
            </div>

            <div style={{ borderTop: "1px solid #f0f0f0", margin: "0.75rem 0" }} />

            {/* Stop count info */}
            <p style={{ fontSize: "0.8rem", color: "#999", marginBottom: "0.75rem" }}>
              {stopCount <= 1
                ? "Lägg till ordrar för att optimera"
                : stopCount <= 10
                  ? `${stopCount} stopp — Google Maps-optimering`
                  : `${stopCount} stopp — närmaste granne-algoritm`}
            </p>

            {activeQueue.length > 0 && (
              <button
                onClick={buildRoute}
                disabled={optimizing}
                style={{
                  width: "100%", padding: "0.65rem 1rem",
                  background: "#1a1a1a", color: "#fff",
                  border: "none", borderRadius: "8px",
                  fontSize: "0.875rem", fontWeight: 600,
                  cursor: optimizing ? "not-allowed" : "pointer",
                  opacity: optimizing ? 0.6 : 1,
                  marginBottom: "0.75rem",
                }}
              >
                {optimizing ? "Optimerar…" : "Optimera & generera länk"}
              </button>
            )}


            {activeMapsUrl && (
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "#f9f9f8", border: "1px solid #e5e5e5", borderRadius: "8px", padding: "0.5rem 0.75rem", marginBottom: "0.5rem" }}>
                  <span style={{ flex: 1, minWidth: 0, fontSize: "0.72rem", color: "#666", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {activeMapsUrl}
                  </span>
                  <button
                    onClick={copyUrl}
                    style={{ padding: "0.3rem 0.65rem", background: copied ? "#dcfce7" : "#fff", color: copied ? "#15803d" : "#333", border: "1px solid #e5e5e5", borderRadius: "6px", fontSize: "0.75rem", fontWeight: 600, cursor: "pointer", flexShrink: 0, transition: "background 0.15s, color 0.15s" }}
                  >
                    {copied ? "✓ Kopierat" : "Kopiera"}
                  </button>
                </div>
                <a
                  href={activeMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: "block", textAlign: "center", padding: "0.55rem", background: "#4285f4", color: "#fff", borderRadius: "8px", fontSize: "0.825rem", fontWeight: 600, textDecoration: "none" }}
                >
                  Öppna i Google Maps
                </a>
              </div>
            )}

            {/* ── Driver run link ──────────────────────────────────────────── */}
            <div style={{ borderTop: "1px solid #f0f0f0", marginTop: "0.85rem", paddingTop: "0.85rem" }}>
              <p style={sectionLabelStyle}>Körningslänk för chauffören</p>

              {activeQueue.length > 0 && (
                <button
                  onClick={generateRunLink}
                  disabled={generatingLink}
                  style={{
                    width: "100%", padding: "0.65rem 1rem",
                    background: "transparent", color: "#1a1a1a",
                    border: "1px solid #d0d0d0", borderRadius: "8px",
                    fontSize: "0.875rem", fontWeight: 600,
                    cursor: generatingLink ? "not-allowed" : "pointer",
                    opacity: generatingLink ? 0.6 : 1,
                    marginBottom: activeRunLink ? "0.75rem" : 0,
                  }}
                >
                  {generatingLink ? "Genererar…" : activeRunLink ? "Ny körningslänk" : "Generera körningslänk"}
                </button>
              )}

              {activeRunLink && (
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "#f9f9f8", border: "1px solid #e5e5e5", borderRadius: "8px", padding: "0.5rem 0.75rem", marginBottom: "0.5rem" }}>
                    <span style={{ flex: 1, minWidth: 0, fontSize: "0.72rem", color: "#666", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {activeRunLink}
                    </span>
                    <button
                      onClick={copyRunLink}
                      style={{ padding: "0.3rem 0.65rem", background: linkCopied ? "#dcfce7" : "#fff", color: linkCopied ? "#15803d" : "#333", border: "1px solid #e5e5e5", borderRadius: "6px", fontSize: "0.75rem", fontWeight: 600, cursor: "pointer", flexShrink: 0, transition: "background 0.15s, color 0.15s" }}
                    >
                      {linkCopied ? "✓ Kopierat" : "Kopiera"}
                    </button>
                  </div>
                  <a
                    href={activeRunLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ display: "block", textAlign: "center", padding: "0.55rem", background: "#1a1a1a", color: "#fff", borderRadius: "8px", fontSize: "0.825rem", fontWeight: 600, textDecoration: "none" }}
                  >
                    Öppna körningssida →
                  </a>
                </div>
              )}

              {activeQueue.length === 0 && (
                <p style={{ fontSize: "0.75rem", color: "#ccc" }}>Lägg till ordrar i kön för att generera länk</p>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────────

function AnchorToggle({
  label, dotColor, addr, included, loaded, onToggle,
}: {
  label: string; dotColor: string; addr: string;
  included: boolean; loaded: boolean; onToggle: (v: boolean) => void;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.5rem" }}>
      <input
        type="checkbox"
        checked={included}
        onChange={e => onToggle(e.target.checked)}
        disabled={!loaded || !addr}
        style={{ cursor: loaded && addr ? "pointer" : "default", accentColor: "#1a1a1a", flexShrink: 0 }}
      />
      <div style={{ width: 8, height: 8, borderRadius: "50%", background: included && addr ? dotColor : "#ccc", flexShrink: 0 }} />
      <span style={{ fontSize: "0.78rem", fontWeight: 600, color: included && addr ? "#555" : "#bbb", minWidth: 60, flexShrink: 0 }}>{label}</span>
      <span style={{
        flex: 1, fontSize: "0.8rem",
        color: addr ? (included ? "#1a1a1a" : "#999") : "#ccc",
        fontStyle: addr ? "normal" : "italic",
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
      }}>
        {loaded ? (addr || "Ej inställd") : "…"}
      </span>
    </div>
  );
}

function AnchorRow({ label, address, isLast, color }: { label: string; address: string; isLast: boolean; color: string }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: "0.75rem",
      padding: "0.65rem 1rem",
      borderBottom: isLast ? "none" : "1px solid #f0f0f0",
      background: "#fafafa",
    }}>
      <div style={{ width: 22, height: 22, borderRadius: "50%", background: color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <span style={{ color: "#fff", fontSize: "0.6rem", fontWeight: 700 }}>
          {label === "Start" ? "S" : "E"}
        </span>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{ fontSize: "0.75rem", fontWeight: 700, color, textTransform: "uppercase", letterSpacing: "0.04em", marginRight: "0.4rem" }}>{label}</span>
        <span style={{ fontSize: "0.8rem", color: "#555", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{address}</span>
      </div>
    </div>
  );
}

function TabBtn({ label, active, count, onClick }: { label: string; active: boolean; count: number; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{ padding: "0.6rem 1.1rem", background: "none", border: "none", borderBottom: active ? "2px solid #1a1a1a" : "2px solid transparent", marginBottom: "-2px", cursor: "pointer", fontSize: "0.875rem", fontWeight: active ? 700 : 400, color: active ? "#1a1a1a" : "#888", display: "flex", alignItems: "center", gap: "0.4rem" }}
    >
      {label}
      {count > 0 && (
        <span style={{ background: active ? "#1a1a1a" : "#e5e5e5", color: active ? "#fff" : "#555", borderRadius: "99px", fontSize: "0.65rem", fontWeight: 700, padding: "0.1rem 0.45rem" }}>
          {count}
        </span>
      )}
    </button>
  );
}

function SectionLabel({ title, count, onAddAll }: { title: string; count: number; onAddAll?: () => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
      <p style={sectionLabelStyle}>{title}</p>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <span style={{ fontSize: "0.75rem", color: "#bbb" }}>{count} ordrar</span>
        {onAddAll && count > 0 && (
          <button
            onClick={onAddAll}
            style={{
              padding: "0.15rem 0.5rem",
              background: "transparent",
              border: "1px solid #e0e0e0",
              borderRadius: "4px",
              fontSize: "0.7rem",
              fontWeight: 600,
              color: "#666",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            Lägg till alla
          </button>
        )}
      </div>
    </div>
  );
}

function OrderRow({ order, isLast, routePos, actionLabel, actionDanger, onAction }: {
  order: DriverOrder; isLast: boolean; routePos?: number;
  actionLabel: string; actionDanger?: boolean; onAction: () => void;
}) {
  const addr = fullAddress(order);
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem", padding: "0.85rem 1rem", borderBottom: isLast ? "none" : "1px solid #f0f0f0" }}>
      {routePos !== undefined && (
        <div style={{ width: 22, height: 22, borderRadius: "50%", background: "#f0f0f0", color: "#555", fontSize: "0.7rem", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
          {routePos}
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: "0.85rem", fontWeight: 600, color: "#1a1a1a", marginBottom: "0.15rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {addr || <span style={{ color: "#bbb" }}>Ingen adress</span>}
        </p>
        <p style={{ fontSize: "0.775rem", color: "#888", marginBottom: "0.1rem" }}>{order.serviceName}</p>
        {order.dropoffDate && (
          <p style={{ fontSize: "0.72rem", color: "#bbb" }}>{order.dropoffDate}{order.dropoffTime ? ` kl. ${order.dropoffTime}` : ""}</p>
        )}
      </div>
      <button
        onClick={onAction}
        style={{ padding: "0.3rem 0.65rem", background: "transparent", border: `1px solid ${actionDanger ? "#fca5a5" : "#e5e5e5"}`, borderRadius: "6px", fontSize: "0.75rem", fontWeight: 500, cursor: "pointer", color: actionDanger ? "#dc2626" : "#555", flexShrink: 0, whiteSpace: "nowrap" }}
      >
        {actionLabel}
      </button>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div style={{ padding: "2.5rem 1rem", textAlign: "center", color: "#bbb", fontSize: "0.85rem" }}>{text}</div>;
}

const sectionLabelStyle: React.CSSProperties = {
  fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase",
  letterSpacing: "0.06em", color: "#aaa", margin: 0, marginBottom: "0.4rem",
};
