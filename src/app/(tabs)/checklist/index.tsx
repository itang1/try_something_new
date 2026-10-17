import { useCallback, useMemo, useState, type ComponentType } from 'react';
import { Pressable, ScrollView, SectionList, StyleSheet, Text, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import type { SFSymbol } from 'expo-symbols';
import NativeSegmentedControl, {
  type SegmentedControlProps,
} from '@react-native-segmented-control/segmented-control';
import MemoriesIcon from '@expo/material-symbols/photo_library.xml';
import SortIcon from '@expo/material-symbols/swap_vert.xml';
import { entryHint, LEVELS, type Entry } from '@/data/catalog';
import { formatDay } from '@/data/days';
import { driveMinutes } from '@/data/drive';
import { useAppState } from '@/state/app-state';
import { useToggleWithUndo } from '@/state/use-toggle-with-undo';
import { readable, subcategory, useColors } from '@/theme';
import { ActivityRow, type PlaceProgress } from '@/components/activity-row';
import { FilterChip } from '@/components/chips';
import { Icon } from '@/components/icon';
import { toolbarIcon } from '@/components/header-items';
import { LocationControl } from '@/components/location-control';

// The package's class typings predate React 19.3's JSX types; the component itself works.
const SegmentedControl = NativeSegmentedControl as unknown as ComponentType<SegmentedControlProps>;

const STATUSES = ['All', 'Not Done', 'Done', 'Saved'] as const;
type Status = (typeof STATUSES)[number];

type Sort = 'Name' | 'Distance' | 'Duration' | 'Cost' | 'Level';
const SORTS: { label: Sort; sf: SFSymbol }[] = [
  { label: 'Name', sf: 'textformat' },
  { label: 'Distance', sf: 'car.fill' },
  { label: 'Duration', sf: 'clock' },
  { label: 'Cost', sf: 'dollarsign.circle' },
  { label: 'Level', sf: 'chart.bar' },
];

type Row = { activity: Entry; minutes: number | null; progress: PlaceProgress | null };

export default function ChecklistScreen() {
  const colors = useColors();
  const router = useRouter();
  const { city, entries, origin, doneIds, savedIds, visitedPlaceIds, plans } = useAppState();
  const toggleDone = useToggleWithUndo();
  const [status, setStatus] = useState<Status>('All');
  const [sort, setSort] = useState<Sort>('Name');
  const [search, setSearch] = useState('');
  // The chip remembers its city, so switching cities resets it without an effect.
  const [chip, setChip] = useState<{ city: string; sub: string } | null>(null);
  const selectedSub = chip?.city === city.id ? chip.sub : null;

  const cityActivities = entries;
  const subcategories = useMemo(
    () => [...new Set(cityActivities.map((a) => a.subcategory))].sort(),
    [cityActivities],
  );
  const doneCount = cityActivities.filter((a) => doneIds.has(a.id)).length;
  const fraction = cityActivities.length ? doneCount / cityActivities.length : 0;

  const sections = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    const matchesStatus = (a: Entry) =>
      status === 'All' ||
      (status === 'Saved' ? savedIds.has(a.id) : (status === 'Done') === doneIds.has(a.id));
    const matchesQuery = (a: Entry) =>
      !query ||
      a.name.toLocaleLowerCase().includes(query) ||
      a.places.some((p) => p.name.toLocaleLowerCase().includes(query));
    const progressOf = (a: Entry): PlaceProgress | null => {
      if (a.kind !== 'activity' || a.places.length < 2) return null;
      const visited = a.places.filter((p) => visitedPlaceIds.has(p.id));
      if (!visited.length) return null;
      return { visited: visited.length, total: a.places.length, names: visited.map((p) => p.name).join(', ') };
    };
    const result: Row[] = cityActivities
      .filter((a) => !selectedSub || a.subcategory === selectedSub)
      .filter(matchesStatus)
      .filter(matchesQuery)
      .map((a) => ({ activity: a, minutes: driveMinutes(a, origin), progress: progressOf(a) }));
    const byName = (x: Row, y: Row) => x.activity.name.localeCompare(y.activity.name);
    const compare: Record<Sort, (x: Row, y: Row) => number> = {
      Name: byName,
      Distance: (x, y) => (x.minutes ?? Infinity) - (y.minutes ?? Infinity) || byName(x, y),
      Duration: (x, y) => x.activity.durationMinutes - y.activity.durationMinutes || byName(x, y),
      Cost: (x, y) => x.activity.costLevel - y.activity.costLevel || byName(x, y),
      Level: (x, y) => LEVELS[x.activity.level].rank - LEVELS[y.activity.level].rank || byName(x, y),
    };
    result.sort(compare[sort]);
    // Planned and not yet done rows move up into their own section, soonest first.
    const isUpcoming = (r: Row) => plans.has(r.activity.id) && !doneIds.has(r.activity.id);
    const day = (r: Row) => plans.get(r.activity.id)?.day ?? '';
    const rest = result.filter((r) => !isUpcoming(r));
    return [
      { title: 'Coming up', data: result.filter(isUpcoming).sort((x, y) => day(x).localeCompare(day(y))) },
      { title: `${city.name} icons`, data: rest.filter((r) => r.activity.kind === 'icon') },
      { title: 'Activities', data: rest.filter((r) => r.activity.kind === 'activity') },
    ].filter((section) => section.data.length > 0);
  }, [cityActivities, selectedSub, status, doneIds, savedIds, visitedPlaceIds, search, origin, sort, city.name, plans]);

  const renderItem = useCallback(
    ({ item }: { item: Row }) => (
      <ActivityRow
        activity={item.activity}
        done={doneIds.has(item.activity.id)}
        saved={savedIds.has(item.activity.id)}
        minutes={item.minutes}
        hint={entryHint(item.activity)}
        progress={item.progress}
        planned={plans.has(item.activity.id) ? formatDay(plans.get(item.activity.id)!.day) : undefined}
        onToggle={toggleDone}
        onOpen={(id) => router.push(`/activity/${id}`)}
      />
    ),
    [doneIds, savedIds, toggleDone, router, plans],
  );

  const header = (
    <View style={styles.header}>
      <LocationControl />
      <View
        style={[styles.progress, { backgroundColor: colors.accentSoft }]}
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={`${doneCount} of ${cityActivities.length} tried`}
        accessibilityValue={{ min: 0, max: cityActivities.length, now: doneCount }}
      >
        <View style={styles.progressTop}>
          <Icon name="trophy" size={18} color={colors.accent} />
          <Text style={[styles.progressText, styles.grow, { color: colors.label }]}>
            {doneCount} of {cityActivities.length} tried
          </Text>
          <Text style={[styles.progressText, { color: colors.accent }]}>{Math.floor(fraction * 100)}%</Text>
        </View>
        <View style={[styles.track, { backgroundColor: colors.fill }]}>
          <View style={[styles.bar, { width: `${fraction * 100}%`, backgroundColor: colors.accent }]} />
        </View>
      </View>

      <SegmentedControl
        values={[...STATUSES]}
        selectedIndex={STATUSES.indexOf(status)}
        onChange={(e) => setStatus(STATUSES[e.nativeEvent.selectedSegmentIndex])}
      />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        <FilterChip
          title="All"
          icon="grid_view"
          color={colors.accent}
          selected={!selectedSub}
          onPress={() => setChip(null)}
        />
        {subcategories.map((sub) => (
          <FilterChip
            key={sub}
            title={subcategory(sub).label}
            icon={subcategory(sub).icon}
            color={subcategory(sub).color}
            selected={selectedSub === sub}
            onPress={() => setChip(selectedSub === sub ? null : { city: city.id, sub })}
          />
        ))}
      </ScrollView>
    </View>
  );

  return (
    <>
      <SectionList
        sections={sections}
        keyExtractor={(row) => row.activity.id}
        renderItem={renderItem}
        renderSectionHeader={({ section }) => (
          <Text style={[styles.section, { color: colors.secondary, backgroundColor: colors.background }]}>
            {section.title}
          </Text>
        )}
        stickySectionHeadersEnabled={false}
        ListHeaderComponent={header}
        ListFooterComponent={
          <Pressable
            onPress={() => router.push('/add')}
            accessibilityRole="button"
            style={({ pressed }) => [styles.add, { borderColor: colors.separator, opacity: pressed ? 0.6 : 1 }]}
          >
            <Icon name="add" size={20} color={colors.accent} />
            <Text style={[styles.addText, { color: colors.accent }]}>Add your own</Text>
          </Pressable>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Icon name={status === 'Saved' ? 'bookmark' : 'search'} size={44} color={colors.tertiary} />
            <Text style={[styles.emptyTitle, { color: colors.label }]}>
              {status === 'Saved' ? 'Nothing saved yet' : 'No matches'}
            </Text>
            <Text style={[styles.caption, { color: colors.secondary }]}>
              {status === 'Saved' ? 'Swipe right on an Explore card to save it.' : 'Try adjusting your filters.'}
            </Text>
          </View>
        }
        contentInsetAdjustmentBehavior="automatic"
        keyboardDismissMode="on-drag"
        contentContainerStyle={styles.list}
        style={{ backgroundColor: colors.background }}
      />
      <Stack.SearchBar
        placeholder="Search activities & places"
        hideWhenScrolling={false}
        onChangeText={(e) => setSearch(e.nativeEvent.text)}
        onCancelButtonPress={() => setSearch('')}
      />
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          accessibilityLabel="Memories"
          tintColor={colors.accent}
          onPress={() => router.push('/checklist/memories')}
        >
          <Stack.Toolbar.Icon {...toolbarIcon('photo.on.rectangle', MemoriesIcon)} />
        </Stack.Toolbar.Button>
        <Stack.Toolbar.Menu accessibilityLabel="Sort" tintColor={colors.accent}>
          <Stack.Toolbar.Icon {...toolbarIcon('arrow.up.arrow.down', SortIcon)} />
          {SORTS.map((s) => (
            <Stack.Toolbar.MenuAction
              key={s.label}
              icon={process.env.EXPO_OS === 'ios' ? s.sf : undefined}
              isOn={sort === s.label}
              onPress={() => setSort(s.label)}
            >
              {s.label}
            </Stack.Toolbar.MenuAction>
          ))}
        </Stack.Toolbar.Menu>
      </Stack.Toolbar>
    </>
  );
}

const styles = StyleSheet.create({
  list: { ...readable, paddingHorizontal: 16, paddingBottom: 24, gap: 8 },
  header: { gap: 12, paddingTop: 8, paddingBottom: 4 },
  progress: { borderRadius: 12, padding: 16, gap: 8 },
  progressTop: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  progressText: { fontSize: 15, fontWeight: '700' },
  grow: { flex: 1 },
  track: { height: 4, borderRadius: 2, overflow: 'hidden' },
  bar: { height: 4, borderRadius: 2 },
  caption: { fontSize: 13, textAlign: 'center' },
  section: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', marginTop: 12, marginLeft: 4 },
  chips: { gap: 8, paddingVertical: 2 },
  empty: { alignItems: 'center', gap: 8, paddingTop: 48 },
  add: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 50,
    marginTop: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: 'dashed',
  },
  addText: { fontSize: 16, fontWeight: '600' },
  emptyTitle: { fontSize: 20, fontWeight: '700' },
});
