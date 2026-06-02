# Booking Flow — Developer Cheat-Sheet

## Cart item types

Every item in the cart (home page and app) carries a `type` field. There are exactly three:

| `type`      | Origin                        | Price logic                        |
|-------------|-------------------------------|------------------------------------|
| `mattvätt`  | Size slider on home page      | `Math.round(sqm) × 90 kr`         |
| `struken`   | Struken tvätt catalog (Firestore `services/struken-tvatt/StrukenTvatt`) | Fixed per product |
| `service`   | Klädvård catalog (Firestore `services/` root collection) | `price_ore / 100` |

Mattvätt items use a **synthetic ID** (`matta-{sqm}`) — there is no Firestore document for them. The name encodes the size: `"Matta 5 m²"`. The server derives the price from the name via regex.

---

## Web checkout flow (canonical path)

```
Home page (/) — user builds cart
        ↓
handleCheckout() in app/page.tsx
        ↓
/kassa?cart=<JSON>          ← unified entry point for ALL cart types
        ↓
User fills: address, date, time, notes
        ↓
POST /api/create-cart-payment   ← server validates prices + creates Stripe PaymentIntent + Firestore order
        ↓
Stripe PaymentElement (in-page)
        ↓
stripe.confirmPayment()
        ↓
Success screen → back to /
```

### Old checkout paths (still live, not the primary path from home)

These exist for direct links, admin use, or legacy flows. Do not remove them.

- `/boka?serviceId=<id>` → collects address/date → `/checkout?...` → `CheckoutWrapper` → `create-payment` API  
- `/struken-tvatt/boka?basket=<JSON>` → own Stripe form → `create-struken-tvatt-payment` API

---

## API routes — what each does

| Route | Handles | Price source |
|---|---|---|
| `POST /api/create-cart-payment` | ALL types (mattvätt, struken, service) in one call | Server-validates against Firestore; mattvätt derived from name |
| `POST /api/create-struken-tvatt-payment` | Struken only | Firestore `struken-tvatt` subcollection |
| `POST /api/create-payment` | Single Firestore service | Firestore `services` collection |
| `GET /api/services` | Returns klädvård services | Firestore `services` root |
| `GET /api/struken-tvatt` | Returns struken catalog | Firestore `services/struken-tvatt/StrukenTvatt` |

**Do not touch** `create-payment`, `services`, `struken-tvatt` (GET), or `webhook`.

---

## Server-side price validation (create-cart-payment)

The API re-derives every price from Firestore before creating the PaymentIntent — never trust client-supplied prices. For mattvätt it extracts sqm from the item name with `/(\d+(?:\.\d+)?)\s*m²/i` and applies `× 90`.

Items with an unresolvable price are silently skipped. If the total comes to 0, the API returns 400.

---

## Firestore order document shape

```ts
{
  id:              paymentIntent.id,   // also the doc ID
  paymentIntentId: string,
  serviceId:       'cart' | <service id>,
  serviceName:     string,
  customerId:      string,             // Firebase UID or 'anonymous'
  amount:          number,             // in öre (smallest unit)
  currency:        'sek',
  status:          'pending_payment' | 'paid' | 'collected' | 'in_progress' | 'ready_for_pickup' | 'completed' | 'cancelled',
  address:         string,
  postalCode:      string,
  dropoffDate:     string,
  dropoffTime:     string,
  notes:           string,
  items:           CartItem[],         // only on cart orders
  createdAt:       Date,
}
```

Status transitions are driven by the admin dashboard. The webhook sets `paid` on payment success.

---

## React Native app (skraddare-app) checkout flow

The app uses a single unified `Checkout` screen — no type-based branching:

```
HomeScreen — user builds cart (same 3 types)
    ↓
navigation.navigate('Checkout', { items, total })
    ↓
CheckoutScreen — address, date, time
    ↓
PaymentScreen — Stripe
```

**Rule:** When adding a new service type, add it to both web (`/kassa` via `create-cart-payment`) and the app's `Checkout` screen. The server already handles arbitrary types as long as price derivation is implemented in `create-cart-payment`.

---

## Address autocomplete

`<AddressAutocomplete>` (web: `components/AddressAutocomplete.tsx`, app: similar) talks to `/api/places`. It restricts suggestions to the admin-configured service area circle (stored in Firestore `settings/driver`). Do not bypass or remove the restriction logic.

---

## Adding a new bookable service type

1. Add the type string to `CartItem.type` in `app/page.tsx` and `create-cart-payment/route.ts`.
2. Add price derivation logic in `create-cart-payment` (server-side).
3. Add UI on the home page with `addToCart({ ..., type: 'new-type' })`.
4. No routing changes needed — `/kassa` handles all types automatically.
5. Mirror the UI in `HomeScreen.tsx` and make sure `Checkout` screen in the app renders it.

---

## Key gotchas

- **Mattvätt has no Firestore document.** Never try to look it up by ID. The name string is the source of truth for pricing.
- **`/kassa` expects `cart` param as `encodeURIComponent(JSON.stringify(items))`** — but the `useSearchParams` value is already decoded by Next.js, so call `JSON.parse(raw)` without an extra `decodeURIComponent`. (The `/kassa` page does a `decodeURIComponent` defensively — harmless if the value is already decoded.)
- **Cart state is in-memory only** — refreshing the home page clears the cart. There is no persistence layer for the cart.
- **Stripe PaymentIntent is pre-created** on form submit (before the card step). The Firestore order is written at the same time with `pending_payment`. If the user abandons, the order stays as `pending_payment` indefinitely — this is expected.
- **Admin UID is not in Firestore Auth** — it's matched against the `ADMIN_UID` env var in `app/api/admin/session`. Firebase Auth is only used client-side to get the ID token; the server verifies it and checks the UID.
