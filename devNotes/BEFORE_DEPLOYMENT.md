# Before Deployment — Known Issues & Fixes

Issues identified before first production deployment, ordered by severity.
Cross-reference with `CLAUDE.md` for codebase structure.

---

## 🔴 Critical — must fix before any real customer uses the app

---

### 🔴 LIVE PASSWORDS ARE IN THIS REPOSITORY'S PUBLIC HISTORY — ROTATE THEM

Found 2026-10-27. **Not yet done.** The most urgent item in this file.

Two plaintext account logins were committed to `CLAUDE.md` early on and removed
again a few commits later. Removing them changed nothing: **this repository is
public and both commits remain in its history.** One of the two is the
**bootstrap `ADMIN_UID`** — the root admin, with the whole dashboard behind it,
which `lib/admin-auth.ts` treats as `developer` and which by design cannot be
locked out. The other is a customer test account.

This section deliberately does not name the accounts or the commits. Anyone can
find them by reading the history; there is no reason for this file — which is
itself public — to hand over the shortcut. The owner knows which two they are.

**Fix — rotation, not history rewriting:**

1. Firebase Console → Authentication → Users → each account → Reset password.
   The admin panel **cannot** do the root admin:
   `POST /api/admin/admins/reset-password` deliberately excludes the bootstrap
   UID so the owner can never be locked out.
2. If either password was reused anywhere else — the mail account itself,
   Stripe, Vercel, Firebase Console — change it there too. A password in public
   history is burned everywhere it appears, not only where it leaked.
3. Mark this item done only once both are actually changed.

Rewriting history afterwards is optional and does **not** substitute for
rotation: GitHub retains unreachable objects, and clones and forks persist.

A full sweep found nothing else exposed: `.env.local`, `.env`,
`firebase-service-account.json` and both app env files have **never** been
committed, and the only `sk_live_` string in the repo is a literal placeholder.

---

### ~~🔴 ADMIN PANEL UNREACHABLE — ERR_TOO_MANY_REDIRECTS~~ ✅ Done (2026-10-27)

Fixed in `0ff08d7`. `/admin/login` looped forever once a session cookie was
present but no longer valid: `middleware.ts` saw the cookie and redirected to
`/admin`, while `(dashboard)/layout.tsx` verified it, found it dead, and
redirected back.

Middleware runs on the Edge runtime and cannot load `firebase-admin`, so it can
only see that a cookie *exists*, never whether it still verifies — deciding
"already logged in" from presence alone was never safe. Sessions last 14 days,
so every admin reached this eventually and the panel locked itself out on a
timer, escapable only by clearing cookies by hand.

The middleware's login→`/admin` redirect is gone; the protective direction
stays. **Do not reintroduce it.** If a signed-in admin should skip the login
form, that belongs in the login page client-side, where a session can actually
be verified.

---

### ~~1. Firestore Security Rules~~ ✅ Done

`firestore.rules` committed to repo and deployed via Firebase Console.

~~**Risk:** If the Firebase project is still in test mode, the default rule is
`allow read, write: if true` — anyone who finds the Firebase config (it's
semi-public) can read every customer order, address, and payment amount, or
wipe the entire database.

**Check:** Firebase Console → Firestore → Rules tab.

**Fix:** All data mutations go through the server-side Admin SDK, so the
client-side rules should deny everything except what the customer app
legitimately needs (reading their own orders, etc.). A safe baseline:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Orders: customers can read their own only
    match /orders/{orderId} {
      allow read: if request.auth != null && request.auth.uid == resource.data.customerId;
      allow write: if false; // all writes go through Admin SDK
    }

    // Services catalog: public read, no client writes
    match /services/{doc=**} {
      allow read: if true;
      allow write: if false;
    }

    // Everything else: deny by default
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

Store this as `firestore.rules` in the project root and deploy with
`firebase deploy --only firestore:rules`.

---

### ~~2. Mattvätt price falls back to client-supplied price~~ ✅ Done

