# iOS App Store — launch blockers & readiness

Audit of `skraddare-app/` begun **2026-10-26**, ahead of getting access to the
client's Apple Developer account. Companion to `BEFORE_DEPLOYMENT.md`, which
covers the website, and to `migration.md`, which tracks web ↔ app divergence.

**Build path: Expo + EAS Build (cloud).** There is no Xcode on the dev machine
(`xcode-select` points at Command Line Tools only), so `expo run:ios` cannot
work locally. EAS compiles on Expo's own Macs and needs no local Xcode. This is
also why Expo Go failed in earlier attempts: the app has custom native modules
(Stripe), which Expo Go cannot load by design.

---

## 📍 Where the app stands — read this first (as of 2026-10-27)

**The app is built, signed and installed on the developer's own iPhone**, under
his personal Apple Developer Program membership. It talks to production
(`https://expresstvatt.se`) and reads the live catalogue.

### Project coordinates

| | |
|---|---|
| Expo project | `@calleexpressapp/express-tvatt` |
| EAS project id | `ab22f4f3-df93-4d46-9e7b-4c60da187957` |
| Bundle identifier | `se.expresstvatt.app` |
| Currently signed by | the developer's own Individual Apple team — temporary, see **A2** |
| App version / runtime | `1.0.0` (runtimeVersion policy `appVersion`) |
| Build profiles | `simulator` · `preview` (device) · `production` (store) |
| OTA | configured; channel `preview` → branch `preview`, two updates published |

### Confirmed working on a real device

Seen on the phone, not merely compiled: the app launches, signs in, loads the
live catalogue, shows categories with the admin's own icons and subtitles,
builds a basket, reaches checkout, and renders the booking summary with the
first-time discount, delivery fee and the admin's time windows. OTA updates
reach it.

### Written and verified to compile — but never seen running

**Treat every item here as unproven.** It typechecks, bundles and follows the
website's logic, but no one has watched it work on a device:

- the amount sheet for per-kg / per-m² products, and the `amount` it sends
- the Mattvätt m² slider and its area-based line ids
- "Minst N st" badges and the add/remove rules around a minimum
- per-item RUT maths (`rutEligibleTotalKr`) in both the basket and checkout
- admin-blocked dates greying out in the date picker
- `outsideArea` rejection for an address outside the drawn polygon
- **whether a picked address now actually captures a postcode** — this was
  silently broken before and is the single most important thing to confirm
- the 0 kr test-order path and the admin-only gate on 0 kr tiles
- the note field for categories with `requiresInput`
- account deletion end to end (app → route → Auth user gone → signed out)
- push notifications — never tested, and cannot be until **C** is done

### Known rough edges, not yet fixed

- **A measured line cannot be decremented from its tile.** Per-kg, per-m² and
  noted products can produce several lines from one product, so the tile only
  adds; removing is done in the basket sheet. Deliberate, but a customer may
  look for a "−" on the tile and not find one.
- **A discounted tile is taller than its neighbours**, because the footer
  stacks strike-price, price and unit on three lines. Rows stretch to match, so
  it looks intentional, but it is uneven.
- **The basket is in-memory only.** Killing the app empties it. That is the
  pre-existing behaviour and matches `lib/cart.tsx`'s comment, but it is worth
  a decision before launch — a customer who takes a call mid-booking loses it.
- **`/api/create-payment` may now have no caller at all.** The app's legacy
  single-service screens were deleted; the website dropped that flow earlier.
  It is on CLAUDE.md's do-not-touch list, so it was left alone — someone should
  confirm it is dead before it is removed.
- **Android is not maintained.** `app.json` still carries an Android block and
  the icons are the old Expo template. The app is iOS-only; if Android is ever
  wanted, that block needs real artwork and a test pass.
- **Node 23 locally**, which Expo does not officially support (20 or 22 LTS).
  Everything builds, but EAS uses its own Node, so this only affects local
  commands.

### ⚠️ All app changes are uncommitted

Per the owner's instruction, nothing under `skraddare-app/` has been committed —
only the website half is in git. A day of work therefore exists **solely in the
working tree**: modified screens, libs and components, four deleted legacy
screens, plus untracked `eas.json` and `.env.production`.

