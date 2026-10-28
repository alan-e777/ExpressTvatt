'use client';

import { useEffect, useState } from 'react';
import { IconStarFilled } from '@tabler/icons-react';
import type { GoogleReviewsPayload } from '@/lib/googleReviews';
import { getReviews } from '@/lib/reviews-client';

/**
 * Google's own listing, read live through `/api/reviews` (which caches for six
 * hours — see that route).
 *
 * Fetched from the browser rather than rendered on the server so the landing
 * page stays statically servable, and from *our* origin rather than Google's so
 * no third-party request leaves the visitor's browser before they have answered
 * the cookie banner. That is also why the reviewer's Google-hosted profile photo
 * is never loaded: a letter avatar costs no request to lh3.googleusercontent.com.
 *
 * Renders nothing at all when there is nothing to show — no reviews yet, no
 * place id configured, or Google unreachable. An empty widget looks broken;
 * an absent one looks deliberate.
 */

const GOOGLE_G = (
  <svg viewBox="0 0 48 48" aria-hidden className="lp-rev-g">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
  </svg>
);

/** Five stars, the first `n` of them gold. */
function Stars({ n, size = 14 }: { n: number; size?: number }) {
  return (
    <span className="lp-rev-stars" aria-hidden>
      {[1, 2, 3, 4, 5].map(i => (
        <IconStarFilled key={i} size={size} className={i <= n ? 'is-on' : 'is-off'} />
      ))}
    </span>
  );
}

/* Deterministic avatar tint, so the same reviewer keeps the same colour on
   every render. Pulled from the site palette rather than Google's. */
const TINTS = ['#083F41', '#6BB3AC', '#B08A28', '#3F6F72', '#7A6A3A'];
const tintFor = (name: string) =>
  TINTS[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % TINTS.length];

export default function GoogleReviews() {
  const [data, setData] = useState<GoogleReviewsPayload | null>(null);

  useEffect(() => {
    let alive = true;
    // Shared with the header, which uses the same answer to decide whether to
    // show its "Omdömen" link — one request, not two.
    getReviews().then(d => { if (alive) setData(d); });
    return () => { alive = false; };
  }, []);

  if (!data || !data.reviews.length) return null;

  const { rating, total, url, reviews } = data;

  return (
    <section className="lp-rev" id="reviews">
      <div className="lp-section-inner">

        <div className="lp-rev-head">
          <div className="lp-kicker">Omdömen</div>
          <h2 className="lp-section-title">Det kunderna säger.</h2>

          <div className="lp-rev-summary">
            {GOOGLE_G}
            <span className="lp-rev-score">{rating.toFixed(1).replace('.', ',')}</span>
            <Stars n={Math.round(rating)} size={17} />
            {total > 0 && (
              <span className="lp-rev-count">
                {total} {total === 1 ? 'omdöme' : 'omdömen'} på Google
              </span>
            )}
          </div>
        </div>

        <ul className="lp-rev-grid">
          {reviews.map(r => (
            <li key={r.id} className="lp-rev-card">
              <div className="lp-rev-card-head">
                <span className="lp-rev-avatar" style={{ background: tintFor(r.author) }} aria-hidden>
                  {r.initial}
                </span>
                <span className="lp-rev-author">{r.author}</span>
              </div>
              <Stars n={r.rating} />
              <p className="lp-rev-text">{r.text}</p>
              {(r.relativeTime || r.publishedAt) && (
                <time className="lp-rev-date" dateTime={r.publishedAt || undefined}>
                  {r.relativeTime || new Date(r.publishedAt).toLocaleDateString('sv-SE')}
                </time>
              )}
            </li>
          ))}
        </ul>

        {url && (
          <a href={url} target="_blank" rel="noopener noreferrer" className="lp-rev-all">
            Läs alla omdömen på Google
          </a>
        )}

      </div>
    </section>
  );
}
