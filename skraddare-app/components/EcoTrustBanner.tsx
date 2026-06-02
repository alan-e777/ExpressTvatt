import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { IconLeaf } from '@tabler/icons-react-native';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { radius, spacing } from '../theme/spacing';

export default function EcoTrustBanner() {
  return (
    <View style={styles.banner}>
      <IconLeaf size={12} color={colors.forestMid} strokeWidth={1.5} />
      <Text style={styles.text}>Miljövänliga metoder sedan 1987</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: colors.linen,
    borderRadius:    radius.sharp,
    borderWidth:     0.5,
    borderColor:     'rgba(74,124,89,0.2)',
    paddingVertical:   9,
    paddingHorizontal: spacing.md,
    flexDirection:   'row',
    alignItems:      'center',
    gap:             8,
    marginBottom:    spacing.md,
  },
  text: {
    ...typography.label,
    color: colors.textMid,
  } as any,
});