`git stash`, `git checkout .`, a bad merge or a disk failure would lose all of
it, and it cannot be recovered from GitHub. **Worth a local-only commit on a
branch that is never pushed, or a copy of the folder outside the repo.**

---

## ✅ Fixed in this pass (2026-10-26)

### ~~1. App icon was the default Expo placeholder~~ ✅ Done

`assets/icon.png` was the blue "A" template icon with alignment guides — an
automatic rejection, and the wrong brand besides (it predated the Express Tvätt
rebrand). Regenerated from `public/logo-icon.png` at 1024×1024, flattened onto
white with **no alpha channel** (an alpha channel is itself a rejection).
`assets/splash-icon.png` regenerated from the same mark.

### ~~2. App was named `skraddare-app` everywhere~~ ✅ Done

`name` is now **Express Tvätt**, slug `express-tvatt`. The home-screen label
(`CFBundleDisplayName`) reads "Express Tvätt".

### ~~3. Bundle identifier was Expo's placeholder~~ ✅ Done

Was `com.anonymous.skraddare-app`. Now **`se.expresstvatt.app`**.

> ⚠️ **Confirm this before the first App Store Connect registration.** A bundle
> ID is permanent once an app record exists — changing it later means a new app
> record, a new TestFlight, and losing the listing.

### ~~4. No in-app account deletion~~ ✅ Done

App Store guideline **5.1.1(v)**: an app that can create an account must be able
to delete it in-app. `AuthScreen` creates accounts; `ProfileScreen` only deleted
*addresses*. This is one of the most common rejection reasons there is.

Added:
- `app/api/account/delete/route.ts` — verifies the customer's Firebase ID token
  (`Authorization: Bearer …`, same pattern as `/api/first-time-eligibility`),
  then deletes `customers/{uid}`, removes `chats/{uid}` from the Realtime
  Database, and deletes the Auth user.
- Server-side on purpose. The client SDK's `deleteUser()` fails with
  `auth/requires-recent-login` for anyone who did not just sign in — i.e. almost
  everyone — which would force a password prompt mid-deletion.
- **Orders are anonymised, not deleted.** Bokföringslagen requires the
  accounting record to survive 7 years, so amounts, dates and line items stay
  while `customerName`, `customerEmail`, `customerPhone`, `careOf`, `address`,
  `postalCode`, `notes` and `rutPersonnummer` are cleared and `customerId`
  becomes `"deleted"`.
- **Refuses while an order is active** (`paid`, `collected`, `in_progress`,
  `ready_for_pickup`) with HTTP 409 and a Swedish explanation — otherwise the
  laundry would be holding clothes for a customer with no contact details.
- App side: "Radera konto" at the bottom of `ProfileScreen`, behind a two-step
  confirmation, plus an "Integritetspolicy" link to the website's policy page.

### ~~5. Customers were signed out on every app restart~~ ✅ Done

`lib/firebase.ts` used `getAuth(app)`. On React Native that keeps the session in
memory only, so killing the app logged the customer out. Now uses
`initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) })`
with `@react-native-async-storage/async-storage`.

