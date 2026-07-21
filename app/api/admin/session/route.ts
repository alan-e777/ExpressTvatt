import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/firebase-admin";
import { isAdminUid } from "@/lib/admin-auth";
import { cookies } from "next/headers";

const SESSION_DURATION_MS = 60 * 60 * 24 * 14 * 1000; // 14 days
const SESSION_DURATION_S  = 60 * 60 * 24 * 14;

export async function POST(request: NextRequest) {
  const { idToken } = await request.json();

  try {
    // Verify the ID token and check the user is a registered admin (bootstrap
    // ADMIN_UID or an entry in the Firestore `admins` collection).
    const decoded = await auth.verifyIdToken(idToken);
    if (!(await isAdminUid(decoded.uid))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Exchange the short-lived ID token for a long-lived session cookie (14 days)
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
  } catch (e) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete("admin-session");
  return NextResponse.json({ ok: true });
}
