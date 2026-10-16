import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { entriesForCity, findEntry, type Entry } from '@/data/catalog';
import { formatMinutes, placesByDistance } from '@/data/drive';
import { useAppState } from '@/state/app-state';
import { subcategory, useColors } from '@/theme';
import { GradientIcon, Icon } from '@/components/icon';
import { MetadataTag } from '@/components/chips';
import { LocationControl } from '@/components/location-control';
import { SwipeCard } from '@/components/swipe-card';
import type { IconName } from '@/icons/paths';

function randomItem<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

export default function ExploreScreen() {
  const colors = useColors();
  const router = useRouter();
  const { city, origin, isDone, toggleDone, savedIds, toggleSaved, hiddenIds, hide } = useAppState();
  // The pick remembers its city, so switching cities clears it without an effect.
  const [pick, setPick] = useState<{ id: string; city: string; n: number } | null>(null);

  const entries = entriesForCity(city.id);
  const activity = pick?.city === city.id ? findEntry(city.id, pick.id) : undefined;

  const showAnother = (exclude?: string) => {
    const current = exclude ?? activity?.id;
    const fresh = entries.filter((e) => e.id !== current && !hiddenIds.has(e.id) && !isDone(e.id));
    const pool = fresh.length ? fresh : entries.filter((e) => e.id !== current);
    if (!pool.length) return;
    const next = randomItem(pool);
    Haptics.selectionAsync();
    setPick({ id: next.id, city: city.id, n: (pick?.n ?? 0) + 1 });
  };

  const save = (entry: Entry) => {
    if (!savedIds.has(entry.id)) toggleSaved(entry.id);
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      {/* A scroll view lets the large title lay out natively; the button sits outside it, above the tabs. */}
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
        <LocationControl />

        <View style={styles.middle}>
          {activity ? (
            <SwipeCard
              key={pick?.n}
              onSwipeLeft={() => showAnother(activity.id)}
              onSwipeRight={() => {
                save(activity);
                showAnother(activity.id);
              }}
            >
              <ActivityCard
                entry={activity}
                origin={origin}
                done={isDone(activity.id)}
                saved={savedIds.has(activity.id)}
                onOpen={() => router.push(`/activity/${activity.id}`)}
                onNotForMe={() => {
                  hide(activity.id);
                  showAnother(activity.id);
                }}
                onSave={() => {
                  Haptics.selectionAsync();
                  toggleSaved(activity.id);
                }}
                onDone={() => {
                  Haptics.selectionAsync();
                  toggleDone(activity);
                }}
              />
            </SwipeCard>
          ) : (
            <View style={styles.empty}>
              <Icon name="help" size={60} color={colors.tertiary} />
              <Text style={[styles.emptyTitle, { color: colors.secondary }]}>What should you do today?</Text>
              <Text style={[styles.emptyBody, { color: colors.tertiary }]}>Tap the button to find out!</Text>
            </View>
          )}
        </View>
      </ScrollView>

      <SafeAreaView edges={['bottom']} style={styles.footer}>
        <Pressable
          onPress={() => showAnother()}
          disabled={entries.length === 0}
          style={({ pressed }) => [styles.tryButton, { backgroundColor: colors.accent, opacity: pressed ? 0.8 : 1 }]}
        >
          <Icon name="shuffle" size={22} color="white" />
          <Text style={styles.tryText}>{activity ? 'Show me another' : 'Show me something'}</Text>
        </Pressable>
        {activity && (
          <Text style={[styles.swipeHint, { color: colors.secondary }]}>
            or swipe the card: left to skip, right to save
          </Text>
        )}
      </SafeAreaView>
    </View>
  );
}

type CardProps = {
  entry: Entry;
  origin: Parameters<typeof placesByDistance>[1];
  done: boolean;
  saved: boolean;
  onOpen: () => void;
  onNotForMe: () => void;
  onSave: () => void;
  onDone: () => void;
};

