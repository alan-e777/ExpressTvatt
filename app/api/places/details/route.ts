import { NextRequest, NextResponse } from "next/server";
import { placeAddress } from "@/lib/places";
import { getServiceArea } from "@/lib/serviceArea-server";
import { pointInPolygon } from "@/lib/serviceArea";

const API_KEY = process.env.GOOGLE_MAPS_API_KEY ?? "";

/**
 * Street address + postcode for a place the customer picked. Shape unchanged
 * (`{ address, postalCode }`) — only the upstream call moved to the new Places
 * API, which names the fields `addressComponents` / `longText`.
 *
 * This is also where the admin's drawn service area is actually enforced. The
 * autocomplete call can only be restricted to the area's bounding box (Google's
 * `locationRestriction` has no polygon), so a place in the box but outside the
 * shape reaches this route — and is refused here, with the coordinates in hand.
 */
export async function GET(req: NextRequest) {
  const placeId = req.nextUrl.searchParams.get("placeId") ?? "";
  if (!placeId) return NextResponse.json({ address: "", postalCode: "" });
  if (!API_KEY) {
    console.error("[places/details] GOOGLE_MAPS_API_KEY is not set");
    return NextResponse.json({ address: "", postalCode: "", error: "maps_key_missing" }, { status: 500 });
  }

  try {
    const { address, postalCode, location } = await placeAddress(placeId, API_KEY);

    // No coordinates means no verdict. Accepting is the safe failure here: the
    // bounding box already held, and refusing every address Google declines to
    // geocode would block bookings over a missing field.
    if (location) {
      const area = await getServiceArea();
      if (!pointInPolygon(location, area.polygon)) {
        // 200, not an error status: the client falls back to the prediction's
        // own text on a failed request, which would quietly accept the very
        // address this is rejecting.
        return NextResponse.json({
          address: "",
          postalCode: "",
          outsideArea: true,
          error: "outside_service_area",
        });
      }
    }

    return NextResponse.json({ address, postalCode });
  } catch (err) {
    // The client falls back to the prediction's own text when this fails, so a
    // booking is still possible — but the postcode goes missing, which the shop
    // needs. Worth an error in the log rather than a quiet blank.
    console.error("[places/details]", err);
    return NextResponse.json({ address: "", postalCode: "", error: "places_unavailable" }, { status: 502 });
  }
}
