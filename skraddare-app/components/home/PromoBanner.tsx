import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { IconLeaf, IconChevronRight } from '@tabler/icons-react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { radius, spacing } from '../../theme/spacing';

export default function PromoBanner() {
  return (
    <TouchableOpacity style={styles.banner} activeOpacity={0.8}>
      {/* Left — icon circle */}
      <View style={styles.iconCircle}>
        <IconLeaf size={20} color={colors.forestMid} strokeWidth={1.5} />
      </View>

      {/* Middle — text */}
      <View style={{ flex: 1 }}>
        <Text style={typography.h3}>Eco-tvätt — nu 15% rabatt</Text>
        <Text style={[typography.small, { marginTop: 2 }]}>
          Svanenmärkt · Gäller t.o.m. 30 juni
        </Text>
      </View>

      {/* Right — chevron */}
      <IconChevronRight size={14} color={colors.textMuted} strokeWidth={1.5} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: colors.linen,
    borderRadius:    radius.lg,
    padding:         spacing.md,
    flexDirection:   'row',
    alignItems:      'center',
    gap:             spacing.md,
  },
  iconCircle: {
    width:           40,
    height:          40,
    borderRadius:    radius.circle,
    backgroundColor: 'rgba(143,184,122,0.18)',
    alignItems:      'center',
    justifyContent:  'center',
  },
});
