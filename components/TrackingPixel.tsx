'use client';

import Script from 'next/script';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

/**
 * Google tag (gtag.js) for the ads team's Google Ads account — loaded on every
 * public page from the root layout. It replaced the Trlution `tlq` pixel, which
 * never reported anything.
 *
 * Three things differ from the raw <script> tags they handed over:
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

// Vendor snippet, with the measurement id lifted into a constant and the
// one-shot calls guarded. `gtag` itself is (re)defined unconditionally: it has
// to exist as a global even if the script somehow runs twice.
const GTAG_BOOTSTRAP = `
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
if (!window.__gtagBooted) {
  window.__gtagBooted = true;
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
  const tracked = isTracked(pathname);

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
