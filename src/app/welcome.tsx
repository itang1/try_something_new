import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import { writeSetting } from '@/data/storage';
import { readable, useColors } from '@/theme';
import { Icon } from '@/components/icon';
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
    router.replace(setLocation ? '/quick-start?location=1' : '/quick-start');
  };

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={styles.top}>
        <Animated.View entering={ZoomIn.springify().damping(12)}>
          <Image source={require('../../assets/images/icon.png')} style={styles.logo} accessibilityIgnoresInvertColors />
        </Animated.View>
        <Animated.Text entering={FadeInDown.delay(150)} style={[styles.title, { color: colors.label }]}>
          Try Something New
        </Animated.Text>
        <Animated.Text entering={FadeInDown.delay(250)} style={[styles.subtitle, { color: colors.secondary }]}>
          Ideas for things to try, out around town or at home, from archery to a new craft.
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
          accessibilityRole="button"
          onPress={() => finish(true)}
          style={({ pressed }) => [styles.primary, { backgroundColor: colors.accent, opacity: pressed ? 0.8 : 1 }]}
        >
          <Icon name="location_on" size={20} color={colors.onAccent} />
          <Text style={[styles.primaryText, { color: colors.onAccent }]}>Set my location</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => finish(false)} hitSlop={8} style={styles.secondary}>
          <Text style={[styles.secondaryText, { color: colors.accent }]}>Not now</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 24 },
  logo: { width: 96, height: 96, borderRadius: 22, borderCurve: 'continuous' },
  top: { ...readable, maxWidth: 480, flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 },
  title: { fontSize: 32, fontWeight: '800', textAlign: 'center', marginTop: 8 },
  subtitle: { fontSize: 17, textAlign: 'center', lineHeight: 23 },
  points: { alignSelf: 'stretch', gap: 18, marginTop: 24 },
  point: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  pointIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  grow: { flex: 1 },
  pointTitle: { fontSize: 17, fontWeight: '700' },
  pointBody: { fontSize: 15, marginTop: 2 },
  actions: { ...readable, maxWidth: 480, gap: 8, paddingBottom: 12 },
  primary: {
    minHeight: 54,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryText: { fontSize: 17, fontWeight: '600' },
  secondary: { alignItems: 'center', paddingVertical: 12 },
  secondaryText: { fontSize: 16, fontWeight: '600' },
});
