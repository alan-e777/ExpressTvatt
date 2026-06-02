import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { radius } from '../../theme/spacing';

type Props = {
  name: string;
  orderCount: number;
};

export default function GreetingRow({ name, orderCount }: Props) {
  const initials = name
    .split(' ')
    .map((w) => w[0] ?? '')
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <View style={styles.row}>
      <View>
        <Text style={typography.h1}>God morgon, {name}.</Text>
        <Text style={[typography.label, { marginTop: 4 }]}>
          {orderCount} aktiva ärenden
        </Text>
      </View>

      <View style={styles.avatar}>
        <Text style={styles.initials}>{initials}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
  },
  avatar: {
    width:           38,
    height:          38,
    borderRadius:    radius.circle,
    backgroundColor: colors.moss,
    alignItems:      'center',
    justifyContent:  'center',
  },
  initials: {
    fontFamily: 'PlayfairDisplay_500',
    fontStyle:  'italic',
    fontSize:   14,
    color:      colors.forestDark,
  },
});
