import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/firebase-admin";
import { buildRows, toCsv, type ExportCustomer, type ExportOrder } from "@/lib/customer-export";
import { guestOptOutKey, guestUnsubscribeUrl, unsubscribeUrl } from "@/lib/unsubscribe";

/**
 * Every customer the shop has, as one CSV row each, for the client's own
 * mailing list.
 *
 * The "Vill ha reklam" column is the whole point — the file holds everyone and
 * the client filters it down themselves. It is J only where someone actually
 * ticked a box: at signup, in Profil → Utskick, or at guest checkout. Every
 * account and guest predating those boxes reads N, because consent that was
 * never asked for is not consent.
 *
 * All the shaping lives in `lib/customer-export.ts`, which is pure and
 * testable. This route only reads Firestore and sets the headers.
 *
 * Admin only, and never cached: it is the shop's entire customer list.
 */
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [customerSnap, orderSnap, optOutSnap] = await Promise.all([
    db.collection("customers").get(),
    db.collection("orders").get(),
    // Guests who clicked an unsubscribe link. They have no document to flip,
    // so the opt-out is its own record and overrides what their order said.
    db.collection("marketing_optouts").get().catch(() => null),
  ]);

  const optedOutKeys = new Set((optOutSnap?.docs ?? []).map(d => d.id));

  const customers: ExportCustomer[] = customerSnap.docs.map(d => {
    const data = d.data();
    return {
      uid: d.id,
      name: data.name ?? "",
      email: data.email ?? "",
      phone: data.phone ?? "",
      addresses: Array.isArray(data.addresses) ? data.addresses : [],
      createdAt: data.createdAt?.toDate?.()?.toISOString() ?? null,
      newsletterConsent: data.newsletterConsent,
      newsletterConsentAt: data.newsletterConsentAt ?? null,
      newsletterChannels: data.newsletterChannels,
    };
  });

  const orders: ExportOrder[] = orderSnap.docs.map(d => {
    const data = d.data();
    return {
      customerId: data.customerId ?? "",
      customerName: data.customerName ?? "",
      customerEmail: (data.customerEmail ?? "").trim(),
      customerPhone: (data.customerPhone ?? "").trim(),
      serviceName: data.serviceName ?? "",
      amount: Number(data.amount) || 0,
      status: data.status ?? "",
      address: data.address ?? "",
      postalCode: data.postalCode ?? "",
      createdAt: data.createdAt?.toDate?.()?.toISOString() ?? null,
      items: Array.isArray(data.items) ? data.items : [],
      // Present only on guest orders — a signed-in buyer's answer is on their
      // customer document, and checkout must not overwrite it.
      newsletterConsent: data.newsletterConsent,
      newsletterConsentAt: data.newsletterConsentAt ?? null,
      newsletterChannels: data.newsletterChannels,
    };
  });

  // Taken from the request so the links work on whatever host the admin is
  // actually on — production, a preview deployment or localhost — instead of
  // needing yet another env var to state the site's own address.
  const origin = new URL(req.url).origin;

  const stamp = new Date().toISOString().slice(0, 10);
  const csv = toCsv(buildRows(
    customers,
    orders,
    uid => unsubscribeUrl(uid, origin),
    email => guestUnsubscribeUrl(email, origin),
    email => optedOutKeys.has(guestOptOutKey(email)),
  ));

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="expresstvatt-kunder-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
