"use client";

import { useState } from "react";

export type ProductWarning = { id: string; text: string; order: number };

/**
 * Collapsible library of reusable "bra att veta" remarks.
 *
 * Warnings live here once and are attached to individual garments from the
 * product rows, so the same remark can cover several products and editing it
 * once updates all of them.
 */
export default function WarningsManager({
  warnings,
  onChange,
  usageCount,
}: {
  warnings: ProductWarning[];
  onChange: (next: ProductWarning[]) => void;
  /** How many products currently use a given warning. */
  usageCount: (id: string) => number;
}) {
  const [open, setOpen] = useState(false);
  const [newText, setNewText] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  async function handleAdd() {
    const text = newText.trim();
    if (!text) { setError("Skriv en text först."); return; }
    setAdding(true);
    setError("");
    try {
      const res = await fetch("/api/admin/warnings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "Kunde inte spara."); return; }
      onChange([...warnings, { id: json.id, text: json.text, order: json.order }]);
      setNewText("");
    } catch {
      setError("Nätverksfel — försök igen.");
    } finally {
      setAdding(false);
    }
  }

  async function handleSaveEdit(id: string) {
    const text = editText.trim();
    if (!text) { setEditingId(null); return; }
    const previous = warnings;
    onChange(warnings.map(w => (w.id === id ? { ...w, text } : w)));
    setEditingId(null);
    const res = await fetch(`/api/admin/warnings/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) { onChange(previous); setError("Kunde inte spara ändringen."); }
  }

  async function handleDelete(w: ProductWarning) {
    const uses = usageCount(w.id);
    const suffix = uses > 0
      ? `\n\nDen är kopplad till ${uses} ${uses === 1 ? "plagg" : "plagg"} och tas bort där också.`
      : "";
    if (!confirm(`Ta bort varningen?${suffix}`)) return;

    const previous = warnings;
    onChange(warnings.filter(x => x.id !== w.id));
    const res = await fetch(`/api/admin/warnings/${w.id}`, { method: "DELETE" });
    if (!res.ok) { onChange(previous); setError("Kunde inte ta bort varningen."); }
  }

  return (
    <div style={{ background: "#fff", border: "1px solid #eee", borderRadius: "10px", marginBottom: "1.25rem", overflow: "hidden" }}>
      <button
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        style={{
          width: "100%", display: "flex", alignItems: "center", gap: "0.6rem",
          background: "none", border: "none", padding: "1rem 1.25rem",
          cursor: "pointer", textAlign: "left",
        }}
      >
        <span style={{
          width: 22, height: 22, borderRadius: "50%", background: "#fef3c7", color: "#b45309",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "0.8rem", fontWeight: 700, flexShrink: 0,
        }}>!</span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: "block", fontWeight: 700, fontSize: "0.95rem", color: "#1a1a1a" }}>
            Varningar &amp; bra att veta
          </span>
          <span style={{ display: "block", fontSize: "0.78rem", color: "#999", marginTop: "0.1rem" }}>
            {warnings.length === 0
              ? "Skapa en anmärkning och koppla den till ett eller flera plagg"
              : `${warnings.length} ${warnings.length === 1 ? "anmärkning" : "anmärkningar"} — koppla dem på varje plagg nedan`}
          </span>
        </span>
        <span style={{ color: "#bbb", fontSize: "0.8rem", transform: open ? "rotate(180deg)" : "none", transition: "transform .15s" }}>▼</span>
      </button>

      {open && (
        <div style={{ padding: "0 1.25rem 1.25rem", borderTop: "1px solid #f5f5f5" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", margin: "1rem 0" }}>
            {warnings.length === 0 && (
              <p style={{ fontSize: "0.8rem", color: "#bbb", margin: 0 }}>
                Inga anmärkningar ännu.
              </p>
            )}
            {warnings.map(w => {
              const uses = usageCount(w.id);
              return (
                <div key={w.id} style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "8px", padding: "0.6rem 0.75rem" }}>
                  {editingId === w.id ? (
                    <textarea
                      value={editText}
                      autoFocus
                      rows={3}
                      onChange={e => setEditText(e.target.value)}
                      onBlur={() => handleSaveEdit(w.id)}
                      onKeyDown={e => {
                        if (e.key === "Escape") setEditingId(null);
                        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSaveEdit(w.id);
                      }}
                      style={{ width: "100%", boxSizing: "border-box", padding: "0.4rem 0.5rem", border: "1px solid #d6b656", borderRadius: "6px", fontSize: "0.82rem", lineHeight: 1.5, resize: "vertical", outline: "none", fontFamily: "inherit" }}
                    />
                  ) : (
                    <div style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem" }}>
                      <p style={{ flex: 1, margin: 0, fontSize: "0.82rem", color: "#78350f", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
                        {w.text}
                      </p>
                      <button
                        onClick={() => { setEditingId(w.id); setEditText(w.text); }}
                        title="Redigera"
                        style={{ background: "none", border: "none", color: "#b45309", cursor: "pointer", fontSize: "0.75rem", fontWeight: 600, flexShrink: 0, padding: 0 }}
                      >
                        Ändra
                      </button>
                      <button
                        onClick={() => handleDelete(w)}
                        title="Ta bort"
                        style={{ background: "none", border: "none", color: "#d6a06a", cursor: "pointer", fontSize: "0.9rem", lineHeight: 1, flexShrink: 0, padding: 0, fontWeight: 700 }}
                      >
                        ✕
                      </button>
                    </div>
                  )}
                  <p style={{ margin: "0.35rem 0 0", fontSize: "0.68rem", color: "#b8935f" }}>
                    {uses === 0 ? "Inte kopplad till något plagg än" : `Används av ${uses} ${uses === 1 ? "plagg" : "plagg"}`}
                  </p>
                </div>
              );
            })}
          </div>

          <div style={{ borderTop: "1px dashed #eee", paddingTop: "0.85rem" }}>
            <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#555", marginBottom: "0.35rem" }}>
              Ny anmärkning
            </label>
            <textarea
              placeholder="T.ex. Vi ansvarar ej för knappar som lossnar vid tvätt."
              value={newText}
              rows={2}
              onChange={e => { setNewText(e.target.value); setError(""); }}
              style={{ width: "100%", boxSizing: "border-box", padding: "0.5rem 0.65rem", border: "1px solid #e5e5e5", borderRadius: "6px", fontSize: "0.82rem", lineHeight: 1.5, resize: "vertical", outline: "none", fontFamily: "inherit", color: "#333" }}
            />
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginTop: "0.4rem" }}>
              <button
                onClick={handleAdd}
                disabled={adding}
                style={{ padding: "0.4rem 0.85rem", background: "#1a1a1a", color: "#fff", border: "none", borderRadius: "6px", fontSize: "0.8rem", fontWeight: 600, cursor: adding ? "not-allowed" : "pointer", opacity: adding ? 0.6 : 1 }}
              >
                {adding ? "Sparar…" : "+ Lägg till anmärkning"}
              </button>
              {error && <span style={{ color: "#dc2626", fontSize: "0.75rem" }}>{error}</span>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
