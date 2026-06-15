import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconArrowLeft } from '@tabler/icons-react-native';
import { colors } from '../theme/colors';
import Logo from './Logo';

type Props = {
  /** Show a back arrow on the left (sub-screens). */
  onBack?: () => void;
  /** Accepted for backwards-compat; the header always shows the brand lockup. */
  title?: string;
};

export default function TopBar({ onBack }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top + 6 }]}>
      <View style={styles.side}>
        {onBack ? (
          <TouchableOpacity onPress={onBack} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <IconArrowLeft size={22} color={colors.moss} strokeWidth={1.5} />
          </TouchableOpacity>
        ) : null}
      </View>

      <Logo size="sm" />

      <View style={styles.side} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    // Transparent so the screen's gradient canvas flows through the header.
    backgroundColor:   'transparent',
    paddingHorizontal: 20,
    paddingBottom:     12,
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
  },
  side: { width: 44, justifyContent: 'center' },
});
