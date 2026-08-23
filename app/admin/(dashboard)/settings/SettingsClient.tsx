/// <reference types="@types/google.maps" />
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { DriverSettings } from "@/app/api/admin/settings/route";
import { DISCOUNT_DEFAULTS, clampPct, type DiscountSettings } from "@/lib/discount";
import {
  MATTA_TYPES, MATTVATT_DEFAULTS, SQM_STEP, clampKrPerSqm, clampSqm,
  formatSqm, mattaPriceKr, normalizeMattvattSettings, type MattvattSettings,
} from "@/lib/mattvatt";
import WishlistPanel from "./WishlistPanel";
import GdprSettingsPanel from "./GdprSettingsPanel";
import NotificationStatusPanel from "./NotificationStatusPanel";

type Prediction = { description: string; placeId: string };

// ── Settings search ──────────────────────────────────────────────────────────
// Every section declares the words it answers to. The box under the header hides
// the ones that do not match, so the page stays navigable as settings pile up.

const SECTION_TERMS = {
  driver:    "chaufför chaufförens platser startplats slutplats adress adresser rutt ruttplanering start slut",
  area:      "tjänsteområde område radie km cirkel centrum karta google maps adresser räckvidd",
  delivery:  "leverans leveransavgift frakt gratis fri tröskel gränsvärde hemleverans upphämtning avgift kr",
  discounts: "rabatt rabatter förstagångsrabatt procent kampanj ny kund mattvätt matta flera",
  mattvatt:  "mattvätt matta mattor pris priser kvadratmeter kvm m2 m² kr per storlek min max minsta största normal äkta orientalisk slider reglage",
  admins:    "administratörer admin adminkonton konto konton roll roller huvudadmin lösenord behörighet användare",
  gdpr:      "gdpr integritetspolicy personuppgifter dataskydd policy juridik företagsuppgifter organisationsnummer",
  avsandare: "avsändare avsandare epost e-post mejl sms resend 46elks from svara till domän sandbox testavsändare",
  map:       "karta google maps tjänsteområde radie cirkel centrum",
  wishlist:  "önskelista önskemål wishlist funktioner idéer förslag",
} as const;

type SectionKey = keyof typeof SECTION_TERMS;

const normalizeTerm = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

function matchesQuery(query: string, terms: string): boolean {
  const q = normalizeTerm(query).trim();
  if (!q) return true;
  const haystack = normalizeTerm(terms);
  return q.split(/\s+/).every(word => haystack.includes(word));
}

/**
 * Hides its section when the search does not match it.
 *
 * `display: contents` rather than unmounting: the map inside must stay mounted
 * at all times (swapping it out makes it blink on every re-render), and a
 * `contents` wrapper adds no box of its own, so a visible section lays out
 * exactly as it did before.
 */
