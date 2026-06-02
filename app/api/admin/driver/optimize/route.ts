import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";

const API_KEY = process.env.GOOGLE_MAPS_API_KEY ?? "";

function haversine(a: [number, number], b: [number, number]): number {
  const R = 6371;
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLon = ((b[1] - a[1]) * Math.PI) / 180;
  const lat1 = (a[0] * Math.PI) / 180;
  const lat2 = (b[0] * Math.PI) / 180;
  const sin2 = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(sin2));
}

function nearestNeighbor(coords: [number, number][], startIdx = 0): number[] {
  const n = coords.length;
  const visited = new Array<boolean>(n).fill(false);
  const order = [startIdx];
  visited[startIdx] = true;
  for (let step = 1; step < n; step++) {
    const last = order[order.length - 1];
    let best = -1, bestDist = Infinity;
    for (let j = 0; j < n; j++) {
      if (!visited[j]) {
        const d = haversine(coords[last], coords[j]);
        if (d < bestDist) { bestDist = d; best = j; }
      }
    }
    order.push(best);
    visited[best] = true;
  }
  return order;
}

async function geocode(address: string): Promise<[number, number] | null> {
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${API_KEY}`;
    const resp = await fetch(url);
    const data = await resp.json();
    if (data.status === "OK") {
      const { lat, lng } = data.results[0].geometry.location;
      return [lat, lng];
    }
  } catch { /* fall through */ }
  return null;
}

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const stops: string[]          = body.stops ?? [];
  const origin: string | undefined    = body.origin  || undefined;
  const destination: string | undefined = body.destination || undefined;

  if (!API_KEY) {
    return NextResponse.json({ error: "GOOGLE_MAPS_API_KEY saknas i .env.local" }, { status: 500 });
  }

  // Nothing to optimise
  if (stops.length === 0) {
    return NextResponse.json({
      orderedAddresses: [...(origin ? [origin] : []), ...(destination ? [destination] : [])],
      algorithm: "none",
    });
  }

  // Single stop — nothing to reorder
  if (stops.length === 1) {
    return NextResponse.json({
      orderedAddresses: [...(origin ? [origin] : []), ...stops, ...(destination ? [destination] : [])],
      algorithm: "none",
    });
  }

  // ── Google Directions API (≤ 10 delivery stops) ──────────────────────────
  //
  // Strategy: origin and destination are always fixed anchors.
  //   Both set  → all stops are waypoints between them.          ✓ fully optimised
  //   Start only → origin = start, dest = stops[last] (fixed).  Optimises stops[0..n-2]
  //   Stop only  → origin = stops[0] (fixed), dest = stop.      Optimises stops[1..n-1]
  //   Neither    → origin = stops[0], dest = stops[last].       Optimises middle stops
  //
  // The "both set" case gives full freedom; the others fix one natural endpoint.

  if (stops.length <= 10) {
    try {
      const apiOrigin = origin ?? stops[0];
      const apiDest   = destination ?? stops[stops.length - 1];

      // Waypoints = everything that is NOT the fixed origin or destination in the Directions call
      let waypointAddrs: string[];
      if (origin && destination) {
        waypointAddrs = stops;                // all stops sit between the two anchors
      } else if (origin) {
        waypointAddrs = stops.slice(0, -1);   // last stop becomes apiDest
      } else if (destination) {
        waypointAddrs = stops.slice(1);       // first stop becomes apiOrigin
      } else {
        waypointAddrs = stops.slice(1, -1);   // first & last stops are anchors
      }

      let url =
        `https://maps.googleapis.com/maps/api/directions/json` +
        `?origin=${encodeURIComponent(apiOrigin)}` +
        `&destination=${encodeURIComponent(apiDest)}` +
        `&key=${API_KEY}`;

      if (waypointAddrs.length > 0) {
        url += `&waypoints=optimize:true|${waypointAddrs.map(a => encodeURIComponent(a)).join("|")}`;
      }

      const resp = await fetch(url);
      const data = await resp.json();

      if (data.status === "OK") {
        const waypointOrder: number[] = data.routes[0]?.waypoint_order ?? [];
        const orderedWaypoints = waypointOrder.map(i => waypointAddrs[i]);

        // Reconstruct the full ordered route
        const orderedStops = origin && destination
          ? orderedWaypoints                              // all stops were waypoints
          : origin
            ? [...orderedWaypoints, stops[stops.length - 1]]  // re-append the fixed last stop
            : destination
              ? [stops[0], ...orderedWaypoints]               // re-prepend the fixed first stop
              : [stops[0], ...orderedWaypoints, stops[stops.length - 1]]; // both ends were fixed

        return NextResponse.json({
          orderedAddresses: [
            ...(origin      ? [origin]      : []),
            ...orderedStops,
            ...(destination ? [destination] : []),
          ],
          algorithm: "google",
        });
      }
    } catch { /* fall through to nearest-neighbour */ }
  }

  // ── Nearest-neighbour (> 10 stops or Directions API failed) ─────────────
  try {
    // Build full address list for geocoding: [origin?, ...stops, destination?]
    const allAddrs = [...(origin ? [origin] : []), ...stops, ...(destination ? [destination] : [])];
    const coords   = await Promise.all(allAddrs.map(geocode));

    if (coords.every(Boolean)) {
      const all = coords as [number, number][];

      if (origin && destination) {
        // Run NN on [origin, ...stops] (skip destination from NN, append at end)
        const subset = all.slice(0, -1); // origin + stops coords
        const nnOrder = nearestNeighbor(subset, 0); // 0 = origin
        return NextResponse.json({
          orderedAddresses: [
            ...nnOrder.map(i => allAddrs[i]),
            destination,
          ],
          algorithm: "nearest_neighbor",
        });
      }

      if (origin) {
        // NN visits origin + all stops; no fixed end
        const nnOrder = nearestNeighbor(all, 0);
        return NextResponse.json({
          orderedAddresses: nnOrder.map(i => allAddrs[i]),
          algorithm: "nearest_neighbor",
        });
      }

      if (destination) {
        // NN visits all stops (no fixed start), then append destination
        const subset = all.slice(0, -1); // stops coords only
        const nnOrder = nearestNeighbor(subset, 0);
        return NextResponse.json({
          orderedAddresses: [...nnOrder.map(i => stops[i]), destination],
          algorithm: "nearest_neighbor",
        });
      }

      // No anchors — NN on all stops
      const nnOrder = nearestNeighbor(all, 0);
      return NextResponse.json({
        orderedAddresses: nnOrder.map(i => stops[i]),
        algorithm: "nearest_neighbor",
      });
    }
  } catch { /* fall through */ }

  // Last resort — return as-is
  return NextResponse.json({
    orderedAddresses: [...(origin ? [origin] : []), ...stops, ...(destination ? [destination] : [])],
    algorithm: "nearest_neighbor",
  });
}
