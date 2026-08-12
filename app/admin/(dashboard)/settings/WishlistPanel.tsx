"use client";

import { useCallback, useEffect, useState } from "react";
import { WishFrame, SparkleIcon } from "@/components/admin/WishlistChrome";

/**
 * TEMPORARY — remove after launch.
 *
 * The accumulated wishlist, shown in Settings under the map. Completed wishes
 * stay in place struck through rather than disappearing, so whoever asked can
 * see that it was dealt with.
 */

type Wish = {
  id: string;
  text: string;
  done: boolean;
  createdAt: number | null;
  createdByName: string;
  isMine: boolean;
};

export default function WishlistPanel() {
  const [wishes, setWishes] = useState<Wish[]>([]);
  const [canComplete, setCanComplete] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [newText, setNewText] = useState("");
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/wishes");
      const data = await res.json();
      if (res.ok) {
        setWishes(data.wishes ?? []);
        setCanComplete(!!data.canComplete);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // The top-right composer fires this after adding, so the list stays in step
  // without polling.
  useEffect(() => {
    const onChanged = () => load();
    window.addEventListener("wishlist:changed", onChanged);
    return () => window.removeEventListener("wishlist:changed", onChanged);
  }, [load]);

  async function addWish() {
    const text = newText.trim();
    if (!text) return;
    setAdding(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/wishes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) {
        setError((await res.json().catch(() => ({}))).error ?? "Kunde inte spara.");
        return;
      }
      setNewText("");
      load();
    } finally {
      setAdding(false);
    }
  }

  async function patch(id: string, body: Record<string, unknown>, optimistic: (w: Wish) => Wish) {
    const previous = wishes;
    setWishes(prev => prev.map(w => (w.id === id ? optimistic(w) : w)));
    setError(null);
    const res = await fetch(`/api/admin/wishes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      setWishes(previous);
      setError((await res.json().catch(() => ({}))).error ?? "Kunde inte spara.");
    } else if ("done" in body) {
      load(); // re-sorts open items above completed ones
    }
  }

  async function removeWish(id: string) {
    if (!confirm("Ta bort önskemålet?")) return;
    const previous = wishes;
    setWishes(prev => prev.filter(w => w.id !== id));
    const res = await fetch(`/api/admin/wishes/${id}`, { method: "DELETE" });
    if (!res.ok) { setWishes(previous); setError("Kunde inte ta bort."); }
  }

  function saveEdit(id: string) {
    const text = editText.trim();
    const current = wishes.find(w => w.id === id);
    setEditingId(null);
    if (!text || text === current?.text) return;
    patch(id, { text }, w => ({ ...w, text }));
  }

  const open = wishes.filter(w => !w.done).length;

  return (
    <WishFrame style={{ marginTop: "1.5rem" }}>
      <p className="wl-title" style={{ marginBottom: "0.15rem" }}>
        <SparkleIcon />
        Önskelista
      </p>
      <p style={{ margin: "0 0 0.75rem", fontSize: "0.72rem", color: "rgba(216,180,254,0.6)" }}>
        {loading
          ? "Laddar…"
          : `${open} kvar${wishes.length - open > 0 ? ` · ${wishes.length - open} klara` : ""}`}
        {canComplete ? " · bocka av när det är fixat" : " · du ser när något är fixat"}
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", marginBottom: "0.85rem" }}>
        {!loading && wishes.length === 0 && (
          <p style={{ margin: 0, fontSize: "0.78rem", color: "rgba(216,180,254,0.55)" }}>
            Inga önskemål än. Skriv det första nedan eller uppe till höger.
          </p>
        )}

        {wishes.map(w => (
          <div key={w.id} className={`wl-item${w.done ? " is-done" : ""}`}>
            <input
              type="checkbox"
              className="wl-check"
              checked={w.done}
              disabled={!canComplete}
              title={canComplete ? "Markera som fixat" : "Bara utvecklaren kan bocka av"}
              onChange={e => patch(w.id, { done: e.target.checked }, x => ({ ...x, done: e.target.checked }))}
            />

            <div style={{ flex: 1, minWidth: 0 }}>
              {editingId === w.id ? (
                <textarea
                  className="wl-input"
                  rows={2}
                  autoFocus
                  value={editText}
                  maxLength={500}
                  onChange={e => setEditText(e.target.value)}
                  onBlur={() => saveEdit(w.id)}
                  onKeyDown={e => {
                    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); saveEdit(w.id); }
                    if (e.key === "Escape") setEditingId(null);
                  }}
                />
              ) : (
                <p className="wl-item-text" style={{ margin: 0 }}>{w.text}</p>
              )}
              <p className="wl-meta" style={{ margin: "0.15rem 0 0" }}>
                {w.createdByName || "Okänd"}
                {w.createdAt ? ` · ${new Date(w.createdAt).toLocaleDateString("sv-SE")}` : ""}
                {w.done ? " · fixat" : ""}
              </p>
            </div>

            {editingId !== w.id && (
              <span style={{ display: "flex", gap: "0.5rem", flexShrink: 0 }}>
                <button
                  className="wl-mini"
                  onClick={() => { setEditingId(w.id); setEditText(w.text); }}
                >
                  Ändra
                </button>
                <button className="wl-mini is-danger" onClick={() => removeWish(w.id)}>
                  Ta bort
                </button>
              </span>
            )}
          </div>
        ))}
      </div>

      <textarea
        className="wl-input"
        rows={2}
        value={newText}
        maxLength={500}
        placeholder="Nytt önskemål…"
        onChange={e => { setNewText(e.target.value); setError(null); }}
        onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); addWish(); } }}
      />
      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginTop: "0.5rem" }}>
        <button className="wl-btn" onClick={addWish} disabled={adding}>
          {adding ? "Sparar…" : "+ Lägg till"}
        </button>
        {error && <span className="wl-err">{error}</span>}
      </div>
    </WishFrame>
  );
}
