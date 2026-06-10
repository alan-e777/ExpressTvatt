# Express Tvätt — Mobile Design System

> Read this before creating or editing any screen or component.
> It mirrors the website's design tokens (`app/globals.css`). The website is the
> branding source of truth; this file documents how it maps into the Expo app.
> Never hardcode hex/fonts in components — always read from `theme/*`.

---

## Brand

Deep teal + gold, Poppins typography, white/mint cards floating on a deep-teal
background. Flat, premium, minimal. All copy in Swedish, short and direct.

---

## Dependencies

```bash
@tabler/icons-react-native    # icons — outline only, strokeWidth 1.5
@expo-google-fonts/poppins    # Poppins 300/400/500/600/700 (loaded in App.tsx)
@stripe/stripe-react-native   # payment
```

---

## Colors (`theme/colors.ts`)

```ts
forestDark:  '#063F41'  // deep teal — page bg, topbar, primary buttons, active nav
forestMid:   '#0E5C5B'  // teal — icons, borders, slider fill, CTA
forestLight: '#6BB3AC'  // light teal — accents
moss:        '#B7DCD7'  // pale teal — chips, avatar bg, text/icons on dark

cream:       '#063F41'  // page background (deep teal — matches website body)
linen:       '#FFFFFF'  // cards, inputs, left chat bubbles
white:       '#FFFFFF'  // nav bar, Stripe fields, white surfaces
mint:        '#E6F3F2'  // service-card surface, inset blocks on white cards

textDark:    '#063F41'  // headings / primary text on LIGHT surfaces
textMid:     '#0E5C5B'  // secondary text
textMuted:   '#6BB3AC'  // labels, metadata, placeholder

earth:       '#D4AF37'  // gold accent — active-order border, highlights
```

**Text on the deep-teal page background must be light** — use `colors.white`
(headings) or `colors.moss` (secondary). `textDark` is invisible on the page bg;
only use it inside white/mint cards.

---

## Typography (`theme/typography.ts`)

Poppins everywhere. Font keys `Poppins_300/400/500/600` are registered in `App.tsx`.

```ts
h1   Poppins_600 24    h2 Poppins_600 18    h3 Poppins_600 15
body Poppins_400 14    bodyBold Poppins_500 14
small Poppins_400 12   label Poppins_400 10 (uppercase, ls 1.5)   micro Poppins_300 9
price Poppins_600 26 (moss, on dark)   priceDark Poppins_600 26 (forestDark)
```

---

## Spacing & Radius (`theme/spacing.ts`)

```ts
spacing = { xs:4, sm:8, md:12, lg:16, xl:24, xxl:32 }
radius  = { sharp:2, sm:8, md:10, lg:14, xl:20, pill:999, circle:9999 }
```

---

## Screen structure

```
<View style={{ flex:1, backgroundColor: colors.cream }}>   // deep teal page
  <TopBar title="…" />                                      // deep-teal header
  <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
    {/* page-level headings → colors.white / colors.moss */}
    {/* content lives in white (linen) or mint cards */}
  </ScrollView>
</View>
// BottomTab bar is handled by RootNavigator (white bar, icon-only)
```

---

## Components

- **TopBar** — deep-teal (`forestDark`) header, white centered title, "Express" wordmark.
- **Service card** (Home) — `mint` bg, 1px teal border, radius lg. Inset blocks use `linen` (white).
- **Primary button / CTAButton** — `forestDark` bg, `moss` text. Secondary: `moss` bg, `forestDark` text.
- **ActiveOrderCard** ("Pågående ärenden") — white bg, **3px gold (`earth`) border**, gold
  section label, teal 5-step stepper (Bokad → Hämtad → Rengörs → Klar → Levererad).
- **Chat bubbles** — left: `linen` (white) + `textDark`; right: `forestDark` + `moss` text.
- **Inputs** — on white cards use `mint` bg; floating on the page use `linen` (white).

---

## Navigation (3 tabs, icon-only)

```
RootNavigator (BottomTabs, tabBarShowLabel: false, white bar)
├── Hem    (IconHome)    → HomeStack: Home → Checkout → CartPayment
├── Chatt  (IconMessage) → ChatScreen
└── Profil (IconUser)    → ProfileScreen
```

- **Home** = mobile version of the website `/order` flow (Mattvätt slider, Struken
  grid, Klädvård grid, cart bar → Checkout). Active order shown via ActiveOrderCard.
- **Chat** = Firebase Realtime Database chat (`chats/{uid}/messages`).
- **Profile** = user info, account info, saved addresses, active orders, logout.
  Order *history* is out of scope — only active orders.

Legacy single-service screens (Products/Book/Payment/StrukenTvatt) are preserved
but not wired into the tab bar.

---

## Rules

- Never hardcode hex — always `colors.*`. Never Inter/Playfair/DM Sans — always Poppins.
- Flat design — avoid heavy shadows/elevation; use borders and the gold accent.
- Light text on the deep-teal page background; dark text only inside light cards.
- Price math in the UI is a preview — the real amount is validated server-side.
- `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` = `pk_test_…` — never `sk_…`.
```
