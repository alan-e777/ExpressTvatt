import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { radius, spacing } from '../theme/spacing';

type Props = {
  price: number;
  breakdown?: string;
};

export default function LivePriceCard({ price, breakdown }: Props) {
  return (
    <View style={styles.card}>
      <View>
        <Text style={[typography.label, styles.priceLabel]}>Pris</Text>
        <Text style={typography.price}>{price} kr</Text>
        {breakdown ? (
          <Text style={styles.breakdown}>{breakdown}</Text>
        ) : null}
      </View>
      <View style={styles.right}>
        <Text style={styles.pickup}>Hämtning ingår</Text>
        <Text style={styles.delivery}>Lev. ca 5–7 dagar</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor:  colors.forestDark,
    borderRadius:     12,
    padding:          spacing.lg,
    flexDirection:    'row',
    alignItems:       'center',
    justifyContent:   'space-between',
  },
  priceLabel: { color: 'rgba(183,220,215,0.55)', letterSpacing: 1.5 },
  breakdown:  {
    fontFamily: 'Poppins_300',
    fontSize:   9,
    color:      'rgba(183,220,215,0.4)',
    marginTop:  2,
  },
  right:    { alignItems: 'flex-end' },
  pickup:   { fontFamily: 'Poppins_400', fontSize: 12, color: 'rgba(183,220,215,0.55)' },
  delivery: { fontFamily: 'Poppins_300', fontSize: 9,  color: 'rgba(183,220,215,0.3)', marginTop: 2 },
});
