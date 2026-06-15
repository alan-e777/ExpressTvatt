import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, View, useWindowDimensions } from 'react-native';

// Brand-palette confetti — light teal, moss, gold, deep teal, pale gold.
// Mirrors the website `components/Confetti.tsx` burst. A one-shot, dependency-free
// celebratory rain; pointerEvents="none" so it never blocks the success card.
const COLORS = ['#6BB3AC', '#B7DCD7', '#D4AF37', '#083F41', '#EADBA8'];

type Cfg = {
  left: number; delay: number; duration: number; bg: string;
  size: number; rot: number; drift: number; round: boolean;
};

function Piece({ cfg, height }: { cfg: Cfg; height: number }) {
  const t = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(t, {
      toValue: 1,
      duration: cfg.duration,
      delay: cfg.delay,
      easing: Easing.bezier(0.25, 0.6, 0.5, 1),
      useNativeDriver: true,
    }).start();
  }, []);

  const translateY = t.interpolate({ inputRange: [0, 1], outputRange: [-40, height + 60] });
  const translateX = t.interpolate({ inputRange: [0, 1], outputRange: [0, cfg.drift] });
  const rotate     = t.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${cfg.rot}deg`] });
  const opacity    = t.interpolate({ inputRange: [0, 0.85, 1], outputRange: [1, 1, 0] });

  return (
    <Animated.View
      style={{
        position: 'absolute',
        top: 0,
        left: `${cfg.left}%`,
        width: cfg.size,
        height: cfg.size * 1.7,
        backgroundColor: cfg.bg,
        borderRadius: cfg.round ? cfg.size : 2,
        opacity,
        transform: [{ translateY }, { translateX }, { rotate }],
      }}
    />
  );
}

export default function Confetti({ count = 70 }: { count?: number }) {
  const { height } = useWindowDimensions();

  const pieces = useMemo<Cfg[]>(
    () =>
      Array.from({ length: count }).map((_, i) => ({
        left:     Math.random() * 100,
        delay:    Math.random() * 500,
        duration: 2600 + Math.random() * 2000,
        bg:       COLORS[i % COLORS.length],
        size:     6 + Math.random() * 7,
        rot:      (Math.random() > 0.5 ? 1 : -1) * (360 + Math.random() * 540),
        drift:    (Math.random() - 0.5) * 140,
        round:    Math.random() > 0.6,
      })),
    [count],
  );

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {pieces.map((cfg, i) => (
        <Piece key={i} cfg={cfg} height={height} />
      ))}
    </View>
  );
}
