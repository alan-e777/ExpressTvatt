// Express Tvätt — brand palette. Mirrors the website's RENDERED design system,
// i.e. the `.site-shell` overrides in app/globals.css (Inter, deep teal #083F41,
// gold #D4AF37, ink text, white cards on a deep-teal canvas).
// Never hardcode hex in components — always read from here.
export const colors = {
  forestDark:  '#083F41',  // primary deep teal — buttons, header, glyphs, active nav
  forestMid:   '#0E5C5B',  // teal — icons, slider fill, borders
  forestLight: '#6BB3AC',  // light teal — accents, secondary text on dark
  moss:        '#B7DCD7',  // pale teal — chips, avatar bg, text/icons on dark

  cream:       '#063F41',  // page background (deep-teal canvas — website body)
  linen:       '#FFFFFF',  // cards, left chat bubbles
  white:       '#FFFFFF',  // nav bar, Stripe fields, white surfaces
  mint:        '#F7F5F0',  // warm-cream input / inset fill on white cards

  textDark:    '#0F172A',  // ink — headings / primary text on light cards
  textMid:     '#334155',  // slate — secondary text
  textMuted:   '#64748B',  // slate gray — labels, metadata, placeholder

  earth:       '#D4AF37',  // gold accent — active-order border, highlights
  amber:       '#fde8a0',  // status: pending
  amberText:   '#7a5a00',

  onDark:      '#FFFFFF',  // text on the deep-teal page background
} as const;
