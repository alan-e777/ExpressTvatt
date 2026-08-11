import { NextRequest, NextResponse } from "next/server";
import { auth, db } from "@/lib/firebase-admin";
import admin from "@/lib/firebase-admin";
import { getAdminSession } from "@/lib/admin-auth";
import { generateTempPassword } from "@/lib/temp-password";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type AdminRow = {
  uid: string;
  email: string;
  createdAt: number | null;
  mustChangePassword: boolean;
  isRoot: boolean;
  isSelf: boolean;
};

// ── List admins ──────────────────────────────────────────────────────────────
export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rootUid = process.env.ADMIN_UID ?? null;
  const snap = await db.collection("admins").get();

  const rows: AdminRow[] = snap.docs.map((d) => {
    const data = d.data();
    const createdAt = data.createdAt?.toMillis?.() ?? null;
    return {
      uid: d.id,
      email: data.email ?? "",
      createdAt,
      mustChangePassword: data.mustChangePassword === true,
      isRoot: d.id === rootUid,
      isSelf: d.id === session.uid,
    };
  });

  // Surface the bootstrap root admin even though it has no `admins` document.
  if (rootUid && !rows.some((r) => r.uid === rootUid)) {
    let email = "";
    try {
      email = (await auth.getUser(rootUid)).email ?? "";
    } catch {
      /* ignore — root user may be managed outside this project */
    }
    rows.unshift({
      uid: rootUid,
      email,
      createdAt: null,
      mustChangePassword: false,
      isRoot: true,
      isSelf: rootUid === session.uid,
    });
  }

  rows.sort((a, b) => (b.createdAt ?? Infinity) - (a.createdAt ?? Infinity));
  return NextResponse.json({ admins: rows });
}

// ── Add a new admin ──────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { email?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const email = (body.email ?? "").trim().toLowerCase();
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Ange en giltig e-postadress." }, { status: 400 });
  }

  // An existing account is not a conflict — it is the normal case. Almost
  // everyone being made an admin already has a customer login, so treat this as
  // promoting that account rather than refusing it. Their existing password
  // keeps working, so no temporary password is issued.
  let existing: Awaited<ReturnType<typeof auth.getUserByEmail>> | null = null;
  try {
    existing = await auth.getUserByEmail(email);
  } catch (e: any) {
    if (e?.code !== "auth/user-not-found") {
      return NextResponse.json({ error: "Kunde inte kontrollera e-postadressen." }, { status: 500 });
    }
  }

  if (existing) {
    if (existing.uid === process.env.ADMIN_UID) {
      return NextResponse.json(
        { error: "Det här är redan huvudadministratören." },
        { status: 409 },
      );
    }
    if ((await db.collection("admins").doc(existing.uid).get()).exists) {
      return NextResponse.json(
        { error: "Den här användaren är redan administratör." },
        { status: 409 },
      );
    }

    await db.collection("admins").doc(existing.uid).set({
      email,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: session.uid,
      // They already have a password of their own choosing, so there is nothing
      // temporary to force them past.
      mustChangePassword: false,
      promotedExistingAccount: true,
    });

    return NextResponse.json({ email, promoted: true, tempPassword: null });
  }

  const tempPassword = generateTempPassword();

  let uid: string;
  try {
    const user = await auth.createUser({ email, password: tempPassword, emailVerified: false });
    uid = user.uid;
  } catch (e: any) {
    if (e?.code === "auth/email-already-exists") {
      return NextResponse.json(
        { error: "Ett konto med den här e-postadressen finns redan." },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: "Kunde inte skapa kontot." }, { status: 500 });
  }

  await db.collection("admins").doc(uid).set({
    email,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    createdBy: session.uid,
    mustChangePassword: true,
  });

  // The temp password is returned exactly once; never persisted or logged.
  return NextResponse.json({ email, tempPassword, promoted: false });
}

// ── Remove an admin ──────────────────────────────────────────────────────────
export async function DELETE(request: NextRequest) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const uid = new URL(request.url).searchParams.get("uid");
  if (!uid) {
    return NextResponse.json({ error: "Missing uid" }, { status: 400 });
  }
  if (uid === process.env.ADMIN_UID) {
    return NextResponse.json({ error: "Huvudadministratören kan inte tas bort." }, { status: 400 });
  }
  if (uid === session.uid) {
    return NextResponse.json({ error: "Du kan inte ta bort ditt eget konto." }, { status: 400 });
  }

  const ref = db.collection("admins").doc(uid);
  if (!(await ref.get()).exists) {
    return NextResponse.json({ error: "Administratören hittades inte." }, { status: 404 });
  }

  await ref.delete();

  // Demote only — never delete the Auth account.
  //
  // Admins are usually promoted customer logins, so deleting the account here
  // destroyed a real customer's login and orphaned their `customers/{uid}`
  // profile. Removing the `admins` doc is already enough: `isAdminUid` fails
  // immediately, so the dashboard is closed to them. Revoking refresh tokens
  // makes that take effect on any session they already have open rather than
  // waiting for the 14-day session cookie to lapse.
  //
  // An account that should genuinely cease to exist is deleted from the
  // Firebase console, which keeps an irreversible action out of a two-click
  // dashboard flow.
  try {
    await auth.revokeRefreshTokens(uid);
  } catch {
    /* ignore — the admins-doc removal already closes the dashboard */
  }

  return NextResponse.json({ ok: true });
}
