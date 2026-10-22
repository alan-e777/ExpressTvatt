'use client';

import { useEffect, useState } from 'react';

/**
 * Ad-tracking consent — the single source of truth.
 *
 * The site loads the ads team's Google tag (see `components/TrackingPixel.tsx`),
 * which writes advertising cookies (`_gcl_*`). Those are not strictly necessary,
 * so ePrivacy / LEK 2022:482 ch. 9 § 28 requires **prior** consent: nothing may
 * be stored before the visitor has said yes.
 *
 * Therefore:
 *  - `null` (no decision yet) must behave exactly like `'denied'`. Every caller
 *    treats "not decided" as "do not load", so a visitor who ignores the banner
 *    is never tracked.
 *  - A blocked or full `localStorage` also reads back as `null`, which fails
 *    closed: the banner reappears next visit rather than the tag loading on a
 *    consent we cannot actually prove was given.
 *
 * The key is versioned. If what the tag does changes — another vendor, another
 * purpose — bump `CONSENT_VERSION`; every stored decision stops matching and
 * every visitor is asked again, which is what a change of purpose requires.
 */

export type AdConsent = 'granted' | 'denied';

export const CONSENT_VERSION = 1;
/**
 * Exported because `TrackingPixel`'s inline bootstrap has to read this key
 * synchronously, before React has run, to decide what consent state gtag.js
 * starts in. That snippet is a string, so it cannot call `readAdConsent()` —
 * interpolating the key is what keeps the two from drifting apart.
 */
export const CONSENT_STORAGE_KEY = `consent.ads.v${CONSENT_VERSION}`;
const STORAGE_KEY = CONSENT_STORAGE_KEY;

/** Fired on `window` whenever the decision changes, so the tag can react without a reload. */
export const CONSENT_EVENT = 'expresstvatt:adconsent';

type StoredConsent = { v: number; ads: AdConsent; at: string };

/** The decision, or `null` when none has been made (or storage is unreadable). */
export function readAdConsent(): AdConsent | null {
  if (typeof window === 'undefined') return null;
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null; // private mode / storage blocked — fail closed
  }
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as StoredConsent;
    if (parsed?.v !== CONSENT_VERSION) return null;
    return parsed.ads === 'granted' || parsed.ads === 'denied' ? parsed.ads : null;
  } catch {
    return null; // corrupt value — ask again rather than guess
  }
}

export function writeAdConsent(ads: AdConsent): void {
  if (typeof window === 'undefined') return;
  const value: StoredConsent = { v: CONSENT_VERSION, ads, at: new Date().toISOString() };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // Unwritable storage is not a reason to refuse the click: the decision still
    // applies to this page session, it just will not be remembered next visit.
  }
  if (ads === 'denied') clearAdCookies();
  window.dispatchEvent(new CustomEvent<AdConsent>(CONSENT_EVENT, { detail: ads }));
}

/** Forget the decision so the banner asks again — what "withdraw consent" needs. */
export function resetAdConsent(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* nothing to remove */
  }
  clearAdCookies();
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: null }));
}

/**
 * Drop the cookies gtag.js set while consent was held.
 *
 * Withdrawing has to actually remove what was stored, not just stop writing
 * more. gtag.js cannot be unloaded from a page that already has it, so the
 * caller also pushes `gtag('consent','update', …denied)`; together that stops
 * new writes and clears the old ones. A host cookie has to be expired on the
 * same path/domain pair it was set with, and we do not know which was used, so
 * every plausible pair is tried — an expiry on a cookie that does not exist is
 * a no-op.
 */
function clearAdCookies(): void {
  if (typeof document === 'undefined') return;
  const names = document.cookie
    .split(';')
    .map((c) => c.split('=')[0]?.trim())
    .filter((n): n is string => !!n && (n.startsWith('_gcl') || n === '_ga' || n.startsWith('_ga_')));
  if (names.length === 0) return;

  const host = window.location.hostname;
  // `example.com` and `.example.com`, plus the registrable parent for a www host.
  const domains = ['', host, `.${host}`];
  const parent = host.split('.').slice(-2).join('.');
  if (parent && parent !== host) domains.push(parent, `.${parent}`);

  for (const name of names) {
    for (const domain of domains) {
      document.cookie =
        `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/` +
        (domain ? `; domain=${domain}` : '');
    }
  }
}

/** Subscribe to decision changes. Returns an unsubscribe function. */
export function subscribeAdConsent(fn: (ads: AdConsent | null) => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const handler = (e: Event) => fn((e as CustomEvent<AdConsent | null>).detail ?? null);
  window.addEventListener(CONSENT_EVENT, handler);
  return () => window.removeEventListener(CONSENT_EVENT, handler);
}

/**
 * The decision as React state, resolved after mount.
 *
 * It deliberately starts as `undefined` ("not yet known") rather than `null`
 * ("asked, no answer"): the server cannot read `localStorage`, so the first
 * client render must match the server's and show neither the banner nor the
 * tag. Once the effect has run, `undefined` is gone for good — `null` then
 * genuinely means undecided.
 */
export function useAdConsent(): AdConsent | null | undefined {
  const [consent, setConsent] = useState<AdConsent | null | undefined>(undefined);

  useEffect(() => {
    setConsent(readAdConsent());
    return subscribeAdConsent(setConsent);
  }, []);

  return consent;
}
