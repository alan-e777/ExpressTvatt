# Go-Live Handover Runbook

Use this at the cutover moment: client gives you the **production API keys**, you install + verify, then you grant full access.

Order of the day:
1. Read **PART A** (your checklist).
2. Paste **PART B** (the prompt) into a fresh Claude Code session and work through it.
3. Read **PART C** (same checklist again) before you grant the client full access.

---

## PART A — READ THIS BEFORE YOU START (your checklist)

**Secrets — you handle them, never Claude, never the chat:**
- [ ] Do **NOT** paste any secret key into the chat or let Claude type one into a field. You paste keys yourself into `.env.local` and the hosting env (Vercel). Claude only checks that they're present and have the right prefix (`sk_live`, `pk_live`, `whsec_`, etc.).
- [ ] Confirm `.env.local` and `firebase-service-account.json` are still git-ignored (`git check-ignore .env.local firebase-service-account.json` → both printed).

**Have these ready from the client before you start:**
- [ ] Stripe **live** keys: `sk_live_…` (secret) + `pk_live_…` (publishable).
- [ ] The **production domain** (e.g. `https://expresstvatt.se`) — needed for the Stripe webhook.
- [ ] Google Maps API key (production) **with restrictions** set: APIs enabled = Places, Geocoding, Maps JavaScript, Static Maps; restricted by HTTP referrer (the domain) for the browser key.
- [ ] Resend: a **verified sending domain** + `RESEND_API_KEY`, and the `RESEND_FROM` address on that domain.
- [ ] The client's **Firebase admin UID** (the Google account that will own the admin panel) — see the ADMIN_UID gotcha below.
- [ ] 46elks (SMS) credentials if SMS is staying on.
- [ ] Decide: same Firebase project, or the client's own? (If theirs, much more changes — tell Claude.)

**The two things that will silently break everything if missed:**
- [ ] **Stripe webhook** must be registered on the live domain for `payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.refunded`, and its **live** `whsec_…` put in env. Without it, paid orders never flip to "paid".
- [ ] **`firestore.rules` hardcodes the admin UID** (`kAT4Zu…`). If the admin account becomes the client's, you must change BOTH `ADMIN_UID` in env **and** the hardcoded UID in `firestore.rules`, then redeploy rules. Otherwise the client can't manage anything (or the old admin still can).

**Don't grant full access until PART C passes.** Access hand-over (repo owner, Firebase project, Stripe account, domain DNS) is the irreversible step — it comes last.

---

## PART B — THE PROMPT (paste into a fresh Claude Code session)

