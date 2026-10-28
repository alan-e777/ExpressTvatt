// Google reviews for the landing page, via the *new* Places API.
//
// Deliberately separate from `lib/places.ts`: that module is on the booking
// path (address autocomplete, service-area enforcement) and nothing marketing
// does should be able to break it.
//
// Two things worth knowing before changing anything here:
//
//  1. Google returns **at most five** reviews per place and offers no way to
//     ask for more, page through them or sort them. Five cards is the ceiling,
//     not a design choice.
//  2. Place Details including `reviews` is billed on a dearer SKU than the
//     address lookups, which is why the route in front of this caches hard.
//     Two refreshes a day costs nothing; one call per visitor would not.
//
// Everything throws on failure. The route turns that into an empty payload and
// the section then renders nothing at all — a laundry with no reviews showing
// is better than a broken-looking empty widget.

const BASE = 'https://places.googleapis.com/v1';

export type GoogleReview = {
  /** Stable id, used as the React key. */
  id: string;
  author: string;
  /** First letter of the author's name — we draw a letter avatar rather than
      loading the Google-hosted profile photo (see the route for why). */
  initial: string;
  rating: number;
  text: string;
  /** Google's own wording, localised: "för 2 veckor sedan". */
  relativeTime: string;
  /** ISO timestamp, for the <time> element. */
  publishedAt: string;
};

export type GoogleReviewsPayload = {
  /** Average rating across all ratings, not just the five shown. */
  rating: number;
  /** Total number of ratings the place has. */
  total: number;
  /** Link to the place's Google listing — required attribution. */
  url: string;
  reviews: GoogleReview[];
};

class PlacesError extends Error {
  constructor(readonly status: number, readonly body: string) {
    super(`Places API ${status}: ${body.slice(0, 400)}`);
    this.name = 'PlacesError';
  }
}

/**
 * Find the place id for a free-text query ("Expresstvätt, Svandammsvägen 20").
 *
 * Only used when `GOOGLE_PLACE_ID` is not set. The resolved id is logged so it
 * can be pinned in the environment — searching by name is one more billed call
 * per cold start, and it is one guess about which listing Google thinks you
 * mean. Pin it.
 */
export async function resolvePlaceId(query: string, key: string): Promise<string> {
  const res = await fetch(`${BASE}/places:searchText`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': key,
      'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress',
    },
    body: JSON.stringify({ textQuery: query, languageCode: 'sv', regionCode: 'SE' }),
  });
  if (!res.ok) throw new PlacesError(res.status, await res.text());

  const data = await res.json();
  const first = (data.places ?? [])[0];
  if (!first?.id) return '';

  console.info(
    `[reviews] resolved "${query}" → ${first.id} (${first.displayName?.text ?? '?'}, ` +
      `${first.formattedAddress ?? '?'}). Set GOOGLE_PLACE_ID to this to skip the lookup.`,
  );
  return first.id;
}

/** Rating summary plus the (up to five) reviews Google exposes for a place. */
export async function fetchPlaceReviews(placeId: string, key: string): Promise<GoogleReviewsPayload> {
  // The field mask is required and is what the call is billed on.
  const res = await fetch(`${BASE}/places/${encodeURIComponent(placeId)}`, {
    headers: {
      'X-Goog-Api-Key': key,
      'X-Goog-FieldMask': 'rating,userRatingCount,googleMapsUri,reviews',
      'X-Goog-LanguageCode': 'sv',
    },
  });
  if (!res.ok) throw new PlacesError(res.status, await res.text());
  const data = await res.json();

  const reviews: GoogleReview[] = (data.reviews ?? [])
    .map((r: any, i: number): GoogleReview => {
      const author = (r.authorAttribution?.displayName ?? '').trim();
      const text = (r.text?.text ?? r.originalText?.text ?? '').trim();
      return {
        id: r.name ?? `review-${i}`,
        author,
        initial: author.slice(0, 1).toUpperCase() || '?',
        rating: Math.round(Number(r.rating) || 0),
        text,
        relativeTime: r.relativePublishTimeDescription ?? '',
        publishedAt: r.publishTime ?? '',
      };
    })
    // A rating with no words behind it is a blank card. Drop it.
    .filter((r: GoogleReview) => r.author && r.text);

  return {
    rating: Number(data.rating) || 0,
    total: Number(data.userRatingCount) || 0,
    url: data.googleMapsUri ?? '',
    reviews,
  };
}

export const EMPTY_REVIEWS: GoogleReviewsPayload = { rating: 0, total: 0, url: '', reviews: [] };
