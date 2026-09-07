import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase-admin";
import { autocompleteAddresses, type ServiceArea } from "@/lib/places";

const API_KEY = process.env.GOOGLE_MAPS_API_KEY ?? "";

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

/**
 * Address suggestions for the customer's address field, restricted to the
 * admin's service circle.
 *
 * The response keeps the legacy Google shape (`place_id`, `description`,
 * `structured_formatting`) because two clients parse it: `AddressAutocomplete`
 * on the web and `skraddare-app/lib/places.ts` on iOS. `lib/places.ts` converts
 * the new API's field names back to these, so neither client had to change when
 * the legacy endpoint was switched off.
 */
export async function GET(req: NextRequest) {
  const input = req.nextUrl.searchParams.get("input") ?? "";
  if (!input.trim() || input.length < 3) return NextResponse.json({ predictions: [] });
  if (!API_KEY) {
    console.error("[places/autocomplete] GOOGLE_MAPS_API_KEY is not set");
    return NextResponse.json({ predictions: [], error: "maps_key_missing" }, { status: 500 });
  }

  try {
    const predictions = await autocompleteAddresses(input, await getServiceArea(), API_KEY);
    return NextResponse.json({ predictions });
  } catch (err) {
    // Logged, never swallowed. An empty list here is indistinguishable from
    // "no such street" on the client, so without this line a dead address
    // field — the whole checkout — fails in complete silence.
    console.error("[places/autocomplete]", err);
    return NextResponse.json({ predictions: [], error: "places_unavailable" }, { status: 502 });
  }
}
