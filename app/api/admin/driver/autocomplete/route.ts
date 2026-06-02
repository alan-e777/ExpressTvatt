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
  const q = req.nextUrl.searchParams.get("q") ?? "";
  if (!q.trim()) return NextResponse.json({ predictions: [] });
  if (!API_KEY) return NextResponse.json({ error: "GOOGLE_MAPS_API_KEY saknas" }, { status: 500 });

  // Prefer caller-supplied area (Settings page passes live values while editing)
  // otherwise fall back to Firestore
  const latParam = req.nextUrl.searchParams.get("lat");
  const lngParam = req.nextUrl.searchParams.get("lng");
  const kmParam  = req.nextUrl.searchParams.get("radiusKm");

  const area: ServiceArea =
    latParam && lngParam && kmParam
      ? { lat: Number(latParam), lng: Number(lngParam), radiusKm: Number(kmParam) }
      : await getServiceArea();

  const url = new URL("https://maps.googleapis.com/maps/api/place/autocomplete/json");
  url.searchParams.set("input", q);
  url.searchParams.set("types", "address");
  url.searchParams.set("language", "sv");
  url.searchParams.set("components", "country:SE");
  url.searchParams.set("location", `${area.lat},${area.lng}`);
  url.searchParams.set("radius", String(Math.round(area.radiusKm * 1000)));
  url.searchParams.set("strictbounds", "true");
  url.searchParams.set("key", API_KEY);

  const resp = await fetch(url.toString());
  const data = await resp.json();

  const predictions = (data.predictions ?? []).map((p: { description: string; place_id: string }) => ({
    description: p.description,
    placeId: p.place_id,
  }));

  return NextResponse.json({ predictions });
}
