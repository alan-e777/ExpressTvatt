# Express Tvätt — Design System

> Referensdokument för alla UI-komponenter, färger, typografi och mönster i appen och webbplatsen.
> Claude Code ska alltid läsa denna fil innan ny skärm eller komponent skapas.

---

## Varumärke

**Namn:** Express Tvätt  
**Tagline:** Kemtvätt. Upphämtning. Hemleverans.

**Logo** (`styleReference/expressTvättLogo.png`):  
Logotypen består av en ikonmark (galge + kavaj i teal/guld) ovanför ordmärket "EXPRESSTVÄTT" i versaler. Visa alltid logotypen i sin naturliga form — ikon ovanpå text. Tvinga aldrig in den i en cirkel, kvadrat eller annan maskering. Ge den luft runt om.

---

## Teknikstack

- **Framework:** React Native (Expo) — alternativt React + Tailwind för webb
- **Ikoner:** `@tabler/icons-react-native` (outline only, aldrig filled)
- **Fonter:** `Poppins` (Light 300, Regular 400, Medium 500, SemiBold 600, Bold 700)
- **Animationer:** `react-native-reanimated` för slider/transitions

---

## Färgpalett

Alla färger definieras som konstanter i `src/theme/colors.ts`.

```ts
export const colors = {
  // Primära teal-toner
  deepTeal:    '#063F41',   // Primär bakgrund, knappar, topbar, hero-ytor
  textTeal:    '#0E5C5B',   // Brödtext, ikoner, aktiva states, borders
  tagline:     '#6BB3AC',   // Accenter, tagline, aktiva states, medium teal
  houillee:    '#B7DCD7',   // Pale chips, badges, avatar-bakgrund, ljus teal-tint

  // Guld / neutrala accenter
  gold:        '#D4AF37',   // Galge i logotyp, premium-accenter, stjärnor
  tan:         '#DCCBA3',   // Kortbakgrunder, input-fält, neutrala chips
  hanger:      '#1E3F4C',   // Mörkaste overlay-teal, djup bakgrund

  // Bakgrunder
  cream:       '#F5F0E8',   // App/webb-bakgrund (varm offwhite)
  white:       '#FAFAFA',   // Kortbakgrund, navbar

  // Text
  textDark:    '#063F41',   // Rubriker, primär text (= deepTeal)
  textMid:     '#0E5C5B',   // Sekundär text (= textTeal)
  textMuted:   '#6BB3AC',   // Etiketter, metadata, placeholder (= tagline)

  // Status
  amber:       '#FDE8A0',   // Väntande status
  amberText:   '#7A5A00',
} as const;
```

**Regel:** Använd aldrig hårdkodade hexvärden i komponenterna — importera alltid från `colors`.

---

## Typografi

Poppins är enda typsnittsfamiljen. Playfair Display och DM Sans används inte längre.

```ts
export const typography = {
  // Rubriker — Poppins SemiBold
  h1: { fontFamily: 'Poppins_600SemiBold', fontSize: 28, color: colors.textDark },
  h2: { fontFamily: 'Poppins_600SemiBold', fontSize: 22, color: colors.textDark },
  h3: { fontFamily: 'Poppins_500Medium',   fontSize: 16, color: colors.textDark },

  // Brödtext — Poppins Regular/Medium
  body:    { fontFamily: 'Poppins_400Regular', fontSize: 14, color: colors.textDark, lineHeight: 22 },
  bodyBold:{ fontFamily: 'Poppins_500Medium',  fontSize: 14, color: colors.textDark },
  small:   { fontFamily: 'Poppins_400Regular', fontSize: 12, color: colors.textMuted },
  label:   { fontFamily: 'Poppins_400Regular', fontSize: 10, color: colors.textMuted,
             letterSpacing: 1.5, textTransform: 'uppercase' },
  micro:   { fontFamily: 'Poppins_300Light',   fontSize: 9,  color: colors.textMuted },

  // Pris-display — Poppins SemiBold (ersätter Playfair Display i prissammanhang)
  price:   { fontFamily: 'Poppins_600SemiBold', fontSize: 24, color: colors.houillee },
} as const;
```

---

## Border Radius

```ts
export const radius = {
  sharp:  2,
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
// deepTeal bakgrund. Logotyp visas som <Image> (ikon + text), INTE text-render.
// Höger: settings-knapp — cirkel 36×36, radius.circle, border 0.5px rgba(183,220,215,0.3)
// INGEN bakgrundsfärg, INGEN filled färg. Ikon size 16, färg houillee.
<View style={{ backgroundColor: colors.deepTeal, paddingHorizontal: 20, paddingVertical: 12,
               flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
  {/* Logotyp — visa PNG, aldrig i cirkel */}
  <Image source={require('../../styleReference/expressTvättLogo.png')}
         style={{ height: 36, width: undefined, aspectRatio: 'auto' }}
         resizeMode="contain" />
  <TouchableOpacity style={{
    width: 36, height: 36, borderRadius: radius.circle,
    borderWidth: 0.5, borderColor: 'rgba(183,220,215,0.3)',
    alignItems: 'center', justifyContent: 'center',
  }}>
    <IconSettings size={16} color={colors.houillee} />
  </TouchableOpacity>
</View>
```

