# Tyg & Mark — Design System

> Läs denna fil innan du skapar eller redigerar någon skärm eller komponent.
> Den är den enda källan för färger, typografi, spacing och komponentmönster.

---

## Beroenden

```bash
@tabler/icons-react-native   # ikoner — outline only, aldrig -filled suffix
expo-google-fonts             # Playfair_Display_500, DM_Sans_300/400/500
react-native-reanimated       # slider, transitions
@stripe/stripe-react-native   # betalning
```

---

## Färger

```ts
// theme/colors.ts
export const colors = {
  forestDark:  '#2d5a3d',  // topbar, primärknappar, aktiv nav
  forestMid:   '#4a7c59',  // ikoner, borders, slider-fill
  forestLight: '#8fb87a',  // accenter, stjärnor, aktiv slider-thumb
  moss:        '#c8dfc0',  // valda chips, eco-badge, avatar bg, SelectOption vald

  cream:       '#f5f0e8',  // SafeAreaView / sidabakgrund
  linen:       '#ede8de',  // kort, input-fält, off-chips, sammanfattningsblock
  white:       '#fafaf7',  // skärmbakgrund, navbar

  textDark:    '#1e2e24',  // rubriker, primär text
  textMid:     '#3d5245',  // sekundär text
  textMuted:   '#7a9480',  // labels, metadata, placeholder

  earth:       '#6b5c45',  // skrädderi-accent
  amber:       '#fde8a0',  // status: väntande
  amberText:   '#7a5a00',
} as const;
```

Aldrig hårdkodade hex i komponentfiler. Alltid från `colors`.

---

## Typografi

```ts
// theme/typography.ts
export const typography = {
  h1:       { fontFamily: 'PlayfairDisplay_500', fontSize: 24, color: colors.textDark },
  h2:       { fontFamily: 'PlayfairDisplay_500', fontSize: 18, color: colors.textDark },
  h3:       { fontFamily: 'PlayfairDisplay_500', fontSize: 15, color: colors.textDark },
  price:    { fontFamily: 'PlayfairDisplay_500', fontSize: 26, color: '#c8e6c9' },  // på mörk bg
  priceDark:{ fontFamily: 'PlayfairDisplay_500', fontSize: 26, color: colors.forestDark },

  body:     { fontFamily: 'DMSans_400', fontSize: 14, color: colors.textDark, lineHeight: 22 },
  bodyBold: { fontFamily: 'DMSans_500', fontSize: 14, color: colors.textDark },
  small:    { fontFamily: 'DMSans_400', fontSize: 12, color: colors.textMuted },
  label:    { fontFamily: 'DMSans_400', fontSize: 10, color: colors.textMuted,
              letterSpacing: 1.5, textTransform: 'uppercase' as const },
  micro:    { fontFamily: 'DMSans_300', fontSize: 9,  color: colors.textMuted },
} as const;
```

---

## Spacing & Radius

```ts
// theme/spacing.ts
export const spacing = { xs:4, sm:8, md:12, lg:16, xl:24, xxl:32 } as const;
export const radius  = { sm:8, md:10, lg:14, xl:20, pill:999 }      as const;
```

---

## Komponentbibliotek

### TopBar

```tsx
// forestDark bakgrund. Alltid SafeAreaView-medveten.
// Titel: PlayfairDisplay_500, 13px, color '#c8e6c9'
// Vänster: ti-arrow-left (tillbaka) ELLER logotyptext "Tyg & Mark"
// Höger: kontextuella ikoner (ti-bell, ti-x, ti-settings) i rgba(200,230,201,0.6)
<View style={{ backgroundColor: colors.forestDark, paddingHorizontal: 16, paddingVertical: 12,
               flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
```

---

### BottomTabBar — 4 flikar

```
Hem          ti-home       → HomeScreen
Boka         ti-calendar   → BookScreen (ny bokning, steg 1)
Mina ärenden ti-package    → ProfileScreen (orderhistorik)
Profil       ti-user       → ProfileScreen (inställningar)
```

```tsx
// white bakgrund, borderTop: '0.5px solid rgba(74,124,89,0.12)'
// Inaktiv: textMuted ikon + label 9px DMSans_400
// Aktiv: forestDark ikon + label DMSans_500
```

