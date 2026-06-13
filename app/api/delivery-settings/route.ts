import { NextResponse } from "next/server";
import { db } from "@/lib/firebase-admin";

export interface DeliverySettings {
  freeDeliveryThresholdKr: number;
  deliveryFeeKr: number;
}

const DEFAULTS: DeliverySettings = { freeDeliveryThresholdKr: 0, deliveryFeeKr: 0 };

const clampKr = (n: unknown): number => {
  const v = Math.round(Number(n));
  return Number.isFinite(v) && v >= 0 ? v : 0;
};

// Public, non-sensitive: the kassa client reads this to preview the delivery fee
// the server will charge. Only the two pricing fields are exposed — never the
// driver's addresses or service-area coordinates from settings/driver.
export async function GET() {
  try {
    const snap = await db.collection("settings").doc("driver").get();
    const data = snap.exists ? snap.data() : {};
    const payload: DeliverySettings = {
      freeDeliveryThresholdKr: clampKr(data?.freeDeliveryThresholdKr),
      deliveryFeeKr:           clampKr(data?.deliveryFeeKr),
    };
    const res = NextResponse.json(payload);
    res.headers.set("Cache-Control", "public, max-age=60, s-maxage=60");
    return res;
  } catch (err) {
    console.error("[GET /api/delivery-settings]", err);
    return NextResponse.json(DEFAULTS);
  }
}
