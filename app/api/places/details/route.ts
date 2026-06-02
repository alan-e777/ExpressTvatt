import { NextRequest, NextResponse } from "next/server";

const API_KEY = process.env.GOOGLE_MAPS_API_KEY ?? "";

export async function GET(req: NextRequest) {
  const placeId = req.nextUrl.searchParams.get("placeId") ?? "";
  if (!placeId || !API_KEY) return NextResponse.json({ address: "", postalCode: "" });

  const params = new URLSearchParams({
    place_id: placeId,
    fields: "address_components",
    key: API_KEY,
  });

  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?${params}`
    );
    const data = await res.json();

    if (data.status !== "OK") return NextResponse.json({ address: "", postalCode: "" });

    const comps: Array<{ long_name: string; types: string[] }> =
      data.result.address_components ?? [];

    const route        = comps.find(c => c.types.includes("route"))?.long_name ?? "";
    const streetNumber = comps.find(c => c.types.includes("street_number"))?.long_name ?? "";
    const postalRaw    = comps.find(c => c.types.includes("postal_code"))?.long_name ?? "";

    const address  = streetNumber ? `${route} ${streetNumber}` : route;
    const digits   = postalRaw.replace(/\D/g, "");
    const postalCode =
      digits.length === 5 ? `${digits.slice(0, 3)} ${digits.slice(3)}` : postalRaw;

    return NextResponse.json({ address, postalCode });
  } catch {
    return NextResponse.json({ address: "", postalCode: "" });
  }
}