---

### CTAButton (primär)

```tsx
<TouchableOpacity style={{
  backgroundColor: colors.forestDark,
  borderRadius: radius.md,
  paddingVertical: 14,
  alignItems: 'center',
  flexDirection: 'row',
  justifyContent: 'center',
  gap: 8,
}}>
  <Text style={{ fontFamily: 'DMSans_500', fontSize: 14, color: '#c8e6c9' }}>
    Gå till betalning
  </Text>
</TouchableOpacity>

// Sekundär: moss bakgrund, forestDark text — används för "Kontakta", "Boka igen"
```

---

### SelectOption (tjänsteväljare, 2-kolumners grid)

```tsx
// Default: linen bg, transparent border
// Vald:    moss bg, 0.5px forestMid border
<TouchableOpacity style={{
  backgroundColor: selected ? colors.moss : colors.linen,
  borderRadius: radius.lg,
  borderWidth: 0.5,
  borderColor: selected ? colors.forestMid : 'transparent',
  padding: 10, gap: 4,
}}>
  <Icon size={18} color={colors.forestMid} />
  <Text style={typography.bodyBold}>Matttvätt</Text>
  <Text style={typography.micro}>Eco-djuptvätt</Text>
</TouchableOpacity>
```

---

### Chip (tillägg/filter)

```tsx
// On:  forestDark bg, '#c8e6c9' text
// Off: linen bg, textMuted text
// pill-radius (999), paddingHorizontal 12, paddingVertical 6, DMSans_500 11px
// Används i horisontell ScrollView (flex-wrap: wrap är OK för max 4 chips)
```

---

### EcoBadge

Ska visas på **alla** skärmar med tjänsteinnehåll (BookScreen, konfiguratorer, OrderStatus).

```tsx
<View style={{ backgroundColor: colors.linen, borderRadius: radius.md,
               padding: 10, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
  <IconLeaf size={14} color={colors.forestMid} />
  <Text style={typography.small}>
    <Text style={typography.bodyBold}>Eco-tvättmedel</Text> ingår alltid · Svanenmärkt · 30°
  </Text>
</View>
```

---

### LivePriceCard

Visas direkt ovanför CTA-knappen på alla konfiguratorer. Uppdateras live.

```tsx
<View style={{ backgroundColor: colors.forestDark, borderRadius: 12, padding: 14,
               flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
  <View>
    <Text style={typography.label}>Pris</Text>
    <Text style={typography.price}>{price} kr</Text>
    <Text style={[typography.micro, { color: 'rgba(200,230,201,0.4)' }]}>{breakdown}</Text>
  </View>
  <View style={{ alignItems: 'flex-end' }}>
    <Text style={[typography.small, { color: 'rgba(200,230,201,0.55)' }]}>Hämtning ingår</Text>
    <Text style={[typography.micro, { color: 'rgba(200,230,201,0.3)' }]}>Lev. ca 5–7 dagar</Text>
  </View>
</View>
```

---

### SquareMeterSlider

Nyckelkomponent för matttvätt. Pris räknas om live.

```tsx
// Slider: min=1, max=30, step=1
// Thumb: forestDark, border 3px moss
// Track aktiv del: forestMid  |  inaktiv: linen
// Ovanför slidern: m²-värde i PlayfairDisplay_500 24px (forestDark) + "m²" label
// Under slidern: dimensionsgissning i linen-kort: "2 × 3 m"

const sizeLabels: Record<number, string> = {
  1:'1×1 m',  2:'1×2 m',  3:'1.5×2 m', 4:'2×2 m',  5:'2×2.5 m',
  6:'2×3 m',  8:'2.5×3 m',10:'2.5×4 m',12:'3×4 m', 15:'3×5 m',
  20:'4×5 m', 24:'4×6 m', 25:'5×5 m',  30:'5×6 m',
};

// Närmaste nyckel:
function closestLabel(m: number): string {
  const keys = Object.keys(sizeLabels).map(Number);
  const closest = keys.reduce((a, b) => Math.abs(b - m) < Math.abs(a - m) ? b : a);
  return sizeLabels[closest];
}
```

