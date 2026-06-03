# Tvättio — Design System

> Referensdokument för alla UI-komponenter, färger, typografi och mönster i appen.
> Claude Code ska alltid läsa denna fil innan ny skärm eller komponent skapas.

---

## Teknikstack

- **Framework:** React Native (Expo) — alternativt React + Tailwind för webb
- **Ikoner:** `@tabler/icons-react-native` (outline only, aldrig filled)
- **Fonter:** `Playfair_Display_500` för rubriker, `DM_Sans_300/400/500` för brödtext
- **Animationer:** `react-native-reanimated` för slider/transitions

---

## Färgpalett

Alla färger definieras som konstanter i `src/theme/colors.ts`.

```ts
export const colors = {
  // Primära gröna toner
  forestDark:  '#2d5a3d',   // Primär bakgrund, knappar, topbar
  forestMid:   '#4a7c59',   // Ikoner, aktiva states, borders
  forestLight: '#8fb87a',   // Accenter, stjärnor, slider-thumb fill
  moss:        '#c8dfc0',   // Pale chips, eco-badges, avatar bg
  
  // Neutrala ytor
  cream:       '#f5f0e8',   // App-bakgrund
  linen:       '#ede8de',   // Kortbakgrunder, input-fält, chips
  white:       '#fafaf7',   // Skärmbakgrund, navbar

  // Text
  textDark:    '#1e2e24',   // Rubriker, primär text
  textMid:     '#3d5245',   // Sekundär text
  textMuted:   '#7a9480',   // Etiketter, metadata, placeholder

  // Earth (accent för skrädderi-kontext)
  earth:       '#6b5c45',

  // Status
  amber:       '#fde8a0',   // Väntande status
  amberText:   '#7a5a00',
} as const;
```

**Regel:** Använd aldrig hårdkodade hexvärden i komponenterna — importera alltid från `colors`.

---

## Typografi

```ts
export const typography = {
  // Rubriker — Playfair Display
  h1: { fontFamily: 'PlayfairDisplay_500', fontSize: 28, color: colors.textDark },
  h2: { fontFamily: 'PlayfairDisplay_500', fontSize: 22, color: colors.textDark },
  h3: { fontFamily: 'PlayfairDisplay_500', fontSize: 16, color: colors.textDark },

  // Brödtext — DM Sans
  body:    { fontFamily: 'DMSans_400', fontSize: 14, color: colors.textDark, lineHeight: 22 },
  bodyBold:{ fontFamily: 'DMSans_500', fontSize: 14, color: colors.textDark },
  small:   { fontFamily: 'DMSans_400', fontSize: 12, color: colors.textMuted },
  label:   { fontFamily: 'DMSans_400', fontSize: 10, color: colors.textMuted, 
             letterSpacing: 1.5, textTransform: 'uppercase' },
  micro:   { fontFamily: 'DMSans_300', fontSize: 9,  color: colors.textMuted },
} as const;
```

---

## Border Radius

```ts
export const radius = {
  sharp:  2,    // Filter-chips, eco-trust banner — precision edges, inte pill
  sm:     8,
  md:     10,
  lg:     14,
  xl:     20,
  pill:   999,
  circle: 9999,
} as const;
```

---

## Spacing

Använd ett 4px-baserat system.

```ts
export const spacing = {
  xs:  4,
  sm:  8,
  md:  12,
  lg:  16,
  xl:  24,
  xxl: 32,
} as const;
```

---

## Komponenter

### TopBar / StatusBar

```tsx
// Alltid forestDark bakgrund. Titel i Playfair Display italic, 17px, färg moss.
// Vänster: app-logotyp i DMSans_300, 11px, moss 60% opacity, uppercase, letterSpacing 1.5
// Höger: settings-knapp — cirkel 36×36, radius.circle, border 0.5px rgba(197,204,186,0.3)
//         INGEN bakgrundsfärg, INGEN filled/blå färg. Ikon ti-settings size 16, färg moss.
<View style={{ backgroundColor: colors.forestDark, paddingHorizontal: 20, paddingVertical: 12,
               flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
  <Text style={{ fontFamily: 'DMSans_300', fontSize: 11, color: colors.moss,
                 opacity: 0.6, letterSpacing: 1.5, textTransform: 'uppercase' }}>
    Tvättio
  </Text>
  <Text style={{ fontFamily: 'PlayfairDisplay_500', fontSize: 17, color: colors.moss,
                 fontStyle: 'italic' }}>
    Tvättio
  </Text>
  <TouchableOpacity style={{
    width: 36, height: 36, borderRadius: radius.circle,
    borderWidth: 0.5, borderColor: 'rgba(197,204,186,0.3)',
    alignItems: 'center', justifyContent: 'center',
  }}>
    <IconSettings size={16} color={colors.moss} />
  </TouchableOpacity>
</View>
```

---

### Primär knapp (CTA)

