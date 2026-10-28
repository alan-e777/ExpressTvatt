import { NextResponse } from 'next/server';
import {
  EMPTY_REVIEWS,
  fetchPlaceReviews,
  resolvePlaceId,
  type GoogleReviewsPayload,
} from '@/lib/googleReviews';

const API_KEY = process.env.GOOGLE_MAPS_API_KEY ?? '';

/**
 * Pin this in the environment. Without it the first request resolves the place
 * by name, which costs an extra billed call and trusts Google to pick the right
 * listing. The id is printed to the server log when that happens.
 */
const PLACE_ID = process.env.GOOGLE_PLACE_ID ?? '';

/** Fallback query, only used when GOOGLE_PLACE_ID is unset. */
const PLACE_QUERY = 'Expresstvätt STHLM AB, Svandammsvägen 20, 126 34 Hägersten';

/* Reviews change a few times a month at most, and Place Details with `reviews`
   is billed on the expensive SKU, so a warm server answers from memory for six
   hours and Google is asked at most four times a day. */
const TTL_MS = 6 * 60 * 60 * 1000;
const EMPTY_TTL_MS = 5 * 60 * 1000;

// Never prerendered: a build that happens before the place id is configured
// would otherwise bake "no reviews" into the deployment.
export const dynamic = 'force-dynamic';

let cache: { payload: GoogleReviewsPayload; at: number } | null = null;

/**
 * `max-age=0` on purpose — the *browser* must never hold this.
 *
 * The section hides itself when the payload is empty, and an empty payload is
 * exactly what every visitor gets until the place id is configured. Let a
 * browser cache that for six hours and those visitors keep seeing no reviews
 * long after the reviews are live. Revalidating costs them one request that a
 * warm server answers from memory; the CDN still absorbs the rest.
 *
 * An empty answer gets a short shared cache too, so a misconfiguration fixed at
 * 10:00 is not still being served from the edge at 16:00.
 */
function cached(payload: GoogleReviewsPayload) {
  const long = payload.reviews.length > 0;
  return NextResponse.json(payload, {
    headers: {
      'Cache-Control': long
        ? 'public, max-age=0, s-maxage=21600, stale-while-revalidate=86400'
        : 'public, max-age=0, s-maxage=60',
    },
  });
}

export async function GET() {
  const ttl = cache?.payload.reviews.length ? TTL_MS : EMPTY_TTL_MS;
  if (cache && Date.now() - cache.at < ttl) return cached(cache.payload);

  if (!API_KEY) {
    console.error('[reviews] GOOGLE_MAPS_API_KEY is not set');
    return cached(EMPTY_REVIEWS);
  }

  try {
    const placeId = PLACE_ID || (await resolvePlaceId(PLACE_QUERY, API_KEY));
    if (!placeId) {
      console.error(`[reviews] no Google place matched "${PLACE_QUERY}" — set GOOGLE_PLACE_ID`);
      cache = { payload: EMPTY_REVIEWS, at: Date.now() };
      return cached(EMPTY_REVIEWS);
    }

    const payload = await fetchPlaceReviews(placeId, API_KEY);
    cache = { payload, at: Date.now() };
    return cached(payload);
  } catch (err) {
    console.error('[reviews]', err);
    // Serve the last good answer rather than blanking a section that was on the
    // page a minute ago. Only a cold server with a failing upstream shows none.
    if (cache) return cached(cache.payload);
    return cached(EMPTY_REVIEWS);
  }
}
