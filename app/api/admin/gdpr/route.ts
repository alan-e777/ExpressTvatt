import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase-admin";
import { getAdminSession } from "@/lib/admin-auth";
import { withGdprDefaults, clampYears, type GdprSettings } from "@/lib/gdpr";

const REF = () => db.collection("settings").doc("gdpr");

export async function GET() {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const snap = await REF().get();
  return NextResponse.json(withGdprDefaults(snap.exists ? (snap.data() as Partial<GdprSettings>) : {}));
}

export async function POST(request: NextRequest) {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Partial<GdprSettings>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const text = (v: unknown, fallback: string) => {
    const s = String(v ?? "").trim();
    return s.length ? s.slice(0, 200) : fallback;
  };

  const current = withGdprDefaults((await REF().get()).data() as Partial<GdprSettings>);

  const next: GdprSettings = {
    customerDataRetentionYears:    clampYears(body.customerDataRetentionYears),
    accountingRetentionYears:      clampYears(body.accountingRetentionYears),
    personnummerRetentionYears:    clampYears(body.personnummerRetentionYears),
    inactiveAccountRetentionYears: clampYears(body.inactiveAccountRetentionYears),
    chatRetentionMonths:           clampYears(body.chatRetentionMonths, 600),
    companyName:   text(body.companyName,   current.companyName),
    orgNumber:     text(body.orgNumber,     current.orgNumber),
    postalAddress: text(body.postalAddress, current.postalAddress),
    privacyEmail:  text(body.privacyEmail,  current.privacyEmail),
    privacyPhone:  text(body.privacyPhone,  current.privacyPhone),
    policyVersion: text(body.policyVersion, current.policyVersion),
    // Editing the policy inputs is a change to the published policy, so the
    // "last updated" stamp should never lag behind it.
    lastUpdated: new Date().toISOString().slice(0, 10),
  };

  try {
    await REF().set(next, { merge: true });
    return NextResponse.json(next);
  } catch (err) {
    console.error("[admin gdpr POST]", err);
    return NextResponse.json({ error: "Kunde inte spara." }, { status: 500 });
  }
}
