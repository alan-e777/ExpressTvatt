import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase-admin";
import { getAdminSession } from "@/lib/admin-auth";
import { canManageAdmins, ASSIGNABLE_ROLES, type AdminRole } from "@/lib/admin-roles";

/**
 * Changes another admin's role.
 *
 * Only `developer` and `huvudadmin` may call this, and neither may change their
 * own role. That single rule is what makes lockout impossible: a huvudadmin
 * cannot demote themselves to `admin` and lose the ability to promote themselves
 * back, and the bootstrap account has no stored role to change at all.
 */
export async function POST(request: NextRequest) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canManageAdmins(session.role)) {
    return NextResponse.json({ error: "Bara huvudadmin kan ändra roller." }, { status: 403 });
  }

  let uid: string | undefined;
  let role: string | undefined;
  try {
    ({ uid, role } = await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (!uid) return NextResponse.json({ error: "Missing uid" }, { status: 400 });

  if (!ASSIGNABLE_ROLES.includes(role as AdminRole)) {
    return NextResponse.json({ error: "Okänd roll." }, { status: 400 });
  }

  // The bootstrap admin's role lives in code, not in Firestore.
  if (uid === process.env.ADMIN_UID) {
    return NextResponse.json({ error: "Huvudkontots roll kan inte ändras." }, { status: 400 });
  }
  if (uid === session.uid) {
    return NextResponse.json(
      { error: "Du kan inte ändra din egen roll." },
      { status: 400 },
    );
  }

  const ref = db.collection("admins").doc(uid);
  if (!(await ref.get()).exists) {
    return NextResponse.json({ error: "Administratören hittades inte." }, { status: 404 });
  }

  try {
    await ref.update({ role });
  } catch (err) {
    console.error("[admins role]", err);
    return NextResponse.json({ error: "Kunde inte spara rollen." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, role });
}
