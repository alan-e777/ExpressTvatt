import { cookies } from "next/headers";
import { auth } from "@/lib/firebase-admin";

/**
 * Verifies the admin session cookie using Firebase's session cookie API.
 * Session cookies last 14 days and survive server restarts — unlike raw ID
 * tokens which expire after 1 hour.
 */
export async function isAdmin(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin-session")?.value;
  if (!token) return false;
  try {
    const decoded = await auth.verifySessionCookie(token, true);
    return decoded.uid === process.env.ADMIN_UID;
  } catch {
    return false;
  }
}
