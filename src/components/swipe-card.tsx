import { useEffect, type ReactNode } from 'react';
import { StyleSheet, Text, useWindowDimensions } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useColors } from '@/theme';
import { Icon } from '@/components/icon';
import type { IconName } from '@/icons/paths';

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
  /** Rocks the card once each way so the stamps show what a swipe does. */
  nudge?: boolean;
};

/** Drag sideways to skip (left) or save (right). Vertical drags and taps pass through to the content. */
export function SwipeCard({ children, onSwipeLeft, onSwipeRight, nudge }: Props) {
  const colors = useColors();
  const { width } = useWindowDimensions();
  const x = useSharedValue(0);

  useEffect(() => {
    if (!nudge) return;
    x.set(
      withDelay(
        700,
        withSequence(
          withTiming(70, { duration: 350 }),
          withTiming(70, { duration: 500 }),
          withTiming(-70, { duration: 450 }),
          withTiming(-70, { duration: 500 }),
          withSpring(0, { dampingRatio: 0.8 }),
        ),
      ),
    );
  }, [nudge, x]);

  const pan = usePanGesture({
    activeOffsetX: [-15, 15],
    failOffsetY: [-12, 12],
    onUpdate: (e) => {
      x.set(e.translationX);
    },
    onDeactivate: (e) => {
      const flung = Math.abs(e.translationX) > SWIPE_DISTANCE || Math.abs(e.velocityX) > SWIPE_VELOCITY;
      if (!flung) {
        x.set(withSpring(0, { dampingRatio: 0.8 }));
        return;
      }
      const right = (e.velocityX || e.translationX) > 0;
      x.set(
        withTiming(right ? width * 1.2 : -width * 1.2, { duration: 220 }, (finished) => {
          if (finished) scheduleOnRN(right ? onSwipeRight : onSwipeLeft);
        }),
      );
    },
  });

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: x.get() }, { rotate: `${(x.get() / width) * 12}deg` }],
  }));

  return (
    <GestureDetector gesture={pan}>
      {/* Screen reader users can't swipe, so the same choices are offered as actions. */}
      <Animated.View
        entering={cardEntering}
        style={[styles.card, style]}
        accessibilityActions={[
          { name: 'skip', label: 'Skip' },
          { name: 'save', label: 'Save and show another' },
        ]}
        onAccessibilityAction={(e) => (e.nativeEvent.actionName === 'save' ? onSwipeRight() : onSwipeLeft())}
      >
        {children}
        <Stamp x={x} direction={1} label="SAVE" icon="bookmark" color={colors.accent} />
        <Stamp x={x} direction={-1} label="SKIP" icon="close" color={colors.secondary} />
      </Animated.View>
    </GestureDetector>
  );
}

type StampProps = { x: SharedValue<number>; direction: 1 | -1; label: string; icon: IconName; color: string };

function Stamp({ x, direction, label, icon, color }: StampProps) {
  const colors = useColors();
  const style = useAnimatedStyle(() => {
    const progress = interpolate(x.get() * direction, [10, 80], [0, 1], 'clamp');
    return { opacity: progress, transform: [{ scale: 0.8 + progress * 0.2 }, { rotate: `${-direction * 12}deg` }] };
  });
  return (
    <Animated.View
      pointerEvents="none"
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      style={[
        styles.stamp,
        direction === 1 ? styles.left : styles.right,
        { borderColor: color, backgroundColor: colors.card },
        style,
      ]}
    >
      <Icon name={icon} size={22} color={color} />
      <Text style={[styles.stampText, { color }]}>{label}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: { alignSelf: 'stretch' },
  stamp: {
    position: 'absolute',
    top: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 3,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  left: { left: 20 },
  right: { right: 20 },
  stampText: { fontSize: 20, fontWeight: '800', letterSpacing: 1 },
});
