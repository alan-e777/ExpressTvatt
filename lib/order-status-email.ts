import { Resend } from "resend";

/**
 * Customer-facing email sent when an order's status changes.
 *
 * Everything is driven by env vars so the only thing the operator has to do is
 * paste their Resend API key (and optionally a verified `RESEND_FROM` sender)
 * into `.env.local`:
 *
 *   RESEND_API_KEY=re_xxx
 *   RESEND_FROM=Express Tvätt <noreply@dindoman.se>
 */

// ── Brand palette (matches the website / Express Tvätt) ──────────────────────
const COLORS = {
  deepTeal: "#063F41",
  textTeal: "#0E5C5B",
  tealAccent: "#6BB3AC",
  mint: "#B7DCD7",
  gold: "#D4AF37",
  cream: "#F5F0E8",
  card: "#FFFFFF",
  ink: "#0F172A",
  muted: "#64748B",
};

// Customer-facing Swedish label + a short reassuring sentence per status.
const STATUS_COPY: Record<string, { label: string; line: string }> = {
  order_received:   { label: "Beställning mottagen",   line: "Vi har tagit emot din beställning och återkommer med mer information." },
  paid:             { label: "Mottagen",                line: "Vi har tagit emot din beställning och förbereder upphämtning." },
  collected:        { label: "Upphämtad",               line: "Vi har hämtat dina plagg – nu tar vi hand om resten." },
  in_progress:      { label: "Behandlas",               line: "Dina plagg behandlas just nu av vårt team." },
  ready_for_pickup: { label: "Redo för leverans",       line: "Allt är klart och din order är på väg tillbaka till dig." },
  delivered:        { label: "Levererad",               line: "Din order har levererats. Vi hoppas att du är nöjd!" },
  completed:        { label: "Slutförd",                line: "Din order är slutförd. Tack för att du valde oss!" },
  cancelled:        { label: "Avbruten",                line: "Din order har avbrutits. Kontakta oss gärna om du har frågor." },
  payment_failed:   { label: "Betalning misslyckades",  line: "Betalningen för din order gick tyvärr inte igenom." },
  refunded:         { label: "Återbetald",              line: "Din order har återbetalats. Beloppet är på väg tillbaka." },
};

export function statusLabel(status: string): string {
  return STATUS_COPY[status]?.label ?? status;
}

/**
 * Customer-facing label + reassuring line for a status. Shared by the email and
 * the SMS sender so both channels say exactly the same thing.
 */
export function statusCopy(status: string): { label: string; line: string } {
  return STATUS_COPY[status] ?? { label: status, line: "Din order har uppdaterats." };
}

/** Order number shown to the customer, e.g. "#VZE3AEA". */
export function orderNumber(paymentIntentId: string): string {
  if (!paymentIntentId) return "—";
  return `#${paymentIntentId.slice(-7).toUpperCase()}`;
}

