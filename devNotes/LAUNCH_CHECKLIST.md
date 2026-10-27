# Launch checklist — the one ordered list

**Start here.** Everything else is detail hanging off this file. Last updated
**2026-10-27**.

The other docs and what they are for:

| File | What it holds |
|---|---|
| `IOS_APP_STORE.md` | The iOS app: what is proven, what is not, and the Apple runbook |
| `BEFORE_DEPLOYMENT.md` | Website security and data issues, with fixes |
| `GO_LIVE_HANDOVER.md` | The website cutover-day runbook (Stripe live keys, webhook, Maps) |
| `FIREBASE_EMAIL_TEMPLATES.md` | The password-reset email copy and why Firebase blocks editing it |
| `migration.md` (repo root) | Where the website and the app still behave differently |

---

## Where things stand in one paragraph

The **website is live** at `expresstvatt.se` on the client's **live** Stripe
account, taking real payments. The **iOS app is built, signed and installed on
the developer's own iPhone** under his personal Apple Developer membership,
pointed at production, reading the live catalogue; it is not on the App Store
and cannot be until the client's Apple account exists. Over-the-air updates are
wired, so JavaScript-only app changes ship in about a minute without a rebuild.

---

## ‼️ Things a fresh session must know before touching anything

1. **The app's source is not in git.** Every `skraddare-app/` change is
   deliberately uncommitted — the owner keeps only the website in the public
   repo. A safety snapshot lives on the local branch **`local-only/app-work`**,
   which must **never** be pushed. Refresh it after app changes; recover from it
   with `git checkout local-only/app-work -- skraddare-app`.
2. **This repository is public.** Never commit credentials, keys, team ids or
   device identifiers. Git history is permanent — see the first item below for
   what that already cost.
3. **Seven library modules exist twice** and must stay byte-identical. Run
   `npm run check:mirrors`. Never edit one side only; they decide prices.
4. **App changes reach the phone by OTA**, not a rebuild:
   `npx eas-cli update --branch preview -m "…"`. Native changes still need a
   build. Do not bump `version` in `app.json` — that breaks OTA for the
   installed build.

---

## 1. Do now — nothing blocks these

- [ ] **Rotate the two leaked passwords.** They are in public git history and
      one is the root admin. Firebase Console → Authentication → Users.
      Details and the reason the admin panel cannot do it:
      `BEFORE_DEPLOYMENT.md` → "LIVE PASSWORDS ARE IN THIS REPOSITORY'S PUBLIC
      HISTORY". **This is the single most urgent item in any of these files.**
- [ ] **Verify `RESEND_FROM` actually took in Production.** One click: Admin →
      Inställningar → notification status panel. Confirm `sandbox: false` and an
      `@expresstvatt.se` sender. If it is right, mark the item done in
      `BEFORE_DEPLOYMENT.md`. Until confirmed, assume no production email works —
      order confirmations included.
- [ ] **Restrict the Google Places API key** to iOS bundle id
      `se.expresstvatt.app` in Google Cloud Console. The key ships inside the app
      binary and can be extracted from the `.ipa`.

## 2. Decisions waiting on the owner

- [ ] **Password-reset email.** The flow works today on both surfaces and sends
      Firebase's default mail. Firebase has **blocked template editing on this
      project** ("Email template updates are currently unavailable"), so it
      cannot be made to look better there. Either open a Firebase support
      ticket, or send it through **Resend** — already a dependency, already
      sending every order email, domain already verified, free tier 3,000/month.
      See `FIREBASE_EMAIL_TEMPLATES.md`.
- [ ] **App analytics** (`migration.md` #2). The website runs the Google tag
      with Consent Mode v2; the app has nothing. **Ask the ads team whether app
      installs and in-app bookings need attribution before launch.** If yes it
      means a native SDK plus an app-side consent gate — real scope.
- [ ] **The basket empties when the app is killed** (in-memory only). Fine or
      not? A customer who takes a call mid-booking loses their basket.

## 3. Before the app can reach the App Store — needs the client's Apple account

Follow **`IOS_APP_STORE.md` → section B** step by step. The ordered summary:

- [ ] Client adds the developer to his team as **Admin** (App Manager cannot
      create certificates or push keys).
- [ ] **Release the bundle id `se.expresstvatt.app` from the developer's own
      Apple team first** — otherwise signing fails with "already in use by
      another team" and the error does not say why.
- [ ] Put the client's **live** Stripe publishable key into the EAS
      **production** environment only; leave `preview` on the test key.
- [ ] `eas credentials` signed in as the client, then
      `eas build --platform ios --profile production`.
- [ ] Create and upload an **APNs key**, or push notifications silently do
      nothing.
- [ ] App Store Connect metadata: privacy policy URL, a **demo account the
      reviewer can sign into**, the privacy nutrition label, screenshots.
- [ ] Install via TestFlight and place **one real order with a real card, then
      refund it.** The live payment path has never run end to end.

## 4. Before the app ships — independent of Apple

- [ ] **Test the "never seen running" list on the device.** It is at the top of
      `IOS_APP_STORE.md`. Everything on it typechecks and bundles but has never
      been watched working. **The highest-value check: confirm that picking an
      address actually fills in a postcode** — that was silently broken and was
      writing orders without one.
- [ ] Confirm the password-reset link completes a reset from the phone.
- [ ] Confirm account deletion works end to end (app → route → Auth user gone →
      signed out).

## 5. Website — still open

From `BEFORE_DEPLOYMENT.md` and `GO_LIVE_HANDOVER.md`:

- [ ] **Stripe production webhook** registered on the live domain for
      `payment_intent.succeeded`, `payment_intent.payment_failed` and
      `charge.refunded`, with the live `whsec_…` in env. Without it, paid orders
      never flip to paid.
- [ ] **Google Maps billing** on the owner's account — five APIs, two keys.
- [ ] **Klarna / Amazon Pay have no `return_url`**, so redirect-based payment
      methods error on pay. Either implement the return handling or disable
      those methods in Stripe.
- [ ] Legacy booking pages (`/boka`, `/struken-tvatt`) bypass the delivery fee,
      discounts and blocked-date rules.
- [ ] Rate limiting on payment and Maps autocomplete endpoints.
- [ ] `pending_payment` orders accumulate forever.

---

## Recently closed (2026-10-26 → 27)

- Admin panel redirect loop — `/admin/login` was unreachable (`0ff08d7`).
- Customer password reset — did not exist on either surface; now on both.
- Customer account deletion — App Store requires it; route plus app UI.
- The iOS app now reads the same catalogue, prices and rules as the website:
  thirteen `migration.md` entries closed in one pass.
- The duplicated pricing modules are byte-identical and checked by
  `npm run check:mirrors` instead of being kept in sync by hand.
- The native iOS build compiles and signs; the app runs on a real device.