---

### Primär knapp (CTA)

```tsx
// deepTeal bakgrund, houillee/white text, border-radius 10, padding 13px vertikal
<TouchableOpacity style={{
  backgroundColor: colors.deepTeal,
  borderRadius: radius.md,
  paddingVertical: 13,
  alignItems: 'center',
}}>
  <Text style={{ fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: colors.houillee }}>
    Boka upphämtning
  </Text>
</TouchableOpacity>

// Sekundär variant: outline — transparent bakgrund, 1px border deepTeal, deepTeal text
// Tertiär variant: houillee bakgrund, deepTeal text
```

---

### Tjänsteväljare (SelectOption)

```tsx
// 2-kolumners grid. Default: tan bg, transparent border.
// Vald: houillee bg, tagline border (0.5px).
<TouchableOpacity style={{
  backgroundColor: selected ? colors.houillee : colors.tan,
  borderRadius: radius.lg,
  borderWidth: 0.5,
  borderColor: selected ? colors.tagline : 'transparent',
  padding: 10,
}}>
  <Icon size={18} color={colors.textTeal} />
  <Text style={typography.bodyBold}>Kemtvätt</Text>
  <Text style={typography.micro}>Express · Hemleverans</Text>
</TouchableOpacity>
```

---

### Kvadratmeter-slider (SquareMeterSlider)

Används på matttvätt-skärmen. Nyckelkomponent.

```tsx
// Slider: 1–30 m², step 1
// Thumb: deepTeal med houillee border
// Track: tan (inaktiv), tagline (aktiv del)
// Visar: m²-värde i Poppins SemiBold 24px + ungefärlig dimensionsgissning
// Pris räknas om live: basPrice = sqm * 90

const sizeLabels: Record<number, string> = {
  1:'1×1 m', 2:'1×2 m', 3:'1.5×2 m', 4:'2×2 m', 5:'2×2.5 m',
  6:'2×3 m', 8:'2.5×3 m', 10:'2.5×4 m', 12:'3×4 m', 15:'3×5 m',
  20:'4×5 m', 24:'4×6 m', 25:'5×5 m', 30:'5×6 m',
};
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
// On-state:  deepTeal bg, houillee text, 0.5px deepTeal border
// Off-state: transparent bg, 0.5px border colors.tan, textMuted text
// Padding: 5px vertikal, 10px horisontell. Font: Poppins_400, 11px, letterSpacing 1.2
```

---

### Eco-badge (inline)

```tsx
// tan bakgrund, ti-leaf ikon i tagline, text i textDark
<View style={{ backgroundColor: colors.tan, borderRadius: radius.md,
               padding: 8, flexDirection: 'row', gap: 6 }}>
  <IconLeaf size={14} color={colors.tagline} />
  <Text style={typography.small}>
    <Text style={typography.bodyBold}>Eco-tvättmedel</Text> ingår alltid · Svanenmärkt · 30°
  </Text>
</View>
```

---

### Eco-trust banner (EcoTrustBanner)

Används på **Hem-skärmen**, ovanför filter-chips.

```tsx
// tan bakgrund, border 0.5px rgba(14,92,91,0.2), border-radius sharp (2px)
// ti-leaf ikon 12px i tagline, text i typography.label färg textMid
<View style={{
  backgroundColor: colors.tan,
  borderRadius: radius.sharp,
  borderWidth: 0.5,
  borderColor: 'rgba(14,92,91,0.2)',
  paddingVertical: 9,
  paddingHorizontal: 12,
  flexDirection: 'row',
  alignItems: 'center',
  gap: 8,
  marginBottom: spacing.md,
}}>
  <IconLeaf size={12} color={colors.tagline} />
  <Text style={{ ...typography.label, color: colors.textMid }}>
    Kemtvätt. Upphämtning. Hemleverans.
  </Text>
</View>
```

---

### Tjänstelista (ServiceListItem)

```tsx
// Separator: 0.5px borderBottom rgba(6,63,65,0.08)
// Vänster:  cirkulär ikonhållare 36×36, radius.circle, border 0.5px colors.tan
//           Ikon: ti-*, size 16, färg textTeal
// Mitten:   tjänstnamn i typography.body + kategori i typography.label
// Höger:    pris i Poppins_600 16px textMid + ti-chevron-right 12px textMuted
<TouchableOpacity style={{
  flexDirection: 'row',
  alignItems: 'center',
  paddingVertical: 13,
  borderBottomWidth: 0.5,
  borderBottomColor: 'rgba(6,63,65,0.08)',
  gap: spacing.md,
}}>
  <View style={{
    width: 36, height: 36, borderRadius: radius.circle,
    borderWidth: 0.5, borderColor: colors.tan,
    alignItems: 'center', justifyContent: 'center',
  }}>
    <Icon size={16} color={colors.textTeal} />
  </View>
  <View style={{ flex: 1 }}>
    <Text style={typography.body}>{name}</Text>
    <Text style={typography.label}>{category}</Text>
  </View>
  <Text style={{ fontFamily: 'Poppins_600SemiBold', fontSize: 16, color: colors.textMid }}>
    {price} kr
  </Text>
  <IconChevronRight size={12} color={colors.textMuted} />
</TouchableOpacity>
```

