// Express Tvätt — brand palette (mirrors the website's app/globals.css tokens).
// Deep teal + gold. Never hardcode hex in components — always read from here.
export const colors = {
  forestDark:  '#063F41',  // deep teal — page bg, topbar, primary buttons, active nav
  forestMid:   '#0E5C5B',  // teal — icons, borders, slider fill, primary CTA
  forestLight: '#6BB3AC',  // light teal — accents, muted text on dark surfaces
  moss:        '#B7DCD7',  // pale teal — chips, avatar bg, button/text on dark

  cream:       '#063F41',  // page background (deep teal — matches website body)
  linen:       '#FFFFFF',  // cards, inputs, left chat bubbles
  white:       '#FFFFFF',  // nav bar, Stripe fields, white surfaces
  mint:        '#E6F3F2',  // service-card surface, inset blocks on white cards

  textDark:    '#063F41',  // headings / primary text on light surfaces
  textMid:     '#0E5C5B',  // secondary text
  textMuted:   '#6BB3AC',  // labels, metadata, placeholder

  earth:       '#D4AF37',  // gold accent — active-order border, highlights
  amber:       '#fde8a0',  // status: pending
  amberText:   '#7a5a00',

  onDark:      '#FFFFFF',  // text on the deep-teal page background
} as const;
