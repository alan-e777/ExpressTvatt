import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, PanResponder, LayoutChangeEvent } from 'react-native';
import { colors } from '../theme/colors';
import { radius, spacing } from '../theme/spacing';

type Props = {
  value: number;
  onChange: (sqm: number) => void;
  min?: number;
  max?: number;
};

const SIZE_LABELS: Record<number, string> = {
  1: '1×1 m',   2: '1×2 m',   3: '1.5×2 m', 4: '2×2 m',   5: '2×2.5 m',
  6: '2×3 m',   8: '2.5×3 m', 10: '2.5×4 m', 12: '3×4 m',  15: '3×5 m',
  20: '4×5 m',  24: '4×6 m',  25: '5×5 m',   30: '5×6 m',
};

function closestLabel(m: number): string {
  const keys = Object.keys(SIZE_LABELS).map(Number);
  const closest = keys.reduce((a, b) => Math.abs(b - m) < Math.abs(a - m) ? b : a);
  return SIZE_LABELS[closest];
}

const THUMB_SIZE = 24;

export default function SquareMeterSlider({ value, onChange, min = 1, max = 30 }: Props) {
  const trackWidth = useRef(0);

  function valueToRatio(v: number) {
    return (v - min) / (max - min);
  }

  function ratioToValue(ratio: number) {
    const clamped = Math.max(0, Math.min(1, ratio));
    return Math.round(clamped * (max - min) + min);
  }

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder:  () => true,
      onPanResponderGrant: (e) => {
        const x = e.nativeEvent.locationX;
        onChange(ratioToValue(x / trackWidth.current));
      },
      onPanResponderMove: (e) => {
        const x = e.nativeEvent.locationX;
        onChange(ratioToValue(x / trackWidth.current));
      },
    })
  ).current;

  function onTrackLayout(e: LayoutChangeEvent) {
    trackWidth.current = e.nativeEvent.layout.width;
  }

  const ratio = valueToRatio(value);
  const thumbLeft = `${ratio * 100}%`;

  return (
    <View style={styles.container}>
      {/* Value display */}
      <View style={styles.valueRow}>
        <Text style={styles.sqmValue}>{value}</Text>
        <Text style={styles.sqmUnit}>m²</Text>
      </View>

      {/* Track */}
      <View
        style={styles.trackContainer}
        onLayout={onTrackLayout}
        {...panResponder.panHandlers}
      >
        <View style={styles.trackBg} />
        <View style={[styles.trackFill, { width: `${ratio * 100}%` as `${number}%` }]} />
        <View style={[styles.thumb, { left: thumbLeft as `${number}%` }]} />
      </View>

      {/* Range labels */}
      <View style={styles.rangeRow}>
        <Text style={styles.rangeText}>{min} m²</Text>
        <Text style={styles.rangeText}>{max} m²</Text>
      </View>

      {/* Dimension hint */}
      <View style={styles.hintCard}>
        <Text style={styles.hintText}>ca {closestLabel(value)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.xs },

  valueRow:  { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.xs },
  sqmValue:  { fontFamily: 'Inter_600', fontSize: 24, color: colors.forestDark },
  sqmUnit:   { fontFamily: 'Inter_400', fontSize: 13, color: colors.textMuted, marginBottom: 3 },

  trackContainer: {
    height:         THUMB_SIZE,
    justifyContent: 'center',
    paddingHorizontal: THUMB_SIZE / 2,
  },
  trackBg: {
    position:        'absolute',
    left:            THUMB_SIZE / 2,
    right:           THUMB_SIZE / 2,
    height:          4,
    borderRadius:    2,
    backgroundColor: colors.linen,
  },
  trackFill: {
    position:        'absolute',
    left:            THUMB_SIZE / 2,
    height:          4,
    borderRadius:    2,
    backgroundColor: colors.forestMid,
  },
  thumb: {
    position:        'absolute',
    width:           THUMB_SIZE,
    height:          THUMB_SIZE,
    borderRadius:    THUMB_SIZE / 2,
    backgroundColor: colors.forestDark,
    borderWidth:     3,
    borderColor:     colors.moss,
    marginLeft:      -THUMB_SIZE / 2,
    top:             0,
  },

  rangeRow:  { flexDirection: 'row', justifyContent: 'space-between' },
  rangeText: { fontFamily: 'Inter_400', fontSize: 9, color: colors.textMuted },

  hintCard: {
    backgroundColor:   colors.linen,
    borderRadius:      radius.sm,
    paddingVertical:   spacing.sm,
    paddingHorizontal: spacing.md,
    alignSelf:         'flex-start',
  },
  hintText: { fontFamily: 'Inter_400', fontSize: 12, color: colors.textMid },
});
