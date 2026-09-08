import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/firebase-admin";
import {
  DEFAULT_SERVICE_AREA,
  boundingCircle,
  normalizeServiceArea,
  validatePolygon,
  type ServiceArea,
} from "@/lib/serviceArea";

export interface DriverSettings {
  startAddr: string;
  stopAddr: string;
  /**
   * The delivery area. `polygon` is the shape the admin drew; `lat`/`lng`/
   * `radiusKm` are its bounding circle, derived here rather than trusted from
   * the client. See `lib/serviceArea.ts` for why both are stored.
   */
  serviceArea: ServiceArea;
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
  serviceArea: DEFAULT_SERVICE_AREA,
  freeDeliveryThresholdKr: 0,
  deliveryFeeKr: 0,
};

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const snap = await DOC().get();
  const data = snap.exists ? (snap.data() as Partial<DriverSettings>) : {};
  // A document written before polygons existed comes back as an editable
  // octagon around its old circle, so the editor never opens on a blank map.
  return NextResponse.json({ ...DEFAULTS, ...data, serviceArea: normalizeServiceArea(data.serviceArea) });
}

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body: Partial<DriverSettings> = await req.json();

  // The panel checks the shape too, but this is the check that counts — the
  // area is the only thing standing between a customer and an address the
  // driver never agreed to serve.
  const polygon = body.serviceArea?.polygon;
  const invalid = validatePolygon(polygon);
  if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });

  await DOC().set(
    {
      startAddr: body.startAddr ?? "",
      stopAddr: body.stopAddr ?? "",
      serviceArea: {
        // Recomputed, never taken from the request: the bounding circle must
        // actually contain the polygon or the Places call would clip it.
        ...boundingCircle(polygon!),
        polygon,
      },
      freeDeliveryThresholdKr: clampKr(body.freeDeliveryThresholdKr, DEFAULTS.freeDeliveryThresholdKr),
      deliveryFeeKr: clampKr(body.deliveryFeeKr, DEFAULTS.deliveryFeeKr),
    },
    { merge: true }
  );
  return NextResponse.json({ ok: true });
}
