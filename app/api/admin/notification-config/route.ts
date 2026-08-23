import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";

/**
 * What this deployment will actually put in the From/Reply-To headers, and
 * whether the two notification providers are configured at all.
 *
 * Exists because environment variables are write-only in most hosting UIs:
 * Vercel hides a value once saved, so "is production still on the sandbox
 * sender?" is otherwise unanswerable without placing an order and reading the
 * result off it. This answers it directly, from inside the running deployment.
 *
 * Returns addresses and presence flags only — never a key, not even truncated.
 */
export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Session expired — please sign in again." }, { status: 403 });
  }

  const from = (process.env.RESEND_FROM ?? "").trim();
  const replyTo = (process.env.RESEND_REPLY_TO ?? "").trim();

  return NextResponse.json({
    email: {
      // Empty means the code falls back to its built-in sandbox default, which
      // behaves identically to setting it — so report that, not "unset".
      from: from || "Express Tvätt <onboarding@resend.dev>  (fallback — RESEND_FROM is unset)",
      replyTo: replyTo || null,
      configured: !!process.env.RESEND_API_KEY,
      // Resend's shared sender refuses every recipient except the account
      // owner, so this is the single most useful thing on the page.
      sandbox: /resend\.dev/i.test(from || "onboarding@resend.dev"),
    },
    sms: {
      from: (process.env.ELKS_FROM ?? "").trim() || "Express  (fallback — ELKS_FROM is unset)",
      configured: !!(process.env.ELKS_API_USERNAME && process.env.ELKS_API_PASSWORD),
    },
  });
}
