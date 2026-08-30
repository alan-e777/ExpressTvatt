"use client";

import { useEffect, useState } from "react";
import { IconArrowLeft, IconArrowRight, IconPlus, IconX } from "@tabler/icons-react";
import {
  MAX_SLOTS, TIMESLOT_DEFAULTS, formatSlot, overlappingIndices, sortSlots, validateSlots,
  type TimeSlot, type TimeSlotKind, type TimeSlotSettings,
} from "@/lib/timeslots";

/**
 * Editor for the pickup and delivery windows the customer can book.
 *
 * The two lists are independent — the mirror buttons copy one over the other for
 * the common case where they are identical. Gaps are allowed on purpose (08–12
 * then 14–16 leaves 12–14 unbookable); overlaps are not, and neither is an empty
 * list, so the panel refuses to save either and the API re-checks both.
 */

const KIND_LABEL: Record<TimeSlotKind, string> = {
  pickup:   "Upphämtning",
  delivery: "Avlämning",
};

const pad = (h: number) => String(h).padStart(2, "0");
const HOURS = Array.from({ length: 25 }, (_, h) => h);

/** First free window after the last one, used by "Lägg till tid". */
function nextFreeSlot(slots: TimeSlot[]): TimeSlot | null {
  const taken = new Array(24).fill(false);
  for (const s of slots) for (let h = Math.max(0, s.start); h < Math.min(24, s.end); h++) taken[h] = true;

  const sorted = sortSlots(slots);
  const preferred = sorted.length ? sorted[sorted.length - 1].end : 8;
  const candidates = [preferred, ...HOURS.slice(0, 24)];

  for (const start of candidates) {
    if (start < 0 || start > 23 || taken[start]) continue;
    let end = start + 1;
    while (end < 24 && !taken[end] && end - start < 2) end++;
    return { start, end };
  }
  return null;
}