function ActivityCard({ entry, origin, done, saved, onOpen, onNotForMe, onSave, onDone }: CardProps) {
  const colors = useColors();
  const sub = subcategory(entry.subcategory);
  const [nearest, ...others] = placesByDistance(entry, origin);
  const placeLine = [
    nearest?.minutes != null && `${formatMinutes(nearest.minutes)} away`,
    others.length > 0 && `${others.length} more ${others.length === 1 ? 'place' : 'places'}`,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <View style={[styles.card, { backgroundColor: colors.card }]}>
      <GradientIcon
        icon={entry.icon}
        subcategoryId={entry.subcategory}
        size={112}
        shape="circle"
        style={{ boxShadow: `0 10px 20px ${sub.color}59` }}
      />
      <Text style={[styles.title, { color: colors.label }]}>{entry.name}</Text>
      <Text style={[styles.pill, { color: sub.color, backgroundColor: `${sub.color}26` }]}>{sub.label}</Text>

      {nearest && (
        <Pressable
          onPress={onOpen}
          accessibilityRole="button"
          accessibilityHint="Shows every place and directions"
          style={({ pressed }) => [styles.place, { backgroundColor: colors.background, opacity: pressed ? 0.7 : 1 }]}
        >
          <Icon name="location_on" size={22} color={colors.accent} />
          <View style={styles.grow}>
            <Text style={[styles.placeName, { color: colors.label }]} numberOfLines={1}>
              {nearest.place.name}
            </Text>
            {!!placeLine && <Text style={[styles.placeLine, { color: colors.secondary }]}>{placeLine}</Text>}
          </View>
          <Icon name="chevron_right" size={20} color={colors.tertiary} />
        </Pressable>
      )}

      <View style={styles.tags}>
        <MetadataTag icon="schedule" text={entry.duration} />
        <MetadataTag icon="payments" text={entry.cost} />
      </View>

      <View style={styles.actions}>
        <CardAction icon="block" label="Not for me" onPress={onNotForMe} />
        <CardAction
          icon="bookmark"
          label={saved ? 'Saved' : 'Save'}
          onPress={onSave}
          tint={saved ? colors.accent : undefined}
          selected={saved}
        />
        <CardAction
          icon={done ? 'check_circle' : 'radio_button_unchecked'}
          label={done ? 'Done!' : 'Done'}
          onPress={onDone}
          tint={done ? colors.done : undefined}
          selected={done}
        />
      </View>
    </View>
  );
}

type ActionProps = { icon: IconName; label: string; onPress: () => void; tint?: string; selected?: boolean };

function CardAction({ icon, label, onPress, tint, selected }: ActionProps) {
  const colors = useColors();
  const color = tint ?? colors.secondary;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={({ pressed }) => [
        styles.action,
        { backgroundColor: tint ? `${tint}26` : colors.fill, opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <Icon name={icon} size={18} color={color} />
      <Text style={[styles.actionText, { color }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { flexGrow: 1, padding: 16, gap: 16 },
  middle: { flex: 1, justifyContent: 'center' },
  card: { borderRadius: 24, padding: 20, paddingTop: 24, alignItems: 'center', gap: 12 },
  title: { fontSize: 26, fontWeight: '700', textAlign: 'center' },
  pill: {
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    overflow: 'hidden',
  },
  place: { alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 14 },
  placeName: { fontSize: 15, fontWeight: '600' },
  placeLine: { fontSize: 13, marginTop: 2 },
  grow: { flex: 1 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  actions: { alignSelf: 'stretch', flexDirection: 'row', gap: 8, marginTop: 4 },
  action: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  actionText: { fontSize: 14, fontWeight: '600' },
  empty: { alignItems: 'center', gap: 12 },
  emptyTitle: { fontSize: 17, fontWeight: '600' },
  emptyBody: { fontSize: 15 },
  footer: { paddingHorizontal: 16, paddingBottom: 16, alignItems: 'center' },
  tryButton: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    gap: 8,
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tryText: { color: 'white', fontSize: 17, fontWeight: '600' },
  swipeHint: { fontSize: 13, marginTop: 8 },
});
