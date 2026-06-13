"use client";

import { useEffect, useRef, useState } from "react";
import { onStatusEmailQueued, type QueuedEmail } from "@/lib/order-email-bus";

/**
 * Floating admin banner shown after an order's status changes.
 *
 * Flow: the Orders table calls `queueStatusEmail(...)`; this listens, shows a
 * 10-second countdown ("Order Status changed, updating the customer"), then POSTs
 * to /api/admin/orders/notify-status which sends the email via Resend.
 *
 * Multiple changes can be in-flight at once (each with its own timer). The banner
 * only renders the most recently queued one; when it resolves, the previous
 * still-pending one re-appears as long as its 10s window hasn't elapsed.
 * Re-changing the same order within the window supersedes the earlier email.
 */
const DELAY_MS = 10_000;
const DEEP_TEAL = "#063F41";
const GOLD = "#D4AF37";

type Pending = QueuedEmail & { uid: string; sendAt: number };

export default function OrderStatusNotifier() {
  const [pending, setPending] = useState<Pending[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Stable send fn (always sees latest impl) so setTimeout closures don't go stale.
  const send = useRef<(p: Pending) => void>(() => {});
  send.current = async (p: Pending) => {
    timers.current.delete(p.uid);
    try {
      await fetch("/api/admin/orders/notify-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: p.orderId, status: p.status }),
      });
    } catch {
      // Status itself is already persisted elsewhere; the email is best-effort.
    } finally {
      setPending(prev => prev.filter(x => x.uid !== p.uid));
    }
  };

  function clearTimer(uid: string) {
    const t = timers.current.get(uid);
    if (t) {
      clearTimeout(t);
      timers.current.delete(uid);
    }
  }

  // Subscribe to queued status changes.
  useEffect(() => {
    return onStatusEmailQueued(payload => {
      const uid =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random()}`;
      const item: Pending = { ...payload, uid, sendAt: Date.now() + DELAY_MS };

      setPending(prev => {
        // Supersede any still-pending email for the same order.
        prev.filter(x => x.orderId === payload.orderId).forEach(x => clearTimer(x.uid));
        return [...prev.filter(x => x.orderId !== payload.orderId), item];
      });

      timers.current.set(uid, setTimeout(() => send.current(item), DELAY_MS));
    });
  }, []);

  // Tick the countdown only while something is pending.
  useEffect(() => {
    if (pending.length === 0) return;
    const iv = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(iv);
  }, [pending.length]);

  // Cleanup on unmount.
  useEffect(() => {
    const map = timers.current;
    return () => map.forEach(t => clearTimeout(t));
  }, []);

  function undo(uid: string) {
    clearTimer(uid);
    setPending(prev => prev.filter(x => x.uid !== uid));
  }

  if (pending.length === 0) return null;

  // Show the most recently queued pending email.
  const latest = pending.reduce((a, b) => (b.sendAt > a.sendAt ? b : a));
  const msLeft = Math.max(0, latest.sendAt - now);
  const secondsLeft = Math.ceil(msLeft / 1000);
  const fraction = Math.max(0, Math.min(1, msLeft / DELAY_MS));
  const queuedBehind = pending.length - 1;

  // Countdown ring geometry.
  const R = 17;
  const C = 2 * Math.PI * R;

  return (
    <div
      style={{
        position: "fixed",
        right: "1.5rem",
        bottom: "1.5rem",
        zIndex: 1000,
        width: "340px",
        background: "#ffffff",
        border: "1px solid #E4EEEC",
        borderRadius: "16px",
        boxShadow: "0 16px 48px rgba(6,63,65,0.18)",
        padding: "1rem 1.1rem",
        fontFamily: "system-ui, sans-serif",
        animation: "ost-slide-in 0.28s cubic-bezier(0.22,1,0.36,1)",
      }}
    >
      <style>{`@keyframes ost-slide-in{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}`}</style>

      <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
        {/* Countdown ring */}
        <div style={{ position: "relative", width: 44, height: 44, flexShrink: 0 }}>
          <svg width="44" height="44" viewBox="0 0 44 44" style={{ transform: "rotate(-90deg)" }}>
            <circle cx="22" cy="22" r={R} fill="none" stroke="#EAF2F1" strokeWidth="4" />
            <circle
              cx="22"
              cy="22"
              r={R}
              fill="none"
              stroke={GOLD}
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={C}
              strokeDashoffset={C * (1 - fraction)}
              style={{ transition: "stroke-dashoffset 0.2s linear" }}
            />
          </svg>
          <span
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "0.85rem",
              fontWeight: 700,
              color: DEEP_TEAL,
            }}
          >
            {secondsLeft}
          </span>
        </div>

        {/* Text */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: "0.82rem", fontWeight: 700, color: DEEP_TEAL, lineHeight: 1.3 }}>
            Order Status changed, updating the customer
          </p>
          <p
            style={{
              margin: "0.2rem 0 0 0",
              fontSize: "0.72rem",
              color: "#64748B",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            <span style={{ fontFamily: "monospace", color: "#0E5C5B", fontWeight: 600 }}>{latest.orderNo}</span>
            {latest.customerName ? ` · ${latest.customerName}` : ""} → {latest.statusLabel}
          </p>
        </div>

        {/* Undo */}
        <button
          onClick={() => undo(latest.uid)}
          style={{
            flexShrink: 0,
            background: "transparent",
            border: "1px solid #E4EEEC",
            color: "#64748B",
            borderRadius: "8px",
            padding: "0.3rem 0.6rem",
            fontSize: "0.72rem",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Ångra
        </button>
      </div>

      {queuedBehind > 0 && (
        <p style={{ margin: "0.6rem 0 0 0", fontSize: "0.68rem", color: "#94A3B8", textAlign: "right" }}>
          +{queuedBehind} till i kö
        </p>
      )}
    </div>
  );
}
