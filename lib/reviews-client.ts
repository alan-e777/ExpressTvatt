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

/**
 * TEMPORARY (2026-11-01) — the whole reviews feature is switched off here.
 *
 * The Google listing that currently resolves is **not the client's business**,
 * so the landing page was showing a stranger's reviews. Flipping this back to
 * `true` restores both the section and the header's "Omdömen" tab at once:
 * they both read this one function, and both already treat an empty payload as
 * "nothing to show". Nothing else needs touching.
 *
 * Short-circuiting here rather than deleting the markup also stops the
 * `/api/reviews` call being made at all, so the billed Places request goes too.
 *
 * Before turning it back on, confirm `GOOGLE_PLACE_ID` points at the client's
 * own listing. See CLAUDE.md, "Temporarily disabled".
 */
const REVIEWS_ENABLED = false;

let pending: Promise<GoogleReviewsPayload> | null = null;

export function getReviews(): Promise<GoogleReviewsPayload> {
  if (!REVIEWS_ENABLED) return Promise.resolve(EMPTY);

  // Memoised on the promise, not the result, so two components mounting in the
  // same tick share the one request rather than racing a second.
  pending ??= fetch('/api/reviews')
    .then(r => (r.ok ? (r.json() as Promise<GoogleReviewsPayload>) : EMPTY))
    .catch(() => EMPTY);
  return pending;
}