```tsx
// forestDark bakgrund, #c8e6c9 text, border-radius 10, padding 13px vertikal
<TouchableOpacity style={{
  backgroundColor: colors.forestDark,
  borderRadius: radius.md,
  paddingVertical: 13,
  alignItems: 'center',
}}>
  <Text style={{ fontFamily: 'DMSans_500', fontSize: 13, color: '#c8e6c9' }}>
    Gå till betalning
  </Text>
</TouchableOpacity>

// Sekundär variant: moss bakgrund, forestDark text
```

---

### Tjänsteväljare (SelectOption)

```tsx
// 2-kolumners grid. Default: linen bg, transparent border.
// Vald: moss bg, forestMid border (0.5px).
<TouchableOpacity style={{
  backgroundColor: selected ? colors.moss : colors.linen,
  borderRadius: radius.lg,
  borderWidth: 0.5,
  borderColor: selected ? colors.forestMid : 'transparent',
  padding: 10,
}}>
  <Icon size={18} color={colors.forestMid} />
  <Text style={typography.bodyBold}>Matttvätt</Text>
  <Text style={typography.micro}>Eco-djuptvätt</Text>
</TouchableOpacity>
```

---

### Kvadratmeter-slider (SquareMeterSlider)

Används på matttvätt-skärmen. Nyckelkomponent.

```tsx
// Slider: 1–30 m², step 1
// Thumb: forestDark med moss border
// Track: linen (inaktiv), forestMid (aktiv del)
// Visar: m²-värde i Playfair Display 24px + ungefärlig dimensionsgissning
// Pris räknas om live: basPrice = sqm * 90

const sizeLabels: Record<number, string> = {
  1:'1×1 m', 2:'1×2 m', 3:'1.5×2 m', 4:'2×2 m', 5:'2×2.5 m',
  6:'2×3 m', 8:'2.5×3 m', 10:'2.5×4 m', 12:'3×4 m', 15:'3×5 m',
  20:'4×5 m', 24:'4×6 m', 25:'5×5 m', 30:'5×6 m',
};
// Välj närmaste nyckel för givet m²-värde
```

**Prislogik matttvätt:**

| Tjänst            | Pris          |
|-------------------|---------------|
| Grundtvätt        | 90 kr / m²    |
| Fläckbehandling   | +90 kr        |
| Luktbehandling    | +75 kr        |
| Impregnering      | +120 kr       |
| Expresstvätt      | +50%          |
| Hämtning & lämning| Ingår alltid  |

---

### Chip / Tag

```tsx
// Filter-chips (Hem-skärmen): radius.sharp (2px) — INTE pill
// Pill-radius (999) används fortfarande för status-tags och badges på ärendekort
// On-state:  forestDark bg, moss text, 0.5px forestDark border
// Off-state: transparent bg, 0.5px border colors.linen, textMuted text
// Padding: 5px vertikal, 10px horisontell. Font: DMSans_400, 11px, letterSpacing 1.2
```

---

### Eco-badge (inline)

```tsx
// Ska visas på alla produktskärmar som bekräftelse
// linen bakgrund, ti-leaf ikon i forestMid, text i textDark
<View style={{ backgroundColor: colors.linen, borderRadius: radius.md, 
               padding: 8, flexDirection: 'row', gap: 6 }}>
  <IconLeaf size={14} color={colors.forestMid} />
  <Text style={typography.small}>
    <Text style={typography.bodyBold}>Eco-tvättmedel</Text> ingår alltid · Svanenmärkt · 30°
  </Text>
</View>
```

---

### Eco-trust banner (EcoTrustBanner)

Används på **Hem-skärmen**, ovanför filter-chips. Inte att förväxla med EcoBadge (som tillhör tjänsteskärmar).

```tsx
// linen bakgrund, border 0.5px rgba(74,124,89,0.2), border-radius sharp (2px)
// ti-leaf ikon 12px i forestMid, text i typography.label färg textMid
<View style={{
  backgroundColor: colors.linen,
  borderRadius: radius.sharp,
  borderWidth: 0.5,
  borderColor: 'rgba(74,124,89,0.2)',
  paddingVertical: 9,
  paddingHorizontal: 12,
  flexDirection: 'row',
  alignItems: 'center',
  gap: 8,
  marginBottom: spacing.md,
}}>
  <IconLeaf size={12} color={colors.forestMid} />
  <Text style={{ ...typography.label, color: colors.textMid }}>
    Miljövänliga metoder sedan 1987
  </Text>
</View>
```

---

### Tjänstelista (ServiceListItem)

Används på **Hem-skärmen**. Lista med hairline-separatorer — INTE kort med bakgrundsfärg och borderRadius.

