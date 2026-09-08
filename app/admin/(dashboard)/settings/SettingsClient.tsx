/// <reference types="@types/google.maps" />
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { DriverSettings } from "@/app/api/admin/settings/route";
import {
  CIRCLE_POINTS, DEFAULT_SERVICE_AREA, MAX_POINTS, MIN_POINTS,
  areaSqKm, boundingCircle, findSelfIntersection, polygonFromCircle, validatePolygon,
  type LatLng,
} from "@/lib/serviceArea";
import { DISCOUNT_DEFAULTS, clampPct, type DiscountSettings } from "@/lib/discount";
import {
  MATTA_TYPES, MATTVATT_DEFAULTS, SQM_STEP, clampKrPerSqm, clampSqm,
  formatSqm, mattaPriceKr, normalizeMattvattSettings, type MattvattSettings,
} from "@/lib/mattvatt";
import WishlistPanel from "./WishlistPanel";
import GdprSettingsPanel from "./GdprSettingsPanel";
import NotificationStatusPanel from "./NotificationStatusPanel";
import TimeSlotsPanel from "./TimeSlotsPanel";

type Prediction = { description: string; placeId: string };

// ── Settings search ──────────────────────────────────────────────────────────
// Every section declares the words it answers to. The box under the header hides
// the ones that do not match, so the page stays navigable as settings pile up.

