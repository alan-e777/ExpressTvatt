import { db, auth } from "@/lib/firebase-admin";

export type CustomerContact = {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
};

/**
 * Resolves the contact details to stamp on an order.
 *
 * Some clients — notably the Expo app, which posts only `serviceId` and
 * `customerId` — never send name/email/phone. An order without an email cannot
 * trigger a confirmation or any status update, and for a logged-out buyer there
 * is no way to reach them at all. Rather than change those clients, the server
 * fills the gap from the customer's stored profile.
 *
 * Anything the client did send always wins; this only fills blanks.
 */
export async function resolveCustomerContact(
  customerId: string | undefined | null,
  provided: Partial<CustomerContact> = {},
): Promise<CustomerContact> {
  const contact: CustomerContact = {
    customerName:  (provided.customerName  ?? "").trim(),
    customerEmail: (provided.customerEmail ?? "").trim(),
    customerPhone: (provided.customerPhone ?? "").trim(),
  };

  if (!customerId || customerId === "anonymous") return contact;
  if (contact.customerName && contact.customerEmail && contact.customerPhone) return contact;

  try {
    const snap = await db.collection("customers").doc(customerId).get();
    const data = snap.exists ? snap.data()! : {};

    if (!contact.customerName)  contact.customerName  = (data.name  as string) ?? "";
    if (!contact.customerEmail) contact.customerEmail = (data.email as string) ?? "";
    if (!contact.customerPhone) contact.customerPhone = (data.phone as string) ?? "";

    // The Firestore profile can predate a change of email in Firebase Auth, and
    // for older accounts may have no email at all — fall back to the auth record.
    if (!contact.customerEmail || !contact.customerName) {
      const user = await auth.getUser(customerId).catch(() => null);
      if (user) {
        if (!contact.customerEmail) contact.customerEmail = user.email ?? "";
        if (!contact.customerName)  contact.customerName  = user.displayName ?? "";
      }
    }
  } catch (err) {
    // Never block a payment over this — the order is still better than nothing.
    console.error("[customer-contact] lookup failed for", customerId, err);
  }

  return contact;
}