```tsx
// Separator: 0.5px borderBottom rgba(30,46,36,0.08) — ingen border på sista raden
// Ingen bakgrundsfärg, ingen borderRadius på raden
// Vänster:  cirkulär ikonhållare 36×36, radius.circle, border 0.5px colors.linen
//           Ikon: ti-*, size 16, färg forestMid
// Mitten:   tjänstnamn i typography.body + kategori i typography.label (textMuted)
// Höger:    pris i PlayfairDisplay_500 16px textMid + ti-chevron-right 12px textMuted
<TouchableOpacity style={{
  flexDirection: 'row',
  alignItems: 'center',
  paddingVertical: 13,
  borderBottomWidth: 0.5,
  borderBottomColor: 'rgba(30,46,36,0.08)',
  gap: spacing.md,
}}>
  <View style={{
    width: 36,
    height: 36,
    borderRadius: radius.circle,
    borderWidth: 0.5,
    borderColor: colors.linen,
    alignItems: 'center',
    justifyContent: 'center',
  }}>
    <Icon size={16} color={colors.forestMid} />
  </View>
  <View style={{ flex: 1 }}>
    <Text style={typography.body}>{name}</Text>
    <Text style={typography.label}>{category}</Text>
  </View>
  <Text style={{ fontFamily: 'PlayfairDisplay_500', fontSize: 16, color: colors.textMid }}>
    {price} kr
  </Text>
  <IconChevronRight size={12} color={colors.textMuted} />
</TouchableOpacity>

// Lägg till sektionsetikett ovanför listan:
<Text style={{ ...typography.label, marginBottom: spacing.sm }}>Tjänster</Text>
```

---

### Livepris-card

```tsx
// forestDark bakgrund, border-radius 12
// Vänster: etikett "PRIS" (micro, opacity .5) + stort pris i Playfair Display #c8e6c9
// Höger: "Hämtning ingår" + leveranstid
// Alltid längst ned på konfigureringsvy, ovanför CTA-knappen
```

---

### Ärendetidslinje (OrderTimeline)

Fem steg: Bokning → Upphämtad → Hos skräddaren → Klar → Levererad

```tsx
// Klar: forestDark cirkel med ti-check
// Aktiv: forestLight cirkel med stegnummer
// Kommande: linen cirkel, textMuted text
// Linje mellan steg: 0.5px, rgba(74,124,89,0.18)
```

---

### Betalningsskärm (Stripe)

```tsx
// Kortfält: vit bakgrund, 0.5px border rgba(74,124,89,.25), border-radius 8
// Fältlayout: Kortnummer (hel bredd) → Expiry + CVC (50/50) → Kortinnehavare
// Apple Pay & Google Pay: linen bakgrund, 50/50 grid
// Betalknapp: forestDark, ti-lock ikon + "Betala XXX kr"
// Trust-rad: ti-shield-check + "256-bit SSL" + "Säkrad via stripe"
// Stripe-logotyp: text med #635bff färg
```

**Ordersammanfattning ovanför kortfält:**
- linen bakgrund, border-radius 10
- Varje rad: tjänstnamn vänster / pris höger
- Separator `.5px` → totalrad med Playfair Display pris

---

### Navbar (BottomTab)

Fyra flikar: Hem · Boka · Mina ärenden · Profil

```tsx
// white bakgrund, border-top 0.5px rgba(74,124,89,.12)
// Inaktiv: textMuted ikon + label 8px
// Aktiv: forestDark ikon + label
// Ikoner: ti-home, ti-calendar, ti-package, ti-user
```

---

## Skärmstruktur

Alla skärmar följer detta mönster:

```
<SafeAreaView bg=cream>
  <TopBar />
  <ScrollView contentPadding=16>
    ...innehåll...
    <EcoBadge />          ← alltid med på tjänsteskärmar
    <LivePriceCard />     ← alltid med på konfiguratorer
    <CTAButton />         ← alltid sist i scrollview
  </ScrollView>
  <BottomTabBar />
</SafeAreaView>
```

---

## Produktskärmar & nyckeltal

Varje tjänst har en konfigureringsvy med unika nyckeltal:

| Skärm             | Nyckeltal / slider             | Prislogik              |
|-------------------|-------------------------------|------------------------|
| Matttvätt         | Kvadratmeter (1–30 m²)        | 90 kr/m²               |
| Skrädderi         | Plaggtyp + antal ändringar    | Fast per åtgärd        |
| Textilrengöring   | Antal meter (gardiner etc.)   | 45 kr/m                |
| Reparation        | Typ av lagning                | Fast pris per typ      |

---

## Tonalitet & copy

- Svenska i hela appen
- Kort och direkt: "Välj tid" inte "Välj önskad tidpunkt för bokning"
- Miljöbudskapet är subtilt — det ska kännas naturligt, inte moralistiskt
- Ärende-nummer format: `#ÅÅMM-XXX` (ex. `#2406-017`)

---

## Vad Claude Code INTE ska göra

- Aldrig hårdkoda hexfärger i komponentfiler — använd `colors`-objektet
- Aldrig använda Inter, Roboto eller System-fonter
- Aldrig lägga till skuggor (`shadow*`) — layouten är platt
- Aldrig använda `position: absolute` för layoutsyften
- Aldrig skapa laddningsstatus utan en `skeleton`-komponent i rätt gröna toner
- Aldrig byta ut Playfair Display mot sans-serif i prisdisplayer