Note the import is `@ts-expect-error`-suppressed: `firebase/auth` ships the
*browser* typings, while Metro resolves the *React Native* build at runtime (via
`@firebase/auth`'s `react-native` export condition). Verified by inspecting the
produced Hermes bundle — `getReactNativePersistence` and the `reactNative`
persistence type are present; `indexedDBLocalPersistence` and
`browserLocalPersistence` are absent.

### ~~6. The autolinking patch — removed entirely~~ ✅ Done

`patches/expo-modules-autolinking+3.0.26.patch` rewrote the generated
`ExpoModulesProvider.swift` to emit `internal import Expo` instead of
`import Expo`. It was wrong in two separate ways.

**First**, it had been applied **by hand** to `node_modules`, with no
`patch-package` installed and no `postinstall` script. A clean install would
have silently dropped it.

**Second — and this is what actually killed the first EAS build** — the patch
was the *cause* of a failure, not a fix for one. The "Run fastlane" step failed
with:

```
ambiguous implicit access level for import of 'Expo';
it is imported as 'internal' elsewhere
```

Two files compile into the same module and have to agree:

| File | Import |
|---|---|
| `ios/<app>/AppDelegate.swift` (generated by prebuild) | `import Expo` |
| `ExpoModulesProvider.swift` (rewritten by the patch) | `internal import Expo` |

Upstream `expo-modules-autolinking` emits plain `import Expo`, which matches
`AppDelegate.swift`. The patch broke that agreement, and Swift 6 rejects the
inconsistency. It was also written against **3.0.26** while **3.0.28** is what
`expo@54.0.37` resolves to.

**The patch is gone.** `patches/` is empty and `node_modules` is back to
upstream. Verified after a clean prebuild + `pod install`: both files now say
`import Expo`, and `internal import` appears nowhere. The JS bundle hash was
unchanged by the removal, confirming it only ever affected native codegen.

The original patch is kept outside the repo, at
`scratchpad/removed-patch/`, in case the problem it was written for ever
resurfaces — but it was never needed on EAS, whose Xcode builds the stock Expo
SDK 54 output every other project uses.

`patch-package` and the `"postinstall": "patch-package"` hook are **kept**, with
no patches to apply (it exits 0 with "No patch files found"). That way, if a
patch is ever genuinely needed, it gets applied on EAS instead of silently
vanishing the way this one would have.

### ~~7. `pod install` failed on an unused dependency~~ ✅ Done

**This is the most likely cause of the earlier "some error" on device.**
`@react-native-google-signin/google-signin` was in `package.json` but *not
referenced anywhere in the source*. It pulled in `GoogleSignIn` → `AppCheckCore`,
and CocoaPods aborted with:

```
[!] The following Swift pods cannot yet be integrated as static libraries:
The Swift pod `AppCheckCore` depends upon `GoogleUtilities` and
`RecaptchaInterop`, which do not define modules.
```

Dependency removed. `pod install` now completes cleanly (100 pods).

### ~~8. Apple Pay entitlement for a merchant ID that does not exist~~ ✅ Done

The Stripe config plugin and `App.tsx` both declared
`merchant.com.amosskradderi`, which put
`com.apple.developer.in-app-payments` into the entitlements — but **nothing in
the app uses Apple Pay**; payment is `CardField` + `confirmPayment` only.
Provisioning would have demanded that merchant ID exist in the client's account,
for a feature that is not shipping.

The plugin now gets `{ "merchantIdentifier": "" }`, which makes it skip the
entitlement entirely, and `StripeProvider` takes `urlScheme="expresstvatt"`
instead (the return route for redirect-based payment methods). Verified: the
generated entitlements file now contains only `aps-environment`.

To add Apple Pay later: create the merchant ID in the Apple account, put it back
in both places, rebuild.

### ~~9. `supportsTablet: true` on a phone-only layout~~ ✅ Done

Apple reviews on iPad when this is set, and a broken iPad layout is a rejection.
Now `false`; `TARGETED_DEVICE_FAMILY = "1"` in the generated project.

### ~~10. Export-compliance prompt on every upload~~ ✅ Done

`ITSAppUsesNonExemptEncryption: false` added to `ios.infoPlist`, so TestFlight
and App Store uploads stop asking. (Correct here: the app uses only standard
HTTPS.)

### ~~11. Two TypeScript errors~~ ✅ Done

`@types/react-native` was installed alongside React Native 0.81, which ships its
own types — deprecated and the source of both errors. Removed. The residual
React Navigation 7 complaint (it types `id` as required even on unnamed
navigators) is handled with an explicit `id={undefined}` on both navigators.

`npx tsc --noEmit` is now clean in both `skraddare-app/` and the website.

### ~~12. A release build could silently ship pointing at localhost~~ ✅ Done

`EXPO_PUBLIC_*` values are inlined at build time. `lib/api.ts` now throws at
startup if a **release** build's `EXPO_PUBLIC_API_URL` still contains
`localhost`, `127.0.0.1` or the `SET-THIS-BEFORE-BUILDING` placeholder — loudly,
at launch, rather than silently as a network error in checkout.

### ~~13. Stale brand string in notifications~~ ✅ Done

The Android notification channel was still called "Tvättio". Now "Express
Tvätt". (Android is not shipping, but the string was wrong.)

### Also done

- `eas.json` created with `development` / `preview` / `production` profiles.
- `expo-updates` added with `runtimeVersion: { policy: "appVersion" }` — see
  item **C** below for why this matters to the launch window.
- `expo-splash-screen` plugin configured with the brand mark.
- `expo` and `expo-constants` bumped to the SDK 54 patch versions.
- `expo-doctor`: **17/17 checks pass.**
- `@stripe/stripe-react-native` (0.67.0 vs SDK-pinned 0.50.3) and
  `react-native-svg` (15.15.5 vs 15.12.1) are deliberately *ahead* of the
  SDK's pins and listed in `expo.install.exclude`. Both build and bundle
  cleanly; downgrading the Stripe SDK on the payment path is the riskier move.
  Revisit at the next SDK upgrade.

---

## 🔴 Still blocking — needs the Apple Developer account

Nothing below can be done until access lands.

### A. Apple Developer Program access

- Confirm whether the client registered as **Individual** or **Organization**.
  An Organization needs a **D-U-N-S number**, which can add 1–2 weeks on its own.
- You need the **Admin** role on his team. **App Manager is not enough** — it
  cannot create signing certificates or push keys. Getting this wrong burns the
  gap.

### B. The launch runbook — exact steps once the client's account works

Run from `skraddare-app/`. Steps 1–4 are the ones that must happen in order;
everything after can be done while review is pending.

#### 1. Get the right access (client does this)

The client adds you to his team in App Store Connect → Users and Access, with
the **Admin** role. **App Manager is not enough** — it cannot create signing
certificates or push keys, and discovering that mid-launch wastes a day.

Confirm with him whether the account is **Individual** or **Organization**; an
Organization needs a D-U-N-S number, which can add one to two weeks before
anything below is possible.

#### 2. Release the bundle identifier from your own team

**Do this before anything else touches Apple**, or step 4 fails with "already
in use by another team" and the message does not say why.

Apple Developer portal, signed in as **yourself** → Certificates, Identifiers &
Profiles → Identifiers → `se.expresstvatt.app` → **Remove**. See **A2**.

#### 3. Point the app at the client's Stripe account

Production is already live on the client's Stripe (the client's `pk_live_…` key) while
the app carries a test key from a different account — see **G**. The store build
must match the server or every payment fails with "No such payment_intent".

