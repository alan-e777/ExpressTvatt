"use client";

import { useEffect, useRef, useState } from "react";
import { IconCheck } from "@tabler/icons-react";

type Prediction = {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
};

type Props = {
  value: string;
  onChange: (text: string) => void;
  onSelect: (address: string, postalCode: string) => void;
  onConfirmChange?: (confirmed: boolean) => void;
};

export default function AddressAutocomplete({
  value,
  onChange,
  onSelect,
  onConfirmChange,
}: Props) {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [open,        setOpen]        = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [confirmed,   setConfirmed]   = useState(false);
  // Set when the picked address geocodes outside the admin's service area. The
  // suggestion list can offer such an address because Google can only be
  // restricted to the area's bounding box — see `/api/places/details`.
  const [outside,     setOutside]     = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipRef     = useRef(false);
  const wrapRef     = useRef<HTMLDivElement>(null);

  // Debounced autocomplete fetch
  useEffect(() => {
    if (skipRef.current) { skipRef.current = false; return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!value.trim() || value.length < 3) {
      setPredictions([]);
      setOpen(false);
      return;
    }
    setOutside(false);

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/places/autocomplete?input=${encodeURIComponent(value)}`);
        const data = await res.json();
        const preds: Prediction[] = data.predictions ?? [];
        setPredictions(preds);
        setOpen(preds.length > 0);
      } catch {
        // ignore network errors silently
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [value]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  async function handleSelect(p: Prediction) {
    setOpen(false);
    setPredictions([]);
    skipRef.current = true;
    setLoading(true);
    setOutside(false);
    try {
      const res = await fetch(`/api/places/details?placeId=${encodeURIComponent(p.place_id)}`);
      const data = await res.json();

      // Outside the drawn area: leave the text in the field so the customer can
      // see what they picked, but do not confirm it — the parent form treats an
      // unconfirmed address as incomplete and will not let checkout proceed.
      if (data.outsideArea) {
        onChange(p.structured_formatting.main_text);
        setOutside(true);
        setConfirmed(false);
        onConfirmChange?.(false);
        return;
      }

      const address = data.address || p.structured_formatting.main_text;
      onChange(address);
      onSelect(address, data.postalCode ?? "");
      setConfirmed(true);
      onConfirmChange?.(true);
    } catch {
      const address = p.structured_formatting.main_text;
      onChange(address);
      onSelect(address, "");
      setConfirmed(true);
      onConfirmChange?.(true);
    } finally {
      setLoading(false);
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (confirmed) {
      setConfirmed(false);
      onConfirmChange?.(false);
    }
    setOutside(false);
    onChange(e.target.value);
  }

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <div style={{ position: "relative" }}>
        <input
          className="input"
          placeholder="t.ex. Storgatan 12"
          value={value}
          onChange={handleChange}
          autoComplete="off"
          style={{
            paddingRight: 38,
            ...(confirmed && { boxShadow: "0 0 0 1.5px var(--forest-mid)" }),
            ...(outside   && { boxShadow: "0 0 0 1.5px #dc2626" }),
          }}
        />
        <div style={{
          position: "absolute", right: 12, top: "50%",
          transform: "translateY(-50%)",
          pointerEvents: "none",
          display: "flex", alignItems: "center",
        }}>
          {loading ? (
            <div style={{
              width: 14, height: 14,
              border: "1.5px solid var(--forest-mid)",
              borderTopColor: "transparent",
              borderRadius: "50%",
              animation: "addr-spin 0.6s linear infinite",
            }} />
          ) : confirmed ? (
            <IconCheck size={16} stroke={2} style={{ color: "var(--forest-mid)" }} />
          ) : null}
        </div>
      </div>

      {outside && (
        <p style={{ fontSize: 12, color: "#dc2626", margin: "6px 2px 0", lineHeight: 1.5 }}>
          Vi kör tyvärr inte till den adressen ännu. Välj en adress inom vårt
          upphämtningsområde.
        </p>
      )}

      {open && predictions.length > 0 && (
        <div style={{
          position: "absolute",
          top: "calc(100% + 4px)",
          left: 0, right: 0,
          background: "var(--white)",
          border: "0.5px solid rgba(74,124,89,0.2)",
          borderRadius: "var(--radius-md)",
          boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
          zIndex: 100,
          overflow: "hidden",
        }}>
          {predictions.map((p, i) => (
            <button
              key={p.place_id}
              type="button"
              onClick={() => handleSelect(p)}
              className="addr-suggestion"
              style={{
                display: "block", width: "100%",
                textAlign: "left",
                padding: "10px 14px",
                background: "none", border: "none", cursor: "pointer",
                borderBottom: i < predictions.length - 1
                  ? "0.5px solid rgba(74,124,89,0.08)"
                  : "none",
              }}
            >
              <div style={{ fontSize: 14, color: "var(--text-dark)", fontWeight: 400 }}>
                {p.structured_formatting.main_text}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                {p.structured_formatting.secondary_text}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