const SECTION_TERMS = {
  driver:    "chaufför chaufförens platser startplats slutplats adress adresser rutt ruttplanering start slut",
  area:      "tjänsteområde område yta form polygon punkter hörn rita redigera karta google maps adresser räckvidd radie km cirkel centrum",
  delivery:  "leverans leveransavgift frakt gratis fri tröskel gränsvärde hemleverans upphämtning avgift kr",
  timeslots: "tider tid tidsfönster tidsfonster tidsintervall klockslag schema öppettider oppettider upphämtning upphamtning avlämning avlamning hämtning leveranstid bokningstid timmar fönster",
  discounts: "rabatt rabatter förstagångsrabatt procent kampanj ny kund mattvätt matta flera",
  mattvatt:  "mattvätt matta mattor pris priser kvadratmeter kvm m2 m² kr per storlek min max minsta största normal äkta orientalisk slider reglage",
  admins:    "administratörer admin adminkonton konto konton roll roller huvudadmin lösenord behörighet användare",
  gdpr:      "gdpr integritetspolicy personuppgifter dataskydd policy juridik företagsuppgifter organisationsnummer",
  avsandare: "avsändare avsandare epost e-post mejl sms resend 46elks from svara till domän sandbox testavsändare",
  map:       "karta google maps tjänsteområde form polygon punkter rita redigera radie cirkel centrum",
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
  polygon,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  /** The shape currently on the map — including edits not yet saved. */
  polygon: LatLng[];
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
        if (polygon.length >= MIN_POINTS) params.set("polygon", JSON.stringify(polygon));
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
    serviceArea: DEFAULT_SERVICE_AREA,
    freeDeliveryThresholdKr: 0,
    deliveryFeeKr: 0,
  });
  const [discounts, setDiscounts] = useState<DiscountSettings>(DISCOUNT_DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [areaSaveError, setAreaSaveError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  // ── Service-area editor ───────────────────────────────────────────────────
  // Off by default: the shape is only draggable once the admin says so, so a
  // stray click on the map cannot silently redraw where the company delivers.
  const [editingArea, setEditingArea] = useState(false);

  // Map refs
  const mapDivRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const polygonRef = useRef<google.maps.Polygon | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const mapReady = useRef(false);
  // Read inside the map's click listener, which is attached once at init and
  // would otherwise close over the first value of `editingArea` forever.
  const editingRef = useRef(false);
  // Bumped when the map finishes loading, so the polygon-sync effect below
  // re-runs against a map that now exists.
  const [mapLive, setMapLive] = useState(0);

  useEffect(() => { editingRef.current = editingArea; }, [editingArea]);

  const polygon = settings.serviceArea.polygon;
  const setPolygon = useCallback((next: LatLng[] | ((prev: LatLng[]) => LatLng[])) => {
    setSettings(s => {
      const points = typeof next === "function" ? next(s.serviceArea.polygon) : next;
      // The bounding circle is recomputed on every edit so the readout, and any
      // consumer that can only take a circle, never lags behind the shape. Below
      // three points there is no circle to derive, so the last good one stands —
      // deriving one from an empty array yields NaN.
      const circle = points.length >= MIN_POINTS
        ? boundingCircle(points)
        : { lat: s.serviceArea.lat, lng: s.serviceArea.lng, radiusKm: s.serviceArea.radiusKm };
      return { ...s, serviceArea: { ...circle, polygon: points } };
    });
  }, []);

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
  }, []);

  // ── Draw the polygon and its handles ──────────────────────────────────────
  // Google's own `editable: true` polygon gives drag handles, but no point
  // numbers — and the order points were placed in is exactly what this editor
  // is about. So the polygon itself stays non-editable and the handles are our
  // own numbered markers, which can also carry a right-click to delete.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || typeof google === "undefined") return;

    // Polygon: created once, then just re-pathed.
    if (!polygonRef.current) {
      polygonRef.current = new google.maps.Polygon({
        map,
        fillColor: "#4b8c5c",
        fillOpacity: 0.12,
        strokeColor: "#4b8c5c",
        strokeWeight: 2,
        clickable: false,   // clicks must reach the map, which is what adds a point
        zIndex: 1,
      });
    }
    polygonRef.current.setPath(polygon);
    polygonRef.current.setOptions({
      strokeColor: editingArea ? "#2f6b40" : "#4b8c5c",
      strokeWeight: editingArea ? 2.5 : 2,
    });

    // Markers only exist while editing, and are rebuilt only when the number of
    // points changes — dragging one must not tear down the marker under the
    // cursor mid-gesture.
    const wanted = editingArea ? polygon.length : 0;
    if (markersRef.current.length !== wanted) {
      markersRef.current.forEach(m => m.setMap(null));
      markersRef.current = [];

      for (let i = 0; i < wanted; i++) {
        const marker = new google.maps.Marker({
          map,
          position: polygon[i],
          draggable: true,
          zIndex: 2,
          label: { text: String(i + 1), color: "#fff", fontSize: "11px", fontWeight: "700" },
          title: `Punkt ${i + 1} — dra för att flytta, högerklicka för att ta bort`,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: "#2f6b40",
            fillOpacity: 1,
            strokeColor: "#fff",
            strokeWeight: 2,
          },
        });

        // Live path update while dragging, committed to React state on release —
        // one state write per gesture rather than one per mouse move.
        marker.addListener("drag", () => {
          const pos = marker.getPosition();
          if (pos && polygonRef.current) polygonRef.current.getPath().setAt(i, pos);
        });
        marker.addListener("dragend", () => {
          const pos = marker.getPosition();
          if (!pos) return;
          setPolygon(prev => prev.map((pt, idx) => (idx === i ? { lat: pos.lat(), lng: pos.lng() } : pt)));
        });
        // `rightclick` on older Maps builds, `contextmenu` on newer ones. Both
        // are registered so removal works either way; the guard stops a build
        // that fires both from taking two points off at once.
        let lastRemoval = 0;
        const removePoint = () => {
          const now = Date.now();
          if (now - lastRemoval < 300) return;
          lastRemoval = now;
          setPolygon(prev => (prev.length > MIN_POINTS ? prev.filter((_, idx) => idx !== i) : prev));
        };
        marker.addListener("rightclick", removePoint);
        marker.addListener("contextmenu", removePoint);

        markersRef.current.push(marker);
      }
    } else {
      markersRef.current.forEach((m, i) => m.setPosition(polygon[i]));
    }
  }, [polygon, editingArea, mapLive, setPolygon]);

  /** Frame the whole shape — used on load and by the "visa hela området" button. */
  const fitToPolygon = useCallback((points: LatLng[]) => {
    const map = mapRef.current;
    if (!map || points.length < MIN_POINTS || typeof google === "undefined") return;
    const bounds = new google.maps.LatLngBounds();
    points.forEach(pt => bounds.extend(pt));
    map.fitBounds(bounds, 32);
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
          // A click on the map means "add a point" while editing, so the map
          // must not also swallow it as a POI click and open an info window.
          clickableIcons: false,
        });
        mapRef.current = map;

        // Attached once. `editingRef` rather than `editingArea` because this
        // closure outlives every render that follows.
        map.addListener("click", (e: google.maps.MapMouseEvent) => {
          if (!editingRef.current || !e.latLng) return;
          const pt = { lat: e.latLng.lat(), lng: e.latLng.lng() };
          setPolygon(prev => (prev.length >= MAX_POINTS ? prev : [...prev, pt]));
        });

        setMapLive(v => v + 1);   // lets the polygon effect run now the map exists
        fitToPolygon(settings.serviceArea.polygon);
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
      polygonRef.current = null;
      markersRef.current.forEach(m => m.setMap(null));
      markersRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  // ── Editor actions ────────────────────────────────────────────────────────

  /** Drop the most recently placed point. */
  const undoPoint = () => setPolygon(prev => prev.slice(0, -1));

  /** Start over: the next clicks build a shape from nothing. */
  const clearPoints = () => setPolygon([]);

  /** Back to a regular octagon around the current area — the old circle, in effect. */
  function resetToCircle() {
    const circle = polygon.length >= MIN_POINTS
      ? boundingCircle(polygon)
      : { lat: settings.serviceArea.lat, lng: settings.serviceArea.lng, radiusKm: settings.serviceArea.radiusKm };
    const points = polygonFromCircle({ lat: circle.lat, lng: circle.lng }, circle.radiusKm, CIRCLE_POINTS);
    setPolygon(points);
    fitToPolygon(points);
  }

  // Why the shape cannot be saved, or null. Shown live under the map controls
  // and re-checked by the server, which is what actually enforces it.
  const areaError = validatePolygon(polygon);
  const crossing  = polygon.length >= MIN_POINTS ? findSelfIntersection(polygon) : null;

  async function save() {
    if (areaError) { setAreaSaveError(areaError); return; }
    setAreaSaveError(null);
    setSaving(true);
    try {
      const [areaRes] = await Promise.all([
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
      // The server re-validates the shape. Saying "✓ Sparat" over a rejection
      // would leave the admin believing in an area that was never stored.
      if (!areaRes.ok) {
        const msg = await areaRes.json().catch(() => null);
        setAreaSaveError(msg?.error ?? "Tjänsteområdet kunde inte sparas.");
        return;
      }
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
  const showsSaveButton = (["driver", "area", "delivery", "discounts"] as SectionKey[]).some(shows);
  const showsRightColumn = shows("map") || shows("wishlist");

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "auto" }}>
      {/* Header */}
      <div style={{ marginBottom: "1.25rem" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.2rem" }}>Inställningar</h1>
        <p style={{ color: "#999", fontSize: "0.875rem" }}>Priser, leverans, tider, tjänsteområde och administratörer</p>
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
          Ingen inställning matchar <strong>“{query}”</strong>. Prova t.ex. <em>mattvätt</em>, <em>rabatt</em>, <em>tider</em>, <em>leverans</em>, <em>karta</em> eller <em>administratörer</em>.
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
                polygon={polygon}
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
                polygon={polygon}
              />
            </div>
          </section>
          </Filterable>

          {/* Service area controls */}
          <Filterable query={query} section="area">
          <section style={{ background: "#fff", border: "1px solid #eee", borderRadius: "10px", padding: "1.25rem" }}>
            <p style={labelStyle}>Tjänsteområde</p>
            <p style={{ fontSize: "0.8rem", color: "#aaa", marginBottom: "1rem" }}>
              Adresser utanför detta område visas inte vid adressinmatning. Slå på
              redigering och klicka på kartan för att rita formen.
            </p>

            {/* Edit toggle — the shape is locked until this is on */}
            <button
              type="button"
              onClick={() => setEditingArea(v => !v)}
              style={{
                width: "100%", padding: "0.6rem 0.9rem", marginBottom: "0.85rem",
                background: editingArea ? "#2f6b40" : "#fff",
                color: editingArea ? "#fff" : "#1a1a1a",
                border: `1px solid ${editingArea ? "#2f6b40" : "#e0e0e0"}`,
                borderRadius: "8px", fontSize: "0.85rem", fontWeight: 600, cursor: "pointer",
              }}
            >
              {editingArea ? "✓ Klar med redigering" : "✎ Redigera område"}
            </button>

            {editingArea && (
              <div style={{
                background: "#f4f9f5", border: "1px solid #d8e9dc", borderRadius: "8px",
                padding: "0.7rem 0.8rem", marginBottom: "0.85rem",
                fontSize: "0.75rem", color: "#3d6b48", lineHeight: 1.65,
              }}>
                <strong style={{ display: "block", marginBottom: "0.25rem" }}>Så ritar du</strong>
                Klicka på kartan för att lägga till en punkt — punkterna binds ihop i
                den ordning du placerar dem, och sista punkten kopplas tillbaka till
                den första. Dra en punkt för att flytta den, högerklicka på den för
                att ta bort den.
              </div>
            )}

            {/* Point count, area, and the shape's own health */}
            <div style={{
              display: "flex", alignItems: "baseline", gap: "0.5rem", flexWrap: "wrap",
              fontSize: "0.8rem", color: "#555",
              background: "#f9f9f8", border: "1px solid #eee", borderRadius: "6px",
              padding: "0.45rem 0.65rem", marginBottom: "0.75rem",
            }}>
              <strong>{polygon.length} {polygon.length === 1 ? "punkt" : "punkter"}</strong>
              {polygon.length >= MIN_POINTS && (
                <>
                  <span style={{ color: "#ddd" }}>·</span>
                  <span>≈ {areaSqKm(polygon).toFixed(1)} km²</span>
                  <span style={{ color: "#ddd" }}>·</span>
                  <span style={{ color: "#999", fontSize: "0.72rem" }}>
                    {settings.serviceArea.lat.toFixed(4)}, {settings.serviceArea.lng.toFixed(4)}
                  </span>
                </>
              )}
            </div>

            {areaError && (
              <p style={{
                fontSize: "0.76rem", color: "#b91c1c", background: "#fef2f2",
                border: "1px solid #fecaca", borderRadius: "6px",
                padding: "0.5rem 0.65rem", margin: "0 0 0.75rem", lineHeight: 1.5,
              }}>
                {areaError}
                {crossing && ` (kanterna mellan punkt ${crossing[0] + 1} och ${crossing[1] + 1}).`}
              </p>
            )}

            {editingArea && (
              <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginBottom: "0.85rem" }}>
                <button type="button" onClick={undoPoint} disabled={polygon.length === 0} style={miniBtnStyle(polygon.length === 0)}>
                  ↶ Ångra sista
                </button>
                <button type="button" onClick={clearPoints} disabled={polygon.length === 0} style={miniBtnStyle(polygon.length === 0)}>
                  Rensa alla
                </button>
                <button type="button" onClick={resetToCircle} style={miniBtnStyle(false)}>
                  ○ Återställ till cirkel
                </button>
                <button type="button" onClick={() => fitToPolygon(polygon)} disabled={polygon.length < MIN_POINTS} style={miniBtnStyle(polygon.length < MIN_POINTS)}>
                  ⤢ Visa hela
                </button>
              </div>
            )}

            {/* The points themselves — the reliable way to remove one without
                hunting for a marker hidden under another. */}
            {editingArea && polygon.length > 0 && (
              <div>
                <label style={fieldLabelStyle}>Punkter i ordning</label>
                <ul style={{
                  listStyle: "none", margin: 0, padding: 0,
                  maxHeight: "180px", overflowY: "auto",
                  border: "1px solid #eee", borderRadius: "6px",
                }}>
                  {polygon.map((pt, i) => (
                    <li key={i} style={{
                      display: "flex", alignItems: "center", gap: "0.5rem",
                      padding: "0.35rem 0.5rem",
                      borderBottom: i < polygon.length - 1 ? "1px solid #f5f5f5" : "none",
                      fontSize: "0.75rem", color: "#555",
                    }}>
                      <span style={{
                        display: "inline-flex", alignItems: "center", justifyContent: "center",
                        width: 20, height: 20, flexShrink: 0,
                        borderRadius: "50%", background: "#2f6b40", color: "#fff",
                        fontSize: "0.68rem", fontWeight: 700,
                      }}>{i + 1}</span>
                      <span style={{ flex: 1, fontVariantNumeric: "tabular-nums" }}>
                        {pt.lat.toFixed(4)}, {pt.lng.toFixed(4)}
                      </span>
                      <button
                        type="button"
                        aria-label={`Ta bort punkt ${i + 1}`}
                        title={polygon.length <= MIN_POINTS ? `Ett område behöver minst ${MIN_POINTS} punkter` : "Ta bort punkten"}
                        disabled={polygon.length <= MIN_POINTS}
                        onClick={() => setPolygon(prev => prev.filter((_, idx) => idx !== i))}
                        style={{
                          background: "none", border: "none", padding: "0 0.2rem",
                          color: polygon.length <= MIN_POINTS ? "#ddd" : "#c0392b",
                          cursor: polygon.length <= MIN_POINTS ? "not-allowed" : "pointer",
                          fontSize: "0.95rem", lineHeight: 1,
                        }}
                      >×</button>
                    </li>
                  ))}
                </ul>
                {polygon.length >= MAX_POINTS && (
                  <p style={{ fontSize: "0.72rem", color: "#b45309", margin: "0.4rem 0 0" }}>
                    Max {MAX_POINTS} punkter — ta bort en punkt för att kunna lägga till en ny.
                  </p>
                )}
              </div>
            )}
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

          {/* Bookable pickup/delivery windows */}
          <Filterable query={query} section="timeslots">
            <TimeSlotsPanel />
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

          {/* Mattvätt moved to Tjänster — see the note below */}
          <Filterable query={query} section="mattvatt">
          <MattvattMovedNote />
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
          {showsSaveButton && areaSaveError && (
            <p style={{
              fontSize: "0.78rem", color: "#b91c1c", background: "#fef2f2",
              border: "1px solid #fecaca", borderRadius: "8px",
              padding: "0.6rem 0.75rem", margin: 0,
            }}>
              Inget sparades — {areaSaveError}
            </p>
          )}

          {showsSaveButton && (
          <button
            onClick={save}
            disabled={saving || !!areaError}
            title={areaError ?? undefined}
            style={{
              padding: "0.75rem 1.25rem",
              background: saved ? "#f0fdf4" : "#1a1a1a",
              color: saved ? "#15803d" : "#fff",
              border: saved ? "1px solid #bbf7d0" : "none",
              borderRadius: "8px",
              fontSize: "0.875rem",
              fontWeight: 600,
              cursor: saving || areaError ? "not-allowed" : "pointer",
              opacity: saving || areaError ? 0.6 : 1,
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
            <p style={{ fontSize: "0.78rem", color: editingArea ? "#2f6b40" : "#aaa", margin: 0 }}>
              {editingArea
                ? "Klicka för att lägga till en punkt · Dra för att flytta · Högerklicka på en punkt för att ta bort"
                : "Slå på “Redigera område” för att ändra formen"}
            </p>
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

/**
 * Mattvätt used to be priced here. It now has a proper category card under
 * Tjänster alongside every other category, so its rug types, prices, size range
 * and description live in one place instead of two that could disagree.
 */
function MattvattMovedNote() {
  return (
    <section style={{ background: "#fff", border: "1px solid #eee", borderRadius: "10px", padding: "1.25rem" }}>
      <p style={labelStyle}>Mattvätt</p>
      <p style={{ fontSize: "0.8rem", color: "#888", lineHeight: 1.6 }}>
        Mattvätt hanteras numera under{" "}
        <a href="/admin/services" style={{ color: "#0E5C5B", fontWeight: 600 }}>Tjänster</a>{" "}
        tillsammans med övriga kategorier — där ändrar du mattyper, pris per m²,
        storleksintervall, ikon och beskrivning på samma ställe.
      </p>
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

/** The small secondary actions in the service-area editor. */
const miniBtnStyle = (disabled: boolean): React.CSSProperties => ({
  padding: "0.35rem 0.6rem",
  background: "#fff",
  color: disabled ? "#ccc" : "#444",
  border: `1px solid ${disabled ? "#f0f0f0" : "#e0e0e0"}`,
  borderRadius: "6px",
  fontSize: "0.74rem",
  fontWeight: 600,
  cursor: disabled ? "not-allowed" : "pointer",
});
