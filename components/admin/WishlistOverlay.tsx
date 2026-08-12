"use client";

import { useEffect, useRef, useState } from "react";
import { WishFrame, SparkleIcon } from "./WishlistChrome";

/**
 * TEMPORARY — remove after launch.
 *
 * Always-present composer pinned to the top right of the admin panel. It only
 * ever takes input; the accumulated list lives in Settings, under the map, so
 * this stays small enough to sit over any page without getting in the way.
 */
export default function WishlistOverlay() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  async function submit() {
    const value = text.trim();
    if (!value) { setError("Skriv något först."); return; }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/wishes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: value }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error ?? "Kunde inte spara."); return; }
      setText("");
      setSent(true);
      setTimeout(() => setSent(false), 2600);
      // Let the Settings list refresh itself if it happens to be on screen.
      window.dispatchEvent(new CustomEvent("wishlist:changed"));
    } catch {
      setError("Nätverksfel — försök igen.");
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <div className="wl-overlay">
        <WishFrame>
          <button className="wl-tab" onClick={() => setOpen(true)} style={{ padding: 0 }}>
            <span style={{ color: "#d8b4fe", display: "flex" }}><SparkleIcon size={14} /></span>
            <span style={{ flex: 1, textAlign: "left" }}>Önskelista</span>
            <span style={{ fontSize: "0.7rem", fontWeight: 600, color: "rgba(216,180,254,0.75)" }}>
              {sent ? "✓ Skickat" : "Lägg till"}
            </span>
          </button>
        </WishFrame>
      </div>
    );
  }

  return (
    <div className="wl-overlay">
      <WishFrame>
        <p className="wl-title">
          <SparkleIcon />
          Önskelista
        </p>

        <textarea
          ref={inputRef}
          className="wl-input"
          rows={3}
          value={text}
          maxLength={500}
          placeholder="Vad vill du lägga till eller ändra?"
          onChange={e => { setText(e.target.value); setError(null); }}
          onKeyDown={e => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); }
            if (e.key === "Escape") setOpen(false);
          }}
        />

        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.5rem" }}>
          <button className="wl-btn" onClick={submit} disabled={saving}>
            {saving ? "Skickar…" : "Skicka"}
          </button>
          <button
            className="wl-mini"
            onClick={() => { setOpen(false); setText(""); setError(null); }}
          >
            Stäng
          </button>
          <span style={{ marginLeft: "auto" }}>
            {sent && <span className="wl-sent">✓ Tillagd</span>}
            {error && <span className="wl-err">{error}</span>}
          </span>
        </div>

        <p style={{ margin: "0.45rem 0 0", fontSize: "0.66rem", color: "rgba(216,180,254,0.55)" }}>
          Syns för alla administratörer · listan finns i Inställningar
        </p>
      </WishFrame>
    </div>
  );
}
