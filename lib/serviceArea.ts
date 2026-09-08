// The delivery service area — a polygon the admin draws on the map.
//
// It used to be a circle (`lat` + `lng` + `radiusKm`). Those three fields are
// still written and still mean something: they are the polygon's **bounding
// circle**, kept because Google's Places API cannot take a polygon. Its
// `locationRestriction` accepts a circle or a rectangle and nothing else, so the
// coarse shape is what goes upstream and the exact polygon is applied on this
// side once a place has real coordinates (`/api/places/details`).
//
// That split is the whole design:
//   • bounding rect  → the Places call, a hard but slightly loose boundary
//   • polygon        → `pointInPolygon`, the exact answer
// Anything that only ever had a circle keeps working untouched, and a document
// written before polygons existed still reads back as a usable area.

export type LatLng = { lat: number; lng: number };

export type ServiceArea = {
  /** Bounding-circle centre. Derived from `polygon` — not independently edited. */
  lat: number;
  lng: number;
  /** Bounding-circle radius. Derived from `polygon`. */
  radiusKm: number;
  /** The real shape, in the order the admin placed the points. */
  polygon: LatLng[];
};

/** Stureplan, 5 km — what the area was before anyone configured it. */
export const DEFAULT_CENTER: LatLng = { lat: 59.3342, lng: 18.0709 };
export const DEFAULT_RADIUS_KM = 5;

/** A polygon needs three corners to enclose anything. */
export const MIN_POINTS = 3;
/**
 * Upper bound on points. Nothing upstream imposes it — it exists so a runaway
 * click cannot write a 10 000-vertex document that every autocomplete request
 * then has to read.
 */
export const MAX_POINTS = 60;

/** Points a legacy circle is expanded into, and what "reset" gives you back. */
export const CIRCLE_POINTS = 8;

const EARTH_RADIUS_KM = 6371;
const toRad = (deg: number) => (deg * Math.PI) / 180;
const toDeg = (rad: number) => (rad * 180) / Math.PI;

const isFiniteNum = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n);

/** Coordinates are stored at ~1 m precision; more is noise from a mouse drag. */
const round5 = (n: number) => Math.round(n * 100000) / 100000;

export function isLatLng(p: unknown): p is LatLng {
  if (!p || typeof p !== "object") return false;
  const { lat, lng } = p as Partial<LatLng>;
  return isFiniteNum(lat) && isFiniteNum(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

export function distanceKm(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * A regular n-gon around a circle — how a pre-polygon document becomes an
 * editable shape, and what the editor's "reset" button produces.
 *
 * The corners sit *on* the circle, so the polygon is slightly smaller than the
 * circle it replaces. Deliberate: it can only ever narrow the area, never widen
 * it onto streets the driver never agreed to serve.
 */
export function polygonFromCircle(center: LatLng, radiusKm: number, points = CIRCLE_POINTS): LatLng[] {
  const n = Math.max(MIN_POINTS, Math.min(MAX_POINTS, Math.round(points)));
  const angular = radiusKm / EARTH_RADIUS_KM;
  const lat1 = toRad(center.lat);
  const lng1 = toRad(center.lng);

  return Array.from({ length: n }, (_, i) => {
    // Start due north and go clockwise, so point 1 is the top of the shape.
    const bearing = toRad((360 / n) * i);
    const lat2 = Math.asin(
      Math.sin(lat1) * Math.cos(angular) + Math.cos(lat1) * Math.sin(angular) * Math.cos(bearing),
    );
    const lng2 =
      lng1 +
      Math.atan2(
        Math.sin(bearing) * Math.sin(angular) * Math.cos(lat1),
        Math.cos(angular) - Math.sin(lat1) * Math.sin(lat2),
      );
    return { lat: round5(toDeg(lat2)), lng: round5(toDeg(lng2)) };
  });
}

/** Min/max corners — what the Places API gets as `locationRestriction.rectangle`. */
export function boundingRect(polygon: LatLng[]): { low: LatLng; high: LatLng } {
  const lats = polygon.map(p => p.lat);
  const lngs = polygon.map(p => p.lng);
  return {
    low:  { lat: Math.min(...lats), lng: Math.min(...lngs) },
    high: { lat: Math.max(...lats), lng: Math.max(...lngs) },
  };
}

/**
 * The circle that contains the polygon: centre of the bounding box, radius out
 * to the furthest corner. `radiusKm` never rounds down — rounding down would
 * clip the corners off the admin's own shape.
 */
export function boundingCircle(polygon: LatLng[]): { lat: number; lng: number; radiusKm: number } {
  const { low, high } = boundingRect(polygon);
  const center = { lat: (low.lat + high.lat) / 2, lng: (low.lng + high.lng) / 2 };
  const radiusKm = polygon.reduce((max, p) => Math.max(max, distanceKm(center, p)), 0);
  return {
    lat: round5(center.lat),
    lng: round5(center.lng),
    radiusKm: Math.max(0.1, Math.ceil(radiusKm * 10) / 10),
  };
}

/**
 * Even-odd ray casting. Longitude is treated as flat, which is correct enough
 * at Swedish latitudes over a delivery-sized area — the error at 59°N across
 * 50 km is far below the width of a street.
 *
 * A point exactly on an edge is not guaranteed either way; that is a metre-wide
 * ambiguity on a boundary the admin drew by hand, so it needs no special case.
 */
export function pointInPolygon(point: LatLng, polygon: LatLng[]): boolean {
  if (polygon.length < MIN_POINTS) return false;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i];
    const b = polygon[j];
    const straddles = a.lat > point.lat !== b.lat > point.lat;
    if (!straddles) continue;
    const lngAtLat = ((b.lng - a.lng) * (point.lat - a.lat)) / (b.lat - a.lat) + a.lng;
    if (point.lng < lngAtLat) inside = !inside;
  }
  return inside;
}

// ── Self-intersection ────────────────────────────────────────────────────────
// A bow-tie polygon is still a valid ring to `pointInPolygon`, but the answer it
// gives (the overlap counts as *outside*) is not what anyone dragging a corner
// past another one intends. Saving is refused rather than storing a shape whose
// meaning the admin cannot see on the map.

const cross = (o: LatLng, a: LatLng, b: LatLng) =>
  (a.lng - o.lng) * (b.lat - o.lat) - (a.lat - o.lat) * (b.lng - o.lng);

function segmentsCross(p1: LatLng, p2: LatLng, p3: LatLng, p4: LatLng): boolean {
  const d1 = cross(p3, p4, p1);
  const d2 = cross(p3, p4, p2);
  const d3 = cross(p1, p2, p3);
  const d4 = cross(p1, p2, p4);
  return ((d1 > 0) !== (d2 > 0)) && ((d3 > 0) !== (d4 > 0));
}

/** Index of the first pair of non-adjacent edges that cross, or null. */
export function findSelfIntersection(polygon: LatLng[]): [number, number] | null {
  const n = polygon.length;
  if (n < 4) return null;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      // Neighbouring edges share a corner; that shared point is not a crossing.
      if (j === i + 1 || (i === 0 && j === n - 1)) continue;
      if (segmentsCross(polygon[i], polygon[(i + 1) % n], polygon[j], polygon[(j + 1) % n])) {
        return [i, j];
      }
    }
  }
  return null;
}

