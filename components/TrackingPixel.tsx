'use client';

import Script from 'next/script';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

/**
 * Trlution (tlq) ads/tracking pixel — supplied by the ads team, loaded on
 * every public page from the root layout.
 *
 * Two things differ from the raw <script> tag they handed over:
 *  - It goes through next/script so it lands in <head> once and never
 *    re-runs on client-side navigation (the inline snippet guards with
 *    `if(t.tlq)return`, but React would otherwise re-inject the tag).
 *  - Next.js only loads a full page once; every Link click after that is a
 *    client-side route change, so the snippet's own `tlq('track','PageView')`
 *    fires exactly once per visit. The effect below fires it again on each
 *    route change so the ads platform sees the whole journey.
 *
 * Admin and driver are internal tools — their views are not tracked.
 */

const TLQ_PIXEL_ID = 'LS-27278812-1';
const TLQ_SCRIPT_VERSION = '1789406151199';
const TLQ_PRIMARY = `https://tralut.expresstvatt.se/js/script-dynamic.js?version=${TLQ_SCRIPT_VERSION}`;
const TLQ_FALLBACK = `https://main-57731.trlution.com/js/script-dynamic.js?version=${TLQ_SCRIPT_VERSION}`;

// Verbatim vendor loader, with the two URLs and the id lifted into constants.
const TLQ_SNIPPET = `
!function(t,l,r,o,c,k,s)
{if(t.tlq)return;c=t.tlq=function(){c.callMethod?
  c.callMethod(arguments):c.queue.push(arguments)};
  if(!t._tlq)t._tlq=c;c.push=c;c.loaded=!0;c.version='1.0';c.src=o;
  c.queue=[];k=l.createElement(r);k.async=!0;c.pd = false;c.tools = null;
  k.src=o;s=l.getElementsByTagName(r)[0];
  s.parentNode.insertBefore(k,s);k.onerror=function(){
  o='${TLQ_FALLBACK}';
  t._tlq.src=o;k=l.createElement(r);k.async=!0;k.src=o;
  s.parentNode.insertBefore(k, s)
}}(window,document,'script','${TLQ_PRIMARY}');
tlq('init', '${TLQ_PIXEL_ID}');
tlq('track', 'PageView');
`;

declare global {
  interface Window {
    tlq?: (...args: unknown[]) => void;
  }
}

function isTracked(pathname: string | null): boolean {
  if (!pathname) return false;
  return !pathname.startsWith('/admin') && !pathname.startsWith('/driver');
}

export default function TrackingPixel() {
  const pathname = usePathname();
  const tracked = isTracked(pathname);
  // The inline snippet already sends the first PageView; only route changes
  // after that need a manual one.
  const lastTracked = useRef<string | null>(null);

  useEffect(() => {
    if (!tracked || !pathname) return;
    if (lastTracked.current === null) {
      lastTracked.current = pathname;
      return;
    }
    if (lastTracked.current === pathname) return;
    lastTracked.current = pathname;
    window.tlq?.('track', 'PageView');
  }, [pathname, tracked]);

  if (!tracked) return null;

  return (
    <Script id="tlq-pixel" strategy="afterInteractive">
      {TLQ_SNIPPET}
    </Script>
  );
}