Fallback changed to `null` so unparseable carpet names are skipped rather than trusted.

~~

**File:** `app/api/create-cart-payment/route.ts`

**Risk:** If the sqm regex fails to parse the item name, the server silently
falls back to `item.price` — the price the client sent. A malicious request
with a crafted item name and `item.price: 1` would charge 1 öre.

**Current code (line ~65):**
```typescript
priceKr = kvm ? Math.round(kvm) * 90 : item.price; // ← unsafe fallback
```

**Fix:** Replace the fallback with `null` so the item is skipped (same
behaviour as an unknown service ID):
```typescript
priceKr = kvm ? Math.round(kvm) * 90 : null; // hard-fail if name unparseable
```

---

### ~~3. Webhook doesn't handle payment failures or refunds~~ ✅ Done

Handlers added for `payment_intent.payment_failed` and `charge.refunded`. `payment_failed` and `refunded` added to `VALID_STATUSES`, `STATUS_OPTIONS`, and `STATUS_STYLE`. Register both event types in Stripe Dashboard webhook config.

~~

**File:** `app/api/webhook/route.ts`

**Risk:**
- `payment_intent.payment_failed` is never handled → orders stay as
  `pending_payment` forever with no manager visibility.
- `charge.refunded` is never handled → refunded orders stay `paid` or
  `completed` in the dashboard even after money is returned to the customer.

**Fix:** Add handlers for both events inside the existing `if/else` chain:

```typescript
if (event.type === 'payment_intent.succeeded') {
  // ... existing handler
}

if (event.type === 'payment_intent.payment_failed') {
  const intent = event.data.object;
  await db.collection('orders').doc(intent.id).set(
    { status: 'payment_failed' },
    { merge: true }
  );
}

if (event.type === 'charge.refunded') {
  const charge = event.data.object;
  const paymentIntentId = charge.payment_intent as string;
  if (paymentIntentId) {
    await db.collection('orders').doc(paymentIntentId).set(
      { status: 'refunded' },
      { merge: true }
    );
  }
}
```

Also add `payment_failed` and `refunded` to:
- `VALID_STATUSES` in `app/api/admin/orders/[id]/route.ts`
- `STATUS_OPTIONS` and `STATUS_STYLE` in `app/admin/(dashboard)/orders/OrdersClient.tsx`

Register both new event types in the Stripe Dashboard webhook config.

---

### 🟡 RESEND_FROM — owner reports it is now set in Vercel (2026-10-27), UNVERIFIED

**One step to close this:** open **Admin → Inställningar → the notification
status panel** (`NotificationStatusPanel.tsx`, backed by
`GET /api/admin/notification-config`) and confirm:

| Field | Must read |
|---|---|
| `from` | an `@expresstvatt.se` address — **not** `onboarding@resend.dev` |
| `sandbox` | `false` |
| `replyTo` | a mailbox someone actually reads, not `null` |
| `configured` | `true` |

If all four are right, mark this item ✅ Done and delete the rest of this
section. That panel exists precisely because Vercel hides a value once saved,
so the Vercel UI cannot answer this — and the failure mode is not "unset" but
"set on Preview and not Production", which looks identical there.

The original finding follows, as the reason not to take this on trust.

---

`expresstvatt.se` **is verified in Resend** (root domain, since ~2026-06), so
there is no DNS work. The problem is the env var, and it is in **production**.

Proven, not inferred: a real order placed on https://expresstvatt.se recorded

```
confirmationNotice.from  = "Express Tvätt <onboarding@resend.dev>"
confirmationNotice.email = { ok: false, to: "<customer address>",
                             error: "You can only send testing emails to your
                                     own email address (<Resend account owner>)…" }
```

That `from` string is the **fallback baked into `lib/order-status-email.ts`**,
used when `RESEND_FROM` is empty — so the variable is almost certainly not set
in Vercel at all. Every customer confirmation and status email on production is
being refused with a 403.

