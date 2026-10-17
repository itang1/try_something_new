import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import FiltersIcon from '@expo/material-symbols/tune.xml';
import * as Haptics from 'expo-haptics';
import { LEVELS, type Entry } from '@/data/catalog';
import { addDays, dayKey, formatDay } from '@/data/days';
import { formatMinutes, placesByDistance } from '@/data/drive';
import { describeFilters, matchesFilters, NO_FILTERS } from '@/data/filters';
import { readSetting } from '@/data/storage';
import { useAppState } from '@/state/app-state';
import { readable, subcategory, useColors } from '@/theme';
import { toolbarIcon } from '@/components/header-items';
import { GradientIcon, Icon } from '@/components/icon';
import { MetadataTag } from '@/components/chips';
import { LocationControl } from '@/components/location-control';
import { SwipeCard } from '@/components/swipe-card';
import { useMarkDone } from '@/state/use-mark-done';
import { useToast } from '@/state/toast';
import type { IconName } from '@/icons/paths';

function randomItem<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

export default function ExploreScreen() {
  const colors = useColors();
  const router = useRouter();
  const { city, entries, findEntry, home, origin, driveTimes, isDone, savedIds, toggleSaved, hiddenIds, hide, plans, filters, setFilters } = useAppState();
  const markDone = useMarkDone();
  const toast = useToast();
  // The pick remembers its city, so switching cities clears it without an effect.
  const [pick, setPick] = useState<{ id: string; city: string; n: number } | null>(null);
  const [noMatch, setNoMatch] = useState(false);
  const { height } = useWindowDimensions();
  const footer = useRef<ComponentRef<typeof View>>(null);
  const [toastBottom, setToastBottom] = useState<number>();

  useEffect(() => {
    if (!home && !readSetting('onboarded', false)) router.push('/welcome');
    // Only on first mount: later changes to home shouldn't bring the welcome back.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activity = pick?.city === city.id ? findEntry(pick.id) : undefined;

  const showAnother = (exclude?: string) => {
    const current = exclude ?? activity?.id;
    const allowed = entries.filter((e) => e.id !== current && !hiddenIds.has(e.id) && matchesFilters(e, filters, origin, driveTimes));
    const fresh = allowed.filter((e) => !isDone(e.id));
    // Early on, skip the stretches so the first few tries are easy wins, unless levels were picked on purpose.
    const warmingUp = !filters.levels.length && entries.filter((e) => isDone(e.id)).length < 3;
    const gentle = warmingUp ? fresh.filter((e) => e.level !== 'stretch') : fresh;
    const pool = gentle.length ? gentle : fresh.length ? fresh : allowed;
    Haptics.selectionAsync();
    if (!pool.length) {
      setPick(null);
      setNoMatch(true);
      return;
    }
    setNoMatch(false);
    setPick({ id: randomItem(pool).id, city: city.id, n: (pick?.n ?? 0) + 1 });
  };

  // A gentle nudge for a plan that's today or tomorrow. Missed plans just drop off.
  const soonDays = [dayKey(new Date()), dayKey(addDays(new Date(), 1))];
  const soonPlan = [...plans.values()]
    .filter((p) => soonDays.includes(p.day) && !isDone(p.entryId))
    .sort((x, y) => x.day.localeCompare(y.day))[0];
  const soonEntry = soonPlan && findEntry(soonPlan.entryId);
  const soonPlace = soonEntry?.places.find((p) => p.id === soonPlan?.placeId);

  const activeFilters = describeFilters(filters, (id) => subcategory(id).label);

  // A swipe moves the card away, so say it was saved.
  const save = (entry: Entry) => {
    if (savedIds.has(entry.id)) return;
    toggleSaved(entry.id);
    toast(`Saved ${entry.name}`, { type: 'unsave', id: entry.id }, toastBottom);
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      {/* A scroll view lets the large title lay out natively; the button sits outside it, above the tabs. */}
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
        <LocationControl />

        {activeFilters.length > 0 && (
          <View style={[styles.filterBar, { backgroundColor: colors.card }]}>
            <Pressable
              onPress={() => router.push('/filters')}
              accessibilityRole="button"
              accessibilityHint="Changes the filters"
              style={styles.filterText}
            >
              <Icon name="tune" size={18} color={colors.accent} />
              <Text style={[styles.filterLabel, { color: colors.label }]} numberOfLines={1}>
                {activeFilters.join(' · ')}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                Haptics.selectionAsync();
                setFilters(NO_FILTERS);
                setNoMatch(false);
              }}
              hitSlop={10}
              accessibilityLabel="Clear filters"
            >
              <Icon name="close" size={18} color={colors.secondary} />
            </Pressable>
          </View>
        )}

        {soonPlan && soonEntry && (
          <Pressable
            onPress={() => router.push(`/activity/${soonEntry.id}`)}
            accessibilityRole="button"
            style={({ pressed }) => [styles.soon, { backgroundColor: colors.accentSoft, opacity: pressed ? 0.7 : 1 }]}
          >
            <GradientIcon icon={soonEntry.icon} subcategoryId={soonEntry.subcategory} size={40} shape="tile" />
            <View style={styles.grow}>
              <Text style={[styles.soonDay, { color: colors.accent }]}>{formatDay(soonPlan.day)}</Text>
              <Text style={[styles.placeName, { color: colors.label }]} numberOfLines={2}>
                {soonPlace ? `${soonEntry.name} at ${soonPlace.name}` : soonEntry.name}
              </Text>
            </View>
            <Icon name="chevron_right" size={20} color={colors.tertiary} />
          </Pressable>
        )}

        <View style={[styles.middle, activity && styles.top]}>
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
                planned={plans.has(activity.id)}
                onPlan={() => router.push(`/plan/${activity.id}`)}
                onOpen={() => router.push(`/activity/${activity.id}`)}
                onNotForMe={() => {
                  hide(activity.id);
                  toast(`Hid ${activity.name}`, { type: 'hide', id: activity.id }, toastBottom);
                  showAnother(activity.id);
                }}
                onSave={() => {
                  Haptics.selectionAsync();
                  toggleSaved(activity.id);
                }}
                onDone={() => {
                  Haptics.selectionAsync();
                  markDone(activity);
                }}
              />
            </SwipeCard>
          ) : noMatch ? (
            <View style={styles.empty}>
              <Icon name="tune" size={60} color={colors.tertiary} />
              <Text style={[styles.emptyTitle, { color: colors.secondary }]}>Nothing matches your filters</Text>
              <Pressable onPress={() => router.push('/filters')} hitSlop={8}>
                <Text style={[styles.emptyLink, { color: colors.accent }]}>Change filters</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.empty}>
              <Icon name="help" size={60} color={colors.tertiary} />
              <Text style={[styles.emptyTitle, { color: colors.secondary }]}>What should you do today?</Text>
              <Text style={[styles.emptyBody, { color: colors.tertiary }]}>Tap the button to find out!</Text>
            </View>
          )}
        </View>
      </ScrollView>

      <SafeAreaView
        ref={footer}
        edges={['bottom']}
        style={styles.footer}
        onLayout={() => footer.current?.measureInWindow((_x, y) => setToastBottom(height - y + 8))}
      >
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

      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          accessibilityLabel="Filters"
          tintColor={colors.accent}
          onPress={() => router.push('/filters')}
        >
          <Stack.Toolbar.Icon {...toolbarIcon('line.3.horizontal.decrease', FiltersIcon)} />
        </Stack.Toolbar.Button>
      </Stack.Toolbar>
    </View>
  );
}

