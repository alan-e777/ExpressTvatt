'use client';

import { resetAdConsent, useAdConsent } from '@/lib/consent';

/**
 * "Ändra ditt val" — withdrawal of ad-tracking consent, rendered in the
 * privacy policy's cookie section.
 *
 * Consent has to be as easy to take back as it was to give, and keeping the
 * control here rather than as a second button in the banner is what lets the
 * banner stay a single line. Forgetting the decision re-opens the banner, so
 * "withdraw" and "change my mind" are the same action.
 */
export default function ConsentReset() {
  const consent = useAdConsent();
  if (consent === undefined) return null; // not read yet — avoids a hydration mismatch

  const label =
    consent === 'granted' ? 'du har tillåtit' : consent === 'denied' ? 'du har avvisat' : 'inget val gjort';

  return (
    <button type="button" className="consent-reset" onClick={resetAdConsent} disabled={consent === null}>
      Ändra ditt val <span className="consent-reset-state">({label})</span>
    </button>
  );
}