export default function TimeSlotsPanel() {
  const [slots, setSlots] = useState<TimeSlotSettings>(TIMESLOT_DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mirrored, setMirrored] = useState<TimeSlotKind | null>(null);

  useEffect(() => {
    fetch("/api/admin/timeslots")
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (d) setSlots(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const update = (kind: TimeSlotKind, next: TimeSlot[]) =>
    setSlots(prev => ({ ...prev, [kind]: next }));

  // Start and end can never cross: moving one pushes the other along, so a row
  // is always a real window even mid-edit.
  function setHour(kind: TimeSlotKind, index: number, field: "start" | "end", value: number) {
    update(kind, slots[kind].map((slot, i) => {
      if (i !== index) return slot;
      return field === "start"
        ? { start: value, end: Math.max(slot.end, value + 1) }
        : { start: Math.min(slot.start, value - 1), end: value };
    }));
  }

  function addSlot(kind: TimeSlotKind) {
    const slot = nextFreeSlot(slots[kind]);
    if (slot) update(kind, [...slots[kind], slot]);
  }

  function removeSlot(kind: TimeSlotKind, index: number) {
    update(kind, slots[kind].filter((_, i) => i !== index));
  }

  function mirror(from: TimeSlotKind) {
    const to: TimeSlotKind = from === "pickup" ? "delivery" : "pickup";
    setSlots(prev => ({ ...prev, [to]: prev[from].map(s => ({ ...s })) }));
    setMirrored(from);
    setTimeout(() => setMirrored(null), 2000);
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const body: TimeSlotSettings = { pickup: sortSlots(slots.pickup), delivery: sortSlots(slots.delivery) };
      const res = await fetch("/api/admin/timeslots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(res.status === 401 ? "Sessionen har gått ut — logga in igen." : (data.error ?? "Kunde inte spara."));
        return;
      }
      setSlots(data);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setError("Nätverksfel — försök igen.");
    } finally {
      setSaving(false);
    }
  }

  const errors: Record<TimeSlotKind, string | null> = {
    pickup:   validateSlots(slots.pickup),
    delivery: validateSlots(slots.delivery),
  };
  const blocked = Boolean(errors.pickup || errors.delivery);

  return (
    <section style={{ background: "#fff", border: "1px solid #eee", borderRadius: "10px", padding: "1.25rem" }}>
      <p style={labelStyle}>Tider för upphämtning &amp; avlämning</p>
      <p style={{ fontSize: "0.8rem", color: "#aaa", marginBottom: "1rem", lineHeight: 1.5 }}>
        Bestäm vilka tidsfönster kunden kan välja i kassan. Luckor är tillåtna — sätter du
        <strong> 08–12</strong> och <strong>14–16</strong> går det helt enkelt inte att boka mellan 12 och 14.
        Tider som överlappar varandra går däremot inte att spara.
      </p>

      {loading ? (
        <p style={{ fontSize: "0.8rem", color: "#bbb" }}>Laddar…</p>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: "1rem" }}>
            {(["pickup", "delivery"] as TimeSlotKind[]).map(kind => {
              const list = slots[kind];
              const bad = overlappingIndices(list);
              const other = kind === "pickup" ? "delivery" : "pickup";
              const full = nextFreeSlot(list) === null || list.length >= MAX_SLOTS;

              return (
                <div key={kind} style={{ border: "1px solid #f0f0f0", borderRadius: "8px", padding: "0.9rem" }}>
                  <p style={{ ...fieldLabelStyle, marginBottom: "0.7rem" }}>{KIND_LABEL[kind]}</p>

                  <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                    {list.map((slot, i) => (
                      <div
                        key={i}
                        style={{
                          display: "flex", alignItems: "center", gap: "0.35rem",
                          background: bad.has(i) ? "#fef2f2" : "transparent",
                          border: `1px solid ${bad.has(i) ? "#fecaca" : "transparent"}`,
                          borderRadius: "6px", padding: "0.15rem 0.25rem",
                        }}
                      >
                        <select
                          value={slot.start}
                          onChange={e => setHour(kind, i, "start", Number(e.target.value))}
                          aria-label={`${KIND_LABEL[kind]} — starttid ${i + 1}`}
                          style={selectStyle}
                        >
                          {HOURS.slice(0, 24).map(h => <option key={h} value={h}>{pad(h)}:00</option>)}
                        </select>
                        <span style={{ color: "#bbb", fontSize: "0.8rem" }}>–</span>
                        <select
                          value={slot.end}
                          onChange={e => setHour(kind, i, "end", Number(e.target.value))}
                          aria-label={`${KIND_LABEL[kind]} — sluttid ${i + 1}`}
                          style={selectStyle}
                        >
                          {HOURS.slice(1).map(h => <option key={h} value={h}>{pad(h)}:00</option>)}
                        </select>
                        <button
                          type="button"
                          onClick={() => removeSlot(kind, i)}
                          title="Ta bort tiden"
                          aria-label={`Ta bort ${formatSlot(slot)}`}
                          style={{
                            marginLeft: "auto", display: "flex", alignItems: "center",
                            background: "none", border: "none", color: "#ccc",
                            cursor: "pointer", padding: "0.25rem",
                          }}
                          onMouseEnter={e => { e.currentTarget.style.color = "#dc2626"; }}
                          onMouseLeave={e => { e.currentTarget.style.color = "#ccc"; }}
                        >
                          <IconX size={14} stroke={2} />
                        </button>
                      </div>
                    ))}

                    {list.length === 0 && (
                      <p style={{ fontSize: "0.75rem", color: "#dc2626", margin: "0 0 0.2rem" }}>
                        Inga tider — kunden kan inte boka {KIND_LABEL[kind].toLowerCase()}.
                      </p>
                    )}
                  </div>

                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginTop: "0.7rem" }}>
                    <button
                      type="button"
                      onClick={() => addSlot(kind)}
                      disabled={full}
                      title={full ? "Dygnet är fullbokat med tider" : undefined}
                      style={{
                        display: "flex", alignItems: "center", gap: "0.25rem",
                        padding: "0.35rem 0.6rem", background: "#fff",
                        border: "1px solid #e0e0e0", borderRadius: "6px",
                        fontSize: "0.75rem", fontWeight: 600, color: full ? "#ccc" : "#333",
                        cursor: full ? "not-allowed" : "pointer",
                      }}
                    >
                      <IconPlus size={13} stroke={2} /> Lägg till tid
                    </button>

                    <button
                      type="button"
                      onClick={() => mirror(kind)}
                      title={`Kopiera dessa tider till ${KIND_LABEL[other].toLowerCase()}`}
                      style={{
                        display: "flex", alignItems: "center", gap: "0.25rem",
                        padding: "0.35rem 0.6rem",
                        background: mirrored === kind ? "#f0fdf4" : "#fff",
                        border: `1px solid ${mirrored === kind ? "#bbf7d0" : "#e0e0e0"}`,
                        borderRadius: "6px", fontSize: "0.75rem", fontWeight: 600,
                        color: mirrored === kind ? "#15803d" : "#333", cursor: "pointer",
                      }}
                    >
                      {kind === "pickup"
                        ? <>{mirrored === kind ? "✓ Kopierat" : `Kopiera till ${KIND_LABEL[other].toLowerCase()}`} <IconArrowRight size={13} stroke={2} /></>
                        : <><IconArrowLeft size={13} stroke={2} /> {mirrored === kind ? "✓ Kopierat" : `Kopiera till ${KIND_LABEL[other].toLowerCase()}`}</>}
                    </button>
                  </div>

                  {errors[kind] && (
                    <p style={{ fontSize: "0.72rem", color: "#dc2626", margin: "0.6rem 0 0", lineHeight: 1.5 }}>
                      {errors[kind]}
                    </p>
                  )}

                  <p style={{ fontSize: "0.7rem", color: "#bbb", margin: "0.6rem 0 0", lineHeight: 1.5 }}>
                    Kunden ser: {list.length ? sortSlots(list).map(formatSlot).join(" · ") : "—"}
                  </p>
                </div>
              );
            })}
          </div>

          <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "0.75rem", marginTop: "1rem" }}>
            <button
              onClick={save}
              disabled={saving || blocked}
              title={blocked ? "Rätta felen ovan först" : undefined}
              style={{
                padding: "0.5rem 1rem",
                background: saved ? "#f0fdf4" : blocked ? "#f5f5f5" : "#1a1a1a",
                color: saved ? "#15803d" : blocked ? "#bbb" : "#fff",
                border: saved ? "1px solid #bbf7d0" : "none",
                borderRadius: "8px", fontSize: "0.85rem", fontWeight: 600,
                cursor: saving || blocked ? "not-allowed" : "pointer",
                opacity: saving ? 0.6 : 1,
              }}
            >
              {saving ? "Sparar…" : saved ? "✓ Sparat" : "Spara tider"}
            </button>
            {error && <span style={{ fontSize: "0.75rem", color: "#dc2626" }}>{error}</span>}
          </div>

          <p style={{ fontSize: "0.7rem", color: "#bbb", margin: "0.75rem 0 0", lineHeight: 1.5 }}>
            Ändringarna gäller först när du sparar, och slår igenom direkt i kassan.
            Redan lagda ordrar behåller den tid kunden valde. iOS-appen visar tills vidare
            de ursprungliga tiderna (08–12, 12–16, 16–20).
          </p>
        </>
      )}
    </section>
  );
}

const labelStyle: React.CSSProperties = {
  fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase",
  letterSpacing: "0.06em", color: "#aaa", margin: 0, marginBottom: "0.2rem",
};

const fieldLabelStyle: React.CSSProperties = {
  display: "block", fontSize: "0.78rem", fontWeight: 600,
  color: "#555", margin: 0,
};

const selectStyle: React.CSSProperties = {
  padding: "0.35rem 0.4rem", border: "1px solid #e0e0e0", borderRadius: "6px",
  fontSize: "0.82rem", color: "#1a1a1a", background: "#fff", outline: "none",
};
