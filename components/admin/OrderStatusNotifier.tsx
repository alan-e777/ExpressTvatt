"use client";

import { useEffect, useRef, useState } from "react";
import { onStatusEmailQueued, type QueuedEmail } from "@/lib/order-email-bus";

/**
 * Floating admin banner shown after an order's status changes.
 *
 * Flow: the Orders table calls `queueStatusEmail(...)`; this listens, shows a
 * 10-second countdown, then POSTs to /api/admin/orders/notify-status which sends
 * the email and SMS.
 *
 * "Ångra" **reverts the status**, it does not merely cancel the notification.
 * The status is written to Firestore the moment the admin picks it — only the
 * message is deferred — so cancelling the message alone would leave the order at
 * a status the admin had just said they did not want, which is the opposite of
 * what an undo button promises. The orders table picks the revert up through its
 * own onSnapshot listener.
 *
 * Multiple changes can be in-flight at once (each with its own timer). The banner
 * only renders the most recently queued one; when it resolves, the previous
 * still-pending one re-appears as long as its 10s window hasn't elapsed.
 * Re-changing the same order within the window supersedes the earlier email, and
 * undo then rewinds to where the order stood before the whole burst — not to the
 * intermediate status a superseded change left behind.
 */
const DELAY_MS = 10_000;
const DEEP_TEAL = "#063F41";
const GOLD = "#D4AF37";

type Pending = QueuedEmail & { uid: string; sendAt: number };

/**
 * What "Ångra" acts on. A bulk status change shares one `batchId` across every
 * order it touched; a single change is a batch of one, keyed by its own uid.
 */
const batchKey = (p: Pending) => p.batchId ?? p.uid;

export default function OrderStatusNotifier() {
  const [pending, setPending] = useState<Pending[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const [undoing, setUndoing] = useState<string | null>(null);
  const [undoError, setUndoError] = useState<string | null>(null);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  // Where each order stood before its current burst of changes began. Keyed by
  // order id and held until that order has nothing pending, so two changes
  // inside one window still rewind to the original status rather than to the
  // intermediate one.
  const originalStatus = useRef<Map<string, string>>(new Map());

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
      // The window has closed — there is nothing left to undo.
      originalStatus.current.delete(p.orderId);
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
      // First change in this burst decides where undo rewinds to; later ones
      // inside the same window keep pointing at that same original status.
      if (!originalStatus.current.has(payload.orderId)) {
        originalStatus.current.set(payload.orderId, payload.previousStatus);
      }
      const item: Pending = {
        ...payload,
        previousStatus: originalStatus.current.get(payload.orderId)!,
        uid,
        sendAt: Date.now() + DELAY_MS,
      };

      // `now` only advances while something is pending, so it is stale by however
      // long the page sat idle before this change. Without this the ring renders
      // a nonsense figure for the first 200ms, until the interval corrects it.
      setNow(Date.now());

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

  /**
   * Put every order in this batch back to the status it held before the change,
   * and drop their queued notifications. A bulk change marked ten orders, so
   * undoing it has to rewind all ten — not whichever one the banner happens to
   * be showing.
   *
   * Timers are cleared *before* the requests go out: reverting is a network
   * round-trip, and a click at 9.9s would otherwise race the countdown and
   * notify customers about changes that are being undone.
   */
  async function undoBatch(key: string) {
    const items = pending.filter(x => batchKey(x) === key);
    if (items.length === 0) return;

    items.forEach(x => clearTimer(x.uid));
    setUndoing(key);
    setUndoError(null);

    const results = await Promise.all(
      items.map(async item => {
        try {
          const res = await fetch(`/api/admin/orders/${item.orderId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: item.previousStatus }),
          });
          if (!res.ok) throw new Error("revert failed");
          return { item, ok: true };
        } catch {
          return { item, ok: false };
        }
      }),
    );

    // Reverted orders leave the queue; the rest are handled below. Partial
    // failure is reported rather than smoothed over — some of the selection is
    // back where it was and some is not, and the admin has to know which.
    const reverted = results.filter(r => r.ok).map(r => r.item);
    const failed = results.filter(r => !r.ok).map(r => r.item);

    reverted.forEach(i => originalStatus.current.delete(i.orderId));
    const revertedUids = new Set(reverted.map(i => i.uid));
    setPending(prev => prev.filter(x => !revertedUids.has(x.uid)));

    if (failed.length > 0) {
      // These orders really are still at the new status, so their customers
      // should still be told — re-arm for whatever is left of the window rather
      // than silently swallowing the notification too.
      failed.forEach(item => {
        const msLeft = Math.max(0, item.sendAt - Date.now());
        timers.current.set(item.uid, setTimeout(() => send.current(item), msLeft));
      });
      setUndoError(
        failed.length === 1
          ? "Kunde inte återställa 1 order. Försök igen."
          : `Kunde inte återställa ${failed.length} ordrar. Försök igen.`,
      );
    }

    setUndoing(null);
  }

  if (pending.length === 0) return null;

  // Show the most recently queued batch — every order of a bulk change at once,
  // since that is the unit "Ångra" acts on.
  const latest = pending.reduce((a, b) => (b.sendAt > a.sendAt ? b : a));
  const key = batchKey(latest);
  const batch = pending.filter(x => batchKey(x) === key);
  const msLeft = Math.max(0, latest.sendAt - now);
  const secondsLeft = Math.ceil(msLeft / 1000);
  const fraction = Math.max(0, Math.min(1, msLeft / DELAY_MS));
  const queuedBehind = pending.length - batch.length;
  const isUndoing = undoing === key;

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
            Statusen ändrad — kunden meddelas
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
            {batch.length === 1 ? (
              <>
                <span style={{ fontFamily: "monospace", color: "#0E5C5B", fontWeight: 600 }}>{latest.orderNo}</span>
                {latest.customerName ? ` · ${latest.customerName}` : ""} → {latest.statusLabel}
              </>
            ) : (
              <>
                <span style={{ color: "#0E5C5B", fontWeight: 600 }}>{batch.length} ordrar</span>
                {" → "}{latest.statusLabel}
              </>
            )}
          </p>
        </div>

        {/* Undo — reverts the status, not just the message */}
        <button
          onClick={() => undoBatch(key)}
          disabled={isUndoing}
          title={
            batch.length === 1
              ? `Återställ till "${latest.previousStatus}" och avbryt meddelandet`
              : `Återställ alla ${batch.length} ordrar och avbryt meddelandena`
          }
          style={{
            flexShrink: 0,
            background: "transparent",
            border: "1px solid #E4EEEC",
            color: "#64748B",
            borderRadius: "8px",
            padding: "0.3rem 0.6rem",
            fontSize: "0.72rem",
            fontWeight: 600,
            cursor: isUndoing ? "default" : "pointer",
            opacity: isUndoing ? 0.5 : 1,
          }}
        >
          {isUndoing ? "Ångrar…" : "Ångra"}
        </button>
      </div>

      {undoError && (
        <p style={{ margin: "0.6rem 0 0 0", fontSize: "0.72rem", color: "#B91C1C", lineHeight: 1.4 }}>
          {undoError}
        </p>
      )}

      {queuedBehind > 0 && (
        <p style={{ margin: "0.6rem 0 0 0", fontSize: "0.68rem", color: "#94A3B8", textAlign: "right" }}>
          +{queuedBehind} till i kö
        </p>
      )}
    </div>
  );
}
