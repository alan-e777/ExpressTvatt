import { consentLabel } from "./newsletter";

/**
 * Turning the shop's customers and orders into the CSV the client mail-merges.
 *
 * Pure on purpose — no firebase-admin, no auth, no Response — so the rules that
 * actually matter (guest de-duplication, "absent means no", CSV escaping) can
 * be exercised directly instead of only through an admin-gated route nobody
 * can call from a test.
 *
 * One row **per customer**, never per order: the file feeds a mail merge, and
 * a customer with five orders appearing five times would be emailed five times.
 */

export type ExportCustomer = {
  uid: string;
  name?: string;
  email?: string;
  phone?: string;
  addresses?: Array<{ address?: string; postalCode?: string }>;
  createdAt?: string | null;
  newsletterConsent?: unknown;
  newsletterConsentAt?: string | null;
};

export type ExportOrder = {
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  serviceName: string;
  amount: number;
  status: string;
  address: string;
  postalCode: string;
  createdAt: string | null;
  items: Array<{ name?: string; title?: string }>;
};

export type Row = Record<string, string | number>;

export const HEADERS = [
  "Förnamn",
  "Efternamn",
  "E-post",
  "Telefon",
  "Adress",
  "Postnummer",
  "Vill ha reklam",
  "Samtycke datum",
  "Typ",
  "Antal ordrar",
  "Totalt spenderat (kr)",
  "Senaste order",
  "Köpt",
  "Avregistreringslänk",
  "Registrerad",
  "Kund-ID",
] as const;

/** Swedish Excel: semicolon-separated, and without a UTF-8 BOM åäö arrive as mojibake. */
const SEP = ";";
const BOM = "﻿";

function csvCell(value: string | number): string {
  const s = String(value ?? "");
  // Quote anything that could break the row, and double any embedded quote.
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(rows: Row[], headers: readonly string[] = HEADERS): string {
  const lines = [headers.join(SEP)];
  for (const row of rows) lines.push(headers.map(h => csvCell(row[h] ?? "")).join(SEP));
  // CRLF: what Excel expects, harmless everywhere else.
  return BOM + lines.join("\r\n") + "\r\n";
}

/** "Anna Ek Svensson" → first "Anna", last "Ek Svensson". */
export function splitName(full: string): { first: string; last: string } {
  const parts = (full ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first: "", last: "" };
  if (parts.length === 1) return { first: parts[0], last: "" };
  return { first: parts[0], last: parts.slice(1).join(" ") };
}

const kr = (ore: number) => Math.round(ore) / 100;
const newestFirst = (a: ExportOrder, b: ExportOrder) =>
  (b.createdAt ?? "").localeCompare(a.createdAt ?? "");

/** Distinct service and item names across a customer's orders. */
export function boughtSummary(orders: ExportOrder[]): string {
  const seen = new Set<string>();
  for (const o of orders) {
    if (o.serviceName) seen.add(o.serviceName);
    for (const it of o.items ?? []) {
      const n = (it?.name ?? it?.title ?? "").trim();
      if (n) seen.add(n);
    }
  }
  return [...seen].join(", ");
}

/**
 * `unsubscribeLink` is injected rather than imported so this module stays pure
 * — `lib/unsubscribe.ts` pulls in node:crypto and reads a secret, neither of
 * which belongs in something the tests run directly.
 */
export function buildRows(
  customers: ExportCustomer[],
  orders: ExportOrder[],
  unsubscribeLink: (uid: string) => string = () => "",
): Row[] {
  const byCustomer: Record<string, ExportOrder[]> = {};
  const guestOrders: ExportOrder[] = [];

  for (const order of orders) {
    // An order that never reached payment is not a customer relationship.
    if (order.status === "pending_payment") continue;
    if (order.customerId && order.customerId !== "anonymous") {
      (byCustomer[order.customerId] ??= []).push(order);
    } else if (order.customerEmail) {
      guestOrders.push(order);
    }
  }

  const rows: Row[] = [];
  const accountEmails = new Set<string>();

  // ── Account holders ──────────────────────────────────────────────────────
  for (const c of customers) {
    const cOrders = (byCustomer[c.uid] ?? []).sort(newestFirst);
    const { first, last } = splitName(c.name ?? "");
    const email = (c.email ?? "").trim();
    if (email) accountEmails.add(email.toLowerCase());

    // The saved address is the one the customer chose to keep; fall back to
    // wherever the most recent order was delivered.
    const saved = c.addresses?.[0];
    const latest = cOrders[0];

    rows.push({
      "Förnamn": first,
      "Efternamn": last,
      "E-post": email,
      // Orders carry the phone the customer typed at checkout, which is a
      // usable fallback when the profile has none.
      "Telefon": c.phone || latest?.customerPhone || "",
      "Adress": saved?.address ?? latest?.address ?? "",
      "Postnummer": saved?.postalCode ?? latest?.postalCode ?? "",
      "Vill ha reklam": consentLabel(c),
      "Samtycke datum": (c.newsletterConsentAt ?? "").slice(0, 10),
      "Typ": "Konto",
      "Antal ordrar": cOrders.length,
      "Totalt spenderat (kr)": kr(cOrders.reduce((s, o) => s + o.amount, 0)),
      "Senaste order": latest?.createdAt?.slice(0, 10) ?? "",
      "Köpt": boughtSummary(cOrders),
      // One-click opt-out for the mailing tool's merge field. Empty when no
      // UNSUBSCRIBE_SECRET is configured — an empty column is better than a
      // column of links that all fail, which would tell customers they had
      // unsubscribed when nothing was written.
      "Avregistreringslänk": unsubscribeLink(c.uid),
      "Registrerad": (c.createdAt ?? "").slice(0, 10),
      "Kund-ID": c.uid,
    });
  }

  // ── Guests — one row per distinct email, not per order ────────────────────
  const guestsByEmail: Record<string, ExportOrder[]> = {};
  for (const o of guestOrders) {
    const key = o.customerEmail.trim().toLowerCase();
    // Someone who later created an account is already above; their guest
    // orders would otherwise duplicate them in the mail merge.
    if (accountEmails.has(key)) continue;
    (guestsByEmail[key] ??= []).push(o);
  }

  for (const gOrders of Object.values(guestsByEmail)) {
    gOrders.sort(newestFirst);
    const latest = gOrders[0];
    const { first, last } = splitName(latest.customerName);

    rows.push({
      "Förnamn": first,
      "Efternamn": last,
      "E-post": latest.customerEmail.trim(),
      "Telefon": latest.customerPhone ?? "",
      "Adress": latest.address,
      "Postnummer": latest.postalCode,
      // A guest checkout never showed a consent box, so this is always N.
      "Vill ha reklam": "N",
      "Samtycke datum": "",
      "Typ": "Gäst",
      "Antal ordrar": gOrders.length,
      "Totalt spenderat (kr)": kr(gOrders.reduce((s, o) => s + o.amount, 0)),
      "Senaste order": latest.createdAt?.slice(0, 10) ?? "",
      "Köpt": boughtSummary(gOrders),
      // Guests have no account to switch a flag on, and are always N anyway.
      "Avregistreringslänk": "",
      "Registrerad": "",
      "Kund-ID": "",
    });
  }

  // Most recent customers first; those who never ordered fall to the bottom.
  rows.sort((a, b) => String(b["Senaste order"]).localeCompare(String(a["Senaste order"])));
  return rows;
}
