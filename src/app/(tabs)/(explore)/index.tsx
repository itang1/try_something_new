import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import Animated, { withSpring, withTiming } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { activitiesForCity, ACTIVITIES } from '@/data/catalog';
import { driveMinutes, formatMinutes } from '@/data/drive';
import { useAppState } from '@/state/app-state';
import { subcategory, useColors } from '@/theme';
import { GradientIcon, Icon } from '@/components/icon';
import { MetadataTag } from '@/components/chips';
import { cityMenu, locationButton } from '@/components/header-items';

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

export default function ExploreScreen() {
  const colors = useColors();
  const router = useRouter();
  const { city, setCity, location, isDone, toggleDone } = useAppState();
  // The pick remembers its city, so switching cities clears it without an effect.
  const [pick, setPick] = useState<{ id: string; city: string; n: number } | null>(null);

  const cityActivities = activitiesForCity(city);
  const activity = pick?.city === city ? ACTIVITIES.find((a) => a.id === pick.id) : undefined;
  const minutes = activity ? driveMinutes(activity, location, city) : null;
  const hint = activity?.hints[city];
  const done = activity ? isDone(activity.id) : false;

  const trySomething = () => {
    const next = cityActivities[Math.floor(Math.random() * cityActivities.length)];
    Haptics.selectionAsync();
    setPick({ id: next.id, city, n: (pick?.n ?? 0) + 1 });
  };

  return (
    // The native safe area includes the header and tab bar, so the button stays above the tabs.
    <SafeAreaView edges={['top', 'bottom']} style={[styles.content, { backgroundColor: colors.background }]}>
      <Stack.Toolbar placement="left">{cityMenu(city, setCity)}</Stack.Toolbar>
      <Stack.Toolbar placement="right">{locationButton(location, () => router.push('/location'))}</Stack.Toolbar>

      <View style={styles.middle}>
        {activity ? (
          <Animated.View key={pick?.n} entering={cardEntering} style={styles.card}>
            <GradientIcon
              icon={activity.icon}
              subcategoryId={activity.subcategory}
              size={200}
              shape="circle"
              style={[styles.bigIcon, { boxShadow: `0 10px 20px ${subcategory(activity.subcategory).color}66` }]}
            />
            <Text style={[styles.title, { color: colors.label }]}>{activity.name}</Text>
            <Text
              style={[
                styles.pill,
                {
                  color: subcategory(activity.subcategory).color,
                  backgroundColor: `${subcategory(activity.subcategory).color}26`,
                },
              ]}
            >
              {subcategory(activity.subcategory).label}
            </Text>
            {!!hint && <Text style={[styles.hint, { color: colors.secondary }]}>Try it at: {hint}</Text>}
            <View style={styles.tags}>
              <MetadataTag icon="schedule" text={activity.duration} />
              <MetadataTag icon="payments" text={activity.cost} />
              {minutes != null && <MetadataTag icon="directions_car" text={formatMinutes(minutes)} />}
            </View>
            <Pressable
              onPress={() => {
                Haptics.selectionAsync();
                toggleDone(activity.id);
              }}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: done }}
              style={({ pressed }) => [
                styles.doneButton,
                { backgroundColor: done ? `${colors.done}26` : colors.fill, opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Icon
                name={done ? 'check_circle' : 'radio_button_unchecked'}
                size={18}
                color={done ? colors.done : colors.secondary}
              />
              <Text style={[styles.doneText, { color: done ? colors.done : colors.secondary }]}>
                {done ? 'Done!' : 'Mark as Done'}
              </Text>
            </Pressable>
          </Animated.View>
        ) : (
          <View style={styles.empty}>
            <Icon name="help" size={60} color={colors.tertiary} />
            <Text style={[styles.emptyTitle, { color: colors.secondary }]}>What should you do today?</Text>
            <Text style={[styles.emptyBody, { color: colors.tertiary }]}>Tap the button to find out!</Text>
          </View>
        )}
      </View>

      <View style={styles.footer}>
        {location && (
          <Text style={[styles.driveFrom, { color: colors.secondary }]}>Drive times from {location.name}</Text>
        )}
        <Pressable
          onPress={trySomething}
          disabled={cityActivities.length === 0}
          style={({ pressed }) => [styles.tryButton, { backgroundColor: colors.accent, opacity: pressed ? 0.8 : 1 }]}
        >
          <Text style={styles.tryText}>Try something!</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, padding: 16, gap: 24 },
  middle: { flex: 1, justifyContent: 'center' },
  card: { alignItems: 'center', gap: 16 },
  bigIcon: { marginBottom: 8 },
  title: { fontSize: 28, fontWeight: '700', textAlign: 'center' },
  pill: {
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    overflow: 'hidden',
  },
  hint: { fontSize: 17, textAlign: 'center', paddingHorizontal: 24 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  doneButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  doneText: { fontSize: 15, fontWeight: '600' },
  empty: { alignItems: 'center', gap: 12 },
  emptyTitle: { fontSize: 17, fontWeight: '600' },
  emptyBody: { fontSize: 15 },
  footer: { gap: 12, alignItems: 'center' },
  driveFrom: { fontSize: 13 },
  tryButton: { alignSelf: 'stretch', borderRadius: 999, paddingVertical: 16, alignItems: 'center' },
  tryText: { color: 'white', fontSize: 17, fontWeight: '600' },
});
