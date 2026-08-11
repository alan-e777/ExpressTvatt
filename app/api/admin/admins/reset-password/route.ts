import { NextRequest, NextResponse } from "next/server";
import { auth, db } from "@/lib/firebase-admin";
import { getAdminSession } from "@/lib/admin-auth";
import { generateTempPassword } from "@/lib/temp-password";

/**
 * Issues a fresh temporary password for an existing admin.
 *
 * The password from the add-admin flow is shown exactly once and never stored,
 * so if it is lost or never written down there is otherwise no way back into
 * that account from the dashboard. The new password is equally one-shot and
 * must be changed at next sign-in.
 */

export async function POST(request: NextRequest) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let uid: string | undefined;
  try {
    ({ uid } = await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (!uid) return NextResponse.json({ error: "Missing uid" }, { status: 400 });

  // The bootstrap admin is deliberately out of reach here: it is the account
  // that guarantees the owner can never be locked out, so it must not be
  // resettable from a session that might not be theirs. Use Firebase's own
  // password reset for that one.
  if (uid === process.env.ADMIN_UID) {
    return NextResponse.json(
      { error: "Huvudadministratörens lösenord kan inte återställas härifrån." },
      { status: 400 },
    );
  }

  const ref = db.collection("admins").doc(uid);
  if (!(await ref.get()).exists) {
    return NextResponse.json({ error: "Administratören hittades inte." }, { status: 404 });
  }

  const tempPassword = generateTempPassword();

  try {
    await auth.updateUser(uid, { password: tempPassword });
    // Force them through the change-password gate on next sign-in.
    await ref.update({ mustChangePassword: true });
    // Existing sessions must not survive a password reset.
    await auth.revokeRefreshTokens(uid);
  } catch (err) {
    console.error("[admins reset-password]", err);
    return NextResponse.json({ error: "Kunde inte återställa lösenordet." }, { status: 500 });
  }

  return NextResponse.json({ tempPassword });
}
