# Integritetspolicy — underlag och antaganden

The policy itself is **not** stored here. It lives at `app/integritetspolicy/page.tsx` and is
rendered from `settings/gdpr` in Firestore, so it can be corrected from
Admin → Inställningar → GDPR without a deploy. This file records how it was derived, so a
lawyer or a future maintainer can check it against reality.

**Legal entity:** Nya Ringens Kemiska Tvätt Aktiebolag, org.nr 556097-5640.
"Express Tvätt" is the trading name; the policy states this explicitly in both languages.

---

## Data map found in the code

| Data | Where it is captured | Where it ends up |
|---|---|---|
| Name, email, phone | `/profil` registration, `/kassa` checkout | `customers/{uid}`, `orders/{id}` |
| Password | Firebase Auth | Google (hashed; never visible to us) |
| Street address, postcode, delivery note | `/kassa`, saved addresses in `/profil` | `customers/{uid}.addresses`, `orders/{id}` |
| **Personnummer** | `/kassa` RUT field, `/profil` saved RUT | `customers/{uid}.personnummer`, `orders/{id}.rutPersonnummer`, **and Stripe PaymentIntent metadata** |
| Order contents, amounts, discounts, times, free-text notes | `/kassa` | `orders/{id}` |
| Payment reference, amount, status | Stripe | `orders/{id}`; card data never touches our servers |
| Chat messages | `/chatt` | Realtime Database `chats/{uid}` |
| Push token | Expo app | `customers/{uid}.pushTokens` |
| IP / device | implicit | Vercel platform logs |

## Processors named in the policy

Google (Firebase/Cloud), Stripe, Vercel, Resend, 46elks, Google Maps Platform, Expo,
and Skatteverket for RUT reporting. All are referenced in code or `package.json`.

## Findings that shaped the wording

- **Firestore is in `europe-north2` (Stockholm); RTDB in `europe-west1` (Belgium).** Verified via
  the Firestore Admin API, not assumed. The policy can therefore state EU residency for the
  databases rather than falling back to the generic "may be transferred outside the EU/EEA".
  The transfer clause is retained only for Stripe/Vercel support and processing.
- **No analytics, no advertising pixels, no third-party trackers.** True when the policy was
  drafted; **no longer true, and the policy has not caught up.** `components/TrackingPixel.tsx`
  now loads the ads team's Google tag (gtag.js, `AW-18517355089`) on every public page — see
  `migration.md` #14. gtag.js sets its own cookies (`_gcl_*`, and `_ga` if Analytics is linked)
  and they are **not** strictly necessary, so the conditional in the original finding has
  fired. **All three have since been done (2026-10-21)**: section 8 of the policy names the
  cookies and states consent as the basis, Google Ireland Limited is in both processor lists,
  and no cookie or identifier is stored until the visitor accepts (`components/CookieBanner.tsx`,
  `lib/consent.ts`). **Since 2026-10-22 the tag itself does load on every page**, under Consent
  Mode v2 with every ad signal denied until consent — storage stays off, which is what the
  ePrivacy rule is about, and the policy's section 8 says so in both languages. The related finding this turned up —
  that `app/globals.css` pulled Poppins and Inter from fonts.googleapis.com on every page load,
  contacting Google before consent regardless of the tag — **was fixed the same day** by moving
  both families to `next/font/google`, which serves them from our own origin. gtag.js under
  denied Consent Mode is therefore the only pre-consent third-party call left on the site. The only first-party cookie before consent is still `admin-session`
  (httpOnly, admin interface only), plus Firebase auth state in browser storage — both
  strictly necessary. **If another tag is ever added, bump `CONSENT_VERSION` so every visitor
  is asked again; consent is per purpose, and the stored yes does not carry over.**
- **No automated decision-making or profiling** exists in the code, so the policy states none.
- **No deletion job, TTL or retention enforcement exists anywhere.** Retention periods in the
  policy are therefore statements of intent, not of enforced behaviour (see risk below).
- **Fonts no longer reach Google (fixed 2026-10-22).** `app/globals.css` used to open with two
  `@import url('https://fonts.googleapis.com/css2?...')` lines for Poppins and Inter. Because
  `globals.css` is imported by `app/layout.tsx`, every page load — public, admin and driver —
  sent the visitor's IP to Google *before* the cookie banner had been answered, which undercut
  the whole point of gating the ads tag behind consent. Both families are now declared with
  `next/font/google` in `app/layout.tsx` and exposed as `--font-poppins` / `--font-inter`:
  Next downloads the files at build time and serves them from our own origin. Verified with
  `performance.getEntriesByType('resource')` — zero requests to `fonts.googleapis.com` or
  `fonts.gstatic.com` on the landing page, `/order` and `/admin`. **Nothing is contacted
  pre-consent any more**, so the policy may say so plainly.

## Assumptions made due to incomplete code visibility

- Retention periods are **declared, not enforced**. Nothing in the codebase deletes customer data
  on a schedule. The figures are deliberately long so the policy is not contradicted by practice.
- Sub-processor list assumes each named provider may process any data passed to it, since no
  data-minimisation is applied per provider.
- Stripe and Vercel are assumed to involve some non-EU processing/support; neither was confirmed
  in code, and this is the defensible assumption.
- "Legitimate interest" is used in preference to consent wherever plausible, since consent is
  withdrawable and would otherwise block ordinary operation.

## Open items for a human before/after launch

1. **`[NEEDS INPUT]` — verify the registered address.** The policy uses Svandammsvägen 20,
   126 34 Hägersten, taken from the site footer. Confirm this is the *registered* address of
   Nya Ringens Kemiska Tvätt Aktiebolag, not just the shop.
2. **`[NEEDS INPUT]` — a dedicated privacy contact.** Currently `info@expresstvatt.se`. Fine
   legally, but a separate address is easier to manage if a request ever arrives.
3. **Personnummer is sent to Stripe as PaymentIntent metadata**
   (`app/api/create-cart-payment/route.ts`, `rutPersonnummer`). This is disclosed in the policy,
   but it is almost certainly unnecessary — RUT is reported by the business to Skatteverket, not
   by Stripe. Removing it would shrink the personnummer footprint considerably and is the single
   highest-value privacy improvement available. **Recommended.**
4. **No erasure mechanism.** A customer exercising their right to erasure must currently be
   handled by hand in the Firebase console. At low volume that is acceptable; it should not stay
   that way indefinitely.
5. **No deletion routine backing the stated retention periods.** Once real orders exist, either
   implement deletion or keep the declared periods long.