Edit `.env.production` (gitignored, never committed), set
`EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` to the client's **live** publishable key,
then push it to the production environment only:

```bash
npx eas-cli env:push production --path .env.production
```

Leave the `preview` environment on the test key, so preview builds stay safe to
tap through. Verify with `npx eas-cli env:list production`.

#### 4. Switch EAS to the client's Apple team and build

```bash
npx eas-cli credentials
```

Choose iOS → the production profile, and sign in with the **client's** Apple
account when prompted. Let EAS create the distribution certificate and
provisioning profile; it needs no Xcode. Then:

```bash
npx eas-cli build --platform ios --profile production
```

#### 5. Push notifications

Still in `eas-cli credentials`, under the client's team, create and upload an
**APNs key (.p8)**. Until this exists, `registerPushToken` stores tokens that
never receive anything. The server already sends via Expo's push API from
`app/api/admin/orders/[id]/route.ts`. See **C**.

#### 6. Restrict the Google Places key

Google Cloud Console → the Places key → restrict to iOS bundle id
`se.expresstvatt.app`. The key ships inside the binary and can be extracted from
the `.ipa`; unrestricted, anyone who pulls it out can spend the quota. See **H**.

#### 7. Create the App Store Connect record and submit

```bash
npx eas-cli submit --platform ios --profile production
```

Needed in App Store Connect before review will pass — see **E** for the full
list, but the ones that get apps rejected are:

- **Privacy policy URL**: `https://expresstvatt.se/integritetspolicy`
- **A demo account** the reviewer can sign in with. Apple rejects apps they
  cannot get into. Give them a real customer login, and consider a 0 kr test
  item so they can complete an order without a charge — but note the app shows
  0 kr tiles only to admin UIDs, so either make the demo account an admin or
  tell the reviewer to stop at the payment step.
- **Privacy "nutrition label"**: the app collects name, email, phone, address,
  purchase history and — with RUT — a personnummer. Declare all of it.
