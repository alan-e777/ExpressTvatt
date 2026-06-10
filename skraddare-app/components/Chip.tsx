import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import { radius } from '../theme/spacing';

type Props = {
  label: string;
  active: boolean;
  onPress: () => void;
};

export default function Chip({ label, active, onPress }: Props) {
  return (
    <TouchableOpacity
      style={[styles.chip, active ? styles.chipActive : styles.chipInactive]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.label, active && styles.labelActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderRadius:      radius.sharp,
    paddingHorizontal: 10,
    paddingVertical:   5,
    borderWidth:       0.5,
  },
  chipInactive: {
    backgroundColor: 'transparent',
    borderColor:     colors.linen,
  },
  chipActive: {
    backgroundColor: colors.forestDark,
    borderColor:     colors.forestDark,
  },
  label: {
    fontFamily:    'Poppins_400',
    fontSize:      11,
    color:         colors.textMuted,
    letterSpacing: 1.2,
  },
  labelActive: {
    color: colors.moss,
  },
});
