import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { BRAND, SUBCATEGORIES } from '@/theme';

const COLORS = [BRAND.gold, BRAND.rose, BRAND.violet, SUBCATEGORIES.outdoors.color, SUBCATEGORIES.water.color, SUBCATEGORIES.play.color];

// Picked once at load so every render of a burst draws the same pieces.
const PIECES = Array.from({ length: 28 }, (_, i) => ({
  color: COLORS[i % COLORS.length],
  angle: (i / 28) * Math.PI * 2 + Math.random() * 0.4,
  distance: 90 + Math.random() * 90,
  spin: (Math.random() - 0.5) * 720,
  // Starts once the sheet has slid in.
  delay: 350 + Math.random() * 150,
  wide: i % 3 === 0,
}));

function Piece({ piece }: { piece: (typeof PIECES)[number] }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.set(withDelay(piece.delay, withTiming(1, { duration: 1500, easing: Easing.out(Easing.cubic) })));
  }, [t, piece.delay]);

  const style = useAnimatedStyle(() => {
    const p = t.get();
    return {
      opacity: 1 - p * p,
      transform: [
        { translateX: Math.cos(piece.angle) * piece.distance * p },
        // A little gravity: pieces drift down as they fly out.
        { translateY: Math.sin(piece.angle) * piece.distance * p + 60 * p * p },
        { rotate: `${piece.spin * p}deg` },
      ],
    };
  });

  return (
    <Animated.View
      style={[styles.piece, piece.wide ? styles.wide : styles.tall, { backgroundColor: piece.color }, style]}
    />
  );
}

/** A one-shot burst from the center of its parent, which needs a real size. */
export function Confetti() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {PIECES.map((piece, i) => (
        <Piece key={i} piece={piece} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  piece: { position: 'absolute', left: '50%', top: '50%', borderRadius: 2 },
  wide: { width: 12, height: 8, marginLeft: -6, marginTop: -4 },
  tall: { width: 7, height: 13, marginLeft: -3.5, marginTop: -6.5 },
});
