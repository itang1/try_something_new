import { useCallback, useMemo, useState, type ComponentType } from 'react';
import { FlatList, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import type { SFSymbol } from 'expo-symbols';
import NativeSegmentedControl, {
  type SegmentedControlProps,
} from '@react-native-segmented-control/segmented-control';
import SortIcon from '@expo/material-symbols/swap_vert.xml';
import { activitiesForCity, type Activity } from '@/data/catalog';
import { driveMinutes } from '@/data/drive';
import { useAppState } from '@/state/app-state';
import { subcategory, useColors } from '@/theme';
import { ActivityRow } from '@/components/activity-row';
import { FilterChip } from '@/components/chips';
import { Icon } from '@/components/icon';
import { cityMenu, locationButton, toolbarIcon } from '@/components/header-items';

// The package's class typings predate React 19.3's JSX types; the component itself works.
const SegmentedControl = NativeSegmentedControl as unknown as ComponentType<SegmentedControlProps>;

const STATUSES = ['All', 'Not Done', 'Done'] as const;
type Status = (typeof STATUSES)[number];

type Sort = 'Name' | 'Distance' | 'Duration' | 'Cost';
const SORTS: { label: Sort; sf: SFSymbol }[] = [
  { label: 'Name', sf: 'textformat' },
  { label: 'Distance', sf: 'car.fill' },
  { label: 'Duration', sf: 'clock' },
  { label: 'Cost', sf: 'dollarsign.circle' },
];

type Row = { activity: Activity; minutes: number | null };

export default function ChecklistScreen() {
  const colors = useColors();
  const router = useRouter();
  const { city, setCity, location, doneIds, toggleDone } = useAppState();
  const [status, setStatus] = useState<Status>('All');
  const [sort, setSort] = useState<Sort>('Name');
  const [search, setSearch] = useState('');
  // The chip remembers its city, so switching cities resets it without an effect.
  const [chip, setChip] = useState<{ city: string; sub: string } | null>(null);
  const selectedSub = chip?.city === city ? chip.sub : null;

  const cityActivities = useMemo(() => activitiesForCity(city), [city]);
  const subcategories = useMemo(
    () => [...new Set(cityActivities.map((a) => a.subcategory))].sort(),
    [cityActivities],
  );
  const doneCount = cityActivities.filter((a) => doneIds.has(a.id)).length;
  const fraction = cityActivities.length ? doneCount / cityActivities.length : 0;

  const rows = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    const result: Row[] = cityActivities
      .filter((a) => !selectedSub || a.subcategory === selectedSub)
      .filter((a) => status === 'All' || (status === 'Done') === doneIds.has(a.id))
      .filter((a) => !query || a.name.toLocaleLowerCase().includes(query))
      .map((a) => ({ activity: a, minutes: driveMinutes(a, location, city) }));
    const byName = (x: Row, y: Row) => x.activity.name.localeCompare(y.activity.name);
    const compare: Record<Sort, (x: Row, y: Row) => number> = {
      Name: byName,
      Distance: (x, y) => (x.minutes ?? Infinity) - (y.minutes ?? Infinity) || byName(x, y),
      Duration: (x, y) => x.activity.durationMinutes - y.activity.durationMinutes || byName(x, y),
      Cost: (x, y) => x.activity.costLevel - y.activity.costLevel || byName(x, y),
    };
    return result.sort(compare[sort]);
  }, [cityActivities, selectedSub, status, doneIds, search, location, city, sort]);

  const renderItem = useCallback(
    ({ item }: { item: Row }) => (
      <ActivityRow
        activity={item.activity}
        done={doneIds.has(item.activity.id)}
        minutes={item.minutes}
        hint={item.activity.hints[city] ?? ''}
        onToggle={toggleDone}
      />
    ),
    [doneIds, city, toggleDone],
  );

  const header = (
    <View style={styles.header}>
      <View style={[styles.progress, { backgroundColor: colors.accentSoft }]}>
        <View style={styles.progressTop}>
          <Icon name="trophy" size={18} color={colors.accent} />
          <Text style={[styles.progressText, styles.grow, { color: colors.label }]}>
            {doneCount} of {cityActivities.length} completed
          </Text>
          <Text style={[styles.progressText, { color: colors.accent }]}>{Math.floor(fraction * 100)}%</Text>
        </View>
        <View style={[styles.track, { backgroundColor: colors.fill }]}>
          <View style={[styles.bar, { width: `${fraction * 100}%`, backgroundColor: colors.accent }]} />
        </View>
        <Text style={[styles.caption, { color: colors.secondary }]}>
          {location ? `Drive times from ${location.name}` : 'Set your location for drive times'}
        </Text>
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
            onPress={() => setChip(selectedSub === sub ? null : { city, sub })}
          />
        ))}
      </ScrollView>
    </View>
  );

  return (
    <>
      <FlatList
      data={rows}
      keyExtractor={(row) => row.activity.id}
      renderItem={renderItem}
      ListHeaderComponent={header}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Icon name="search" size={44} color={colors.tertiary} />
          <Text style={[styles.emptyTitle, { color: colors.label }]}>No matches</Text>
          <Text style={[styles.caption, { color: colors.secondary }]}>Try adjusting your filters.</Text>
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
      <Stack.Toolbar placement="left">
        {cityMenu(city, setCity, colors.accent)}
        {locationButton(location, () => router.push('/location'), colors.accent)}
      </Stack.Toolbar>
      <Stack.Toolbar placement="right">
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
  list: { paddingHorizontal: 16, paddingBottom: 24, gap: 8 },
  header: { gap: 12, paddingTop: 8, paddingBottom: 4 },
  progress: { borderRadius: 12, padding: 16, gap: 8 },
  progressTop: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  progressText: { fontSize: 15, fontWeight: '700' },
  grow: { flex: 1 },
  track: { height: 4, borderRadius: 2, overflow: 'hidden' },
  bar: { height: 4, borderRadius: 2 },
  caption: { fontSize: 13 },
  chips: { gap: 8, paddingVertical: 2 },
  empty: { alignItems: 'center', gap: 8, paddingTop: 48 },
  emptyTitle: { fontSize: 20, fontWeight: '700' },
});
