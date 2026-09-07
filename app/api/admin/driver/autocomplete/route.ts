import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase-admin";
import { isAdmin } from "@/lib/admin-auth";
import { autocompleteAddresses } from "@/lib/places";

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
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

  // Same upstream call as the customer's field (lib/places.ts), but this route
  // has always answered in its own camelCase shape, which the Settings page
  // parses — so the mapping stays here rather than moving into the shared module.
  try {
    const found = await autocompleteAddresses(q, area, API_KEY);
    const predictions = found.map(p => ({ description: p.description, placeId: p.place_id }));
    return NextResponse.json({ predictions });
  } catch (err) {
    console.error("[admin/driver/autocomplete]", err);
    return NextResponse.json({ predictions: [], error: "places_unavailable" }, { status: 502 });
  }
}
