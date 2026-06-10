import { colors } from './colors';

// The website's authenticated experience renders in Inter (the `.site-shell`
// override in app/globals.css forces it over the inline Poppins/Playfair).
// Font keys Inter_400/500/600/700 are registered in App.tsx.
export const typography = {
  h1:        { fontFamily: 'Inter_700', fontSize: 24, color: colors.textDark, letterSpacing: -0.4 },
  h2:        { fontFamily: 'Inter_700', fontSize: 18, color: colors.textDark, letterSpacing: -0.3 },
  h3:        { fontFamily: 'Inter_700', fontSize: 15, color: colors.textDark, letterSpacing: -0.2 },
  price:     { fontFamily: 'Inter_700', fontSize: 26, color: colors.moss },       // on dark bg
  priceDark: { fontFamily: 'Inter_700', fontSize: 26, color: colors.textDark },

  body:      { fontFamily: 'Inter_400', fontSize: 14, color: colors.textDark, lineHeight: 22 },
  bodyBold:  { fontFamily: 'Inter_500', fontSize: 14, color: colors.textDark },
  small:     { fontFamily: 'Inter_400', fontSize: 12, color: colors.textMuted },
  label:     { fontFamily: 'Inter_500', fontSize: 10, color: colors.textMuted,
               letterSpacing: 1.2, textTransform: 'uppercase' as const },
  micro:     { fontFamily: 'Inter_400', fontSize: 9,  color: colors.textMuted },
} as const;
