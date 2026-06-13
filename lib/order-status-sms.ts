import { statusCopy, statusLabel } from "@/lib/order-status-email";

/**
 * Customer-facing SMS sent when an order's status changes — the text-message
 * sibling of the status email (see lib/order-status-email.ts). Both are fired
 * together from app/api/admin/orders/notify-status after the admin 10s window.
 *
 * Delivery goes through 46elks (https://46elks.se). As with the email, every
 * knob is an env var so the only thing the operator has to do is paste their
 * credentials into `.env.local`:
 *
 *   ELKS_API_USERNAME=u1a2b3c4d5e6f...      # "API username" from the 46elks dashboard
 *   ELKS_API_PASSWORD=ABCDEF0123456789...   # "API password" from the 46elks dashboard
 *   ELKS_FROM=Express                       # optional sender id (alphanumeric, max 11 chars)
 *
 * Missing credentials → SMS is silently skipped, admin flow unaffected.
 */

const ELKS_SMS_ENDPOINT = "https://api.46elks.com/a1/sms";

/**
 * Normalises a stored Swedish phone number to E.164 (+46…), which 46elks
 * requires for the `to` field. Returns null if it doesn't look like a number we
 * can dial. Examples: "070-123 45 67" → "+46701234567", "0046701234567" →
 * "+46701234567", "+46701234567" → unchanged.
 */
export function toE164(raw: string | null | undefined): string | null {
  if (!raw) return null;
  // Keep a leading +, drop everything else that isn't a digit.
  const hasPlus = raw.trim().startsWith("+");
  let digits = raw.replace(/[^\d]/g, "");
  if (!digits) return null;

  if (hasPlus) {
    // Already international, just re-prefix.
    return `+${digits}`;
  }
  if (digits.startsWith("00")) {
    // 00-prefixed international.
    return `+${digits.slice(2)}`;
  }
  if (digits.startsWith("46")) {
    // Country code without +.
    return `+${digits}`;
  }
  if (digits.startsWith("0")) {
    // Swedish national format, e.g. 070… → +4670…
    return `+46${digits.slice(1)}`;
  }
  // Bare subscriber number — assume Sweden.
  return `+46${digits}`;
}

/** Builds the (short, professional, Swedish) SMS body for a status change. */
export function buildStatusSmsText(opts: {
  name: string;
  orderNo: string;
  status: string;
}): string {
  const { label, line } = statusCopy(opts.status);
  const firstName = opts.name?.trim() ? opts.name.trim().split(" ")[0] : "";
  const hello = firstName ? `Hej ${firstName}! ` : "Hej! ";
  return `${hello}Din order ${opts.orderNo} har ny status: ${label}. ${line}\n\n– Express Tvätt`;
}

export type SendStatusSmsResult =
  | { ok: true; skipped?: never }
  | { ok: true; skipped: string }
  | { ok: false; error: string };

/**
 * Sends the status-change SMS via 46elks. Mirrors sendStatusEmail: resolves to
 * `{ ok: true, skipped }` when there's nothing to send (no recipient, or 46elks
 * not configured) so a missing key never breaks the admin flow.
 */
export async function sendStatusSms(opts: {
  to: string | null | undefined;
  name: string;
  orderNo: string;
  status: string;
}): Promise<SendStatusSmsResult> {
  const username = process.env.ELKS_API_USERNAME;
  const password = process.env.ELKS_API_PASSWORD;
  const from = process.env.ELKS_FROM || "Express";

  if (!username || !password) {
    console.warn("[order-status-sms] ELKS_API_USERNAME/PASSWORD not set — skipping SMS.");
    return { ok: true, skipped: "no_api_key" };
  }

  const to = toE164(opts.to);
  if (!to) {
    return { ok: true, skipped: "no_recipient" };
  }

  const message = buildStatusSmsText({ name: opts.name, orderNo: opts.orderNo, status: opts.status });
  const auth = Buffer.from(`${username}:${password}`).toString("base64");

  try {
    const res = await fetch(ELKS_SMS_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ from, to, message }).toString(),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error("[order-status-sms] 46elks error:", res.status, detail);
      return { ok: false, error: `46elks send failed (${res.status})` };
    }
    return { ok: true };
  } catch (err) {
    console.error("[order-status-sms] Unexpected error:", err);
    return { ok: false, error: "Unexpected error sending SMS" };
  }
}

// Re-export so callers can label SMS results without a second import.
export { statusLabel };