**Prislogik matttvätt** (frontend-preview — faktiska priser valideras av backend):

| Tillägg           | Pris        |
|-------------------|-------------|
| Grundtvätt        | 90 kr / m²  |
| Fläckbehandling   | +90 kr      |
| Luktbehandling    | +75 kr      |
| Impregnering      | +120 kr     |
| Expresstvätt      | ×1.5        |
| Hämtning & lämning| Ingår alltid|

> Notera: dessa priser är för UI-preview. Det faktiska beloppet som skickas till
> `/api/create-payment` är `serviceId`-baserat och valideras mot `lib/services.ts`.

---

### OrderTimeline

Fem steg: Bokning mottagen → Upphämtad → Hos skräddaren → Klar → Levererad

```tsx
// Klar:    forestDark cirkel, ti-check ikon '#c8e6c9'
// Aktiv:   forestLight cirkel, stegnummer forestDark
// Kommande:linen cirkel, textMuted text
// Linje:   width 0.5, backgroundColor 'rgba(74,124,89,0.18)', height 14
// Data hämtas från Firestore order.status och mappas till steg-index
```

Status → steg-mapping:
```ts
const statusToStep: Record<string, number> = {
  'paid':        1,  // Bokning mottagen
  'picked-up':   2,  // Upphämtad
  'in-progress': 3,  // Hos skräddaren
  'ready':       4,  // Klar för hämtning
  'done':        5,  // Levererad
};
```

---

### HeroOrderCard

Visas på HomeScreen för aktivt/senaste ärende. Forestdark bakgrund.

```tsx
// forestDark bakgrund, borderRadius 14, padding 14
// Innehåll:
//   - LABEL: "Pågående ärende" (micro, opacity .55, uppercase)
//   - Tjänstnamn (PlayfairDisplay_500 14px, '#c8e6c9')
//   - Metadata: "Inlämnad DD MMM · Tjänsttyp" (micro, opacity .5)
//   - ProgressBar: linen track, forestLight fill, höjd 4px, borderRadius 2
//     fill-bredd = (currentStep / 5) * 100 + '%'
//   - StatusText: aktuellt steg-namn (micro, forestLight)
//   - Två knappar: "Följ status" (moss bg, forestDark text) + "Kontakta" (rgba vit)
```

---

### Skeletonladdning

Används medan Firebase-data hämtas. Aldrig en spinner — använd skeleton-block.

```tsx
// Samma dimensioner som komponenten den ersätter
// backgroundColor: colors.linen, borderRadius: samma som komponenten
// Animated pulse: opacity 1.0 → 0.4 → 1.0, duration 1200ms, loop
// Använd Animated.loop + Animated.sequence från react-native
```

---

## Skärmstruktur (alla skärmar)

```
<SafeAreaView style={{ flex:1, backgroundColor: colors.cream }}>
  <TopBar />
  <ScrollView
    style={{ flex: 1 }}
    contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}
    showsVerticalScrollIndicator={false}
  >
    {/* skärminnehåll */}
    <EcoBadge />          {/* på alla tjänsteskärmar */}
    <LivePriceCard />     {/* på alla konfiguratorer */}
    <CTAButton />         {/* alltid sist */}
  </ScrollView>
  {/* BottomTabBar hanteras av navigator, inte per skärm */}
</SafeAreaView>
```

---

## Skärmar — layout & ansvar

### HomeScreen (befintlig: HomeScreen.tsx)

**Ersätt nuvarande grid-layout** med denna struktur:

```
1. Hälsningsrad
   - "God morgon/eftermiddag, [displayName]" — PlayfairDisplay_500 18px
   - "[N] aktiva ärenden" — micro textMuted
   - Avatar-cirkel höger (initialer, moss bg, forestDark text)

2. HeroOrderCard  ← visar senaste/aktiva order från Firestore
   - Om inga aktiva orders: visa "Välkommen"-kort med "Boka din första tid"-knapp

3. Tjänstefilter-chips (horisontell scroll)
   Skrädderi · Matttvätt · Textil · Reparation
   - Aktiv chip: forestDark bg  |  Inaktiv: linen bg
   - Filtrerar vilka ServiceCards som visas nedanför

4. ServiceCards-grid (2 kolumner)
   - Data från Firestore via GET /api/services
   - Varje kort: ikon (emoji från service.icon) + name + formatPrice(price_ore)
   - linen bakgrund, borderRadius lg, padding md
   - Tap → navigera till ServiceConfigScreen med serviceId som param

5. Snabblänkar (2-kolumners grid, mini-kort)
   "Ny bokning"  (ti-plus)   → BookScreen
   "Historik"    (ti-history) → ProfileScreen orders-tab
```

