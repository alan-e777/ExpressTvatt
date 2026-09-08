import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { autocompleteAddresses } from "@/lib/places";
import { getServiceArea } from "@/lib/serviceArea-server";
import { normalizeServiceArea, type LatLng, type ServiceArea } from "@/lib/serviceArea";

const API_KEY = process.env.GOOGLE_MAPS_API_KEY ?? "";

export async function GET(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const q = req.nextUrl.searchParams.get("q") ?? "";
  if (!q.trim()) return NextResponse.json({ predictions: [] });
  if (!API_KEY) return NextResponse.json({ error: "GOOGLE_MAPS_API_KEY saknas" }, { status: 500 });

  // Prefer the caller-supplied area — the Settings page passes the shape it is
  // currently drawing, so start/stop suggestions follow the unsaved polygon
  // instead of the one still in Firestore. Anything unparseable falls back to
  // the stored area rather than to an unrestricted search.
  const polygonParam = req.nextUrl.searchParams.get("polygon");
  let area: ServiceArea | null = null;
  if (polygonParam) {
    try {
      const points = JSON.parse(polygonParam) as LatLng[];
      if (Array.isArray(points) && points.length >= 3) area = normalizeServiceArea({ polygon: points });
    } catch { /* fall through to the stored area */ }
  }
  if (!area) area = await getServiceArea();

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