---

### Livepris-card

```tsx
// deepTeal bakgrund, border-radius 12
// Vänster: etikett "PRIS" (micro, opacity .5) + stort pris i Poppins SemiBold houillee-färg
// Höger: "Hämtning ingår" + leveranstid
// Alltid längst ned på konfigureringsvy, ovanför CTA-knappen
```

---

### Ärendetidslinje (OrderTimeline)

Fem steg: Bokning → Upphämtad → Hos kemtvätteriet → Klar → Levererad

```tsx
// Klar: deepTeal cirkel med ti-check
// Aktiv: tagline cirkel med stegnummer
// Kommande: tan cirkel, textMuted text
// Linje mellan steg: 0.5px, rgba(14,92,91,0.18)
```

---

### Betalningsskärm (Stripe)

```tsx
// Kortfält: white bakgrund, 0.5px border rgba(14,92,91,.25), border-radius 8
// Fältlayout: Kortnummer (hel bredd) → Expiry + CVC (50/50) → Kortinnehavare
// Apple Pay & Google Pay: tan bakgrund, 50/50 grid
// Betalknapp: deepTeal, ti-lock ikon + "Betala XXX kr", houillee text
// Trust-rad: ti-shield-check + "256-bit SSL" + "Säkrad via Stripe"
// Stripe-logotyp: text med #635BFF färg
```

**Ordersammanfattning ovanför kortfält:**
- tan bakgrund, border-radius 10
- Varje rad: tjänstnamn vänster / pris höger
- Separator `.5px` → totalrad med Poppins SemiBold pris

---

### Navbar (BottomTab)

Fyra flikar: Hem · Boka · Mina ärenden · Profil

```tsx
// white bakgrund, border-top 0.5px rgba(14,92,91,.12)
// Inaktiv: textMuted ikon + label 8px
// Aktiv: deepTeal ikon + label
// Ikoner: ti-home, ti-calendar, ti-package, ti-user
```

---

## Webbplats (Next.js)

Webbplatsens color tokens mappar direkt mot paletten ovan via Tailwind CSS custom colors eller CSS-variabler:

```css
/* globals.css */
:root {
  --deep-teal:  #063F41;
  --text-teal:  #0E5C5B;
  --tagline:    #6BB3AC;
  --houillee:   #B7DCD7;
  --gold:       #D4AF37;
  --tan:        #DCCBA3;
  --cream:      #F5F0E8;
}
```

**Hero-sektion:** cream bakgrund, deepTeal rubriktext, tagline-accent  
**Feature-banner (mörkare sektioner):** deepTeal bakgrund, houillee ikoner/text  
**CTA-knapp:** deepTeal bakgrund, white/houillee text — aldrig grön  
**Sekundär CTA:** transparent bakgrund, 1.5px deepTeal border, deepTeal text  
**Navbar:** white bakgrund, deepTeal logotyp och nav-text  

**Logo i navbar:** Visa `expressTvättLogo.png` med `object-contain`, aldrig i cirkelram.  
Höjd ~36px på desktop, ~30px på mobil. Låt bildens naturliga proportioner gälla (ikon + text staplat).

---

## Skärmstruktur (mobil)

```
<SafeAreaView bg=cream>
  <TopBar />              ← deepTeal bakgrund, logotyp som PNG
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

| Skärm             | Nyckeltal / slider             | Prislogik              |
|-------------------|-------------------------------|------------------------|
| Matttvätt         | Kvadratmeter (1–30 m²)        | 90 kr/m²               |
| Kemtvätt          | Plaggtyp + antal              | Fast per plagg         |
| Textilrengöring   | Antal meter (gardiner etc.)   | 45 kr/m                |
| Reparation        | Typ av lagning                | Fast pris per typ      |

---

## Tonalitet & copy

- Svenska i hela appen och webbplatsen
- Tagline återkommer konsekvent: "Kemtvätt. Upphämtning. Hemleverans."
- Kort och direkt: "Välj tid" inte "Välj önskad tidpunkt för bokning"
- Premium-känsla utan att vara pompöst — teal + guld signalerar kvalitet, inte lyx
- Ärende-nummer format: `#ÅÅMM-XXX` (ex. `#2406-017`)

---

## Vad Claude Code INTE ska göra

- Aldrig hårdkoda hexfärger i komponentfiler — importera alltid från `colors`
- Aldrig använda Inter, Roboto, DM Sans, Playfair Display eller systemfonter — Poppins only
- Aldrig lägga till skuggor (`shadow*`) — layouten är platt
- Aldrig använda `position: absolute` för layoutsyften
- Aldrig skapa laddningsstatus utan en `skeleton`-komponent i rätt teal-toner
- Aldrig tvinga in logotypen i en cirkel, kvadrat eller annan maskering
- Aldrig använda gröna toner (moss, forestDark, forestMid etc.) — paletten är nu teal/guld
