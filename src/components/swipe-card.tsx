import type { ReactNode } from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

const SWIPE_DISTANCE = 110;
const SWIPE_VELOCITY = 800;

function cardEntering() {
  'worklet';
  return {
    initialValues: { opacity: 0, transform: [{ scale: 0.9 }] },
    animations: {
      opacity: withTiming(1, { duration: 250 }),
      transform: [{ scale: withSpring(1, { duration: 400, dampingRatio: 0.75 }) }],
    },
  };
}

type Props = {
  children: ReactNode;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
};

/** Drag sideways to skip (left) or save (right). Vertical drags and taps pass through to the content. */
export function SwipeCard({ children, onSwipeLeft, onSwipeRight }: Props) {
  const { width } = useWindowDimensions();
  const x = useSharedValue(0);

  const pan = usePanGesture({
    activeOffsetX: [-15, 15],
    failOffsetY: [-12, 12],
    onUpdate: (e) => {
      x.value = e.translationX;
    },
    onDeactivate: (e) => {
      const flung = Math.abs(e.translationX) > SWIPE_DISTANCE || Math.abs(e.velocityX) > SWIPE_VELOCITY;
      if (!flung) {
        x.value = withSpring(0, { dampingRatio: 0.8 });
        return;
      }
      const right = (e.velocityX || e.translationX) > 0;
      x.value = withTiming(right ? width * 1.2 : -width * 1.2, { duration: 220 }, (finished) => {
        if (finished) scheduleOnRN(right ? onSwipeRight : onSwipeLeft);
      });
    },
  });

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }, { rotate: `${(x.value / width) * 12}deg` }],
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View entering={cardEntering} style={[styles.card, style]}>
        {children}
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  card: { alignSelf: 'stretch' },
});
