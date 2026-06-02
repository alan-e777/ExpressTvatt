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
}

const DOC = () => db.collection("settings").doc("driver");

const DEFAULTS: DriverSettings = {
  startAddr: "",
  stopAddr: "",
  serviceArea: { lat: 59.3342, lng: 18.0709, radiusKm: 5 },
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
    },
    { merge: true }
  );
  return NextResponse.json({ ok: true });
}