- Screenshots at 6.7" and 6.5", description, keywords, age rating, support URL.

#### 8. Before you tell the client it is live

Install the production build through TestFlight and place **one real order with
a real card**, then refund it in Stripe. Everything up to now has been tested
against a test key or not at all; this is the first time the live payment path
runs end to end, and it is better to find a problem yourself than to hear about
it from a customer.

Also re-check the list under "Written and verified to compile — but never seen
running" at the top of this file. Most of it still will not have been exercised.

Build profiles in `eas.json`:

| Profile | Signing | Use |
|---|---|---|
| `simulator` | **none needed** | validate the native compile today |
| `preview` | Apple account | install on a real device (needs the device UDID registered) |
| `production` | Apple account | TestFlight / App Store |

There is deliberately no `development` profile: a dev client is useless until
there is Xcode or a registered device, and an earlier draft of this file had
`developmentClient: true` without `expo-dev-client` installed, which would have
failed the build.

### A2. Release the bundle ID from the developer's own Apple team

Device testing before the client's account arrived was done on **Carl's own**
Apple Developer Program membership (`eas device:create` + the `preview`
profile). That registers the App ID **`se.expresstvatt.app`** to that team.

**An App ID can exist in only one Apple team at a time.** Before the client's
account can build or publish under it:

