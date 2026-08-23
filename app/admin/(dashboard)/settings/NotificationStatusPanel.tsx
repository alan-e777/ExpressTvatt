"use client";

import { useEffect, useState } from "react";

type Config = {
  email: { from: string; replyTo: string | null; configured: boolean; sandbox: boolean };
  sms:   { from: string; configured: boolean };
};

/**
 * Read-only readout of the notification senders this deployment is actually
 * using. Environment variables are write-only in Vercel's UI, so after saving
 * one there is no way to confirm what was saved — this reports it from inside
 * the running deployment, which is the only place that knows.
 */
export default function NotificationStatusPanel() {
  const [config, setConfig] = useState<Config | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/notification-config")
      .then(r => (r.ok ? r.json() : Promise.reject(new Error("Kunde inte hämta."))))
      .then(setConfig)
      .catch(() => setError("Kunde inte läsa avsändarinställningarna."));
  }, []);

  return (
    <section style={{ background: "#fff", border: "1px solid #eee", borderRadius: "10px", padding: "1.1rem 1.25rem" }}>
      <p style={{ fontWeight: 700, fontSize: "0.95rem", marginBottom: "0.2rem" }}>Avsändare</p>
      <p style={{ color: "#999", fontSize: "0.8rem", marginBottom: "1rem" }}>
        Vad den här miljön faktiskt skickar ifrån. Läses direkt från servern — så här
        ser du vad som ligger i Vercel utan att gissa.
      </p>

      {error && <p style={{ color: "#dc2626", fontSize: "0.8rem" }}>{error}</p>}
      {!config && !error && <p style={{ color: "#bbb", fontSize: "0.8rem" }}>Läser…</p>}

      {config && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
          {config.email.sandbox && (
            <div style={{
              background: "#fef3c7", border: "1px solid #fbbf24", borderRadius: "8px",
              padding: "0.55rem 0.75rem", fontSize: "0.78rem", color: "#7c2d12", lineHeight: 1.5,
            }}>
              <strong>Testavsändare aktiv.</strong> <code>resend.dev</code> är Resends delade
              adress — den nekar alla mottagare utom Resend-kontots egen e-post. Inga kunder
              får mejl från den här miljön.
            </div>
          )}
          <Row label="E-post från" value={config.email.from} />
          <Row label="Svara till" value={config.email.replyTo ?? "— (inte satt)"} />
          <Row label="Resend-nyckel" value={config.email.configured ? "finns" : "SAKNAS"} bad={!config.email.configured} />
          <Row label="SMS från" value={config.sms.from} />
          <Row label="46elks-inloggning" value={config.sms.configured ? "finns" : "SAKNAS"} bad={!config.sms.configured} />
        </div>
      )}
    </section>
  );
}

function Row({ label, value, bad = false }: { label: string; value: string; bad?: boolean }) {
  return (
    <div style={{ display: "flex", gap: "0.75rem", alignItems: "baseline", fontSize: "0.82rem" }}>
      <span style={{ color: "#888", minWidth: "9rem", flexShrink: 0 }}>{label}</span>
      <code style={{
        color: bad ? "#dc2626" : "#1a1a1a", fontWeight: bad ? 700 : 500,
        background: "#fafafa", borderRadius: "4px", padding: "0.15rem 0.4rem", overflowWrap: "anywhere",
      }}>
        {value}
      </code>
    </div>
  );
}
