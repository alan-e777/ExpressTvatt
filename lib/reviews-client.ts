'use client';

import type { GoogleReviewsPayload } from './googleReviews';

/**
 * One `/api/reviews` request per page load, shared by every component that
 * needs the answer.
 *
 * Two components ask: the reviews section itself, and the header — which only
 * shows the "Omdömen" link when there is actually a section to scroll to, so a
 * laundry with no reviews yet does not get a nav tab that goes nowhere.
 *
 * Deliberately *not* importing anything from `lib/googleReviews.ts` beyond the
 * type (which erases at compile time): that module is the server's Places
 * client and has no business in the browser bundle.
 */

const EMPTY: GoogleReviewsPayload = { rating: 0, total: 0, url: '', reviews: [] };

let pending: Promise<GoogleReviewsPayload> | null = null;

export function getReviews(): Promise<GoogleReviewsPayload> {
  // Memoised on the promise, not the result, so two components mounting in the
  // same tick share the one request rather than racing a second.
  pending ??= fetch('/api/reviews')
    .then(r => (r.ok ? (r.json() as Promise<GoogleReviewsPayload>) : EMPTY))
    .catch(() => EMPTY);
  return pending;
}
