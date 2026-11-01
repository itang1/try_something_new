import { useCallback, useMemo, useState, type ComponentType } from 'react';
import { Pressable, SectionList, StyleSheet, Text, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import type { SFSymbol } from 'expo-symbols';
import NativeSegmentedControl, {
  type SegmentedControlProps,
} from '@react-native-segmented-control/segmented-control';
import SortIcon from '@expo/material-symbols/swap_vert.xml';
import { entryHint, LEVELS, type Entry } from '@/data/catalog';
import { checklistSections, type ChecklistSection, type Grouping } from '@/data/checklist';
import { formatDay } from '@/data/days';
import { driveMinutes } from '@/data/drive';
import { matchesStatus, STATUSES, type Status } from '@/data/status';
import { useAppState } from '@/state/app-state';
import { useSetting } from '@/state/use-setting';
import { useToggleWithUndo } from '@/state/use-toggle-with-undo';
import { readable, subcategory, useColors } from '@/theme';
import { ActivityRow, type PlaceProgress } from '@/components/activity-row';
import { Icon } from '@/components/icon';
import { settingsButton, toolbarIcon } from '@/components/header-items';
import { LocationControl } from '@/components/location-control';

// The package's class typings predate React 19.3's JSX types; the component itself works.
const SegmentedControl = NativeSegmentedControl as unknown as ComponentType<SegmentedControlProps>;

type Sort = 'Name' | 'Distance' | 'Duration' | 'Cost' | 'Level';
const SORTS: { label: Sort; sf: SFSymbol }[] = [
  { label: 'Name', sf: 'textformat' },
  { label: 'Distance', sf: 'car.fill' },
  { label: 'Duration', sf: 'clock' },
  { label: 'Cost', sf: 'dollarsign.circle' },
  { label: 'Level', sf: 'chart.bar' },
];
const GROUPINGS: { label: Grouping; title: string; sf: SFSymbol }[] = [
  { label: 'Kind', title: 'By kind', sf: 'square.stack.3d.up' },
  { label: 'None', title: 'One list', sf: 'list.bullet' },
];

type Row = { activity: Entry; minutes: number | null; progress: PlaceProgress | null };

export default function ChecklistScreen() {
  const colors = useColors();
  const router = useRouter();
  const { city, entries, origin, travelTimes, doneIds, savedIds, visitedPlaceIds, plans } = useAppState();
  const toggleDone = useToggleWithUndo();
  const [status, setStatus] = useSetting<Status>('checklistStatus', 'All');
  const [sort, setSort] = useSetting<Sort>('checklistSort', 'Name');
  const [grouping, setGrouping] = useSetting<Grouping>('checklistGrouping', 'Kind');
  const [search, setSearch] = useState('');
  // Kind sections start folded so the list opens as a short overview, not 100 rows.
  // Which ones are open is remembered between launches.
  const [openKeys, setOpenKeys] = useSetting<string[]>('checklistOpen', []);
  const open = useMemo(() => new Set(openKeys), [openKeys]);
  const toggleSection = (key: string) =>
    setOpenKeys((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));

  const cityActivities = entries;
  const searching = search.trim().length > 0;
  const doneCount = cityActivities.filter((a) => doneIds.has(a.id)).length;
  const fraction = cityActivities.length ? doneCount / cityActivities.length : 0;

  const sections = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
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
      .filter((a) => matchesStatus([a.id], status, doneIds, savedIds))
      .filter(matchesQuery)
      .map((a) => ({ activity: a, minutes: driveMinutes(a, origin, travelTimes), progress: progressOf(a) }));
    const byName = (x: Row, y: Row) => x.activity.name.localeCompare(y.activity.name);
    const compare: Record<Sort, (x: Row, y: Row) => number> = {
      Name: byName,
      Distance: (x, y) => (x.minutes ?? Infinity) - (y.minutes ?? Infinity) || byName(x, y),
      Duration: (x, y) => x.activity.durationMinutes - y.activity.durationMinutes || byName(x, y),
      Cost: (x, y) => x.activity.costLevel - y.activity.costLevel || byName(x, y),
      Level: (x, y) => LEVELS[x.activity.level].rank - LEVELS[y.activity.level].rank || byName(x, y),
    };
    result.sort(compare[sort]);
    return checklistSections(cityActivities, result, {
      grouping,
      cityName: city.name,
      doneIds,
      planDay: (id) => plans.get(id)?.day,
      kindLabel: (id) => subcategory(id).label,
    });
  }, [cityActivities, status, doneIds, savedIds, visitedPlaceIds, search, origin, travelTimes, sort, grouping, city.name, plans]);

  // A search, or a single section, shows everything; otherwise folded kinds hide their rows.
  const showAll = searching || sections.length === 1;
  const isOpen = (s: ChecklistSection<Row>) => !s.collapsible || showAll || open.has(s.key);
  const visibleSections = sections.map((s) => (isOpen(s) ? s : { ...s, data: [] as Row[] }));

  const renderItem = useCallback(
    ({ item }: { item: Row }) => (
      <ActivityRow
        activity={item.activity}
        done={doneIds.has(item.activity.id)}
        saved={savedIds.has(item.activity.id)}
        minutes={item.minutes}
        mode={travelTimes.mode}
        hint={entryHint(item.activity)}
        progress={item.progress}
        planned={plans.has(item.activity.id) ? formatDay(plans.get(item.activity.id)!.day) : undefined}
        onToggle={toggleDone}
        onOpen={(id) => router.push(`/activity/${id}`)}
      />
    ),
    [doneIds, savedIds, toggleDone, router, plans, travelTimes.mode],
  );

  const header = (
    <View style={styles.header}>
      <LocationControl />
      {/* Progress and Memories are the same story: what you've tried. Tapping it opens the memories. */}
      <Pressable
        onPress={() => router.push('/checklist/memories')}
        style={({ pressed }) => [styles.progress, { backgroundColor: colors.accentSoft, opacity: pressed ? 0.7 : 1 }]}
        accessibilityRole="button"
        accessibilityLabel={`${doneCount} of ${cityActivities.length} tried, ${Math.floor(fraction * 100)} percent`}
        accessibilityHint="Opens your memories"
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
        <View style={styles.memories}>
          <Icon name="photo_library" size={16} color={colors.accent} />
          <Text style={[styles.memoriesText, { color: colors.accent }]}>Memories</Text>
          <Icon name="chevron_right" size={16} color={colors.accent} />
        </View>
      </Pressable>

      <SegmentedControl
        values={[...STATUSES]}
        selectedIndex={STATUSES.indexOf(status)}
        onChange={(e) => setStatus(STATUSES[e.nativeEvent.selectedSegmentIndex])}
      />
    </View>
  );

  return (
    <>
      <SectionList
        sections={visibleSections}
        keyExtractor={(row) => row.activity.id}
        renderItem={renderItem}
        renderSectionHeader={({ section }) => (
          <SectionHeader
            section={section}
            open={isOpen(section)}
            onToggle={section.collapsible && !showAll ? () => toggleSection(section.key) : undefined}
          />
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
        <Stack.Toolbar.Menu accessibilityLabel="Sort and group" tintColor={colors.accent}>
          <Stack.Toolbar.Icon {...toolbarIcon('arrow.up.arrow.down', SortIcon)} />
          <Stack.Toolbar.Menu inline title="Sort by">
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
          <Stack.Toolbar.Menu inline title="Group">
            {GROUPINGS.map((g) => (
              <Stack.Toolbar.MenuAction
                key={g.label}
                icon={process.env.EXPO_OS === 'ios' ? g.sf : undefined}
                isOn={grouping === g.label}
                onPress={() => setGrouping(g.label)}
              >
                {g.title}
              </Stack.Toolbar.MenuAction>
            ))}
          </Stack.Toolbar.Menu>
        </Stack.Toolbar.Menu>
        {settingsButton(colors.accent, router)}
      </Stack.Toolbar>
    </>
  );
}

function SectionHeader({
  section,
  open,
  onToggle,
}: {
  section: ChecklistSection<Row>;
  open: boolean;
  onToggle?: () => void;
}) {
  const colors = useColors();
  const count = section.key === 'upcoming' ? `${section.total}` : `${section.done} of ${section.total}`;
  const body = (
    <>
      <Text style={[styles.section, styles.grow, { color: colors.secondary }]}>{section.title}</Text>
      <Text style={[styles.sectionCount, { color: colors.tertiary }]}>{count}</Text>
      {onToggle && <Icon name={open ? 'keyboard_arrow_down' : 'chevron_right'} size={20} color={colors.secondary} />}
    </>
  );
  if (!onToggle) return <View style={styles.sectionRow}>{body}</View>;
  return (
    <Pressable
      onPress={onToggle}
      accessibilityRole="button"
      accessibilityState={{ expanded: open }}
      accessibilityLabel={`${section.title}, ${section.done} of ${section.total} done`}
      style={({ pressed }) => [styles.sectionRow, styles.sectionButton, { backgroundColor: colors.card, opacity: pressed ? 0.6 : 1 }]}
    >
      {body}
    </Pressable>
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
  memories: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-end' },
  memoriesText: { fontSize: 14, fontWeight: '600' },
  sectionRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, paddingHorizontal: 4, minHeight: 28 },
  sectionButton: { minHeight: 44, paddingHorizontal: 12, borderRadius: 12, marginTop: 4 },
  section: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase' },
  sectionCount: { fontSize: 13, fontVariant: ['tabular-nums'] },
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