/** Rough area in km², for the "≈ N km²" readout in the editor. */
export function areaSqKm(polygon: LatLng[]): number {
  if (polygon.length < MIN_POINTS) return 0;
  const latRef = toRad(polygon.reduce((s, p) => s + p.lat, 0) / polygon.length);
  // Equirectangular projection onto kilometres, then the shoelace formula.
  const pts = polygon.map(p => ({
    x: toRad(p.lng) * Math.cos(latRef) * EARTH_RADIUS_KM,
    y: toRad(p.lat) * EARTH_RADIUS_KM,
  }));
  let sum = 0;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    sum += pts[j].x * pts[i].y - pts[i].x * pts[j].y;
  }
  return Math.abs(sum) / 2;
}

// ── Read / write ─────────────────────────────────────────────────────────────

/**
 * Strict check, used on save. Returns null when the shape is fine, otherwise the
 * Swedish message the admin sees.
 */
export function validatePolygon(polygon: unknown): string | null {
  if (!Array.isArray(polygon)) return "Området saknar punkter.";
  if (polygon.length < MIN_POINTS) return `Området behöver minst ${MIN_POINTS} punkter.`;
  if (polygon.length > MAX_POINTS) return `Området får ha högst ${MAX_POINTS} punkter.`;
  if (!polygon.every(isLatLng)) return "En eller flera punkter har ogiltiga koordinater.";
  if (findSelfIntersection(polygon as LatLng[])) {
    return "Områdets kanter korsar varandra. Flytta punkterna så att formen inte viker in i sig själv.";
  }
  return null;
}

export const DEFAULT_SERVICE_AREA: ServiceArea = {
  ...boundingCircle(polygonFromCircle(DEFAULT_CENTER, DEFAULT_RADIUS_KM)),
  polygon: polygonFromCircle(DEFAULT_CENTER, DEFAULT_RADIUS_KM),
};

/**
 * Lenient check, used on read. Never throws and never returns an unusable area:
 * a document with no polygon is expanded from its circle, and one with neither
 * falls back to the default. Booking must not be able to break because the
 * settings document is malformed.
 */
export function normalizeServiceArea(raw: unknown): ServiceArea {
  const src = (raw ?? {}) as Partial<ServiceArea>;

  const points = Array.isArray(src.polygon) ? src.polygon.filter(isLatLng) : [];
  if (points.length >= MIN_POINTS) {
    const polygon = points.slice(0, MAX_POINTS).map(p => ({ lat: round5(p.lat), lng: round5(p.lng) }));
    return { ...boundingCircle(polygon), polygon };
  }

  // No usable polygon — rebuild one from whatever circle the document has.
  const center: LatLng = isLatLng({ lat: src.lat, lng: src.lng })
    ? { lat: src.lat as number, lng: src.lng as number }
    : DEFAULT_CENTER;
  const radiusKm =
    isFiniteNum(src.radiusKm) && src.radiusKm > 0 ? Math.min(50, src.radiusKm) : DEFAULT_RADIUS_KM;
  const polygon = polygonFromCircle(center, radiusKm);
  return { ...boundingCircle(polygon), polygon };
}
