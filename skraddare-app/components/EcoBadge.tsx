import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { IconLeaf } from '@tabler/icons-react-native';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { radius } from '../theme/spacing';

type Props = {
  variant?: 'default' | 'textile';
};

export default function EcoBadge({ variant = 'default' }: Props) {
  const suffix = variant === 'textile'
    ? 'ingår vid behov · Eco-rengöring av textil'
    : 'ingår alltid · Svanenmärkt · 30°';

  return (
    <View style={styles.container}>
      <IconLeaf size={14} color={colors.forestMid} strokeWidth={1.5} />
      <Text style={typography.small}>
        <Text style={typography.bodyBold}>Eco-tvättmedel </Text>
        {suffix}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.linen,
    borderRadius:    radius.md,
    padding:         10,
    flexDirection:   'row',
    alignItems:      'center',
    gap:             8,
  },
});
