"use client";

import { useEffect, useState } from "react";
import { GDPR_DEFAULTS, type GdprSettings } from "@/lib/gdpr";

/**
 * Editable inputs to the published privacy policy.
 *
 * Kept intentionally plain: these values are set once and rarely touched, and
 * the numbers here are what /integritetspolicy renders, so the policy never
 * drifts from what the business actually intends.
 */

const NUMBER_FIELDS: { key: keyof GdprSettings; label: string; unit: string; hint: string }[] = [
  { key: "customerDataRetentionYears",    label: "Kund- och orderuppgifter", unit: "år",     hint: "Hur länge vi sparar kunduppgifter och orderhistorik." },
  { key: "accountingRetentionYears",      label: "Bokföringsunderlag",       unit: "år",     hint: "Bokföringslagen kräver minst 7 år. Sänk inte under 7." },
  { key: "personnummerRetentionYears",    label: "Personnummer (RUT)",       unit: "år",     hint: "Underlag kan behöva visas för Skatteverket." },
  { key: "chatRetentionMonths",           label: "Chattkonversationer",      unit: "mån",    hint: "Hur länge supportchattar sparas." },
  { key: "inactiveAccountRetentionYears", label: "Vilande konton",           unit: "år",     hint: "Efter senaste aktivitet." },
];

const TEXT_FIELDS: { key: keyof GdprSettings; label: string }[] = [
  { key: "companyName",   label: "Företagsnamn" },
  { key: "orgNumber",     label: "Organisationsnummer" },
  { key: "postalAddress", label: "Postadress" },
  { key: "privacyEmail",  label: "E-post för integritetsfrågor" },
  { key: "privacyPhone",  label: "Telefon" },
  { key: "policyVersion", label: "Policyversion" },
];

export default function GdprSettingsPanel() {
  const [values, setValues] = useState<GdprSettings>(GDPR_DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/gdpr")
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (d) setValues(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/gdpr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Kunde inte spara."); return; }
      setValues(data);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setError("Nätverksfel — försök igen.");
    } finally {
      setSaving(false);
    }
  }

  const set = (key: keyof GdprSettings, v: string | number) =>
    setValues(prev => ({ ...prev, [key]: v }));

  return (
    <section style={{ background: "#fff", border: "1px solid #eee", borderRadius: "10px", padding: "1.25rem" }}>
      <p style={labelStyle}>GDPR-inställningar</p>
      <p style={{ fontSize: "0.8rem", color: "#aaa", marginBottom: "1rem", lineHeight: 1.5 }}>
        Styr vad som står i den publicerade{" "}
        <a href="/integritetspolicy" target="_blank" rel="noopener noreferrer" style={{ color: "#0E5C5B" }}>
          integritetspolicyn
        </a>. Ändringar syns direkt på sidan.
      </p>

      {loading ? (
        <p style={{ fontSize: "0.8rem", color: "#bbb" }}>Laddar…</p>
      ) : (
        <>
          <p style={{ ...fieldLabelStyle, marginBottom: "0.6rem" }}>Lagringstider</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.7rem", marginBottom: "1.25rem" }}>
            {NUMBER_FIELDS.map(f => (
              <div key={String(f.key)}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                  <label style={{ flex: 1, fontSize: "0.82rem", color: "#333" }}>{f.label}</label>
                  <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                    <input
                      type="number"
                      min={1}
                      value={Number(values[f.key])}
                      onChange={e => set(f.key, Number(e.target.value))}
                      style={{ width: "86px", padding: "0.35rem 2.2rem 0.35rem 0.5rem", border: "1px solid #e0e0e0", borderRadius: "6px", fontSize: "0.82rem", textAlign: "right", outline: "none", boxSizing: "border-box" }}
                    />
                    <span style={{ position: "absolute", right: "0.5rem", fontSize: "0.72rem", color: "#aaa", pointerEvents: "none" }}>{f.unit}</span>
                  </div>
                </div>
                <p style={{ fontSize: "0.7rem", color: "#bbb", margin: "0.15rem 0 0" }}>{f.hint}</p>
              </div>
            ))}
          </div>

          <p style={{ ...fieldLabelStyle, marginBottom: "0.6rem" }}>Personuppgiftsansvarig</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: "0.6rem", marginBottom: "1rem" }}>
            {TEXT_FIELDS.map(f => (
              <div key={String(f.key)}>
                <label style={{ display: "block", fontSize: "0.74rem", color: "#777", marginBottom: "0.2rem" }}>{f.label}</label>
                <input
                  type="text"
                  value={String(values[f.key] ?? "")}
                  onChange={e => set(f.key, e.target.value)}
                  style={{ width: "100%", boxSizing: "border-box", padding: "0.4rem 0.55rem", border: "1px solid #e0e0e0", borderRadius: "6px", fontSize: "0.82rem", color: "#1a1a1a", outline: "none" }}
                />
              </div>
            ))}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <button
              onClick={save}
              disabled={saving}
              style={{ padding: "0.5rem 1rem", background: saved ? "#f0fdf4" : "#1a1a1a", color: saved ? "#15803d" : "#fff", border: saved ? "1px solid #bbf7d0" : "none", borderRadius: "8px", fontSize: "0.85rem", fontWeight: 600, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1 }}
            >
              {saving ? "Sparar…" : saved ? "✓ Sparat" : "Spara GDPR-inställningar"}
            </button>
            <span style={{ fontSize: "0.72rem", color: "#bbb" }}>
              Senast uppdaterad {values.lastUpdated}
            </span>
            {error && <span style={{ fontSize: "0.75rem", color: "#dc2626" }}>{error}</span>}
          </div>
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
