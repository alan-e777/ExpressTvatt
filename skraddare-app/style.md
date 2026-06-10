# Express Tvätt — Mobile Design System

> Read this before creating or editing any screen or component.
> It mirrors the website's design tokens (`app/globals.css`). The website is the
> branding source of truth; this file documents how it maps into the Expo app.
> Never hardcode hex/fonts in components — always read from `theme/*`.

---

## Brand

Deep teal + gold, **Inter** typography, white cards with warm-cream insets floating
on a deep-teal canvas. Flat, premium, minimal. Swedish copy, short and direct.
(Mirrors the website's `.site-shell` rendered system in `app/globals.css`.)

---

## Dependencies

```bash
@tabler/icons-react-native    # icons — outline only, strokeWidth 1.5
@expo-google-fonts/inter      # Inter 400/500/600/700 (loaded in App.tsx)
@stripe/stripe-react-native   # payment
```

---

## Colors (`theme/colors.ts`)

```ts
forestDark:  '#083F41'  // primary deep teal — buttons, header, glyphs, active nav
forestMid:   '#0E5C5B'  // teal — icons, borders, slider fill
forestLight: '#6BB3AC'  // light teal — accents, secondary text on dark
moss:        '#B7DCD7'  // pale teal — chips, avatar bg, text/icons on dark

cream:       '#063F41'  // page background (deep-teal canvas — website body)
linen:       '#FFFFFF'  // cards, left chat bubbles
white:       '#FFFFFF'  // nav bar, Stripe fields, white surfaces
mint:        '#F7F5F0'  // warm-cream input / inset fill on white cards

textDark:    '#0F172A'  // ink — headings / primary text inside light cards
textMid:     '#334155'  // slate — secondary text
textMuted:   '#64748B'  // slate gray — labels, metadata, placeholder

earth:       '#D4AF37'  // gold accent — active-order border, eco banner
```

**Text on the deep-teal page background must be light** — use `colors.white`
(headings) or `colors.moss` (secondary). The ink/slate `textDark/textMid/textMuted`
are for use INSIDE white/cream cards only; they are invisible on the page bg.

---

## Typography (`theme/typography.ts`)

Inter everywhere. Font keys `Inter_400/500/600/700` are registered in `App.tsx`.

```ts
h1   Inter_700 24 (ls -0.4)   h2 Inter_700 18   h3 Inter_700 15
body Inter_400 14    bodyBold Inter_500 14
small Inter_400 12   label Inter_500 10 (uppercase, ls 1.2)   micro Inter_400 9
price Inter_700 26 (moss, on dark)   priceDark Inter_700 26 (ink)
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
- **Service card** (Home) — white bg, 1px hairline border (`rgba(15,23,42,0.08)`), radius lg. Inset blocks use `mint` (warm cream).
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
