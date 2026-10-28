/**
 * Marketing-email consent, stored on `customers/{uid}`.
 *
 * `newsletterConsent: true` is the only thing that counts as a yes. Absent,
 * null and false all mean no — every account created before this field existed
 * reads as "never asked", which is exactly right: consent that was never
 * obtained cannot be inferred from silence.
 *
 * `newsletterConsentAt` is not decoration. GDPR art. 7(1) puts the burden of
 * *demonstrating* consent on the controller, so the timestamp and the surface
 * it came from are the record that it was given, and when.
 *
 * Two rules that are not ours to relax, and that the admin UI must not be
 * changed to work around:
 *
 *  - **The box is never pre-ticked.** Consent needs a clear affirmative act
 *    (art. 4(11), recital 32); a pre-ticked box is not consent — the CJEU
 *    settled that in Planet49 (C-673/17).
 *  - **Marketing email to a consumer is opt-in** under marknadsföringslagen
 *    § 19. The separate "soft opt-in" for existing customers (§ 19 st. 2) is a
 *    different legal route with its own conditions, and this field does not
 *    implement it.
 *  - **Withdrawal must be as easy as giving it** (art. 7(3)). That is why the
 *    profile page carries a toggle on both surfaces rather than a "write to us
 *    to unsubscribe" line — and why turning it off takes effect immediately,
 *    with no confirmation step to wear the customer down.
 */

export type NewsletterSource = 'web' | 'app';

export type NewsletterConsent = {
  newsletterConsent: boolean;
  /** ISO timestamp of the affirmative act. Null when consent is not held. */
  newsletterConsentAt: string | null;
  newsletterConsentSource: NewsletterSource | null;
  /** ISO timestamp of a later withdrawal. Null if none has happened. */
  newsletterConsentWithdrawnAt: string | null;
};

/** Absent means no. Never infer a yes from a missing field. */
export function hasNewsletterConsent(data: { newsletterConsent?: unknown } | null | undefined): boolean {
  return data?.newsletterConsent === true;
}

/** The Y/N the client filters the export on. */
export function consentLabel(data: { newsletterConsent?: unknown } | null | undefined): 'J' | 'N' {
  return hasNewsletterConsent(data) ? 'J' : 'N';
}

/**
 * What a signup writes. Called with `false` too — recording an explicit "no"
 * is worth more than an absent field, because it distinguishes "declined" from
 * "signed up before we asked".
 */
export function consentFields(accepted: boolean, source: NewsletterSource): NewsletterConsent {
  return {
    newsletterConsent: accepted,
    newsletterConsentAt: accepted ? new Date().toISOString() : null,
    newsletterConsentSource: accepted ? source : null,
    // Declining at signup is not a withdrawal — there was nothing to withdraw.
    newsletterConsentWithdrawnAt: null,
  };
}

/**
 * What the profile toggle writes when a customer changes their mind later.
 *
 * Differs from `consentFields` in one way that matters: turning it off stamps
 * `newsletterConsentWithdrawnAt`. The export only reads the boolean, so the
 * row flips to N on its own — the timestamp exists so the shop can show *when*
 * someone opted out if they are ever asked to prove they stopped.
 */
export function consentChangeFields(accepted: boolean, source: NewsletterSource): NewsletterConsent {
  const now = new Date().toISOString();
  return {
    newsletterConsent: accepted,
    newsletterConsentAt: accepted ? now : null,
    newsletterConsentSource: accepted ? source : null,
    newsletterConsentWithdrawnAt: accepted ? null : now,
  };
}

/** The one wording shown at signup, on both surfaces — keep them identical. */
export const NEWSLETTER_LABEL =
  'Jag vill få erbjudanden och nyheter från Express Tvätt via e-post. Kan avslutas när som helst.';

/** The profile toggle's heading and explanation, likewise shared. */
export const NEWSLETTER_SETTING_TITLE = 'Erbjudanden och nyheter';
export const NEWSLETTER_SETTING_BODY =
  'Få e-post med kampanjer och nyheter från Express Tvätt. Du kan slå av det när som helst — mejl om dina egna ordrar påverkas inte.';
