'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAdConsent, writeAdConsent } from '@/lib/consent';

/**
 * Consent for the ads team's Google tag.
 *
 * Deliberately low-key: a small card in the corner, no scrim, no focus trap,
 * nothing blocked. The page stays fully usable while it is open, because the
 * visitor who ignores it is already getting the privacy-preserving outcome —
 * `TrackingPixel` treats "undecided" as "denied" and loads nothing.
 *
 * What is *not* negotiable, however low-key it looks:
 *  - **Both buttons are the same size and sit side by side.** Refusing has to be
 *    as easy as accepting; a small "Avvisa" next to a big "Tillåt" is the exact
 *    dark pattern regulators fine people for. Keep them symmetrical.
 *  - **No close button and no dismiss-on-scroll.** An X would be a third,
 *    ambiguous answer that visitors read as "accept" — the whole point is a
 *    clear yes or no.
 *
 * Shown on the same routes the tag loads on (public pages only), since asking
 * about a tag that never loads there would be nonsense.
 */

function isTracked(pathname: string | null): boolean {
  if (!pathname) return false;
  return !pathname.startsWith('/admin') && !pathname.startsWith('/driver');
}

export default function CookieBanner() {
  const pathname = usePathname();
  const consent = useAdConsent();
  const [shown, setShown] = useState(false);

  const needed = consent === null && isTracked(pathname);

  // A beat before it slides in, so it does not flash during first paint and
  // land under the cursor mid-click.
  useEffect(() => {
    if (!needed) {
      setShown(false);
      return;
    }
    const t = window.setTimeout(() => setShown(true), 600);
    return () => window.clearTimeout(t);
  }, [needed]);

  // `/order` and `/kassa` have their own fixed cart bar at the bottom. This
  // lifts it while the banner is up (see `.has-consent-banner` in globals.css)
  // so the two never overlap — an ad click can land straight on /order.
  useEffect(() => {
    if (!needed) return;
    document.body.classList.add('has-consent-banner');
    return () => document.body.classList.remove('has-consent-banner');
  }, [needed]);

  if (!needed) return null;

  return (
    <div
      className={`consent-bar${shown ? ' consent-bar--in' : ''}`}
      role="region"
      aria-label="Kakor och annonsmätning"
    >
      <p className="consent-bar-text">
        Vi använder kakor för att mäta och anpassa annonser. Inget sätts förrän du valt.{' '}
        <Link href="/integritetspolicy" className="consent-bar-link">
          Läs mer
        </Link>
      </p>
      <div className="consent-bar-actions">
        <button type="button" className="consent-bar-btn" onClick={() => writeAdConsent('denied')}>
          Avvisa
        </button>
        <button
          type="button"
          className="consent-bar-btn consent-bar-btn--yes"
          onClick={() => writeAdConsent('granted')}
        >
          Tillåt
        </button>
      </div>
    </div>
  );
}
