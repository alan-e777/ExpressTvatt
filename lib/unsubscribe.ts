import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * One-click unsubscribe links for the client's marketing emails.
 *
 * **Why not just link to /profil.** Someone clicking "avregistrera" in an email
 * is not signed in. Making them log in first is more work than ticking the box
 * was, and GDPR art. 7(3) requires withdrawal to be *as easy as* giving
 * consent. So the link carries its own proof and needs no session.
 *
 * **Why an HMAC and not a stored token.** The uid alone would let anyone
 * unsubscribe anyone by editing the URL. A random token per customer stored in
 * Firestore would work too, but every account predating it would need a
 * backfill and the links could not be generated for a customer who has not
 * been migrated. An HMAC of the uid needs no storage and no backfill: the link
 * for any customer, old or new, can be derived on demand.
 *
 * **No expiry, on purpose.** People unsubscribe from six-month-old emails.
 * A link that has stopped working is a customer who cannot withdraw consent.
 *
 * Server-only — it imports node:crypto and reads the secret. Never import this
 * into a client component.
 */

const SECRET = process.env.UNSUBSCRIBE_SECRET ?? "";

/** 24 hex chars ≈ 96 bits: far beyond guessing, short enough for a tidy URL. */
const TOKEN_LENGTH = 24;

export function unsubscribeConfigured(): boolean {
  return SECRET.length > 0;
}

export function unsubscribeToken(uid: string): string {
  if (!SECRET) return "";
  return createHmac("sha256", SECRET).update(`unsubscribe:${uid}`).digest("hex").slice(0, TOKEN_LENGTH);
}

/** Constant-time compare, so the token cannot be recovered a character at a time. */
export function verifyUnsubscribeToken(uid: string, token: string): boolean {
  if (!SECRET || !uid || !token) return false;
  const expected = unsubscribeToken(uid);
  if (expected.length !== token.length) return false;
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(token));
  } catch {
    return false;
  }
}

/**
 * The URL that goes in the mailing tool, one per customer.
 *
 * Returns "" when no secret is configured, so the export ships an empty column
 * rather than a column of links that all fail — a broken unsubscribe link is
 * worse than none, because the customer believes they have opted out.
 */
export function unsubscribeUrl(uid: string, origin: string): string {
  const token = unsubscribeToken(uid);
  if (!token) return "";
  return `${origin.replace(/\/$/, "")}/avregistrera?u=${encodeURIComponent(uid)}&t=${token}`;
}
