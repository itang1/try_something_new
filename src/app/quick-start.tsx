import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import type { Entry } from '@/data/catalog';
import { useAppState } from '@/state/app-state';
import { readable, useColors } from '@/theme';
import { GradientIcon, Icon } from '@/components/icon';

// Familiar things most people have tried, so the first ideas aren't ones they've done for years.
const FAMILIAR = [
  'bowling', 'art-museum', 'zoo-aquarium', 'hike-a-trail', 'mini-golf', 'escape-room', 'sports-game', 'live-show',
  'botanical-garden', 'ice-skating', 'roller-skating', 'yoga-class', 'stand-up-comedy', 'food-market', 'roller-coaster',
];
// A mix across kinds, so what someone saves says something about their taste.
const TEMPTING = [
  'pottery-class', 'rock-climbing', 'trivia-night', 'new-cuisine', 'kayaking', 'archery', 'candle-making', 'sunrise',
  'board-game-cafe', 'live-music', 'horseback-riding', 'cooking-class', 'stargazing', 'sauna', 'dance-class', 'go-karts',
  'bake-bread', 'escape-room',
];

const STEPS = [
  { ids: FAMILIAR, title: 'Already tried any of these?', body: 'Tap what you’ve done, so your ideas start fresh.' },
  { ids: TEMPTING, title: 'Which sound fun?', body: 'Tap any that catch your eye. They’ll be saved for later.' },
];

export default function QuickStartScreen() {
  const colors = useColors();
  const router = useRouter();
  const { location } = useLocalSearchParams<{ location?: string }>();
  const { findEntry, setDone, save } = useAppState();
  const [step, setStep] = useState(0);
  const [done, setDoneIds] = useState<string[]>([]);
  const [fun, setFun] = useState<string[]>([]);

  const picked = step === 0 ? done : fun;
  const setPicked = step === 0 ? setDoneIds : setFun;
  const tiles = STEPS[step].ids
    .filter((id) => step === 0 || !done.includes(id))
    .map(findEntry)
    .filter((e): e is Entry => !!e);

  const finish = () => {
    setDone(done, true, true);
    save(fun);
    router.back();
    if (location) router.push('/location');
  };

  const next = () => {
    Haptics.selectionAsync();
    if (step === 0) setStep(1);
    else finish();
  };

  return (
    <SafeAreaView edges={['bottom']} style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
        <Text style={[styles.step, { color: colors.accent }]}>
          {step + 1} of {STEPS.length}
        </Text>
        <Text style={[styles.title, { color: colors.label }]}>{STEPS[step].title}</Text>
        <Text style={[styles.body, { color: colors.secondary }]}>{STEPS[step].body}</Text>

        <View style={styles.grid}>
          {tiles.map((e) => {
            const selected = picked.includes(e.id);
            return (
              <Pressable
                key={e.id}
                onPress={() => {
                  Haptics.selectionAsync();
                  setPicked(selected ? picked.filter((id) => id !== e.id) : [...picked, e.id]);
                }}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: selected }}
                accessibilityLabel={e.name}
                style={({ pressed }) => [
                  styles.tile,
                  {
                    backgroundColor: colors.card,
                    borderColor: selected ? colors.accent : 'transparent',
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
              >
                <GradientIcon icon={e.icon} subcategoryId={e.subcategory} size={44} shape="circle" />
                <Text style={[styles.tileName, { color: colors.label }]} numberOfLines={3}>
                  {e.name}
                </Text>
                {selected && (
                  <View style={styles.check}>
                    <Icon name="check_circle" size={22} color={colors.accent} />
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <View style={styles.actions}>
        <Pressable
          onPress={next}
          style={({ pressed }) => [styles.primary, { backgroundColor: colors.accent, opacity: pressed ? 0.8 : 1 }]}
        >
          <Text style={styles.primaryText}>
            {picked.length ? (step === 0 ? `Next (${picked.length} done)` : `Save ${picked.length}`) : 'None of these'}
          </Text>
        </Pressable>
        <Pressable onPress={finish} hitSlop={8} style={styles.secondary}>
          <Text style={[styles.secondaryText, { color: colors.accent }]}>Skip</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { ...readable, padding: 16, paddingTop: 24, gap: 8 },
  step: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase' },
  title: { fontSize: 28, fontWeight: '800' },
  body: { fontSize: 16, marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: {
    width: '31%',
    flexGrow: 1,
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 16,
    borderWidth: 2,
  },
  tileName: { fontSize: 13, fontWeight: '600', textAlign: 'center' },
  check: { position: 'absolute', top: 6, right: 6 },
  actions: { ...readable, gap: 8, paddingHorizontal: 16, paddingBottom: 12 },
  primary: { minHeight: 54, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: 'white', fontSize: 17, fontWeight: '600' },
  secondary: { alignItems: 'center', paddingVertical: 12 },
  secondaryText: { fontSize: 16, fontWeight: '600' },
});
