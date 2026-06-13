/// <reference types="@types/google.maps" />
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { DriverSettings } from "@/app/api/admin/settings/route";
import { DISCOUNT_DEFAULTS, clampPct, type DiscountSettings } from "@/lib/discount";

type Prediction = { description: string; placeId: string };

// ── Autocomplete input (locked to Sweden + service area) ─────────────────────

function PlacesInput({
  value,
  onChange,
  placeholder,
  serviceArea,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  serviceArea: DriverSettings["serviceArea"];
}) {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [open, setOpen] = useState(false);
  const [validated, setValidated] = useState(false);
  const [focused, setFocused] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isUserTypingRef = useRef(false);

  // When value is set externally (e.g. loaded from settings), treat it as valid
  useEffect(() => {
    if (isUserTypingRef.current) { isUserTypingRef.current = false; return; }
    if (value.trim()) setValidated(true);
  }, [value]);

  function handleChange(v: string) {
    isUserTypingRef.current = true;
    setValidated(false);
    onChange(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!v.trim()) { setPredictions([]); setOpen(false); return; }
    debounceRef.current = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ q: v });
        params.set("lat", String(serviceArea.lat));
        params.set("lng", String(serviceArea.lng));
        params.set("radiusKm", String(serviceArea.radiusKm));
        const res = await fetch(`/api/admin/driver/autocomplete?${params}`);
        const data = await res.json();
        setPredictions(data.predictions ?? []);
        setOpen((data.predictions ?? []).length > 0);
      } catch { /* ignore */ }
    }, 250);
  }

  function select(p: Prediction) {
    setValidated(true);
    setPredictions([]);
    setOpen(false);
    onChange(p.description);
  }

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, []);

  const showWarn = value.trim().length > 3 && !validated && !open && !focused;

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <div style={{ position: "relative" }}>
        <input
          type="text"
          value={value}
          onChange={e => handleChange(e.target.value)}
          onFocus={() => { setFocused(true); if (predictions.length > 0) setOpen(true); }}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          style={{
            width: "100%", boxSizing: "border-box",
            padding: "0.5rem 2rem 0.5rem 0.75rem",
            border: `1px solid ${showWarn ? "#fca5a5" : validated ? "#86efac" : "#e0e0e0"}`,
            borderRadius: "8px", fontSize: "0.875rem",
            color: "#1a1a1a", background: "#fff", outline: "none",
          }}
        />
        {validated && (
          <span style={{ position: "absolute", right: "0.6rem", top: "50%", transform: "translateY(-50%)", color: "#16a34a", fontSize: "0.8rem" }}>✓</span>
        )}
      </div>
      {showWarn && (
        <p style={{ fontSize: "0.72rem", color: "#dc2626", margin: "0.2rem 0 0" }}>Välj en adress från förslagen</p>
      )}
      {open && predictions.length > 0 && (
        <ul style={{
          position: "absolute", top: "calc(100% + 3px)", left: 0, right: 0, zIndex: 100,
          background: "#fff", border: "1px solid #e5e5e5", borderRadius: "8px",
          boxShadow: "0 4px 16px rgba(0,0,0,0.1)", listStyle: "none", margin: 0, padding: "0.25rem 0",
          maxHeight: "200px", overflowY: "auto",
        }}>
          {predictions.map((p, i) => (
            <li
              key={p.placeId}
              onMouseDown={e => { e.preventDefault(); select(p); }}
              style={{ padding: "0.5rem 0.75rem", fontSize: "0.825rem", color: "#1a1a1a", cursor: "pointer", borderBottom: i < predictions.length - 1 ? "1px solid #f5f5f5" : "none" }}
              onMouseEnter={e => (e.currentTarget.style.background = "#f9f9f9")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            >
              {p.description}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Main settings component ──────────────────────────────────────────────────

export default function SettingsClient({ mapsKey }: { mapsKey: string }) {
  const [settings, setSettings] = useState<DriverSettings>({
    startAddr: "",
    stopAddr: "",
    serviceArea: { lat: 59.3342, lng: 18.0709, radiusKm: 5 },
  });
  const [discounts, setDiscounts] = useState<DiscountSettings>(DISCOUNT_DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  // Map refs
  const mapDivRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const circleRef = useRef<google.maps.Circle | null>(null);
  const mapReady = useRef(false);

  // Load settings from API
  useEffect(() => {
    fetch("/api/admin/settings")
      .then(r => r.json())
      .then((data: DriverSettings) => { setSettings(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  // Load discount settings
  useEffect(() => {
    fetch("/api/admin/discounts")
      .then(r => r.json())
      .then((data: DiscountSettings) => setDiscounts({ ...DISCOUNT_DEFAULTS, ...data, mattvatt: { ...DISCOUNT_DEFAULTS.mattvatt, ...(data.mattvatt ?? {}) } }))
      .catch(() => {});
  }, []);

  // Draw / update circle whenever settings.serviceArea changes and map is ready
  const syncCircle = useCallback((area: DriverSettings["serviceArea"]) => {
    if (!mapRef.current) return;
    const center = { lat: area.lat, lng: area.lng };
    const radiusM = area.radiusKm * 1000;
    if (circleRef.current) {
      circleRef.current.setCenter(center);
      circleRef.current.setRadius(radiusM);
      mapRef.current.panTo(center);
    } else {
      const circle = new google.maps.Circle({
        map: mapRef.current,
        center,
        radius: radiusM,
        editable: true,
        draggable: true,
        fillColor: "#4b8c5c",
        fillOpacity: 0.12,
        strokeColor: "#4b8c5c",
        strokeWeight: 2,
      });
      circleRef.current = circle;

      circle.addListener("radius_changed", () => {
        const km = Math.round((circle.getRadius() / 1000) * 10) / 10;
        setSettings(s => ({ ...s, serviceArea: { ...s.serviceArea, radiusKm: km } }));
      });
      circle.addListener("center_changed", () => {
        const c = circle.getCenter();
        if (!c) return;
        setSettings(s => ({
          ...s,
          serviceArea: {
            ...s.serviceArea,
            lat: Math.round(c.lat() * 10000) / 10000,
            lng: Math.round(c.lng() * 10000) / 10000,
          },
        }));
      });
    }
  }, []);

  // Initialize Google Maps once settings are loaded
  useEffect(() => {
    if (loading || !mapDivRef.current) return;

    if (!mapsKey) {
      setMapError("GOOGLE_MAPS_API_KEY saknas — lägg till den i Vercel Environment Variables.");
      return;
    }

    if (mapReady.current) return;
    mapReady.current = true;

    // Detect API key / billing errors (Google fires this on the window)
    (window as any).gm_authFailure = () => {
      setMapError("Google Maps auth misslyckades — kontrollera att Maps JavaScript API är aktiverat och att API-nyckeln är korrekt.");
      mapReady.current = false;
    };

    function initMap() {
      if (!mapDivRef.current) return;
      try {
        const map = new google.maps.Map(mapDivRef.current, {
          center: { lat: settings.serviceArea.lat, lng: settings.serviceArea.lng },
          zoom: 11,
          disableDefaultUI: true,
          zoomControl: true,
          streetViewControl: false,
        });
        mapRef.current = map;
        syncCircle(settings.serviceArea);
      } catch (err) {
        setMapError(`Kartfel: ${String(err)}`);
        mapReady.current = false;
      }
    }

    if (typeof google !== "undefined" && google.maps) {
      initMap();
      return;
    }

    // Use callback parameter — more reliable than onload for Maps JS API
    const callbackName = "__mapsInit_" + Date.now();
    (window as any)[callbackName] = () => {
      delete (window as any)[callbackName];
      initMap();
    };

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${mapsKey}&libraries=geometry&callback=${callbackName}`;
    script.async = true;
    script.onerror = () => {
      setMapError("Kunde inte ladda Google Maps — kontrollera nätverksanslutning och API-nyckel.");
      mapReady.current = false;
    };
    document.head.appendChild(script);

    return () => {
      // Reset on unmount so map reinitialises if user navigates away and back
      mapReady.current = false;
      mapRef.current = null;
      circleRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  function updateRadius(km: number) {
    const area = { ...settings.serviceArea, radiusKm: km };
    setSettings(s => ({ ...s, serviceArea: area }));
    if (circleRef.current) circleRef.current.setRadius(km * 1000);
  }

  async function save() {
    setSaving(true);
    try {
      await Promise.all([
        fetch("/api/admin/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(settings),
        }),
        fetch("/api/admin/discounts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(discounts),
        }),
      ]);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#bbb", fontSize: "0.9rem" }}>
        Laddar inställningar…
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "auto" }}>
      {/* Header */}
      <div style={{ marginBottom: "1.75rem" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.2rem" }}>Inställningar</h1>
        <p style={{ color: "#999", fontSize: "0.875rem" }}>Chaufförens standardplatser och tjänsteområde</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", alignItems: "start" }}>

        {/* ── Left: start/stop + service area controls ─────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>

          {/* Start/stop */}
          <section style={{ background: "#fff", border: "1px solid #eee", borderRadius: "10px", padding: "1.25rem" }}>
            <p style={labelStyle}>Chaufförens platser</p>
            <p style={{ fontSize: "0.8rem", color: "#aaa", marginBottom: "1rem" }}>
              Används som standard start- och slutpunkt vid ruttplanering.
            </p>

            <div style={{ marginBottom: "0.75rem" }}>
              <label style={fieldLabelStyle}>
                <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: "#4b8c5c", marginRight: "0.4rem", verticalAlign: "middle" }} />
                Startplats
              </label>
              <PlacesInput
                value={settings.startAddr}
                onChange={v => setSettings(s => ({ ...s, startAddr: v }))}
                placeholder="t.ex. Storgatan 1, Stockholm"
                serviceArea={settings.serviceArea}
              />
            </div>

            <div>
              <label style={fieldLabelStyle}>
                <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: "#c0392b", marginRight: "0.4rem", verticalAlign: "middle" }} />
                Slutplats
              </label>
              <PlacesInput
                value={settings.stopAddr}
                onChange={v => setSettings(s => ({ ...s, stopAddr: v }))}
                placeholder="t.ex. Storgatan 1, Stockholm"
                serviceArea={settings.serviceArea}
              />
            </div>
          </section>

          {/* Service area controls */}
          <section style={{ background: "#fff", border: "1px solid #eee", borderRadius: "10px", padding: "1.25rem" }}>
            <p style={labelStyle}>Tjänsteområde</p>
            <p style={{ fontSize: "0.8rem", color: "#aaa", marginBottom: "1rem" }}>
              Adresser utanför detta område visas inte vid adressinmatning. Dra i cirkelns kant på kartan eller justera radien nedan.
            </p>

            <div style={{ marginBottom: "0.75rem" }}>
              <label style={fieldLabelStyle}>Centrum</label>
              <p style={{ fontSize: "0.8rem", color: "#555", background: "#f9f9f8", border: "1px solid #eee", borderRadius: "6px", padding: "0.4rem 0.65rem", margin: 0 }}>
                {settings.serviceArea.lat.toFixed(4)}, {settings.serviceArea.lng.toFixed(4)}
                <span style={{ color: "#bbb", marginLeft: "0.5rem", fontSize: "0.72rem" }}>(dra cirkeln för att flytta)</span>
              </p>
            </div>

            <div>
              <label style={fieldLabelStyle}>Radie: <strong>{settings.serviceArea.radiusKm} km</strong></label>
              <input
                type="range"
                min={1}
                max={50}
                step={0.5}
                value={settings.serviceArea.radiusKm}
                onChange={e => updateRadius(Number(e.target.value))}
                style={{ width: "100%", accentColor: "#4b8c5c" }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem", color: "#bbb" }}>
                <span>1 km</span><span>50 km</span>
              </div>
            </div>
          </section>

          {/* Discounts */}
          <section style={{ background: "#fff", border: "1px solid #eee", borderRadius: "10px", padding: "1.25rem" }}>
            <p style={labelStyle}>Rabatter</p>
            <p style={{ fontSize: "0.8rem", color: "#aaa", marginBottom: "1rem" }}>
              Förstagångsrabatt för nya kunder samt rabatt på mattvätt. Alla värden anges i procent.
            </p>

            {/* First-time discount */}
            <div style={{ marginBottom: "1rem" }}>
              <label style={fieldLabelStyle}>Förstagångsrabatt</label>
              <div style={{ position: "relative", maxWidth: "140px" }}>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  value={discounts.firstTimeDiscountPercent}
                  onChange={e => setDiscounts(d => ({ ...d, firstTimeDiscountPercent: clampPct(e.target.value) }))}
                  style={{ width: "100%", boxSizing: "border-box", padding: "0.5rem 2.2rem 0.5rem 0.75rem", border: "1px solid #e0e0e0", borderRadius: "8px", fontSize: "0.875rem", color: "#1a1a1a", outline: "none" }}
                />
                <span style={{ position: "absolute", right: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "#888", fontSize: "0.85rem", fontWeight: 600, pointerEvents: "none" }}>%</span>
              </div>
              <p style={{ fontSize: "0.72rem", color: "#aaa", margin: "0.35rem 0 0", lineHeight: 1.5 }}>
                Detta är en <strong>procentsats</strong> (0–100). T.ex. <strong>10</strong> betyder 10&nbsp;% rabatt — inte 10× pengarna tillbaka. Sätt till 0 för att stänga av.
              </p>
            </div>

            {/* Multiple discounts toggle */}
            <div style={{ marginBottom: "1rem", paddingTop: "0.75rem", borderTop: "1px solid #f0f0f0" }}>
              <label style={{ display: "flex", alignItems: "flex-start", gap: "0.6rem", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={discounts.multipleDiscountsAllowed}
                  onChange={e => setDiscounts(d => ({ ...d, multipleDiscountsAllowed: e.target.checked }))}
                  style={{ marginTop: "0.15rem", width: 16, height: 16, accentColor: "#4b8c5c", flexShrink: 0 }}
                />
                <span>
                  <span style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: "#333" }}>Flera rabatter tillåtna</span>
                  <span style={{ display: "block", fontSize: "0.72rem", color: "#aaa", marginTop: "0.15rem", lineHeight: 1.5 }}>
                    På: förstagångsrabatt och produktrabatt läggs ihop. Av: endast den största rabatten per produkt används.
                  </span>
                </span>
              </label>
            </div>

            {/* Mattvätt per-size discounts */}
            <div style={{ paddingTop: "0.75rem", borderTop: "1px solid #f0f0f0" }}>
              <label style={fieldLabelStyle}>Mattvätt — rabatt per storlek</label>
              <p style={{ fontSize: "0.72rem", color: "#aaa", margin: "0 0 0.6rem", lineHeight: 1.5 }}>
                Mattvättpriserna är fasta i koden, så deras rabatt ställs in här.
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.6rem" }}>
                {([
                  ["matta-liten", "Liten"],
                  ["matta-stor",  "Stor"],
                  ["matta-akta",  "Äkta"],
                ] as const).map(([key, label]) => (
                  <div key={key}>
                    <label style={{ display: "block", fontSize: "0.72rem", color: "#888", marginBottom: "0.25rem" }}>{label}</label>
                    <div style={{ position: "relative" }}>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={1}
                        value={discounts.mattvatt[key]}
                        onChange={e => setDiscounts(d => ({ ...d, mattvatt: { ...d.mattvatt, [key]: clampPct(e.target.value) } }))}
                        style={{ width: "100%", boxSizing: "border-box", padding: "0.45rem 1.8rem 0.45rem 0.55rem", border: "1px solid #e0e0e0", borderRadius: "8px", fontSize: "0.85rem", color: "#1a1a1a", outline: "none" }}
                      />
                      <span style={{ position: "absolute", right: "0.55rem", top: "50%", transform: "translateY(-50%)", color: "#888", fontSize: "0.8rem", fontWeight: 600, pointerEvents: "none" }}>%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Save button */}
          <button
            onClick={save}
            disabled={saving}
            style={{
              padding: "0.75rem 1.25rem",
              background: saved ? "#f0fdf4" : "#1a1a1a",
              color: saved ? "#15803d" : "#fff",
              border: saved ? "1px solid #bbf7d0" : "none",
              borderRadius: "8px",
              fontSize: "0.875rem",
              fontWeight: 600,
              cursor: saving ? "not-allowed" : "pointer",
              opacity: saving ? 0.6 : 1,
              transition: "background 0.2s, color 0.2s",
            }}
          >
            {saving ? "Sparar…" : saved ? "✓ Sparat" : "Spara inställningar"}
          </button>
        </div>

        {/* ── Right: map ───────────────────────────────────────────────────── */}
        <section style={{ background: "#fff", border: "1px solid #eee", borderRadius: "10px", overflow: "hidden" }}>
          <div style={{ padding: "1rem 1.25rem 0.5rem", borderBottom: "1px solid #f0f0f0" }}>
            <p style={labelStyle}>Karta — tjänsteområde</p>
            <p style={{ fontSize: "0.78rem", color: "#aaa", margin: 0 }}>Dra i cirkelns kant för att ändra radien · Dra i mitten för att flytta centrum</p>
          </div>
          {/* Map div stays mounted at all times — swapping it out causes the blink */}
          <div style={{ position: "relative" }}>
            <div ref={mapDivRef} style={{ width: "100%", height: "440px" }} />
            {mapError && (
              <div style={{
                position: "absolute", inset: 0,
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                padding: "2rem", textAlign: "center",
                background: "rgba(255,249,249,0.97)",
              }}>
                <p style={{ fontSize: "0.8rem", color: "#dc2626", fontWeight: 600, marginBottom: "0.5rem" }}>Kartan kunde inte laddas</p>
                <p style={{ fontSize: "0.78rem", color: "#888", maxWidth: "320px" }}>{mapError}</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase",
  letterSpacing: "0.06em", color: "#aaa", margin: 0, marginBottom: "0.2rem",
};

const fieldLabelStyle: React.CSSProperties = {
  display: "block", fontSize: "0.78rem", fontWeight: 600,
  color: "#555", marginBottom: "0.35rem",
};
