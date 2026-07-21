import { cookies } from "next/headers";
import { auth, db } from "@/lib/firebase-admin";

export type AdminSession = { uid: string; email: string | null };

/**
 * Multi-admin registry.
 *
 * Admins are stored in the Firestore `admins/{uid}` collection (created via the
 * server-side Admin SDK, so no client-facing security rules are involved). The
 * UID in `ADMIN_UID` is treated as the bootstrap / root admin so the owner can
 * never be locked out and can seed the first additional admins — new admins are
 * NOT hardcoded, they live in the database and are added from the dashboard.
 */

/** True if this UID is the bootstrap admin or has an `admins/{uid}` document. */
export async function isAdminUid(uid: string): Promise<boolean> {
  if (uid === process.env.ADMIN_UID) return true;
  const doc = await db.collection("admins").doc(uid).get();
  return doc.exists;
}

/**
 * Verifies the admin session cookie using Firebase's session cookie API and
 * returns the admin's identity, or `null` if the caller is not a valid admin.
 * Session cookies last 14 days and survive server restarts — unlike raw ID
 * tokens which expire after 1 hour.
 */
export async function getAdminSession(): Promise<AdminSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin-session")?.value;
  if (!token) return null;
  try {
    const decoded = await auth.verifySessionCookie(token, true);
    if (!(await isAdminUid(decoded.uid))) return null;
    return { uid: decoded.uid, email: decoded.email ?? null };
  } catch {
    return null;
  }
}

/** Convenience boolean wrapper around {@link getAdminSession}. */
export async function isAdmin(): Promise<boolean> {
  return (await getAdminSession()) !== null;
}

/**
 * Whether the given admin must change their (temporary) password before they
 * can use the dashboard. The bootstrap admin never has an `admins` doc, so this
 * only ever gates admins that were created from the "Add Admin" flow.
 */
export async function mustChangePassword(uid: string): Promise<boolean> {
  const doc = await db.collection("admins").doc(uid).get();
  return doc.exists && doc.data()?.mustChangePassword === true;
}
