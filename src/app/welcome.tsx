import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import { writeSetting } from '@/data/storage';
import { useColors } from '@/theme';
import { GradientIcon, Icon } from '@/components/icon';
import type { IconName } from '@/icons/paths';

const POINTS: { icon: IconName; title: string; body: string }[] = [
  { icon: 'shuffle', title: 'One idea at a time', body: 'Swipe right to save it, left to skip.' },
  { icon: 'calendar_month', title: 'Pick a day', body: 'Add it to your calendar and invite a friend.' },
  { icon: 'photo_library', title: 'Look back', body: 'Rate what you tried and keep a photo.' },
];

export default function WelcomeScreen() {
  const colors = useColors();
  const router = useRouter();

  const finish = (setLocation: boolean) => {
    writeSetting('onboarded', true);
    router.back();
    if (setLocation) router.push('/location');
  };

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={styles.top}>
        <Animated.View entering={ZoomIn.springify().damping(12)}>
          <GradientIcon icon="explore" subcategoryId="outdoor" size={96} shape="circle" />
        </Animated.View>
        <Animated.Text entering={FadeInDown.delay(150)} style={[styles.title, { color: colors.label }]}>
          Try Something New
        </Animated.Text>
        <Animated.Text entering={FadeInDown.delay(250)} style={[styles.subtitle, { color: colors.secondary }]}>
          Ideas for things to do near you, from archery to the city&apos;s must-sees.
        </Animated.Text>

        <View style={styles.points}>
          {POINTS.map((p, i) => (
            <Animated.View key={p.title} entering={FadeInDown.delay(350 + i * 100)} style={styles.point}>
              <View style={[styles.pointIcon, { backgroundColor: colors.accentSoft }]}>
                <Icon name={p.icon} size={24} color={colors.accent} />
              </View>
              <View style={styles.grow}>
                <Text style={[styles.pointTitle, { color: colors.label }]}>{p.title}</Text>
                <Text style={[styles.pointBody, { color: colors.secondary }]}>{p.body}</Text>
              </View>
            </Animated.View>
          ))}
        </View>
      </View>

      <View style={styles.actions}>
        <Pressable
          onPress={() => finish(true)}
          style={({ pressed }) => [styles.primary, { backgroundColor: colors.accent, opacity: pressed ? 0.8 : 1 }]}
        >
          <Icon name="location_on" size={20} color="white" />
          <Text style={styles.primaryText}>Set my location</Text>
        </Pressable>
        <Pressable onPress={() => finish(false)} hitSlop={8} style={styles.secondary}>
          <Text style={[styles.secondaryText, { color: colors.accent }]}>Not now</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 24 },
  top: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 },
  title: { fontSize: 32, fontWeight: '800', textAlign: 'center', marginTop: 8 },
  subtitle: { fontSize: 17, textAlign: 'center', lineHeight: 23 },
  points: { alignSelf: 'stretch', gap: 18, marginTop: 24 },
  point: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  pointIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  grow: { flex: 1 },
  pointTitle: { fontSize: 17, fontWeight: '700' },
  pointBody: { fontSize: 15, marginTop: 2 },
  actions: { gap: 8, paddingBottom: 12 },
  primary: {
    minHeight: 54,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryText: { color: 'white', fontSize: 17, fontWeight: '600' },
  secondary: { alignItems: 'center', paddingVertical: 12 },
  secondaryText: { fontSize: 16, fontWeight: '600' },
});