function Filterable({ query, section, children }: { query: string; section: SectionKey; children: React.ReactNode }) {
  const shown = matchesQuery(query, `${SECTION_TERMS[section]} ${section}`);
  return <div style={{ display: shown ? "contents" : "none" }}>{children}</div>;
}

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
    freeDeliveryThresholdKr: 0,
    deliveryFeeKr: 0,
  });
  const [discounts, setDiscounts] = useState<DiscountSettings>(DISCOUNT_DEFAULTS);
  const [mattvatt, setMattvatt] = useState<MattvattSettings>(MATTVATT_DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

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

  // Load mattvätt pricing (kr per m² + the size range the slider offers)
  useEffect(() => {
    fetch("/api/admin/mattvatt")
      .then(r => r.json())
      .then((data: Partial<MattvattSettings>) => setMattvatt(normalizeMattvattSettings(data)))
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
        fetch("/api/admin/mattvatt", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(mattvatt),
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

  // Which sections survive the current search. The save button and the right
  // column follow along, so nothing is left stranded next to an empty result.
  const shows = (section: SectionKey) => matchesQuery(query, `${SECTION_TERMS[section]} ${section}`);
  const noMatches       = (Object.keys(SECTION_TERMS) as SectionKey[]).every(k => !shows(k));
  const showsSaveButton = (["driver", "area", "delivery", "discounts", "mattvatt"] as SectionKey[]).some(shows);
  const showsRightColumn = shows("map") || shows("wishlist");

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "auto" }}>
      {/* Header */}
      <div style={{ marginBottom: "1.25rem" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.2rem" }}>Inställningar</h1>
        <p style={{ color: "#999", fontSize: "0.875rem" }}>Priser, leverans, tjänsteområde och administratörer</p>
      </div>

      {/* Search — filters the sections below */}
      <div style={{ position: "relative", maxWidth: "420px", marginBottom: "1.75rem" }}>
        <input
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Sök inställning — t.ex. mattvätt, rabatt, leverans…"
          aria-label="Sök inställning"
          style={{
            width: "100%", boxSizing: "border-box",
            padding: "0.6rem 2.2rem 0.6rem 0.75rem",
            border: "1px solid #e0e0e0", borderRadius: "8px",
            fontSize: "0.875rem", color: "#1a1a1a", background: "#fff", outline: "none",
          }}
        />
        <span style={{ position: "absolute", right: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "#bbb", fontSize: "0.9rem", pointerEvents: "none" }}>
          ⌕
        </span>
      </div>

      {noMatches && (
        <p style={{ fontSize: "0.85rem", color: "#888", background: "#fff", border: "1px solid #eee", borderRadius: "10px", padding: "1.25rem", margin: 0 }}>
          Ingen inställning matchar <strong>“{query}”</strong>. Prova t.ex. <em>mattvätt</em>, <em>rabatt</em>, <em>leverans</em>, <em>karta</em> eller <em>administratörer</em>.
        </p>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1.5rem", alignItems: "start" }}>

        {/* ── Left: start/stop + service area controls ─────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>

          {/* Start/stop */}
          <Filterable query={query} section="driver">
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
          </Filterable>

          {/* Service area controls */}
          <Filterable query={query} section="area">
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
          </Filterable>

          {/* Delivery */}
          <Filterable query={query} section="delivery">
          <section style={{ background: "#fff", border: "1px solid #eee", borderRadius: "10px", padding: "1.25rem" }}>
            <p style={labelStyle}>Leverans</p>
            <p style={{ fontSize: "0.8rem", color: "#aaa", marginBottom: "1rem" }}>
              Bestäm vid vilket ordervärde upphämtning och hemleverans blir gratis, samt avgiften för mindre beställningar.
            </p>

            {/* Free-delivery threshold */}
            <div style={{ marginBottom: "1.25rem" }}>
              <label style={fieldLabelStyle}>
                Gratis upphämtning & leverans från: <strong>{settings.freeDeliveryThresholdKr} kr</strong>
              </label>
              <input
                type="range"
                min={0}
                max={1000}
                step={25}
                value={settings.freeDeliveryThresholdKr}
                onChange={e => setSettings(s => ({ ...s, freeDeliveryThresholdKr: Number(e.target.value) }))}
                style={{ width: "100%", accentColor: "#4b8c5c" }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem", color: "#bbb" }}>
                <span>0 kr</span><span>1000 kr</span>
              </div>
              <p style={{ fontSize: "0.72rem", color: "#aaa", margin: "0.35rem 0 0", lineHeight: 1.5 }}>
                Ordrar på minst detta belopp får fri upphämtning och hemleverans. Sätt till <strong>0 kr</strong> för att alltid erbjuda fri leverans.
              </p>
            </div>

            {/* Delivery fee */}
            <div style={{ paddingTop: "0.75rem", borderTop: "1px solid #f0f0f0" }}>
              <label style={fieldLabelStyle}>Leveransavgift</label>
              <div style={{ position: "relative", maxWidth: "140px" }}>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={settings.deliveryFeeKr}
                  onChange={e => {
                    const v = Math.max(0, Math.round(Number(e.target.value.replace(/\D/g, ""))));
                    setSettings(s => ({ ...s, deliveryFeeKr: Number.isFinite(v) ? v : 0 }));
                  }}
                  style={{ width: "100%", boxSizing: "border-box", padding: "0.5rem 2.4rem 0.5rem 0.75rem", border: "1px solid #e0e0e0", borderRadius: "8px", fontSize: "0.875rem", color: "#1a1a1a", outline: "none" }}
                />
                <span style={{ position: "absolute", right: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "#888", fontSize: "0.85rem", fontWeight: 600, pointerEvents: "none" }}>kr</span>
              </div>
              <p style={{ fontSize: "0.72rem", color: "#aaa", margin: "0.35rem 0 0", lineHeight: 1.5 }}>
                Tas ut på ordrar under tröskelvärdet ovan. Sätt till <strong>0 kr</strong> för fri leverans även för mindre beställningar.
              </p>
            </div>
          </section>
          </Filterable>

          {/* Discounts */}
          <Filterable query={query} section="discounts">
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
              <label style={fieldLabelStyle}>Mattvätt — rabatt per mattyp</label>
              <p style={{ fontSize: "0.72rem", color: "#aaa", margin: "0 0 0.6rem", lineHeight: 1.5 }}>
                Dras av på hela mattans pris, oavsett vilken storlek kunden väljer.
                Själva priset per m² ställs in under <strong>Mattvätt</strong> nedan.
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: "0.6rem" }}>
                {MATTA_TYPES.map(({ id: key, label }) => (
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
          </Filterable>

          {/* Mattvätt pricing */}
          <Filterable query={query} section="mattvatt">
          <MattvattPricing settings={mattvatt} onChange={setMattvatt} />
          </Filterable>

          {/* Admin accounts */}
          <Filterable query={query} section="admins">
            <AdminAccounts />
          </Filterable>

          {/* Which sender this deployment actually uses */}
          <Filterable query={query} section="avsandare">
            <NotificationStatusPanel />
          </Filterable>

          {/* GDPR / privacy policy inputs */}
          <Filterable query={query} section="gdpr">
            <GdprSettingsPanel />
          </Filterable>

          {/* Save button */}
          {showsSaveButton && (
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
          )}
        </div>

        {/* ── Right: map, with the wishlist stacked under it ────────────────── */}
        <div style={{ display: showsRightColumn ? undefined : "none" }}>
        <Filterable query={query} section="map">
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
        </Filterable>

        {/* TEMPORARY — remove after launch along with the wishlist feature. */}
        <Filterable query={query} section="wishlist">
          <WishlistPanel />
        </Filterable>
        </div>
      </div>
    </div>
  );
}

// ── Mattvätt pricing ─────────────────────────────────────────────────────────
// Mattvätt is sold by the square metre: the customer picks a rug type, then drags
// a slider between the smallest and largest size set here. create-cart-payment
// prices the order from these same numbers, so a change here changes what is
// actually charged.

function MattvattPricing({ settings, onChange }: { settings: MattvattSettings; onChange: (s: MattvattSettings) => void }) {
  // The size fields are edited as text and committed on blur, so a half-typed
  // number never collapses the range while the admin is still typing.
  const [minDraft, setMinDraft] = useState(String(settings.minSqm));
  const [maxDraft, setMaxDraft] = useState(String(settings.maxSqm));
  useEffect(() => {
    setMinDraft(String(settings.minSqm));
    setMaxDraft(String(settings.maxSqm));
  }, [settings.minSqm, settings.maxSqm]);

  function commitMin() {
    const min = Math.max(SQM_STEP, clampSqm(minDraft.replace(",", "."), settings.minSqm));
    onChange({ ...settings, minSqm: min, maxSqm: Math.max(min + SQM_STEP, settings.maxSqm) });
  }
  function commitMax() {
    const max = clampSqm(maxDraft.replace(",", "."), settings.maxSqm);
    onChange({ ...settings, maxSqm: Math.max(settings.minSqm + SQM_STEP, max) });
  }

  // A worked example at a middling size, so the effect of a change is visible
  // without opening the customer site.
  const exampleSqm = Math.min(settings.maxSqm, Math.max(settings.minSqm, 5));

  return (
    <section style={{ background: "#fff", border: "1px solid #eee", borderRadius: "10px", padding: "1.25rem" }}>
      <p style={labelStyle}>Mattvätt — pris per m²</p>
      <p style={{ fontSize: "0.8rem", color: "#aaa", marginBottom: "1rem" }}>
        Kunden väljer typ av matta och drar sedan ett reglage mellan minsta och största storlek.
        Priset blir <strong>kr/m² × antal m²</strong>, avrundat till hela kronor.
      </p>

      {/* Price per m², per rug type */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "0.75rem", marginBottom: "1.25rem" }}>
        {MATTA_TYPES.map(t => (
          <div key={t.id}>
            <label style={fieldLabelStyle}>{t.label}</label>
            <div style={{ position: "relative" }}>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={settings.pricePerSqmKr[t.id]}
                onChange={e => onChange({
                  ...settings,
                  pricePerSqmKr: { ...settings.pricePerSqmKr, [t.id]: clampKrPerSqm(e.target.value.replace(/\D/g, "")) },
                })}
                style={{ width: "100%", boxSizing: "border-box", padding: "0.5rem 3.6rem 0.5rem 0.75rem", border: "1px solid #e0e0e0", borderRadius: "8px", fontSize: "0.875rem", color: "#1a1a1a", outline: "none" }}
              />
              <span style={{ position: "absolute", right: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "#888", fontSize: "0.8rem", fontWeight: 600, pointerEvents: "none" }}>kr / m²</span>
            </div>
            <p style={{ fontSize: "0.7rem", color: "#bbb", margin: "0.3rem 0 0", lineHeight: 1.45 }}>{t.desc}</p>
          </div>
        ))}
      </div>

      {/* Slider range */}
      <div style={{ paddingTop: "0.75rem", borderTop: "1px solid #f0f0f0" }}>
        <label style={fieldLabelStyle}>Storlek kunden kan välja</label>
        <p style={{ fontSize: "0.72rem", color: "#aaa", margin: "0 0 0.6rem", lineHeight: 1.5 }}>
          Reglagets ändpunkter. Kunden kan bara beställa mattor inom detta intervall — steget är {formatSqm(SQM_STEP)} m².
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: "0.75rem" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.72rem", color: "#888", marginBottom: "0.25rem" }}>Minsta</label>
            <div style={{ position: "relative" }}>
              <input
                type="text"
                inputMode="decimal"
                value={minDraft}
                onChange={e => setMinDraft(e.target.value)}
                onBlur={commitMin}
                onKeyDown={e => { if (e.key === "Enter") e.currentTarget.blur(); }}
                style={{ width: "100%", boxSizing: "border-box", padding: "0.45rem 2.4rem 0.45rem 0.55rem", border: "1px solid #e0e0e0", borderRadius: "8px", fontSize: "0.85rem", color: "#1a1a1a", outline: "none" }}
              />
              <span style={{ position: "absolute", right: "0.55rem", top: "50%", transform: "translateY(-50%)", color: "#888", fontSize: "0.8rem", fontWeight: 600, pointerEvents: "none" }}>m²</span>
            </div>
          </div>
          <div>
            <label style={{ display: "block", fontSize: "0.72rem", color: "#888", marginBottom: "0.25rem" }}>Största</label>
            <div style={{ position: "relative" }}>
              <input
                type="text"
                inputMode="decimal"
                value={maxDraft}
                onChange={e => setMaxDraft(e.target.value)}
                onBlur={commitMax}
                onKeyDown={e => { if (e.key === "Enter") e.currentTarget.blur(); }}
                style={{ width: "100%", boxSizing: "border-box", padding: "0.45rem 2.4rem 0.45rem 0.55rem", border: "1px solid #e0e0e0", borderRadius: "8px", fontSize: "0.85rem", color: "#1a1a1a", outline: "none" }}
              />
              <span style={{ position: "absolute", right: "0.55rem", top: "50%", transform: "translateY(-50%)", color: "#888", fontSize: "0.8rem", fontWeight: 600, pointerEvents: "none" }}>m²</span>
            </div>
          </div>
        </div>
      </div>

      {/* Worked example */}
      <div style={{ marginTop: "1rem", background: "#f9f9f8", border: "1px solid #eee", borderRadius: "8px", padding: "0.7rem 0.85rem" }}>
        <p style={{ fontSize: "0.72rem", color: "#888", margin: "0 0 0.35rem", fontWeight: 600 }}>
          En matta på {formatSqm(exampleSqm)} m² kostar
        </p>
        {MATTA_TYPES.map(t => (
          <p key={t.id} style={{ fontSize: "0.78rem", color: "#555", margin: "0.15rem 0 0" }}>
            {t.label}: <strong>{mattaPriceKr(settings, t.id, exampleSqm)} kr</strong>
          </p>
        ))}
      </div>
    </section>
  );
}

// ── Admin accounts management ────────────────────────────────────────────────

type AdminRole = "developer" | "huvudadmin" | "admin";

const ROLE_LABELS: Record<AdminRole, string> = {
  developer:  "Developer",
  huvudadmin: "Huvudadmin",
  admin:      "Admin",
};

const ROLE_COLORS: Record<AdminRole, string> = {
  developer:  "#6d28d9",
  huvudadmin: "#4b8c5c",
  admin:      "#64748b",
};

type AdminRow = {
  uid: string;
  email: string;
  displayName: string | null;
  role: AdminRole;
  createdAt: number | null;
  mustChangePassword: boolean;
  isRoot: boolean;
  isSelf: boolean;
};

function AdminAccounts() {
  const [admins, setAdmins] = useState<AdminRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ email: string; tempPassword: string | null; promoted: boolean } | null>(null);
  const [copied, setCopied] = useState(false);
  const [resetting, setResetting] = useState<string | null>(null);
  const [newRole, setNewRole] = useState<AdminRole>("admin");
  // Whether the signed-in admin may manage others. The server enforces this too.
  const [canManage, setCanManage] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/admins");
      const data = await res.json();
      if (res.ok) {
        setAdmins(data.admins ?? []);
        setCanManage(!!data.canManage);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  async function changeRole(uid: string, role: AdminRole) {
    const previous = admins;
    setAdmins(prev => prev.map(a => (a.uid === uid ? { ...a, role } : a)));
    setError(null);
    const res = await fetch("/api/admin/admins/role", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uid, role }),
    });
    if (!res.ok) {
      setAdmins(previous);
      setError((await res.json().catch(() => ({}))).error ?? "Kunde inte ändra rollen.");
    }
  }

  useEffect(() => { load(); }, [load]);

  async function addAdmin() {
    setError(null);
    setCreated(null);
    const value = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setError("Ange en giltig e-postadress.");
      return;
    }
    setAdding(true);
    try {
      const res = await fetch("/api/admin/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: value, role: newRole }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Kunde inte lägga till administratören."); return; }
      setCreated({ email: data.email, tempPassword: data.tempPassword ?? null, promoted: !!data.promoted });
      setEmail("");
      load();
    } catch {
      setError("Nätverksfel — försök igen.");
    } finally {
      setAdding(false);
    }
  }

  async function removeAdmin(uid: string, adminEmail: string) {
    if (!confirm(`Ta bort ${adminEmail} som administratör?\n\nDe förlorar åtkomst till adminpanelen direkt. Inloggningen och kundkontot finns kvar — ta bort kontot helt i Firebase om det behövs.`)) return;
    try {
      const res = await fetch(`/api/admin/admins?uid=${encodeURIComponent(uid)}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error ?? "Kunde inte ta bort administratören."); return; }
      load();
    } catch {
      setError("Nätverksfel — försök igen.");
    }
  }

  function copyPassword() {
    if (!created?.tempPassword) return;
    navigator.clipboard?.writeText(created.tempPassword).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  }

  /** Issue a fresh one-shot password when the original was lost. */
  async function resetPassword(uid: string, adminEmail: string) {
    if (!confirm(`Skapa ett nytt tillfälligt lösenord för ${adminEmail}?\n\nDet gamla slutar fungera direkt och personen loggas ut.`)) return;
    setError(null);
    setResetting(uid);
    try {
      const res = await fetch("/api/admin/admins/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Kunde inte återställa lösenordet."); return; }
      setCreated({ email: adminEmail, tempPassword: data.tempPassword, promoted: false });
      load();
    } catch {
      setError("Nätverksfel — försök igen.");
    } finally {
      setResetting(null);
    }
  }

  return (
    <section style={{ background: "#fff", border: "1px solid #eee", borderRadius: "10px", padding: "1.25rem" }}>
      <p style={labelStyle}>Administratörer</p>
      <p style={{ fontSize: "0.8rem", color: "#aaa", marginBottom: "1rem" }}>
        {canManage
          ? "Lägg till fler administratörer och välj deras roll. Nya konton får ett tillfälligt lösenord som måste bytas vid första inloggningen — befintliga konton behåller sitt lösenord."
          : "Bara huvudadmin kan lägga till, ta bort eller ändra roll för administratörer."}
      </p>

      {/* Temp-password reveal */}
      {created && (
        <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "8px", padding: "0.85rem", marginBottom: "1rem" }}>
          <p style={{ fontSize: "0.78rem", color: "#15803d", fontWeight: 600, margin: "0 0 0.4rem" }}>
            {created.promoted
              ? `${created.email} är nu administratör`
              : `Konto skapat för ${created.email}`}
          </p>

          {created.promoted ? (
            <p style={{ fontSize: "0.72rem", color: "#666", margin: 0, lineHeight: 1.5 }}>
              Kontot fanns redan, så personen loggar in på <strong>samma lösenord som vanligt</strong> —
              inget nytt lösenord behövs. Behöver de ändå ett nytt, använd “Nytt lösenord” i listan nedan.
            </p>
          ) : (
            <>
              <p style={{ fontSize: "0.72rem", color: "#666", margin: "0 0 0.6rem", lineHeight: 1.5 }}>
                Ge detta tillfälliga lösenord till administratören. Det visas bara en gång och måste bytas vid första inloggningen.
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <code style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: "1.15rem", fontWeight: 700, letterSpacing: "0.12em", color: "#1a1a1a", background: "#fff", border: "1px solid #d6f0dc", borderRadius: "6px", padding: "0.4rem 0.9rem" }}>
                  {created.tempPassword}
                </code>
                <button
                  onClick={copyPassword}
                  style={{ background: "#1a1a1a", color: "#fff", border: "none", borderRadius: "6px", padding: "0.45rem 0.8rem", fontSize: "0.78rem", fontWeight: 600, cursor: "pointer" }}
                >
                  {copied ? "✓ Kopierat" : "Kopiera"}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Add form — only for admins who may manage others */}
      {canManage && (
        <>
          <label style={fieldLabelStyle}>Lägg till administratör</label>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <input
              type="email"
              value={email}
              onChange={e => { setEmail(e.target.value); setError(null); }}
              onKeyDown={e => e.key === "Enter" && !adding && addAdmin()}
              placeholder="ny.admin@example.com"
              style={{ flex: "1 1 180px", minWidth: 0, boxSizing: "border-box", padding: "0.5rem 0.75rem", border: "1px solid #e0e0e0", borderRadius: "8px", fontSize: "0.875rem", color: "#1a1a1a", outline: "none" }}
            />
            <select
              value={newRole}
              onChange={e => setNewRole(e.target.value as AdminRole)}
              title="Roll för den nya administratören"
              style={{ boxSizing: "border-box", padding: "0.5rem 0.6rem", border: "1px solid #e0e0e0", borderRadius: "8px", fontSize: "0.85rem", color: "#1a1a1a", background: "#fff", cursor: "pointer" }}
            >
              <option value="admin">Admin</option>
              <option value="huvudadmin">Huvudadmin</option>
            </select>
            <button
              onClick={addAdmin}
              disabled={adding}
              style={{ background: "#1a1a1a", color: "#fff", border: "none", borderRadius: "8px", padding: "0.5rem 1rem", fontSize: "0.85rem", fontWeight: 600, cursor: adding ? "not-allowed" : "pointer", opacity: adding ? 0.6 : 1, whiteSpace: "nowrap" }}
            >
              {adding ? "Lägger till…" : "Lägg till admin"}
            </button>
          </div>
        </>
      )}
      {error && <p style={{ fontSize: "0.75rem", color: "#dc2626", margin: "0.4rem 0 0" }}>{error}</p>}

      {/* Existing admins — listed below the add form */}
      <div style={{ borderTop: "1px solid #eee", margin: "1.25rem 0 0", paddingTop: "1rem" }}>
        <label style={{ ...fieldLabelStyle, marginBottom: "0.6rem" }}>
          Nuvarande administratörer{!loading && admins.length > 0 ? ` (${admins.length})` : ""}
        </label>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
          {loading ? (
            <p style={{ fontSize: "0.8rem", color: "#bbb", margin: 0 }}>Laddar…</p>
          ) : admins.length === 0 ? (
            <p style={{ fontSize: "0.8rem", color: "#bbb", margin: 0 }}>Inga administratörer ännu.</p>
          ) : (
            admins.map(a => (
              <div key={a.uid} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem", background: "#f9f9f8", border: "1px solid #eee", borderRadius: "8px", padding: "0.5rem 0.7rem", flexWrap: "wrap" }}>
                <div style={{ minWidth: 0, flex: "1 1 auto" }}>
                  <span style={{ fontSize: "0.83rem", color: "#1a1a1a", fontWeight: 600, wordBreak: "break-all" }}>
                    {a.displayName || a.email || a.uid}
                  </span>
                  {a.displayName && a.email && (
                    <span style={{ fontSize: "0.72rem", color: "#aaa", marginLeft: "0.4rem", wordBreak: "break-all" }}>
                      {a.email}
                    </span>
                  )}
                  <span style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginTop: "0.15rem", flexWrap: "wrap" }}>
                    <Tag color={ROLE_COLORS[a.role]}>{ROLE_LABELS[a.role]}</Tag>
                    {a.isSelf && <Tag color="#888">Du</Tag>}
                    {a.mustChangePassword && <Tag color="#c0392b">Väntar på lösenordsbyte</Tag>}
                    {a.createdAt && (
                      <span style={{ fontSize: "0.68rem", color: "#aaa" }}>
                        Tillagd {new Date(a.createdAt).toLocaleDateString("sv-SE")}
                      </span>
                    )}
                  </span>
                </div>

                {/* Management controls. Hidden for the fixed bootstrap account,
                    for your own row (nobody may revoke or re-role themselves),
                    and for roles without management rights. */}
                {canManage && !a.isRoot && !a.isSelf && (
                  <span style={{ display: "flex", gap: "0.35rem", flexShrink: 0, alignItems: "center" }}>
                    <select
                      value={a.role}
                      onChange={e => changeRole(a.uid, e.target.value as AdminRole)}
                      title="Ändra roll"
                      style={{ border: "1px solid #e0e0e0", background: "#fff", color: "#333", borderRadius: "6px", padding: "0.3rem 0.4rem", fontSize: "0.75rem", fontWeight: 600, cursor: "pointer" }}
                    >
                      <option value="huvudadmin">Huvudadmin</option>
                      <option value="admin">Admin</option>
                    </select>
                    <button
                      onClick={() => resetPassword(a.uid, a.email)}
                      disabled={resetting === a.uid}
                      title="Skapa ett nytt tillfälligt lösenord"
                      style={{ background: "transparent", border: "1px solid #e0e0e0", color: "#555", borderRadius: "6px", padding: "0.3rem 0.6rem", fontSize: "0.75rem", fontWeight: 600, cursor: resetting === a.uid ? "not-allowed" : "pointer", opacity: resetting === a.uid ? 0.6 : 1, whiteSpace: "nowrap" }}
                    >
                      {resetting === a.uid ? "…" : "Nytt lösenord"}
                    </button>
                    <button
                      onClick={() => removeAdmin(a.uid, a.email)}
                      style={{ background: "transparent", border: "1px solid #f0c4c0", color: "#c0392b", borderRadius: "6px", padding: "0.3rem 0.6rem", fontSize: "0.75rem", fontWeight: 600, cursor: "pointer" }}
                    >
                      Ta bort
                    </button>
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}

function Tag({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <span style={{ fontSize: "0.66rem", fontWeight: 600, color, background: `${color}14`, border: `1px solid ${color}33`, borderRadius: "4px", padding: "0.05rem 0.35rem" }}>
      {children}
    </span>
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
