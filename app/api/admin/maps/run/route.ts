import { NextResponse } from "next/server";
import { db } from "@/lib/firebase-admin";
import { isAdmin } from "@/lib/admin-auth";
import { geocodeAddress } from "@/lib/geocode";

const API_KEY = process.env.GOOGLE_MAPS_API_KEY ?? "";

const MAP_STYLES = [
  "feature:poi|visibility:off",
  "feature:transit|visibility:off",
  "element:labels.icon|visibility:off",
  "feature:road.highway|element:geometry|color:0xe8e8e4",
  "feature:landscape|element:geometry|color:0xf5f5f4",
  "feature:water|element:geometry|color:0xd1d5db",
  "feature:road|element:geometry|color:0xffffff",
  "element:labels.text.fill|color:0x999999",
];

const MAP_W = 640;
const MAP_H = 280;

function latRad(lat: number): number {
  const sin = Math.sin((lat * Math.PI) / 180);
  const r = Math.log((1 + sin) / (1 - sin)) / 2;
  return Math.max(Math.min(r, Math.PI), -Math.PI) / 2;
}

function fitZoom(lats: number[], lngs: number[]): { centerLat: number; centerLng: number; zoom: number } {
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const centerLat = (minLat + maxLat) / 2;
  const centerLng = (minLng + maxLng) / 2;

  if (lats.length === 1) return { centerLat, centerLng, zoom: 13 };

  const latFrac = (latRad(maxLat) - latRad(minLat)) / Math.PI;
  const lngDiff = maxLng - minLng;
  const lngFrac = (lngDiff < 0 ? lngDiff + 360 : lngDiff) / 360;

  const TILE = 256;
  const latZ = latFrac > 0 ? Math.log(MAP_H / TILE / latFrac) / Math.LN2 : 21;
  const lngZ = lngFrac > 0 ? Math.log(MAP_W / TILE / lngFrac) / Math.LN2 : 21;

  // Subtract 1 so markers have breathing room at the edges
  const zoom = Math.max(Math.floor(Math.min(latZ, lngZ)) - 1, 8);
  return { centerLat, centerLng, zoom };
}

export async function GET() {
  if (!(await isAdmin())) return new NextResponse("Unauthorized", { status: 401 });
  if (!API_KEY) return new NextResponse("No API key", { status: 500 });

  const runsSnap = await db.collection("runs")
    .orderBy("createdAt", "desc")
    .limit(1)
    .get();

  if (runsSnap.empty) return new NextResponse("No active run", { status: 404 });

  const run = runsSnap.docs[0].data();
  const orderIds: string[] = run.orderIds ?? [];

  const orders = await Promise.all(
    orderIds.map(async (id) => {
      const snap = await db.collection("orders").doc(id).get();
      if (!snap.exists) return null;
      const data = snap.data()!;
      const fullAddress = [data.address, data.postalCode].filter(Boolean).join(", ");
      const coords = await geocodeAddress(fullAddress);
      if (!coords) return null;
      return { status: data.status as string, lat: coords.lat, lng: coords.lng };
    })
  );

  const valid = orders.filter(Boolean) as { status: string; lat: number; lng: number }[];
  if (valid.length === 0) return new NextResponse("No geocodable orders", { status: 404 });

  const { centerLat, centerLng, zoom } = fitZoom(
    valid.map(o => o.lat),
    valid.map(o => o.lng),
  );

  const delivered = valid.filter(o => o.status === "delivered");
  const pending   = valid.filter(o => o.status !== "delivered");

  let url =
    `https://maps.googleapis.com/maps/api/staticmap` +
    `?size=${MAP_W}x${MAP_H}&scale=2&maptype=roadmap` +
    `&center=${centerLat},${centerLng}&zoom=${zoom}`;

  for (const s of MAP_STYLES) {
    url += `&style=${encodeURIComponent(s)}`;
  }

  if (delivered.length > 0) {
    url += `&markers=color:green|${delivered.map(o => `${o.lat},${o.lng}`).join("|")}`;
  }
  if (pending.length > 0) {
    url += `&markers=color:black|${pending.map(o => `${o.lat},${o.lng}`).join("|")}`;
  }

  url += `&key=${API_KEY}`;

  const imageResp = await fetch(url);
  if (!imageResp.ok) return new NextResponse("Maps API error", { status: 502 });

  const buf = await imageResp.arrayBuffer();
  return new NextResponse(buf, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });
}