---

### ServiceConfigScreen (ny — ersätter BookScreen steg 1)

Generisk konfigurator. Tar emot `serviceId` och `serviceType` som route-params.

```
serviceType === 'carpet-cleaning':
  1. Matttyp-väljare (SelectOption 2×2 grid)
     Orientalisk / Modern / Naturfiber / Flokati
  2. SquareMeterSlider (1–30 m²)
  3. Tilläggs-chips: Fläckbehandling · Luktbehandling · Impregnering · Expresstvätt
  4. EcoBadge
  5. LivePriceCard (live-beräkning)
  6. CTA: "Välj tid & hämtning"

serviceType === 'tailoring':
  1. Plaggtyp-väljare (SelectOption 2×2 grid)
     Byxor / Kavaj / Klänning / Övrigt
  2. Ändringstyp-chips (multi-select):
     Midja · Längd · Ärmar · Dragkedja · Lagning
  3. Antal ändringar: +/- stepper (min 1, max 5) — PlayfairDisplay_500 för siffran
  4. EcoBadge (textil-variant: "Eco-rengöring av textil ingår vid behov")
  5. LivePriceCard
  6. CTA: "Välj tid & hämtning"

serviceType === 'textile':
  1. Textiltyp-väljare: Gardiner / Dynor / Överkast / Annat
  2. Löpmeter-slider (1–20 m, step 0.5) — samma mönster som SquareMeterSlider
  3. Tilläggs-chips: Fläckbeh. · Impregnering
  4. EcoBadge
  5. LivePriceCard (45 kr/m)
  6. CTA: "Välj tid & hämtning"

serviceType === 'repair':
  1. Reparationstyp (SelectOption 2×2): Dragkedja · Ficka · Söm · Hål
  2. Plaggbeskrivning (TextInput, multiline, linen bg)
  3. Fotouppladdning (valfritt): 3 foto-thumbnails + add-knapp (linen/streckad)
  4. EcoBadge
  5. LivePriceCard (fast pris per typ)
  6. CTA: "Välj tid & hämtning"
```

> Prisberäkning i konfiguratorn är **preview-only** för UX.
> Det faktiska beloppet som skickas till Stripe hämtas alltid från backend via `serviceId`.

---

### BookScreen (befintlig — nu steg 2: tid & hämtning)

BookScreen tar emot konfigurerad order som route-param och hanterar logistik.

```
1. Hämtningsmetod (SelectOption 2-grid)
   "Hämtning hemma" (ti-truck) | "Lämna i butik" (ti-map-pin, adress)

2. Datumväljare
   Horisontell scroll med datumbrickor (linen/forestDark för vald)
   Använd @react-native-community/datetimepicker för native picker

3. Tidsväljare
   3×2 grid med lediga tider (09:00, 11:00, 13:00, 15:00)
   Vald: forestDark  |  Ledig: linen  |  Bokad: linen opacity .4

4. Adressfält (vid hämtning hemma)
   Förifyller från Firebase Auth-profil om det finns
   Input: linen bg, borderRadius sm

5. Notering (valfritt, multiline TextInput)

6. CTA: "Bekräfta bokning" → navigerar till PaymentScreen
```

---

### PaymentScreen (befintlig — restylas)

