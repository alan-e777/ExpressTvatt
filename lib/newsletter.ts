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
 */

export type NewsletterSource = 'web' | 'app';

export type NewsletterConsent = {
  newsletterConsent: boolean;
  /** ISO timestamp of the affirmative act. Null when consent was never given. */
  newsletterConsentAt: string | null;
  newsletterConsentSource: NewsletterSource | null;
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
  };
}

/** The one wording shown at signup, on both surfaces — keep them identical. */
export const NEWSLETTER_LABEL =
  'Jag vill få erbjudanden och nyheter från Express Tvätt via e-post. Kan avslutas när som helst.';
