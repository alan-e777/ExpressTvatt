import React, { ReactNode } from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { radius } from '../theme/spacing';

type Props = {
  icon?: ReactNode;
  label: string;
  sublabel?: string;
  selected: boolean;
  onPress: () => void;
};

export default function SelectOption({ icon, label, sublabel, selected, onPress }: Props) {
  return (
    <TouchableOpacity
      style={[styles.option, selected && styles.selected]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {icon}
      <Text style={typography.bodyBold}>{label}</Text>
      {sublabel ? <Text style={typography.micro}>{sublabel}</Text> : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  option: {
    flex:            1,
    backgroundColor: colors.linen,
    borderRadius:    radius.lg,
    borderWidth:     0.5,
    borderColor:     'transparent',
    padding:         10,
    gap:             4,
  },
  selected: {
    backgroundColor: colors.moss,
    borderColor:     colors.forestMid,
  },
});
