import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/firebase-admin";
import { DISCOUNT_DEFAULTS, clampPct, type DiscountSettings } from "@/lib/discount";

const DOC = () => db.collection("settings").doc("discounts");

// Only the two rug types are editable; the legacy fixed-size keys are mirrored
// from "Normal" so the iOS app, which still sells them, keeps its discount.
function mergeMattvatt(m: Partial<DiscountSettings["mattvatt"]> | undefined) {
  const normal = clampPct(m?.["matta-normal"] ?? 0);
  return {
    "matta-normal": normal,
    "matta-akta":   clampPct(m?.["matta-akta"] ?? 0),
    "matta-liten":  normal,
    "matta-stor":   normal,
  };
}

function merge(data: Partial<DiscountSettings>): DiscountSettings {
  return {
    firstTimeDiscountPercent: clampPct(data.firstTimeDiscountPercent ?? DISCOUNT_DEFAULTS.firstTimeDiscountPercent),
    multipleDiscountsAllowed: !!(data.multipleDiscountsAllowed ?? DISCOUNT_DEFAULTS.multipleDiscountsAllowed),
    mattvatt: mergeMattvatt(data.mattvatt),
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
