/**
 * Configurable inputs to the privacy policy.
 *
 * The policy page renders these values rather than hardcoding them, so the
 * retention periods and controller details can be corrected from
 * Admin → Inställningar → GDPR without a code change.
 *
 * Defaults are deliberately long. Under GDPR you must not keep data longer than
 * necessary, but a policy that *claims* a longer period than you actually keep
 * is far safer than one that promises a short period you cannot prove you honour
 * — the second is the one that gets you fined. Shorten these only once there is
 * an actual deletion routine enforcing them.
 */
export type GdprSettings = {
  /** General customer-record retention, in years. */
  customerDataRetentionYears: number;
  /** Accounting records. Bokföringslagen requires a minimum of 7 years. */
  accountingRetentionYears: number;
  /** How long a personnummer captured for RUT-avdrag is kept, in years. */
  personnummerRetentionYears: number;
  /** Support/chat conversation retention, in months. */
  chatRetentionMonths: number;
  /** Dormant account retention before review, in years. */
  inactiveAccountRetentionYears: number;

  /** Data controller identity, shown in the policy. */
  companyName: string;
  orgNumber: string;
  postalAddress: string;
  privacyEmail: string;
  privacyPhone: string;

  /** Shown in the policy header. Bump when the text materially changes. */
  policyVersion: string;
  /** ISO date (YYYY-MM-DD). */
  lastUpdated: string;
};

export const GDPR_DEFAULTS: GdprSettings = {
  customerDataRetentionYears: 10,
  accountingRetentionYears: 7,
  personnummerRetentionYears: 10,
  chatRetentionMonths: 24,
  inactiveAccountRetentionYears: 10,

  // The legal entity behind the Express Tvätt brand. The registration number is
  // unchanged — only the registered company name changed.
  companyName: "Nya Ringens Kemiska Tvätt Aktiebolag",
  orgNumber: "556097-5640",
  postalAddress: "Svandammsvägen 20, 126 34 Hägersten",
  privacyEmail: "info@expresstvatt.se",
  privacyPhone: "08-18 00 77",

  policyVersion: "1.0",
  lastUpdated: "2026-08-12",
};

/** Clamp a retention figure to something sane before storing or rendering. */
export function clampYears(value: unknown, max = 50): number {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(n, max);
}

/** Merge stored values over the defaults, discarding anything malformed. */
export function withGdprDefaults(stored: Partial<GdprSettings> | undefined): GdprSettings {
  const s = stored ?? {};
  return {
    ...GDPR_DEFAULTS,
    ...s,
    customerDataRetentionYears:    clampYears(s.customerDataRetentionYears    ?? GDPR_DEFAULTS.customerDataRetentionYears),
    accountingRetentionYears:      clampYears(s.accountingRetentionYears      ?? GDPR_DEFAULTS.accountingRetentionYears),
    personnummerRetentionYears:    clampYears(s.personnummerRetentionYears    ?? GDPR_DEFAULTS.personnummerRetentionYears),
    inactiveAccountRetentionYears: clampYears(s.inactiveAccountRetentionYears ?? GDPR_DEFAULTS.inactiveAccountRetentionYears),
    chatRetentionMonths:           clampYears(s.chatRetentionMonths           ?? GDPR_DEFAULTS.chatRetentionMonths, 600),
  };
}
