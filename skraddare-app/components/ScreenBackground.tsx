import React from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, { Defs, LinearGradient, RadialGradient, Stop, Rect } from 'react-native-svg';

// Premium gradient canvas. Keeps the website's deep-teal brand (#063F41) but adds
// quiet depth — a soft light bloom in the top-left and a darker pool in the
// bottom-right over a near-flat diagonal base. Subtle on purpose (Apple/Uber feel).
//
// Absolute-fill + pointerEvents="none" so it always sits behind screen content and
// never intercepts touches. Drop it in as the FIRST child of a screen's root View.
// Explicit numeric dimensions (not "100%") so the SVG reliably fills the screen.
export default function ScreenBackground() {
  const { width, height } = useWindowDimensions();

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width={width} height={height}>
        <Defs>
          {/* Diagonal base: barely-lighter top-left → base → barely-darker bottom-right */}
          <LinearGradient id="sb-base" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%"   stopColor="#0A4A4C" />
            <Stop offset="52%"  stopColor="#063F41" />
            <Stop offset="100%" stopColor="#042B2D" />
          </LinearGradient>
          {/* Top-left light bloom */}
          <RadialGradient id="sb-glow" cx="14%" cy="4%" rx="72%" ry="55%" fx="14%" fy="4%">
            <Stop offset="0%"   stopColor="#CDEBE6" stopOpacity="0.13" />
            <Stop offset="100%" stopColor="#CDEBE6" stopOpacity="0" />
          </RadialGradient>
          {/* Bottom-right shade */}
          <RadialGradient id="sb-shade" cx="94%" cy="100%" rx="78%" ry="62%" fx="94%" fy="100%">
            <Stop offset="0%"   stopColor="#021A1B" stopOpacity="0.55" />
            <Stop offset="100%" stopColor="#021A1B" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width={width} height={height} fill="url(#sb-base)" />
        <Rect x="0" y="0" width={width} height={height} fill="url(#sb-glow)" />
        <Rect x="0" y="0" width={width} height={height} fill="url(#sb-shade)" />
      </Svg>
    </View>
  );
}
