import { NextResponse } from "next/server";
import { db } from "@/lib/firebase-admin";
import { MATTVATT_DEFAULTS, normalizeMattvattSettings, type MattvattSettings } from "@/lib/mattvatt";

// Public, non-sensitive: the order page reads this to build the size slider and
// preview the price create-cart-payment will charge. Mirrors /api/discount-settings.
export async function GET() {
  try {
    const snap = await db.collection("settings").doc("mattvatt").get();
    const payload = normalizeMattvattSettings(snap.exists ? (snap.data() as Partial<MattvattSettings>) : null);
    const res = NextResponse.json(payload);
    res.headers.set("Cache-Control", "public, max-age=60, s-maxage=60");
    return res;
  } catch (err) {
    console.error("[GET /api/mattvatt-settings]", err);
    return NextResponse.json(MATTVATT_DEFAULTS);
  }
}
