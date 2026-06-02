import React, { ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconArrowLeft, IconSettings } from '@tabler/icons-react-native';
import { colors } from '../theme/colors';
import { radius } from '../theme/spacing';

type Props = {
  title?: string;
  onBack?: () => void;
  right?: ReactNode;
};

export default function TopBar({ title, onBack, right }: Props) {
  const insets = useSafeAreaInsets();

  // Default right slot: ghost settings button (only on root screens without a back action)
  const rightSlot: ReactNode =
    right !== undefined ? right
    : !onBack ? (
      <TouchableOpacity style={styles.settingsBtn} activeOpacity={0.7}>
        <IconSettings size={16} color={colors.moss} strokeWidth={1.5} />
      </TouchableOpacity>
    ) : null;

  return (
    <View style={[styles.container, { paddingTop: insets.top + 4 }]}>
      {/* Left — logo or back arrow */}
      <View style={styles.side}>
        {onBack ? (
          <TouchableOpacity onPress={onBack} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <IconArrowLeft size={20} color={colors.moss} strokeWidth={1.5} />
          </TouchableOpacity>
        ) : (
          <Text style={styles.logo}>{'Tyg &\nMark'}</Text>
        )}
      </View>

      {/* Centre title */}
      {title ? (
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
      ) : (
        <View style={styles.titlePlaceholder} />
      )}

      {/* Right */}
      <View style={[styles.side, styles.sideRight]}>
        {rightSlot}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor:   colors.forestDark,
    paddingHorizontal: 20,
    paddingBottom:     10,
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
  },

  side:             { width: 44 },
  sideRight:        { alignItems: 'flex-end' },
  titlePlaceholder: { flex: 1 },

  logo: {
    fontFamily:     'DMSans_300',
    fontSize:       11,
    color:          colors.moss,
    opacity:        0.6,
    letterSpacing:  1.5,
    textTransform:  'uppercase',
    lineHeight:     16,
  },

  title: {
    flex:       1,
    textAlign:  'center',
    fontFamily: 'PlayfairDisplay_500',
    fontSize:   17,
    color:      colors.moss,
    fontStyle:  'italic',
  },

  settingsBtn: {
    width:        36,
    height:       36,
    borderRadius: radius.circle,
    borderWidth:  0.5,
    borderColor:  'rgba(213,204,186,0.3)',
    alignItems:   'center',
    justifyContent: 'center',
  },
});
