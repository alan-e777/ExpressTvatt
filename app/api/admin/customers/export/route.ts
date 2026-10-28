import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/firebase-admin";
import { buildRows, toCsv, type ExportCustomer, type ExportOrder } from "@/lib/customer-export";
import { unsubscribeUrl } from "@/lib/unsubscribe";

/**
 * Every customer the shop has, as one CSV row each, for the client's own
 * mailing list.
 *
 * The "Vill ha reklam" column is the whole point — the file holds everyone and
 * the client filters it down themselves. It is J only for an account that
 * ticked the box at signup; guests, and every account created before the box
 * existed, read N, because consent that was never asked for is not consent.
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

  const [customerSnap, orderSnap] = await Promise.all([
    db.collection("customers").get(),
    db.collection("orders").get(),
  ]);

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
    };
  });

  // Taken from the request so the links work on whatever host the admin is
  // actually on — production, a preview deployment or localhost — instead of
  // needing yet another env var to state the site's own address.
  const origin = new URL(req.url).origin;

  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(toCsv(buildRows(customers, orders, uid => unsubscribeUrl(uid, origin))), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="expresstvatt-kunder-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
