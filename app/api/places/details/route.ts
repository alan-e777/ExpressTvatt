import { NextRequest, NextResponse } from "next/server";
import { placeAddress } from "@/lib/places";

const API_KEY = process.env.GOOGLE_MAPS_API_KEY ?? "";

/**
 * Street address + postcode for a place the customer picked. Shape unchanged
 * (`{ address, postalCode }`) — only the upstream call moved to the new Places
 * API, which names the fields `addressComponents` / `longText`.
 */
export async function GET(req: NextRequest) {
  const placeId = req.nextUrl.searchParams.get("placeId") ?? "";
  if (!placeId) return NextResponse.json({ address: "", postalCode: "" });
  if (!API_KEY) {
    console.error("[places/details] GOOGLE_MAPS_API_KEY is not set");
    return NextResponse.json({ address: "", postalCode: "", error: "maps_key_missing" }, { status: 500 });
  }

  try {
    return NextResponse.json(await placeAddress(placeId, API_KEY));
  } catch (err) {
    // The client falls back to the prediction's own text when this fails, so a
    // booking is still possible — but the postcode goes missing, which the shop
    // needs. Worth an error in the log rather than a quiet blank.
    console.error("[places/details]", err);
    return NextResponse.json({ address: "", postalCode: "", error: "places_unavailable" }, { status: 502 });
  }
}
