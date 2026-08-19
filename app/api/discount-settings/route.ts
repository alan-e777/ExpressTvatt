import { NextResponse } from "next/server";
import { db } from "@/lib/firebase-admin";
import { DISCOUNT_DEFAULTS, clampPct, type DiscountSettings } from "@/lib/discount";

// Public, non-sensitive: the order/kassa client pages read this to preview the
// discounted prices the server will charge. Mirrors /api/services caching.
export async function GET() {
  try {
    const snap = await db.collection("settings").doc("discounts").get();
    const data = snap.exists ? (snap.data() as Partial<DiscountSettings>) : {};
    const normal = clampPct(data.mattvatt?.["matta-normal"] ?? 0);
    const payload: DiscountSettings = {
      firstTimeDiscountPercent: clampPct(data.firstTimeDiscountPercent ?? DISCOUNT_DEFAULTS.firstTimeDiscountPercent),
      multipleDiscountsAllowed: !!(data.multipleDiscountsAllowed ?? DISCOUNT_DEFAULTS.multipleDiscountsAllowed),
      mattvatt: {
        "matta-normal": normal,
        "matta-akta":   clampPct(data.mattvatt?.["matta-akta"] ?? 0),
        // Legacy fixed sizes, mirrored from "Normal" for the iOS app.
        "matta-liten":  normal,
        "matta-stor":   normal,
      },
    };
    const res = NextResponse.json(payload);
    res.headers.set("Cache-Control", "public, max-age=60, s-maxage=60");
    return res;
  } catch (err) {
    console.error("[GET /api/discount-settings]", err);
    return NextResponse.json(DISCOUNT_DEFAULTS);
  }
}
