import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase-admin";

const API_KEY = process.env.GOOGLE_MAPS_API_KEY ?? "";

interface ServiceArea { lat: number; lng: number; radiusKm: number }
const DEFAULT_AREA: ServiceArea = { lat: 59.3342, lng: 18.0709, radiusKm: 5 };

async function getServiceArea(): Promise<ServiceArea> {
  try {
    const snap = await db.collection("settings").doc("driver").get();
    if (snap.exists) {
      const area = snap.data()?.serviceArea as Partial<ServiceArea> | undefined;
      if (area?.lat && area?.lng && area?.radiusKm) return area as ServiceArea;
    }
  } catch { /* fall through */ }
  return DEFAULT_AREA;
}

export async function GET(req: NextRequest) {
  const input = req.nextUrl.searchParams.get("input") ?? "";
  if (!input.trim() || input.length < 3 || !API_KEY) {
    return NextResponse.json({ predictions: [] });
  }

  const area = await getServiceArea();

  const params = new URLSearchParams({
    input,
    types: "address",
    components: "country:SE",
    language: "sv",
    location: `${area.lat},${area.lng}`,
    radius: String(Math.round(area.radiusKm * 1000)),
    strictbounds: "true",
    key: API_KEY,
  });

  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/place/autocomplete/json?${params}`
    );
    const data = await res.json();
    return NextResponse.json({
      predictions: data.status === "OK" ? (data.predictions ?? []) : [],
    });
  } catch {
    return NextResponse.json({ predictions: [] });
  }
}
