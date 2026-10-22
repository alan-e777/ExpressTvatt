'use client';

import Script from 'next/script';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { CONSENT_STORAGE_KEY, useAdConsent } from '@/lib/consent';

/**
 * Google tag (gtag.js) for the ads team's Google Ads account, loaded on every
 * public page from the root layout. It replaced the Trlution `tlq` pixel,
 * which never reported anything.
 *
 * **Consent Mode v2.** The tag loads for everyone, but it starts with every ad
 * signal denied and only flips to granted once the visitor accepts. Denied is
 * not cosmetic: gtag.js writes no cookies and no identifiers in that state, it
 * sends cookieless pings that let Google model the conversions it cannot
 * measure. So the ePrivacy rule that matters — nothing stored on the device
 * before consent — still holds, and the banner still governs it.
 *
 * This replaced a stricter arrangement that loaded nothing at all until the
 * visitor accepted. What settled it: Google's "Installera en Google-tagg"
 * check loads the page without answering the banner, so it never saw the tag
 * and reported the site as untagged — which is what the ads team was looking
 * at — and the strict version also gave up modelled conversions for everyone
 * who refuses or ignores the banner.
 *
 * A second argument was made at the time and has since expired, which is worth
 * recording so nobody re-derives it: the strict gate was said to be pointless
 * because `globals.css` pulled Poppins and Inter from fonts.googleapis.com on
 * every page load, so Google received the visitor's IP regardless. True then;
 * the fonts were self-hosted the same day (see `app/layout.tsx`). **gtag.js is
 * now the only thing on the site that contacts Google before consent.** The
 * decision was taken deliberately anyway, on the two grounds above and on the
 * fact that denied Consent Mode stores nothing — but if the strictest posture
 * is ever wanted, this is the file to revisit.
 *
 * Three other things differ from the raw snippet the ads team handed over:
 *  - Both halves go through next/script, so they land once and React never
 *    re-injects them. The bootstrap is rendered *before* the loader: gtag.js
 *    replays whatever is already in `dataLayer` when it starts, so the consent
 *    default has to be queued first or it would arrive after the first ping.
 *  - `gtag('js')` / `gtag('config')` sit behind a `window` flag. In dev, Fast
 *    Refresh remounts this component (and re-evaluates the module, so a ref or
 *    a module-level variable would not survive); a plain re-run would push a
 *    fresh page_view on every save. `window.__gtagBooted` outlives both.
 *  - Next.js only loads a full page once; every Link click after that is a
 *    client-side route change, so the snippet's own page_view fires exactly
 *    once per visit. The effect below re-runs `config` with the new path on
 *    each route change so Google Ads sees the whole journey.
 *
 * Admin and driver are internal tools — their views are not tracked.
 */

const GOOGLE_ADS_ID = 'AW-18517355089';

/**
 * The bootstrap reads the stored decision itself rather than waiting for
 * React. A returning visitor who already accepted is therefore granted from
 * the very first command, with no denied-then-granted flip-flop — and, more
 * importantly, no ordering race: an `update` pushed from an effect could
 * otherwise land *before* this `default` and be overwritten by it.
 *
 * `wait_for_update` holds the first ping briefly so a decision arriving a tick
 * later still counts. The parse mirrors `readAdConsent()`; anything it cannot
 * read falls through to denied, same as everywhere else.
 */
const GTAG_BOOTSTRAP = `
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
if (!window.__gtagBooted) {
  window.__gtagBooted = true;
  var granted = 'denied';
  try {
    var stored = JSON.parse(window.localStorage.getItem('${CONSENT_STORAGE_KEY}') || 'null');
    if (stored && stored.ads === 'granted') granted = 'granted';
  } catch (e) {}
  gtag('consent', 'default', {
    ad_storage: granted,
    ad_user_data: granted,
    ad_personalization: granted,
    analytics_storage: 'denied',
    wait_for_update: 500
  });
  gtag('js', new Date());
  gtag('config', '${GOOGLE_ADS_ID}');
}
`;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    __gtagBooted?: boolean;
    __gtagLastPath?: string;
  }
}

function isTracked(pathname: string | null): boolean {
  if (!pathname) return false;
  return !pathname.startsWith('/admin') && !pathname.startsWith('/driver');
}

export default function TrackingPixel() {
  const pathname = usePathname();
  const consent = useAdConsent();
  const tracked = isTracked(pathname);

  // Mirror the decision into gtag whenever it changes in this page session —
  // the banner being answered, or consent withdrawn from the privacy policy.
  // `undefined` means storage has not been read yet, and the bootstrap has
  // already covered that case, so there is nothing to say.
  useEffect(() => {
    if (!tracked || consent === undefined) return;
    const value = consent === 'granted' ? 'granted' : 'denied';
    window.gtag?.('consent', 'update', {
      ad_storage: value,
      ad_user_data: value,
      ad_personalization: value,
    });
  }, [consent, tracked]);

  useEffect(() => {
    if (!tracked || !pathname) return;
    // The bootstrap already sent the first page_view for the entry path; only
    // real route changes after that need one. Kept on `window` for the same
    // reason as __gtagBooted — a remount must not count as a navigation.
    if (window.__gtagLastPath === undefined) {
      window.__gtagLastPath = pathname;
      return;
    }
    if (window.__gtagLastPath === pathname) return;
    window.__gtagLastPath = pathname;
    window.gtag?.('config', GOOGLE_ADS_ID, {
      page_path: pathname + window.location.search,
    });
  }, [pathname, tracked]);

  if (!tracked) return null;

  return (
    <>
      {/* Order matters — see the note on GTAG_BOOTSTRAP. */}
      <Script id="gtag-init" strategy="afterInteractive">
        {GTAG_BOOTSTRAP}
      </Script>
      <Script
        id="gtag-js"
        src={`https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ADS_ID}`}
        strategy="afterInteractive"
      />
    </>
  );
}
