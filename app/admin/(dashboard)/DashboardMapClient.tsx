"use client";

import { useEffect, useState, useCallback } from "react";

type RunOrder = {
  id: string;
  address: string;
  postalCode: string;
  serviceName: string;
  status: string;
  lat: number | null;
  lng: number | null;
};

type ActiveRun = {
  token: string;
  type: string;
  orders: RunOrder[];
};

export default function DashboardMapClient() {
  const [run, setRun] = useState<ActiveRun | null>(null);
  const [imgKey, setImgKey] = useState(0);
  const [imgError, setImgError] = useState(false);

  const fetchRun = useCallback(async () => {
    try {
      const resp = await fetch("/api/admin/runs/active");
      if (!resp.ok) { setRun(null); return; }
      const data = await resp.json();
      setRun(data.run ?? null);
      setImgKey(k => k + 1);
      setImgError(false);
    } catch {
      setRun(null);
    }
  }, []);

  useEffect(() => {
    fetchRun();

    const id = setInterval(() => {
      if (document.hidden) return;
      fetchRun();
    }, 30_000);

    return () => clearInterval(id);
  }, [fetchRun]);

  const deliveredCount = run?.orders.filter(o => o.status === "delivered").length ?? 0;
  const total = run?.orders.length ?? 0;
  const allDone = deliveredCount === total && total > 0;

  return (
    <div style={{ marginTop: "2rem" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "0.75rem" }}>
        <div>
          <h2 style={{ fontSize: "0.875rem", fontWeight: 700, color: "#1a1a1a", marginBottom: "0.2rem" }}>
            Körning — live
          </h2>
          {run ? (
            <p style={{ fontSize: "0.75rem", color: "#aaa" }}>
              {run.type === "dropoff" ? "Utkörning" : "Upphämtning"}
              {" · "}
              <span style={{ color: allDone ? "#16a34a" : "#aaa", fontWeight: allDone ? 600 : 400 }}>
                {allDone ? "✓ Allt klart" : `${deliveredCount} av ${total} klara`}
              </span>
            </p>
          ) : (
            <p style={{ fontSize: "0.75rem", color: "#ccc" }}>Ingen aktiv körning</p>
          )}
        </div>
        {run && (
          <a
            href={`/driver/${run.token}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: "0.72rem",
              color: "#4b8c5c",
              textDecoration: "none",
              border: "1px solid #cde3d3",
              borderRadius: "6px",
              padding: "0.28rem 0.65rem",
              fontWeight: 500,
              whiteSpace: "nowrap",
            }}
          >
            Öppna körning →
          </a>
        )}
      </div>

      {/* Map */}
      <div style={{
        border: "1px solid #eee",
        borderRadius: "10px",
        overflow: "hidden",
        background: "#f5f5f4",
        minHeight: "120px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}>
        {!run ? (
          <p style={{ color: "#ccc", fontSize: "0.82rem" }}>Generera en körningslänk i Driver-sidan för att se progress här</p>
        ) : imgError ? (
          <p style={{ color: "#ccc", fontSize: "0.82rem" }}>Kartan kunde inte laddas</p>
        ) : (
          <img
            key={imgKey}
            src={`/api/admin/maps/run?t=${imgKey}`}
            alt="Körningskarta"
            onError={() => setImgError(true)}
            style={{ width: "100%", height: "auto", display: "block" }}
          />
        )}
      </div>

      {/* Legend */}
      {run && (
        <div style={{ display: "flex", gap: "1.25rem", marginTop: "0.6rem" }}>
          <LegendDot color="#16a34a" label="Levererad" />
          <LegendDot color="#1a1a1a" label="Väntar" />
        </div>
      )}
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
      <div style={{ width: 9, height: 9, borderRadius: "50%", background: color, flexShrink: 0 }} />
      <span style={{ fontSize: "0.72rem", color: "#999" }}>{label}</span>
    </div>
  );
}
