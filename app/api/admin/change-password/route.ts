import { NextRequest, NextResponse } from "next/server";
import { auth, db } from "@/lib/firebase-admin";
import { isAdminUid } from "@/lib/admin-auth";
import { cookies } from "next/headers";

const SESSION_DURATION_MS = 60 * 60 * 24 * 14 * 1000; // 14 days
const SESSION_DURATION_S = 60 * 60 * 24 * 14;

/**
 * Called after an admin has set a new password client-side and re-authenticated
 * with it. We (1) clear the `mustChangePassword` flag so the dashboard gate lets
 * them in, and (2) mint a fresh session cookie from the post-change ID token —
 * the login-time cookie is invalidated by the password change, so it must be
 * replaced or the admin would be bounced back to the login screen.
 */
export async function POST(request: NextRequest) {
  let idToken: string | undefined;
  try {
    ({ idToken } = await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (!idToken) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  try {
    const decoded = await auth.verifyIdToken(idToken, true);
    if (!(await isAdminUid(decoded.uid))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const ref = db.collection("admins").doc(decoded.uid);
    if ((await ref.get()).exists) {
      await ref.update({ mustChangePassword: false });
    }

    const sessionCookie = await auth.createSessionCookie(idToken, {
      expiresIn: SESSION_DURATION_MS,
    });
    const cookieStore = await cookies();
    cookieStore.set("admin-session", sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: SESSION_DURATION_S,
      path: "/",
      sameSite: "lax",
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }
}
