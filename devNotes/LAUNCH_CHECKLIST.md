# Launch checklist — the one ordered list

**Start here.** Everything else is detail hanging off this file. Last updated
**2026-10-30**.

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

- [x] ~~Rotate the two leaked passwords.~~ **Done 2026-10-27.**
- [ ] **Verify `RESEND_FROM` actually took in Production.** One click: Admin →
      Inställningar → notification status panel. Confirm `sandbox: false` and an
      `@expresstvatt.se` sender. If it is right, mark the item done in
      `BEFORE_DEPLOYMENT.md`. Until confirmed, assume no production email works —
      order confirmations included.
- [ ] **Do NOT restrict the Google key to the iOS bundle id** — the old wording
      of this item was wrong and following it would break the live website.
      `EXPO_PUBLIC_GOOGLE_PLACES_API_KEY` is referenced nowhere in the app, so it
      is never inlined into the binary and there is nothing to protect; and it is
      the *same* key (`GOOGLE_MAPS_API_KEY`) the website uses server-side in
      `places/autocomplete`, `places/details`, `lib/geocode.ts` and the two
      driver routes, where a bundle-id restriction rejects every call. App-side
      action is to delete the variable:
      `npx eas-cli env:delete <env> --variable-name EXPO_PUBLIC_GOOGLE_PLACES_API_KEY`
      for both `preview` and `production`, and drop the line from `.env` /
      `.env.production`. Restricting the key is then a **website** task and needs
      two keys, because `admin/settings` ships it to the browser for the map.

- [ ] **Turn the Google reviews strip on.** The landing page has one
      (`components/GoogleReviews.tsx` → `GET /api/reviews`) and it renders
      **nothing at all** until Google answers with reviews, which is the state
      it shipped in. Two steps:
      1. Put the business's Google place id in `GOOGLE_PLACE_ID` (env, local
         *and* Vercel). Without it the route falls back to a Text Search by
         name, which costs an extra billed call and may match the wrong listing.
      2. The existing `GOOGLE_MAPS_API_KEY` currently answers **403
         PERMISSION_DENIED** for both Text Search and Place Details-with-reviews
         — reviews are on the **Places API (New) Enterprise** SKU, a different
         one from the address lookups. Enable it for the key in Google Cloud and
         check the key's API restrictions.
      Verify with `curl https://expresstvatt.se/api/reviews` — a non-empty
      `reviews` array means the section is live. Server logs print the resolved
      place id and the exact Google error.
      **The nav's "Omdömen" tab is tied to this**: the header only shows it when
      the API returns reviews, so it is invisible today and appears by itself
      the moment the key works. Nothing to deploy for it.
      *(Owner, 2026-10-28: this is part of a wider backlog of API-key work —
      Vercel will not display an already-saved value, so which keys are actually
      set where has to be re-established by hand.)*