1. Apple Developer portal (Carl's account) → Certificates, Identifiers &
   Profiles → Identifiers
2. Select `se.expresstvatt.app` → Remove
3. Then register it under the client's team (or let EAS create it there)

Two minutes, but it blocks the first production build if missed, and the error
Apple returns ("already in use by another team") does not say what to do.

A separate bundle ID for test builds would avoid this, but it requires turning
`app.json` into a dynamic `app.config.js` — deliberately not done, to keep a
configuration that now builds clean from growing moving parts.

### C. Push notifications

`lib/notifications.ts` calls `getExpoPushTokenAsync`, which needs
`extra.eas.projectId` — written by `build:configure` (B). It then needs an
**APNs key (.p8)** from the client's Apple account, uploaded to Expo
(`eas credentials`). Until both exist, push silently does nothing.

The server already sends via Expo's push API from
`app/api/admin/orders/[id]/route.ts`.

### D. Over-the-air updates — set this up *before* launch, not after

`expo-updates` is installed but not yet pointed at a project. After (B):

```bash
npx eas-cli update:configure
```

This is the direct answer to the "small gap to fix the app" worry: once wired,
a JavaScript-only fix ships to users in minutes with no App Store review.
Anything touching native code still needs a new build.

### E. App Store Connect metadata

- **Privacy policy URL** (mandatory): the website's `/integritetspolicy` page,
  once the domain is live.
- **Support URL**, screenshots (6.7" and 6.5" iPhone), description, keywords,
  age rating.
- **Privacy "nutrition label"**: the app collects name, email, phone, address,
  purchase history and — when RUT is used — a personnummer. Declare all of it.
- **Demo account** for the reviewer. Apple rejects apps they cannot sign into.
  A throwaway customer login plus a 0 kr test item (see the "test items" hint
  under Tjänster) lets them complete an order without a real charge.

---

## 🟠 Still blocking — needs owner input / production config

### ~~F. Production API URL~~ ✅ Done — but see F2

Set to **`https://expresstvatt.se`** in the `preview` and `production` profiles
of `eas.json`. Confirmed live on 2026-10-26: `/api/timeslots` returns the
admin's real windows, `/api/services` and `/integritetspolicy` both 200, and
the account-deletion route pushed in this same session is already deployed and
answering 401 without a token.

Verified by inspecting a production bundle, not assumed: `https://expresstvatt.se`
appears once, `http://localhost:3000` zero times (the fallback is dead-code
eliminated once the env value is inlined).

> ⚠️ **Metro caches the transform and does NOT bust on `EXPO_PUBLIC_*` changes.**
> A local `expo export` after changing an env value silently reuses the old
> inlined string. Always pass `--clear` when checking what a build will contain.
> This cost a wrong conclusion once already. EAS builds start cold, so it only
> bites locally.

### 🔴 F2. The other six `EXPO_PUBLIC_*` vars do not reach EAS

**This would have broken the very first EAS build.** `.env` is gitignored, so
EAS Build — which uploads the git project — never sees it. Only
`EXPO_PUBLIC_API_URL` is in `eas.json`; the other six live solely in `.env`:

```
EXPO_PUBLIC_FIREBASE_API_KEY        EXPO_PUBLIC_FIREBASE_PROJECT_ID
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN    EXPO_PUBLIC_FIREBASE_DATABASE_URL
EXPO_PUBLIC_GOOGLE_PLACES_API_KEY   EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY
```

A build without them produces an app with no Firebase config (sign-in and
orders dead), no Stripe key, and no address autocomplete.

They are **not** written into `eas.json`, because this repository is public and
anything committed stays in its history. Instead `.env.production` now holds the
production values — same file shape as `.env`, with the API URL swapped — and is
gitignored (`.gitignore` widened to cover it *before* the file was created).

Expo loads it automatically in production mode, ahead of `.env`
(`env: load .env.production .env`), so local release exports are correct too.

**Push to both EAS environments after `build:configure`, before any build:**

```bash
npx eas-cli env:push preview    --path .env.production
npx eas-cli env:push production --path .env.production
```

(`env:push` defaults to `--path .env.local`, so the flag is required.)

> ⚠️ **Two environments, not one.** EAS build profiles resolve to an *environment*
> (`preview` / `production`), and variables are stored per environment. A
> `distribution: internal` profile defaults to `preview`, so pushing only to
> `production` leaves simulator and preview builds with no Firebase config —
> they compile fine and then fail at runtime, which is a nasty way to lose an
> afternoon. Each profile in `eas.json` now names its `environment` explicitly
> rather than relying on that default.
>
> Keeping the two separate is deliberate: when the live Stripe keys arrive
> (item G), change only the `production` environment and let preview/simulator
> builds stay on test keys.

Check what is actually stored with:

```bash
npx eas-cli env:list preview
npx eas-cli env:list production
```

### 🔴 G. Stripe: production is LIVE, the app is on a different TEST account

**Corrected 2026-10-26 — an earlier version of this file said both sides were in
test mode. That was wrong, and acting on it would have been expensive.**

What is actually deployed:

| Where | Key | Account | Mode |
|---|---|---|---|
| Production website (Vercel) | the client's `pk_live_…` key | client's | **LIVE** |
| `.env.local` (dev) and the app | a `pk_test_…` key | Carl's own | test |

Read straight from the production JS bundle (`NEXT_PUBLIC_*` is inlined at
build time), so this is observed, not inferred. **expresstvatt.se is taking real
card payments right now.**

The first device test failed with:

```
No such payment_intent: 'pi_3UUt8cFkh7EfDdrK0DujKqW6'
```

Confirmed the cause by querying Stripe directly with the local test key: that
PaymentIntent does not exist in it. Production created a **live** intent in the
client's account; the app tried to confirm it with a **test** key from a
different account. The two can never see each other's objects.

**Right now this mismatch is a safety feature.** It is the only thing stopping
an app build from putting real charges through the client's live account.

#### Consequences

1. **Never point a test build at production with a live publishable key.** Every
   order would be a real charge on the client's account.
2. **The app cannot be payment-tested against `expresstvatt.se` at all.** Testing
   needs a backend running test keys — see below.
3. **Before the store build**, `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` in the EAS
   **production** environment must become the client's the client's `pk_live_…` key,
   matching the server. The `preview` environment keeps a test key. This is
   exactly why the two environments were split.

#### How to test payments now

**Fastest, works today, no rebuild — 0 kr test item.** A basket where every line
prices to 0 never touches Stripe: `create-cart-payment` marks it `isTestOrder`
and the order is born paid. It exercises the whole chain — cart, address,
time windows, RUT, order creation, admin dashboard — except the card charge.
It is gated to admin UIDs, so sign into the *app* with the bootstrap admin
account for the tiles to appear.

**Full card path — needs a test backend and a rebuild.** Either run the website
locally with `.env.local` and point the app at the Mac's LAN IP (`Info.plist`
already sets `NSAllowsLocalNetworking: true`), or deploy a Vercel preview
carrying test keys and point the app at that URL. `EXPO_PUBLIC_*` is baked in at
build time, so either way it is a new EAS build.

