import { useMemo, useRef, useState } from 'react';
import { Animated } from 'react-native';

// Scroll-driven collapsing header. The header stays fully visible for the first
// `safeZone` pixels of scroll (the "safe zone"), then slides up out of view as the
// user keeps scrolling down, and slides back as they scroll up. Native-driven, so
// it tracks the finger smoothly.
//
// Usage per screen:
//   const h = useCollapsibleHeader();
//   <Animated.ScrollView onScroll={h.onScroll} scrollEventThrottle={16}
//     contentContainerStyle={{ paddingTop: h.headerHeight }} />
//   <Animated.View style={[styles.header, { transform:[{translateY:h.translateY}], opacity:h.opacity }]}
//     onLayout={e => h.onHeaderLayout(e.nativeEvent.layout.height)}><TopBar/></Animated.View>
export function useCollapsibleHeader(safeZone = 64) {
  const scrollY = useRef(new Animated.Value(0)).current;
  const [headerHeight, setHeaderHeight] = useState(110);

  const onScroll = useMemo(
    () => Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true }),
    [scrollY],
  );

  const translateY = scrollY.interpolate({
    inputRange: [0, safeZone, safeZone + headerHeight],
    outputRange: [0, 0, -headerHeight],
    extrapolate: 'clamp',
  });

  const opacity = scrollY.interpolate({
    inputRange: [0, safeZone, safeZone + headerHeight * 0.75],
    outputRange: [1, 1, 0],
    extrapolate: 'clamp',
  });

  return {
    onScroll,
    translateY,
    opacity,
    headerHeight,
    onHeaderLayout: (h: number) => { if (h > 0 && Math.abs(h - headerHeight) > 1) setHeaderHeight(h); },
  };
}