- [ ] **Confirm the company name and org.nr with the client.** The site now says
      **Expresstvätt STHLM AB** (ads team's request, 2026-10-28) while keeping
      **556097-5640**, on the assumption this is the same legal entity renamed.
      If it is a *different* company, the org.nr, the address and the privacy
      policy's controller all have to change with it. Note also that
      `lib/gdpr.ts` only sets the **default** — a name saved through Admin →
      Inställningar → GDPR overrides it, so check there as well.

- [ ] **Before the client sends a single ad mail, they need an unsubscribe
      mechanism.** The signup checkbox and the CSV export (Orders → "Alla kunder
      (CSV)") are in place, but every marketing email must carry a working
      opt-out (marknadsföringslagen § 20, and the consent is only valid while it
      can be withdrawn — GDPR art. 7(3)). Whatever tool the client mails from
      (Mailchimp, Brevo, Resend broadcasts…) has to supply that link, **and
      someone has to act on the unsubscribes** — there is no automatic path back
      into Firestore. **This is now built** (2026-10-28) and needs **one
      env var** to switch on:

      1. `openssl rand -hex 32`, and put the result in `UNSUBSCRIBE_SECRET` —
         local `.env.local` *and* Vercel Production. **Set it once and never
         change it**: rotating it breaks every unsubscribe link already sent.
      2. Export the CSV and check the **`Avregistreringslänk`** column has a
         URL in it. Empty means the secret is missing — the code deliberately
         ships no link rather than one that fails.
      3. Tell the client to use that column as the unsubscribe merge field in
         whatever they send from. It needs no login, works forever, and writes
         `newsletterConsent: false` straight back — so the next export shows
         that person as N without anyone doing anything by hand.

      Customers can also switch it off themselves under Profil → Utskick, on
      both the website and the app.
      **The consent covers SMS as well as e-post since 2026-10-28.** Two things
      follow. First, marketing SMS needs its own opt-out — the convention is a
      STOP keyword handled by the sending tool (46elks is already a dependency
      for order SMS), and like the e-post link it does not write back to
      Firestore on its own. Second, read the export's **`Kanaler`** column
      before any SMS campaign: a row that says J / `e-post` consented under the
      older wording and **must not be texted**. Nothing in this repo *sends* marketing
      email; the export and the opt-out are the whole feature.
      Verify once live: open an unsubscribe URL from the CSV, confirm the page
      says "Du är avregistrerad", then re-export and confirm that row is N.

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
      been watched working. **Confirmed 2026-10-27:** postcode capture, service-area
      rejection, Minsta antal, and that a hidden category stays out of the app.
      Password reset and blocked dates are confirmed too. The per-item RUT
      arithmetic is confirmed on the web and the app feeds the same inputs to the
      same module. **What is left is the 0 kr test-order path, the
      `requiresInput` note field and account deletion.** None of it needs Stripe: the
      order row is written before the card is touched, so reaching the payment
      screen and leaving it lets you compare the `pending_payment` order's
      `amount` / `rutRefundOre` in the admin panel (clear the status filter —
      `pending_payment` is not one of its options) against what the app showed.

      **Mattvätt is `hidden: true`**, so the m² slider cannot be tested and no
      rug can be ordered on either surface. Un-hide and test it if rug cleaning
      is meant to sell at launch.
- [x] ~~Confirm the password-reset link completes a reset from the phone.~~ **Done 2026-10-27.**
- [ ] Confirm account deletion works end to end (app → route → Auth user gone →
      signed out).

## 5. Website — still open

From `BEFORE_DEPLOYMENT.md` and `GO_LIVE_HANDOVER.md`:

- [ ] **Stripe production webhook** registered on the live domain for
      `payment_intent.succeeded`, `payment_intent.payment_failed` and
      `charge.refunded`, with the live `whsec_…` in env. Without it, paid orders
      never flip to paid.
- [ ] **Google Maps billing** on the owner's account — five APIs, two keys.
- [x] ~~**Klarna / Amazon Pay have no `return_url`**.~~ **Verified done
      2026-10-30** — `app/kassa/page.tsx` passes
      `return_url: <origin>/order-bekraftelse`, and that page calls
      `/api/confirm-order` so a redirect-based payment settles like any other.
      *(The iOS app's `CartPaymentScreen` still passes none — app only.)*
- [x] ~~Legacy booking pages bypass the delivery fee, discounts and
      blocked-date rules.~~ **Verified done 2026-10-30** — `/boka`,
      `/struken-tvatt` and `/struken-tvatt/boka` are six-line redirect stubs to
      `/order`.
- [x] ~~`POST /api/create-payment` was still live.~~ **Deleted 2026-10-30.**
      Nothing had called it since the `/order → /kassa` rework; its only caller,
      `components/CheckoutWrapper.tsx`, was orphaned and went with it. It took
      unauthenticated orders that skipped the delivery fee, discounts, RUT,
      blocked dates, minimum quantities and the service-area check. The price
      itself was read from Firestore, so it was never a tampering hole.
      An **older** app build did call it (snapshot `82b6e81`, which still had
      `PaymentScreen`); the current app calls only `/api/create-cart-payment`,
      and the app is on the developer's phone alone, so nothing customer-facing
      could regress. If that phone still runs a pre-rework bundle, one OTA
      brings it current.
- [ ] **Rate limiting on payment and Maps autocomplete endpoints.** Still open,
      and `/api/places/autocomplete` is open to the world — every call is
      billable Google spend, so this is a cost risk once ads drive traffic.
- [ ] `pending_payment` orders accumulate forever. Cosmetic; note that any such
      order whose Stripe intent says *Succeeded* is money with no usable order,
      and the reconcile sweep only looks back 48 hours.

---

## Recently closed (2026-10-26 → 28)

- **Admin logout sent every admin to `http://localhost:3000/admin/login`**
  (2026-10-28). The route built an absolute redirect from
  `NEXT_PUBLIC_BASE_URL`, a variable set nowhere in this project, so the
  hard-coded localhost fallback was used in production too. It also answered
  307, which preserves the POST method, so even on the right host the browser
  would have re-POSTed to a page that only answers GET. Now a relative
  `Location` with status 303.

- Two credentials that had been committed early on and were still readable in
  this repo's public history were **rotated**. See `BEFORE_DEPLOYMENT.md`.
- Admin panel redirect loop — `/admin/login` was unreachable (`0ff08d7`).
- Customer password reset — did not exist on either surface; now on both.
- Customer account deletion — App Store requires it; route plus app UI.
- The iOS app now reads the same catalogue, prices and rules as the website:
  thirteen `migration.md` entries closed in one pass.
- The duplicated pricing modules are byte-identical and checked by
  `npm run check:mirrors` instead of being kept in sync by hand.
- The native iOS build compiles and signs; the app runs on a real device.
