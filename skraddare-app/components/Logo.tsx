import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';

const MARK = require('../assets/logo-icon.png');

type Props = { size?: 'sm' | 'lg' };

// Express Tvätt brand lockup: hanger mark in a light chip + "EXPRESS TVÄTT"
// wordmark (white + light teal), tuned for the deep-teal surfaces.
export default function Logo({ size = 'sm' }: Props) {
  const lg = size === 'lg';
  const chip = lg ? 60 : 34;          // chip box size — unchanged
  const img  = lg ? 54 : 31;          // logo mark inside — enlarged for prominence
  const fs   = lg ? 22 : 15;

  return (
    <View style={[styles.row, { gap: lg ? 12 : 8 }]}>
      <View style={[styles.chip, { width: chip, height: chip, borderRadius: lg ? 16 : 10 }]}>
        <Image source={MARK} style={{ width: img, height: img }} resizeMode="contain" />
      </View>
      <Text style={[styles.word, { fontSize: fs, letterSpacing: lg ? 1.5 : 1 }]}>
        <Text style={{ color: colors.white }}>EXPRESS </Text>
        <Text style={{ color: colors.forestLight }}>TVÄTT</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row:  { flexDirection: 'row', alignItems: 'center' },
  chip: { backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  word: { fontFamily: 'Inter_700' },
});
