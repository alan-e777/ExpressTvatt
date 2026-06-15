import React, { ReactNode } from 'react';
import { TouchableOpacity, Text, ActivityIndicator, View, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import { radius } from '../theme/spacing';

type Props = {
  label: string;
  onPress: () => void;
  icon?: ReactNode;
  variant?: 'primary' | 'secondary';
  /** Taller button + larger label for prominent CTAs (e.g. order confirmation). */
  large?: boolean;
  disabled?: boolean;
  loading?: boolean;
  style?: any;
};

export default function CTAButton({
  label,
  onPress,
  icon,
  variant = 'primary',
  large,
  disabled,
  loading,
  style,
}: Props) {
  const isPrimary = variant === 'primary';

  return (
    <TouchableOpacity
      style={[
        styles.btn,
        isPrimary ? styles.primary : styles.secondary,
        large && styles.btnLarge,
        (disabled || loading) && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? colors.textDark : colors.forestDark} />
      ) : (
        <View style={styles.inner}>
          {icon}
          <Text style={[styles.label, large && styles.labelLarge, !isPrimary && styles.labelSecondary]}>{label}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    borderRadius:    radius.md,
    paddingVertical: 14,
    alignItems:      'center',
    justifyContent:  'center',
  },
  btnLarge:        { paddingVertical: 18, borderRadius: radius.lg },
  // Gold primary is an intentional mobile adaptation: it reads on BOTH white cards
  // and the deep-teal page canvas, where a forestDark fill would vanish (#083F41 on
  // the #063F41 canvas). Gold is a brand color (deep teal + gold). The website's
  // teal .btn-primary only works there because its buttons always sit on white.
  primary:         { backgroundColor: colors.earth },
  secondary:       { backgroundColor: colors.moss },
  disabled:        { opacity: 0.45 },
  inner:           { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label:           { fontFamily: 'Inter_600', fontSize: 14, color: colors.textDark },
  labelLarge:      { fontSize: 16 },
  labelSecondary:  { color: colors.forestDark },
});