type CardProps = {
  entry: Entry;
  origin: Parameters<typeof placesByDistance>[1];
  done: boolean;
  saved: boolean;
  planned: boolean;
  onPlan: () => void;
  onOpen: () => void;
  onNotForMe: () => void;
  onSave: () => void;
  onDone: () => void;
};

function ActivityCard({ entry, origin, done, saved, planned, onPlan, onOpen, onNotForMe, onSave, onDone }: CardProps) {
  const colors = useColors();
  const { driveTimes } = useAppState();
  const sub = subcategory(entry.subcategory);
  const [nearest, ...others] = placesByDistance(entry, origin, driveTimes);
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
        size={88}
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
        <MetadataTag icon={LEVELS[entry.level].icon} text={LEVELS[entry.level].label} />
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
          icon="calendar_month"
          label={planned ? 'Planned' : 'Plan'}
          onPress={onPlan}
          tint={planned ? colors.accent : undefined}
          selected={planned}
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
      <Icon name={icon} size={20} color={color} />
      <Text style={[styles.actionText, { color }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { ...readable, flexGrow: 1, padding: 16, gap: 16 },
  middle: { flex: 1, justifyContent: 'center' },
  // The scroll view runs behind the footer, so a centered card would slip under it.
  top: { justifyContent: 'flex-start' },
  card: { borderRadius: 24, padding: 16, paddingTop: 20, alignItems: 'center', gap: 10 },
  title: { fontSize: 24, fontWeight: '700', textAlign: 'center' },
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
    minHeight: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  actionText: { fontSize: 12, fontWeight: '600' },
  soon: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 16 },
  soonDay: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  empty: { alignItems: 'center', gap: 12 },
  emptyTitle: { fontSize: 17, fontWeight: '600' },
  emptyBody: { fontSize: 15 },
  emptyLink: { fontSize: 16, fontWeight: '600' },
  filterBar: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 14 },
  filterText: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  filterLabel: { flex: 1, fontSize: 15, fontWeight: '600' },
  footer: { ...readable, paddingHorizontal: 16, paddingBottom: 16, alignItems: 'center' },
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
