import { colors } from './colors';

export const typography = {
  h1:        { fontFamily: 'PlayfairDisplay_500', fontSize: 24, color: colors.textDark },
  h2:        { fontFamily: 'PlayfairDisplay_500', fontSize: 18, color: colors.textDark },
  h3:        { fontFamily: 'PlayfairDisplay_500', fontSize: 15, color: colors.textDark },
  price:     { fontFamily: 'PlayfairDisplay_500', fontSize: 26, color: '#c8e6c9' },
  priceDark: { fontFamily: 'PlayfairDisplay_500', fontSize: 26, color: colors.forestDark },

  body:      { fontFamily: 'DMSans_400', fontSize: 14, color: colors.textDark, lineHeight: 22 },
  bodyBold:  { fontFamily: 'DMSans_500', fontSize: 14, color: colors.textDark },
  small:     { fontFamily: 'DMSans_400', fontSize: 12, color: colors.textMuted },
  label:     { fontFamily: 'DMSans_400', fontSize: 10, color: colors.textMuted,
               letterSpacing: 1.5, textTransform: 'uppercase' as const },
  micro:     { fontFamily: 'DMSans_300', fontSize: 9,  color: colors.textMuted },
} as const;
