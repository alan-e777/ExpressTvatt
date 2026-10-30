/**
 * Marketing-email consent, stored on `customers/{uid}` — or, for a guest
 * checkout, on the order itself, which is the only record of that person.
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

/**
 * Where the consent was given. `guest` is a checkout with no account behind it
 * — the consent then lives on the order, since there is no `customers/{uid}`
 * document to hold it.
 */
export type NewsletterSource = 'web' | 'app' | 'guest';

/**
 * Which channels the customer actually agreed to.
 *
 * This exists because the consent text changed on 2026-10-28 from e-post only
 * to e-post *and* SMS. Reusing the boolean alone would have silently widened
 * every existing consent to a channel its owner never agreed to — so the
 * channels are recorded with the consent, and **absent means `['email']`**,
 * which is what the earlier wording asked for.
 *
 * Live phone calls are deliberately **not** here. They sit under NIX-Telefon
 * rather than marknadsföringslagen § 19, and a laundry ringing customers with
 * offers was not the intent; adding them later is a wording change plus a new
 * channel value, not a rebuild.
 */
export type NewsletterChannel = 'email' | 'sms';

/** What a consent given today covers. */
export const CURRENT_CHANNELS: NewsletterChannel[] = ['email', 'sms'];

export type NewsletterConsent = {
  newsletterConsent: boolean;
  /** ISO timestamp of the affirmative act. Null when consent is not held. */
  newsletterConsentAt: string | null;
  newsletterConsentSource: NewsletterSource | null;
  /** ISO timestamp of a later withdrawal. Null if none has happened. */
  newsletterConsentWithdrawnAt: string | null;
  /** The channels this particular consent covered. Null when none is held. */
  newsletterChannels: NewsletterChannel[] | null;
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
 * The channels a stored consent covers.
 *
 * An absent `newsletterChannels` on a held consent means it was given under
 * the e-post-only wording, so it returns `['email']` and never `['email','sms']`.
 * Texting that customer would be marketing through a channel they were never
 * asked about.
 */
export function consentChannels(
  data: { newsletterConsent?: unknown; newsletterChannels?: unknown } | null | undefined,
): NewsletterChannel[] {
  if (!hasNewsletterConsent(data)) return [];
  const raw = data?.newsletterChannels;
  if (!Array.isArray(raw) || raw.length === 0) return ['email'];
  return raw.filter((c): c is NewsletterChannel => c === 'email' || c === 'sms');
}

/** Human-readable channel list for the export: "e-post" / "e-post, SMS". */
export function channelsLabel(
  data: { newsletterConsent?: unknown; newsletterChannels?: unknown } | null | undefined,
): string {
  return consentChannels(data)
    .map(c => (c === 'email' ? 'e-post' : 'SMS'))
    .join(', ');
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
    newsletterChannels: accepted ? [...CURRENT_CHANNELS] : null,
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
    newsletterChannels: accepted ? [...CURRENT_CHANNELS] : null,
  };
}

/** The one wording shown at signup, on both surfaces — keep them identical. */
export const NEWSLETTER_LABEL =
  'Jag vill få erbjudanden och nyheter från Express Tvätt via e-post och SMS. Kan avslutas när som helst.';

/** The profile toggle's heading and explanation, likewise shared. */
export const NEWSLETTER_SETTING_TITLE = 'Erbjudanden och nyheter';
export const NEWSLETTER_SETTING_BODY =
  'Få kampanjer och nyheter från Express Tvätt via e-post och SMS. Du kan slå av det när som helst — meddelanden om dina egna ordrar påverkas inte.';
