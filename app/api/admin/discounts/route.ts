import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/firebase-admin";
import { DISCOUNT_DEFAULTS, clampPct, type DiscountSettings } from "@/lib/discount";

const DOC = () => db.collection("settings").doc("discounts");

function merge(data: Partial<DiscountSettings>): DiscountSettings {
  return {
    firstTimeDiscountPercent: clampPct(data.firstTimeDiscountPercent ?? DISCOUNT_DEFAULTS.firstTimeDiscountPercent),
    multipleDiscountsAllowed: !!(data.multipleDiscountsAllowed ?? DISCOUNT_DEFAULTS.multipleDiscountsAllowed),
    mattvatt: {
      "matta-liten": clampPct(data.mattvatt?.["matta-liten"] ?? 0),
      "matta-stor":  clampPct(data.mattvatt?.["matta-stor"] ?? 0),
      "matta-akta":  clampPct(data.mattvatt?.["matta-akta"] ?? 0),
    },
  };
}

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const snap = await DOC().get();
  return NextResponse.json(merge(snap.exists ? (snap.data() as Partial<DiscountSettings>) : {}));
}

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body: Partial<DiscountSettings> = await req.json();
  await DOC().set(merge(body), { merge: true });
  return NextResponse.json({ ok: true });
}