**Fix — in Vercel → Settings → Environment Variables. Key and Value are separate
fields; do not paste `RESEND_FROM=` into the value, and mind trailing spaces:**

| Key | Value |
|---|---|
| `RESEND_FROM` | `Express Tvätt <no-reply@expresstvatt.se>` |
| `RESEND_REPLY_TO` | a mailbox somebody reads (optional; omit rather than point it at a dead address) |

**Then redeploy.** Changing an environment variable does not affect the running
deployment — Vercel only picks it up on the next build.

**Then confirm** at Inställningar → **Avsändare** on the production site, which
reads the value back out of the running deployment. It must not say `resend.dev`.

**SMS is unaffected and already works in production** — the same order sent its
confirmation SMS successfully (`sms.ok = true`).

`.env.local` was set to the verified sender on 2026-08-23 and is confirmed
working locally. Note the consequence: a dev machine can now email real
customers, which the sandbox sender previously made impossible.

---

### 🔴 STRIPE PRODUCTION WEBHOOK — DO THIS THE DAY YOU GET A DOMAIN

> **This cannot be done until you have a live HTTPS URL (e.g. Vercel deployment).
> Do it before accepting a single real payment or payment failures and refunds
> will silently never update in the dashboard.**

The local Stripe CLI listener (used in development) forwards all events automatically.
A production webhook endpoint does NOT — you must register it manually.