```
1. Ordersammanfattning (linen-kort)
   Tjänst + konfiguration / pris per rad
   Hämtning: "Ingår" (forestMid text)
   Divider 0.5px → Total inkl. moms: PlayfairDisplay_500 18px forestDark

2. Betalningsmetod-label + kortmärken (VISA / MC / AMEX som text-badges)

3. Stripe CardField
   backgroundColor: white, borderRadius sm, border 0.5px rgba(74,124,89,.25)
   textColor: colors.textDark, placeholderColor: colors.textMuted
   Wrap i View med stripe-field-label ovanför

4. Apple Pay-knapp (om tillgängligt på enhet)
   linen bg, ti-brand-apple ikon + "Pay"

5. CTA: "Betala [X] kr" med ti-lock ikon
   forestDark bg, '#c8e6c9' text

6. Trust-rad (centrerad, micro):
   ti-shield-check + "256-bit SSL · PCI DSS"
   "Säkrad betalning via " + "stripe" (#635bff)

På success (payment confirmed):
→ Visa bekräftelseskärm inline (byt ut formulär-innehållet):
   - ti-circle-check ikon (48px, moss bg cirkel, forestDark ikon)
   - "Ärende levererat" PlayfairDisplay_500
   - Kvittorader (samma linen-kort)
   - "Boka igen?"-länk (moss sekundärknapp)
```

---

### OrderStatusScreen (ny — nås från HeroOrderCard eller Mina ärenden)

```
1. Ärendeheader
   Tjänstnamn PlayfairDisplay_500 + ärendenummer micro + status-pill

2. OrderTimeline (5 steg, data från Firestore order.status)

3. EcoBadge (eco-info för just denna tjänst)

4. Kontaktknappar (2-grid, sekundärstil)
   "Meddelande" (ti-message) | "Ring" (ti-phone)
```

---

### ChatScreen (befintlig — har färdig layout, ersätt mock-data)

```
// Bubblor:
// Kund (höger):    forestDark bg, '#c8e6c9' text, borderRadius [lg,lg,sm,lg]
// Skräddare (vänster): linen bg, textDark text, borderRadius [lg,lg,lg,sm]
// Timestamp: micro textMuted, centrerat mellan meddelanden med >5 min mellanrum

// Input-rad längst ned:
// linen input, forestDark skicka-knapp (ti-send)
// SafeAreaView-medveten (KeyboardAvoidingView)
```

Firebase-integration (ersätter mock):
```ts
// Lyssna på: /chats/{uid}/messages
// orderBy: 'timestamp'
// onSnapshot → uppdatera state
```

---

### ProfileScreen (befintlig — lägg till orders-lista)

```
1. Användarblock
   Avatar (initialer, moss cirkel) + displayName + email
   "Anonym användare" om ej inloggad

2. Aktiva ärenden (FlatList, Firestore onSnapshot)
   Varje order-kort:
   - linen bg, borderRadius lg
   - Tjänstnamn (bodyBold) + ärendenummer (micro)
   - Status-pill: paid→amber "Väntar", in-progress→moss "Pågår", done→forestLight "Klart"
   - Tap → navigera till OrderStatusScreen

3. Inställningar-sektion
   Redigera profil / Betalningsmetoder / Notiser / Logga ut
   Varje rad: ti-ikon + label + ti-chevron-right
   Separator 0.5px linen
```

---

## Navigationsstruktur

```
RootNavigator (BottomTabs)
├── Tab: Hem
│   └── Stack: HomeStack
│       ├── HomeScreen
│       ├── ServiceConfigScreen  ← ny, params: { serviceId, serviceType }
│       ├── BookScreen           ← params: { configuredOrder }
│       ├── PaymentScreen        ← params: { bookingData }
│       └── OrderStatusScreen    ← params: { orderId }
├── Tab: Boka       → direkt till ServiceConfigScreen (tjänsteväljare)
├── Tab: Ärenden    → ProfileScreen (orders-tab aktivt)
└── Tab: Profil     → ProfileScreen
```

---

## Regler som alltid gäller

- Aldrig hårdkodade hex — alltid `colors.*`
- Aldrig Inter/Roboto/systemfonter — alltid PlayfairDisplay eller DM Sans
- Inga `shadow*`-props, ingen `elevation` — platt design
- Inga `position: absolute` för layout — använd flexbox
- Skeleton-laddning, aldrig spinner
- All copy på svenska, kort och direkt
- Prisberäkning i UI är **preview** — faktiska belopp alltid från backend
- `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` = `pk_test_...` — aldrig `sk_test_`