### H. Google Places API key restriction

`EXPO_PUBLIC_GOOGLE_PLACES_API_KEY` is inlined into the app bundle and can be
extracted from the `.ipa`. Restrict it in Google Cloud Console to the **iOS
bundle ID `se.expresstvatt.app`** before shipping, or the quota is spendable by
anyone who pulls it out.

### I. Node version

The dev machine runs **Node 23**, which Expo does not officially support (20 or
22 LTS). Everything built fine, but this is a bad thing to discover under time
pressure — EAS uses its own Node, so this only affects local commands.

---

## Verified working on 2026-10-26

Run from `skraddare-app/`:

| Check | Result |
|---|---|
| `npx expo-doctor` | 17/17 pass |
| `npx tsc --noEmit` | 0 errors (app) |
| `npx tsc --noEmit` (website) | 0 errors |
| `npm run build` (website) | compiles, `/api/account/delete` registered |
| `npx expo export --platform ios --clear` | 10.7 MB Hermes bundle, no errors |
| Production bundle contents | `https://expresstvatt.se` inlined, no `localhost` |
| `https://expresstvatt.se/api/timeslots` | 200, real admin-configured windows |
| `POST https://expresstvatt.se/api/account/delete` | 401 — the new route is live in production |
| `npx expo prebuild --platform ios --clean` | succeeds |
| `pod install` | 100 pods, no errors |
| `import Expo` consistency | AppDelegate.swift and ExpoModulesProvider.swift agree |
| `npm ci --dry-run` | lockfile in sync (EAS uses `npm ci`) |
| `POST /api/account/delete` without a token | 401 `{"error":"Inte inloggad."}` |

The only remaining local warning is `[!] Unexpected XCode version string ''`
from CocoaPods, which is just "no Xcode installed" — EAS has one.

---

## ✅ The native build passes (2026-10-26)

`eas build --platform ios --profile simulator` reached **"Build finished"** on
EAS, with no Apple Developer account involved. Dependencies, prebuild,
`pod install`, the Swift compile and fastlane all succeeded.

That retires the biggest unknown: the bundle identifier, app icon, entitlements,
`Info.plist`, autolinking, the Stripe pod, Firebase and the JS bundle all
compile and link on a real Xcode. **Code signing is the only part of the build
that remains untested** — and EAS does that for you once the account exists.

It took two attempts: the first failed on the autolinking patch (item 6), which
turned out to be the cause rather than a fix.

The artifact is a simulator `.app`, which needs Xcode to run; there is none on
this machine (`xcrun simctl` is absent), so answer **n** to "Install and run the
iOS build on a simulator?".

---

## Validate the native build now — no Apple account required

EAS simulator builds are **unsigned**, so they need no Apple Developer account
at all. They compile the same native project, the same pods, the same
autolinking patch and the same Hermes bundle as the store build. If this
succeeds, the only untested thing left for launch day is code signing.

Run these in order, from `skraddare-app/`:

```bash
npx eas-cli login                                       # free Expo account
npx eas-cli build:configure                             # writes extra.eas.projectId
npx eas-cli env:push preview    --path .env.production  # the six vars from F2
npx eas-cli env:push production --path .env.production
npx eas-cli build --platform ios --profile simulator    # ~15 min, no credentials
```

`build:configure` edits `app.json` — it adds `extra.eas.projectId`, which is
also what `lib/notifications.ts` needs for push tokens (item C).

**It does not add `owner`.** Done on 2026-10-26: the project lives under the
`calleexpressapp` organisation (project `express-tvatt`, id
`ab22f4f3-df93-4d46-9e7b-4c60da187957`), and without `"owner": "calleexpressapp"`
in `app.json` a build from a fresh checkout or a different login resolves against
the wrong account. Added by hand; verify it is still there after any future
`build:configure`.

Then wire OTA updates, so a JavaScript fix during the launch window ships in
minutes instead of a review cycle:

```bash
npx eas-cli update:configure
```

### Optional: install Xcode anyway

It is free and needs no Apple account. With it you can run the app in the iOS
Simulator *now* and verify every screen before the account lands, so the only
new variable on the day is signing. Without it, nothing can be run until then —
EAS internal distribution to a physical device needs a paid account to register
the device UDID.
