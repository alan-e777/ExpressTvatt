import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/firebase-admin";

export interface DriverSettings {
  startAddr: string;
  stopAddr: string;
  serviceArea: {
    lat: number;
    lng: number;
    radiusKm: number;
  };
  /** Order total (kr) at or above which pickup + delivery is free. */
  freeDeliveryThresholdKr: number;
  /** Delivery fee (kr) charged when the order total is below the threshold. */
  deliveryFeeKr: number;
}

const DOC = () => db.collection("settings").doc("driver");

// Clamp money inputs to a sane non-negative whole number of kronor.
const clampKr = (n: unknown, fallback: number): number => {
  const v = Math.round(Number(n));
  return Number.isFinite(v) && v >= 0 ? v : fallback;
};

const DEFAULTS: DriverSettings = {
  startAddr: "",
  stopAddr: "",
  serviceArea: { lat: 59.3342, lng: 18.0709, radiusKm: 5 },
  freeDeliveryThresholdKr: 0,
  deliveryFeeKr: 0,
};

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const snap = await DOC().get();
  const data = snap.exists ? (snap.data() as Partial<DriverSettings>) : {};
  return NextResponse.json({ ...DEFAULTS, ...data, serviceArea: { ...DEFAULTS.serviceArea, ...(data.serviceArea ?? {}) } });
}

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body: Partial<DriverSettings> = await req.json();
  await DOC().set(
    {
      startAddr: body.startAddr ?? "",
      stopAddr: body.stopAddr ?? "",
      serviceArea: {
        lat: body.serviceArea?.lat ?? DEFAULTS.serviceArea.lat,
        lng: body.serviceArea?.lng ?? DEFAULTS.serviceArea.lng,
        radiusKm: body.serviceArea?.radiusKm ?? DEFAULTS.serviceArea.radiusKm,
      },
      freeDeliveryThresholdKr: clampKr(body.freeDeliveryThresholdKr, DEFAULTS.freeDeliveryThresholdKr),
      deliveryFeeKr: clampKr(body.deliveryFeeKr, DEFAULTS.deliveryFeeKr),
    },
    { merge: true }
  );
  return NextResponse.json({ ok: true });
}