function esc(s: string): string {
  return String(s).replace(/[&<>"]/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string)
  );
}

export function buildStatusEmailHtml(opts: {
  name: string;
  orderNo: string;
  status: string;
}): string {
  const { name, orderNo, status } = opts;
  const copy = STATUS_COPY[status] ?? { label: status, line: "Din order har uppdaterats." };
  const greetingName = name?.trim() ? esc(name.trim().split(" ")[0]) : "där";

  return `<!DOCTYPE html>
<html lang="sv">
  <body style="margin:0;padding:0;background:${COLORS.cream};">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">Din order ${esc(orderNo)} har en ny status: ${esc(copy.label)}.</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLORS.cream};padding:32px 16px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:540px;background:${COLORS.card};border-radius:20px;overflow:hidden;box-shadow:0 12px 40px rgba(6,63,65,0.10);">
            <!-- Brand bar -->
            <tr>
              <td align="center" style="padding:26px 32px 8px 32px;">
                <span style="font-size:13px;font-weight:700;letter-spacing:0.22em;color:${COLORS.deepTeal};text-transform:uppercase;">Express&nbsp;Tvätt</span>
                <div style="width:34px;height:3px;background:${COLORS.gold};border-radius:99px;margin:12px auto 0 auto;"></div>
              </td>
            </tr>

            <!-- Greeting -->
            <tr>
              <td style="padding:18px 36px 0 36px;">
                <p style="margin:0;font-size:22px;font-weight:700;color:${COLORS.ink};">Hej ${greetingName}!</p>
                <p style="margin:8px 0 0 0;font-size:15px;line-height:1.6;color:${COLORS.muted};">Din order har fått en uppdaterad status.</p>
              </td>
            </tr>

            <!-- Order number + status card -->
            <tr>
              <td style="padding:24px 36px 8px 36px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLORS.cream};border:1px solid ${COLORS.mint};border-radius:16px;">
                  <tr>
                    <td align="center" style="padding:26px 24px;">
                      <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:0.16em;color:${COLORS.muted};text-transform:uppercase;">Ordernummer</p>
                      <p style="margin:8px 0 0 0;font-size:30px;font-weight:800;letter-spacing:0.04em;color:${COLORS.deepTeal};font-family:'SFMono-Regular',Menlo,Consolas,monospace;">${esc(orderNo)}</p>
                      <div style="margin:18px auto 0 auto;display:inline-block;background:${COLORS.deepTeal};color:#ffffff;font-size:14px;font-weight:700;letter-spacing:0.02em;padding:10px 22px;border-radius:99px;">${esc(copy.label)}</div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Body line -->
            <tr>
              <td style="padding:14px 36px 4px 36px;">
                <p style="margin:0;font-size:15px;line-height:1.7;color:${COLORS.textTeal};">${esc(copy.line)}</p>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="padding:26px 36px 30px 36px;">
                <div style="border-top:1px solid #ECE6DA;padding-top:18px;">
                  <p style="margin:0;font-size:13px;line-height:1.6;color:${COLORS.muted};">
                    Tack för att du valde <strong style="color:${COLORS.deepTeal};">Express Tvätt</strong>.<br/>
                    Kemtvätt. Upphämtning. Hemleverans.
                  </p>
                </div>
              </td>
            </tr>
          </table>

          <p style="margin:18px 0 0 0;font-size:11px;color:${COLORS.muted};">Det här är ett automatiskt meddelande – du behöver inte svara.</p>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export type SendStatusEmailResult =
  | { ok: true; skipped?: never }
  | { ok: true; skipped: string }
  | { ok: false; error: string };

/**
 * Sends the status-change email. Resolves to `{ ok: true, skipped }` when there
 * is nothing to send (no recipient, or Resend not configured) so a missing key
 * never breaks the admin flow — it just no-ops with a logged reason.
 */
export async function sendStatusEmail(opts: {
  to: string | null | undefined;
  name: string;
  orderNo: string;
  status: string;
}): Promise<SendStatusEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM || "Express Tvätt <onboarding@resend.dev>";

  if (!apiKey) {
    console.warn("[order-status-email] RESEND_API_KEY not set — skipping email.");
    return { ok: true, skipped: "no_api_key" };
  }
  if (!opts.to || !opts.to.includes("@")) {
    return { ok: true, skipped: "no_recipient" };
  }

  const resend = new Resend(apiKey);
  try {
    const { error } = await resend.emails.send({
      from,
      to: opts.to,
      subject: `Din order ${opts.orderNo} – ${statusLabel(opts.status)}`,
      html: buildStatusEmailHtml({ name: opts.name, orderNo: opts.orderNo, status: opts.status }),
    });
    if (error) {
      console.error("[order-status-email] Resend error:", error);
      return { ok: false, error: error.message ?? "Resend send failed" };
    }
    return { ok: true };
  } catch (err) {
    console.error("[order-status-email] Unexpected error:", err);
    return { ok: false, error: "Unexpected error sending email" };
  }
}