> You are Claude Code (Opus 4.8) working on the **Express Tvätt** website (`app/` — Next.js App Router; Firebase Admin SDK; Stripe). We are doing the **production cutover today**. A full pre-launch audit was already done (see `devNotes/GO_LIVE_HANDOVER.md` and `devNotes/BEFORE_DEPLOYMENT.md`, and the memory file `project_prelaunch_healthcheck`). Read those first.
>
> **Ground rules:**
> - I (the human) will paste all secret keys into `.env.local` and the hosting env myself. **Do not ask me to give you secrets, do not echo secret values, and do not edit secret values into any file yourself.** You may read which env var *names* exist and check key *prefixes* only.
> - Some steps are dashboard actions you cannot perform (Stripe webhook registration, Resend domain verification, Google key restrictions, granting access). For those, give me exact click-by-click steps and wait for me to confirm.
> - Work on the current branch, commit each logical fix separately, and push. Run a typecheck/build after the code changes.
>
> **Do these code fixes (verify in Stripe TEST mode first, before we swap to live keys):**
>
> 1. **Klarna / Amazon Pay checkout is broken.** All three checkout flows call `stripe.confirmPayment({ redirect: 'if_required' })` with empty `confirmParams` and no `return_url`, so any redirect-based method (Klarna, Amazon Pay — both enabled in Stripe) errors on pay. Files: `app/kassa/page.tsx`, `components/CheckoutForm.tsx`, `app/struken-tvatt/boka/page.tsx`. Add a `return_url` and implement the redirect-return handling (on return, read `payment_intent_client_secret` from the URL, retrieve the PaymentIntent, and show the success/failed state). Keep the existing inline (card) success path working. Test card flow end-to-end in the preview. Ask me whether to keep Klarna+Amazon Pay enabled; if I say cards-only, instead I'll disable them in the Stripe Dashboard and you can skip the return-handling.
>
> 2. ~~**First-time discount (10%) leaks and is tamperable.**~~ **DONE (2026-06-14).** `app/api/create-cart-payment/route.ts` now verifies the caller's Firebase ID token (`Authorization: Bearer`) and grants the first-time discount only to that verified UID — an unverified/spoofed `customerId` in the body no longer qualifies. First-time status is derived authoritatively from the `orders` collection (any order past `pending_payment`/`payment_failed` counts as placed), not the client-writable `hasPlacedOrder` flag. The website checkout (`app/kassa/page.tsx`) now sends the ID token. The flag is still used only for the client-side price *preview* and the admin "Ny" label, so it no longer affects pricing — a `firestore.rules` tightening is therefore optional. Note: the mobile app (`skraddare-app`) does not yet send an ID token, so it currently gets no first-time discount until updated.
>
> 3. **Free-delivery threshold inversion.** The free-delivery threshold is compared against the *discounted* total, so a discount can push an order under the threshold and *add* the 100 kr fee (net higher price). Compare the threshold against the **pre-discount** subtotal in `app/api/create-cart-payment/route.ts` and mirror it in the previews.
>
> 4. **Marketing copy vs delivery fee.** The landing page (`app/page.tsx`) says "Inga dolda avgifter" and "Hämtning och leverans ingår alltid", but a 100 kr fee applies under 200 kr. Ask me whether to (a) make pickup/delivery always free (then leave copy), or (b) reword the copy to state the free-from-200-kr policy. Apply my choice.
>
> 5. **Legacy booking pages bypass the new rules.** `app/tjanster/page.tsx` links to `/boka` → `create-payment`, and `app/struken-tvatt/page.tsx` → `create-struken-tvatt-payment`. Those APIs skip the delivery fee, discounts, blocked-date check, and the 3-day rule. Recommend and (after I confirm) apply one of: route those pages through the unified `/order` → `create-cart-payment` flow, or remove the orphan pages/links. Don't silently leave two pricing paths live.
>
> 6. **Webhook log hygiene.** In `app/api/webhook/route.ts`, drop the info `console.log`s that echo order ids and amounts (keep `console.error`).
>
> **Then the production config swap (I do the secret entry, you guide + verify):**
>
> 7. Tell me exactly which env vars to set for production (`STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`, `GOOGLE_MAPS_API_KEY`, `RESEND_API_KEY`, `RESEND_FROM`, `ADMIN_UID`, `FIREBASE_SERVICE_ACCOUNT`, plus 46elks if used) and where (Vercel project + local `.env.local`). After I set them, verify presence and prefix only (`sk_live`/`pk_live`/`whsec_`), never the values.
> 8. Walk me through registering the **live Stripe webhook** at `https://<DOMAIN>/api/webhook` for `payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.refunded`, and putting the new live `whsec_` in env.
> 9. **ADMIN_UID ↔ firestore.rules:** if the production admin is the client's Firebase account, update `ADMIN_UID` **and** the hardcoded UID in `firestore.rules`, and give me the `firebase deploy --only firestore:rules` command. Confirm both match.
> 10. Remind me to verify the Google Maps key restrictions and the Resend verified domain (so customer emails actually send).
>
> **Final verification (do/guide all of these and report results):**
> - Typecheck/build passes.
> - In live mode, I place one **real** small order with a real card; confirm the Stripe webhook fires and the order flips to `paid` in the admin, and that a confirmation email actually arrives at a real inbox. Then I refund it and confirm the order shows `refunded`.
> - Service-area autocomplete works against the production Google key (in-area address resolves, far-away address is filtered out).
> - The `/api/admin/firebase-token` endpoint returns 401 for a forged cookie (the auth-bypass fix is deployed).
> - Give me a short PASS/FAIL summary of every item above.

---

## PART C — READ THIS AGAIN BEFORE YOU GRANT FULL ACCESS (same checklist)

**Secrets — you handle them, never Claude, never the chat:**
- [ ] No secret key was ever pasted into the chat; all live keys live only in `.env.local` + Vercel env.
- [ ] `.env.local` and `firebase-service-account.json` are still git-ignored and were never committed.

**The two things that silently break everything — confirm they're DONE:**
- [ ] Stripe **live** webhook registered for the 3 events, live `whsec_` in env — and you saw a real order flip to `paid` via the webhook.
- [ ] `ADMIN_UID` (env) and the hardcoded UID in `firestore.rules` match the correct admin, rules redeployed — and the admin panel loads for that account.

**Final go-live gate — all must be true before handing over access:**
- [ ] Code fixes from PART B are committed, pushed, and deployed (Klarna/return_url, first-time discount, threshold inversion, copy, legacy pages, webhook logs).
- [ ] One real live order: paid → visible in admin → confirmation email received → refunded → shows refunded.
- [ ] Google Maps key restricted to the domain; Resend domain verified; emails deliver to real customers.
- [ ] Forged `admin-session` cookie → 401 (auth-bypass fix live).
- [ ] Stripe is in **live** mode (`sk_live`/`pk_live`), test keys removed from production.

**Only after every box above is checked, do the irreversible hand-over (last):**
- [ ] Transfer/grant repo, Firebase project, Stripe account, and domain/DNS access.
- [ ] Rotate or invalidate any dev/test keys that were shared during the build.
- [ ] Confirm the client has set their own passwords and 2FA on Stripe/Firebase/Google.