**Steps:**
1. Deploy to Vercel (or your host) and confirm your URL, e.g. `https://tvättio.se`
2. Go to [dashboard.stripe.com](https://dashboard.stripe.com) → Developers → Webhooks
3. Click **"+ Add endpoint"**
4. Set endpoint URL to: `https://YOUR-DOMAIN/api/webhook`
5. Under **"Events to listen to"**, add all of:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `charge.refunded`
6. Click **Add endpoint**
7. Copy the **Signing secret** (starts with `whsec_`) from the endpoint detail page
8. Add it to your production environment variables as `STRIPE_WEBHOOK_SECRET`
   (replaces the CLI secret you used in development — they are different values)

**If you skip this:** `payment_intent.succeeded` will never fire in production →
no order will ever move from `pending_payment` to `paid` → the admin dashboard
will show zero completed orders even though customers were charged.

---

### 🔴 GOOGLE MAPS BILLING IS NOT ENABLED — SET IT UP ON THE OWNER'S ACCOUNT

> **Status 2026-08-31: every Google Maps API the site uses is returning
> `REQUEST_DENIED`.** The key in `.env.local` is valid and the APIs exist — the
> Cloud project it belongs to simply has no billing account attached. Google
> requires a card on file for Maps Platform even inside the free tier.

Proven, not inferred — asked Google directly with the key from `.env.local`:

```
GET /maps/api/geocode/json?address=Stockholm
  status:        REQUEST_DENIED
  error_message: You must enable Billing on the Google Cloud Project

GET /maps/api/place/autocomplete/json?input=Drottninggatan
  status:        REQUEST_DENIED
```

In the browser this shows as the "For development purposes only" watermark plus
a *"Google Maps lästes inte in korrekt på sidan"* dialog — the map still draws
tiles, which is why it looks cosmetic. It is not.

**One key powers all of this, so all of it is down together:**

| Broken | File |
|---|---|
| Address autocomplete at checkout | `app/api/places/autocomplete/route.ts`, `.../details/route.ts` |
| Address → coordinates | `lib/geocode.ts` |
| Driver route optimisation | `app/api/admin/driver/optimize/route.ts` |
| Dashboard map images | `app/api/admin/maps/run/route.ts` |
| Service-area circle (Inställningar) | `app/admin/(dashboard)/settings/SettingsClient.tsx` |

**Only the key in `.env.local` was tested.** If Vercel holds a different
`GOOGLE_MAPS_API_KEY`, production may be fine and only local dev is broken —
check Vercel before treating this as a live outage.

#### Do NOT transfer the developer's existing project

Transferring a Cloud project (IAM owner grant + re-linking billing) only pays
for itself when there is history worth keeping — months of usage, approved
quota increases, an established billing relationship. This project has none of
that, because billing was never switched on. A fresh project in the owner's
account is fewer steps and leaves the owner genuinely owning it from day one.

If either account is Google **Workspace** rather than a personal Gmail, the
project sits inside an Organization node and cannot be moved to a personal
account at all — another reason to start fresh.

#### The 4 steps — signed in to the OWNER'S Google account

1. **[console.cloud.google.com](https://console.cloud.google.com) → New Project.**
   Name it `Express Tvätt`. Make sure the account picker top-right is the owner's
   Gmail, not the developer's, before creating anything.
2. **Billing → Link a billing account** → add the owner's card.
   *This is the step that is actually failing today.*
3. **APIs & Services → Enabled APIs → + Enable APIs**, and enable **all five**:
   Maps JavaScript · Places · Geocoding · **Directions** · Maps Static.
   (Directions is easy to miss — the driver route optimiser needs it.)
4. **APIs & Services → Credentials → Create credentials → API key.**
   Create **two** keys, not one — see the split below.

#### Then, back in the repo

Put the key in `.env.local` **and** in Vercel → Settings → Environment Variables,
then **redeploy** (Vercel only picks up env changes on the next build).

**No code changes are needed for a straight key swap** — all seven consumers read
`process.env.GOOGLE_MAPS_API_KEY`, and nothing anywhere references a project or
an account.

Verify with:

```bash
./scripts/check-maps-key.sh            # tests the key in .env.local
./scripts/check-maps-key.sh AIza...    # tests a key directly, e.g. the one in Vercel
```

It prints the cause in plain words — billing not linked, APIs not enabled, key
restricted, or key invalid — and never prints the key itself, only its prefix and
length. Pass the key as an argument when the one you care about is in Vercel
rather than `.env.local`; the two drift apart easily and a stale local key will
happily report a problem that production does not have.

#### Two traps

- **A billing account is not the same thing as a linked project.** Adding a card
  creates a *billing account*; the project must then be *linked to it*. People
  add the card, see "billing active", and the project still returns
  `REQUEST_DENIED` because nothing was linked.
- **You cannot put an HTTP-referrer restriction on the single key you have now.**
  `GOOGLE_MAPS_API_KEY` is used server-side *and* handed to the browser at
  `app/admin/(dashboard)/settings/page.tsx`. Referrer restrictions only apply to
  browser requests, so restricting the one key silently kills all five server
  routes above. Create two keys instead:

  | Key | Restriction | APIs |
  |---|---|---|
  | Browser | HTTP referrer = the production domain | Maps JavaScript only |
  | Server | IP restriction, or none but kept secret | Places, Geocoding, Directions, Maps Static |

  This needs a small code change (a new env var for the browser key + one line in
  `settings/page.tsx`). Do it at the same time — doing it once on the owner's
  account beats setting up one key now and redoing it at cutover.

#### Set a budget alert before enabling billing, not after

Today a failed call costs nothing. The moment billing works, item **8** below
(Static Maps polling) becomes real money. Note that item 8 still quotes Google's
retired **$200/month** credit — that flat credit was replaced with per-API free
monthly call allowances in 2025, so check the current numbers in the console
rather than budgeting against $200.

---

### ~~THE GOOGLE ADS TAG NEEDS A COOKIE BANNER~~ ✅ Done (2026-10-21)

The banner is built and the policy is updated. What shipped:

- `lib/consent.ts` — the decision, versioned (`consent.ads.v1`) in `localStorage`.
  **No decision and unreadable storage both behave as "denied"**, so a visitor who
  ignores the banner is never tracked, and a blocked `localStorage` fails closed.
- `components/CookieBanner.tsx` — the prompt. Both buttons are deliberately the
  same size, and there is no X: refusing has to be as easy as accepting, and a
  close button is a third answer visitors read as consent. **Do not "improve"
  either of those.**
- `components/TrackingPixel.tsx` — gtag.js is not loaded at all until consent,
  and declares Consent Mode v2 signals when it is.
- `components/ConsentReset.tsx` — withdrawal, in the privacy policy's cookie
  section. Forgetting the decision re-opens the banner; taking consent back also
  deletes the `_gcl_*` cookies and pushes `consent: update` denied.
- `app/integritetspolicy/page.tsx` — section 8 rewritten (SV + EN): the cookies
  are named, consent is stated as the basis, Google Ireland Ltd is listed as a
  processor in both processor lists.

**That decision was revisited on 2026-10-22 and went the other way.** The tag now
loads on every page under **Consent Mode v2**, starting with every ad signal
denied and flipping to granted only when the visitor accepts. Two things settled
it:

- Google's own "Installera en Google-tagg" check loads the page without
  answering the banner, so it never saw the tag and reported expresstvatt.se as
  untagged. That is what the ads team was looking at.
- The strict version gave up modelled conversions for every visitor who refuses
  or ignores the banner, which is most of them.

A third argument was made at the time and expired within the day, recorded here
so it is not re-derived: the strict gate was called pointless because
`app/globals.css` pulled Poppins and Inter from fonts.googleapis.com on every
page load, so Google had the visitor's IP regardless (verified on production).
The fonts were self-hosted the same afternoon, so **gtag.js is now the only
thing on the site that contacts Google before consent.**

What did **not** change: nothing is stored on the device before consent. Denied
Consent Mode writes no cookies and no identifiers; it sends cookieless pings
that let Google model what it cannot measure. The ePrivacy storage rule — the
one with teeth — is still satisfied, and the banner still governs it.

**That makes this the one remaining pre-consent third-party call.** It was still
the right call on the two grounds above, and nothing is stored before consent —
but if you ever want the strictest posture the site can take, this is the single
thing left to change, and `TrackingPixel.tsx` says so at the top.

Still worth a lawyer's eye before launch; this is a careful reading, not advice.

---

## 🟡 Important — fix within first week of launch

---

### ✅ 4. Driver run tokens never expire — FIXED

**File:** `app/api/driver/[token]/route.ts`

**Risk:** A run URL (`/driver/[uuid]`) is valid forever. If it leaks via a
messaging app link preview, browser history, or a screenshot, anyone can mark
orders as delivered or undo deliveries indefinitely.

**Fix:** Add an `expiresAt` field when creating the run, and reject stale tokens:

In `app/api/admin/runs/route.ts` (POST handler), add to the Firestore write:
```typescript
expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
```

In `app/api/driver/[token]/route.ts` (PATCH handler), add after fetching the run:
```typescript
const expiresAt = run.expiresAt?.toDate?.() ?? null;
if (expiresAt && expiresAt < new Date()) {
  return NextResponse.json({ error: 'Körningslänken har gått ut.' }, { status: 410 });
}
```

Show the expiry time on the driver page so the driver knows when the link stops working.

---

### 5. No rate limiting on payment and Maps autocomplete endpoints

**Risk:**
- `POST /api/create-cart-payment` creates a real Stripe PaymentIntent per call
  with no throttle — a script could generate thousands of dangling intents.
- `GET /api/places/autocomplete` hits Google's paid API per request — no
  limit means quota exhaustion and unexpected billing.

**Fix (Vercel deployment):** Enable Vercel's built-in rate limiting on these
routes via `vercel.json`, or add a lightweight middleware check using the
client IP from the `x-forwarded-for` header with an in-memory counter or an
upstash/redis store.

Quick interim fix using Vercel's `vercel.json`:
```json
{
  "functions": {
    "app/api/create-cart-payment/route.ts": { "maxDuration": 10 },
    "app/api/places/autocomplete/route.ts": { "maxDuration": 5 }
  }
}
```
That alone doesn't rate-limit but sets a tight execution cap. A proper fix
requires a rate-limit middleware (e.g. `npm install @upstash/ratelimit @upstash/redis`).

---

### 6. `pending_payment` orders accumulate forever

**Risk:** Every abandoned checkout (user fills form, opens Stripe, closes tab)
creates a Firestore doc that stays as `pending_payment` indefinitely. Over
weeks this pollutes the Orders view and inflates order counts.

**Fix:** A Firebase Scheduled Function that runs nightly and cancels
PaymentIntents + deletes (or marks `abandoned`) orders older than 24 hours
that are still `pending_payment`:

```typescript
// functions/src/cleanupAbandonedOrders.ts
export const cleanupAbandonedOrders = functions.pubsub
  .schedule('every 24 hours')
  .onRun(async () => {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const snap = await db.collection('orders')
      .where('status', '==', 'pending_payment')
      .where('createdAt', '<', cutoff)
      .get();

    await Promise.all(snap.docs.map(async doc => {
      await stripe.paymentIntents.cancel(doc.id).catch(() => {});
      await doc.ref.delete();
    }));
  });
```

Requires enabling Firebase Functions (Blaze plan, but negligible cost for
this volume).

---

### 7. Verbose console.log in webhook

**File:** `app/api/webhook/route.ts`

**Risk:** Order IDs and payment amounts are logged to stdout. On Vercel and
most commercial log platforms these get indexed and stored. Not catastrophic
but unnecessary data exposure.

**Fix:** Remove or reduce the log statements before deploying. Keep the error
logs (`console.error`) but strip the info logs that echo `intent.id` and
`intent.amount`.

---

### 8. Static Maps polling burns Google API quota if dashboard is left open

**File:** `app/admin/(dashboard)/DashboardMapClient.tsx`

**Problem:** The dashboard map image refreshes every 15 seconds unconditionally —
regardless of whether anyone is looking at the screen, whether the browser tab
is in the background, and whether there is even an active driver run. That is
240 Static Maps API calls per hour. Left open for an 8-hour workday that is
~1,900 calls/day and ~57,000/month at $2 per 1,000 — roughly $115/month on
Static Maps alone, which exceeds Google's $200 free credit when combined with
the other APIs.

**Fix — two changes in `DashboardMapClient.tsx`:**

1. **Skip the poll when the browser tab is hidden** (tab switched, window
   minimised). The browser's `document.hidden` flag tells you this for free.

2. **Slow to 60 seconds when there is no active run.** Nothing is changing if
   no run exists, so 15-second polling is pure waste.

Replace the `useEffect` polling block (the one that calls `setInterval`) with:

```typescript
useEffect(() => {
  // Poll immediately on mount
  fetchRun();

  const id = setInterval(() => {
    // Skip entirely if the tab is not visible
    if (document.hidden) return;
    fetchRun();
  }, run ? 15_000 : 60_000); // fast when a run is active, slow otherwise

  return () => clearInterval(id);
}, [fetchRun, run]);
```

This cuts Static Maps calls by ~75 % on a normal workday and to near-zero
when the tab is sitting in the background.

**Note on serverless geocoding cache:** `lib/geocode.ts` keeps an in-memory
address→coords cache, but on Vercel each serverless function instance has its
own cache and cold starts reset it. Both `/api/admin/runs/active` and
`/api/admin/maps/run` geocode the same addresses independently. The permanent
fix is to write `lat` and `lng` back onto the Firestore order document the
first time they are resolved, then skip the Google Geocoding call if those
fields already exist. Until then, geocoding costs stay low at small order
volumes but will scale linearly with order count once the business grows.

---

## ✅ Things that are already solid

These are things first-time deployers commonly get wrong — they're correct here:

- Server-side price validation on all payment routes (prices never trusted from client)
- Stripe webhook signature verification (webhook cannot be spoofed)
- `firebase-service-account.json` is in `.gitignore`
- `.env.local` is in `.gitignore`
- Admin session uses Firebase's proper session cookie (httpOnly, secure in
  production, 14-day expiry, server-verified on every API call)
- Driver token validates that the orderId belongs to the run before updating
- Address autocomplete service area restriction enforced server-side
