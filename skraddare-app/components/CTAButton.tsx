import React, { ReactNode } from 'react';
import { TouchableOpacity, Text, ActivityIndicator, View, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import { radius } from '../theme/spacing';

type Props = {
  label: string;
  onPress: () => void;
  icon?: ReactNode;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
  loading?: boolean;
  style?: any;
};

export default function CTAButton({
  label,
  onPress,
  icon,
  variant = 'primary',
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
        (disabled || loading) && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? '#B7DCD7' : colors.forestDark} />
      ) : (
        <View style={styles.inner}>
          {icon}
          <Text style={[styles.label, !isPrimary && styles.labelSecondary]}>{label}</Text>
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
  primary:         { backgroundColor: colors.forestDark },
  secondary:       { backgroundColor: colors.moss },
  disabled:        { opacity: 0.45 },
  inner:           { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label:           { fontFamily: 'Poppins_500', fontSize: 14, color: '#B7DCD7' },
  labelSecondary:  { color: colors.forestDark },
});
