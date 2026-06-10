import { colors } from './colors';

// Express Tvätt uses Poppins everywhere (see website app/globals.css).
// Font keys (Poppins_300/400/500/600) are registered in App.tsx.
export const typography = {
  h1:        { fontFamily: 'Poppins_600', fontSize: 24, color: colors.textDark },
  h2:        { fontFamily: 'Poppins_600', fontSize: 18, color: colors.textDark },
  h3:        { fontFamily: 'Poppins_600', fontSize: 15, color: colors.textDark },
  price:     { fontFamily: 'Poppins_600', fontSize: 26, color: colors.moss },       // on dark bg
  priceDark: { fontFamily: 'Poppins_600', fontSize: 26, color: colors.forestDark },

  body:      { fontFamily: 'Poppins_400', fontSize: 14, color: colors.textDark, lineHeight: 22 },
  bodyBold:  { fontFamily: 'Poppins_500', fontSize: 14, color: colors.textDark },
  small:     { fontFamily: 'Poppins_400', fontSize: 12, color: colors.textMuted },
  label:     { fontFamily: 'Poppins_400', fontSize: 10, color: colors.textMuted,
               letterSpacing: 1.5, textTransform: 'uppercase' as const },
  micro:     { fontFamily: 'Poppins_300', fontSize: 9,  color: colors.textMuted },
} as const;
