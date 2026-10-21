'use client';

import Script from 'next/script';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { useAdConsent } from '@/lib/consent';

/**
 * Google tag (gtag.js) for the ads team's Google Ads account — loaded on every
 * public page from the root layout, once the visitor has consented. It replaced
 * the Trlution `tlq` pixel, which never reported anything.
 *
 * Four things differ from the raw <script> tags they handed over:
 *  - **Nothing loads until consent is granted.** gtag.js writes advertising
 *    cookies, so it may not run before the visitor says yes. Note what this
 *    rules out: loading gtag.js up front with `ad_storage: 'denied'` and
 *    flipping it afterwards. That is Google's own recommendation and it buys
 *    conversion modelling, but it still sends a request carrying the visitor's
 *    IP to Google before they have agreed to anything. Not loading at all is
 *    the defensible reading; the cost is no modelled conversions for visitors
 *    who refuse. If the ads team wants that trade the other way round, it is a
 *    deliberate decision for the owner to make, not a default to drift into.
 *  - Both halves go through next/script, so the loader lands in <head> once and
 *    React never re-injects it.
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

// Vendor snippet, with the measurement id lifted into a constant, Consent Mode
// v2 signals added (Google Ads needs them to count EEA traffic at all) and the
// one-shot calls guarded. `gtag` itself is (re)defined unconditionally: it has
// to exist as a global even if the script somehow runs twice.
//
// This only ever runs after a yes, so the defaults it declares are 'granted'.
// `analytics_storage` stays denied — there is no Analytics property here, and a
// signal we have not asked the visitor about is not ours to grant.
const GTAG_BOOTSTRAP = `
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
if (!window.__gtagBooted) {
  window.__gtagBooted = true;
  gtag('consent', 'default', {
    ad_storage: 'granted',
    ad_user_data: 'granted',
    ad_personalization: 'granted',
    analytics_storage: 'denied'
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
  // `undefined` (not yet read) and `null` (not yet answered) both mean no.
  const active = consent === 'granted' && isTracked(pathname);

  useEffect(() => {
    if (!active || !pathname) return;
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
  }, [pathname, active]);

  // Withdrawal mid-visit. The script cannot be unloaded from a page that
  // already has it, so tell it to stop storing; `resetAdConsent` has meanwhile
  // deleted the cookies it set. Both halves are needed — one stops new writes,
  // the other removes the old ones.
  useEffect(() => {
    if (consent !== 'granted' && window.__gtagBooted) {
      window.gtag?.('consent', 'update', {
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied',
      });
    }
  }, [consent]);

  if (!active) return null;

  return (
    <>
      <Script
        id="gtag-js"
        src={`https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ADS_ID}`}
        strategy="afterInteractive"
      />
      <Script id="gtag-init" strategy="afterInteractive">
        {GTAG_BOOTSTRAP}
      </Script>
    </>
  );
}
