import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { inSeason, LEVELS, type Level } from '@/data/catalog';
import { formatMinutes } from '@/data/drive';
import {
  COST_OPTIONS,
  DRIVE_OPTIONS,
  DURATION_OPTIONS,
  matchesFilters,
  NO_FILTERS,
  WHERE_OPTIONS,
  type Filters,
} from '@/data/filters';
import { useAppState } from '@/state/app-state';
import { subcategory, useColors } from '@/theme';
import { FilterChip } from '@/components/chips';
import { GradientIcon, Icon } from '@/components/icon';

const toggle = <T,>(list: T[], item: T) => (list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);

export default function FiltersSheet() {
  const colors = useColors();
  const router = useRouter();
  const { entries, origin, driveTimes, filters, setFilters, hiddenIds, unhide, isDone } = useAppState();
  const subcategories = [...new Set(entries.map((e) => e.subcategory))].sort();
  const hidden = entries.filter((e) => hiddenIds.has(e.id));
  const matchCount = entries.filter(
    (e) => !hiddenIds.has(e.id) && !isDone(e.id) && inSeason(e) && matchesFilters(e, filters, origin, driveTimes),
  ).length;

  const update = (next: Partial<Filters>) => {
    Haptics.selectionAsync();
    setFilters({ ...filters, ...next });
  };

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.label }]}>Filters</Text>
          <Pressable
            onPress={() => router.back()}
            hitSlop={8}
            accessibilityLabel="Close"
            style={[styles.close, { backgroundColor: colors.fill }]}
          >
            <Icon name="close" size={18} color={colors.secondary} />
          </Pressable>
        </View>

        <Group title="Kind">
          {subcategories.map((id) => (
            <FilterChip
              key={id}
              title={subcategory(id).label}
              icon={subcategory(id).icon}
              color={subcategory(id).color}
              selected={filters.subcategories.includes(id)}
              onPress={() => update({ subcategories: toggle(filters.subcategories, id) })}
            />
          ))}
        </Group>

        <Group title="Where">
          {WHERE_OPTIONS.map(({ where, label, icon }) => (
            <FilterChip
              key={where}
              title={label}
              icon={icon}
              color={colors.accent}
              selected={filters.where === where}
              onPress={() => update({ where: filters.where === where ? null : where })}
            />
          ))}
        </Group>

        <Group title="How new">
          {(Object.keys(LEVELS) as Level[]).map((level) => (
            <FilterChip
              key={level}
              title={LEVELS[level].label}
              icon={LEVELS[level].icon}
              color={colors.accent}
              selected={filters.levels.includes(level)}
              onPress={() => update({ levels: toggle(filters.levels, level) })}
            />
          ))}
        </Group>

        <Group title="Drive" hint={origin ? undefined : 'Set your location to filter by drive time.'}>
          {DRIVE_OPTIONS.map((minutes) => (
            <FilterChip
              key={minutes}
              title={`Under ${formatMinutes(minutes)}`}
              icon="directions_car"
              color={colors.accent}
              selected={filters.maxDrive === minutes}
              onPress={() => update({ maxDrive: filters.maxDrive === minutes ? null : minutes })}
            />
          ))}
        </Group>

        <Group title="Cost">
          {COST_OPTIONS.map(({ level, label }) => (
            <FilterChip
              key={level}
              title={label}
              icon="payments"
              color={colors.accent}
              selected={filters.maxCost === level}
              onPress={() => update({ maxCost: filters.maxCost === level ? null : level })}
            />
          ))}
        </Group>

        <Group title="Time">
          {DURATION_OPTIONS.map(({ minutes, label }) => (
            <FilterChip
              key={minutes}
              title={label}
              icon="schedule"
              color={colors.accent}
              selected={filters.maxDuration === minutes}
              onPress={() => update({ maxDuration: filters.maxDuration === minutes ? null : minutes })}
            />
          ))}
        </Group>

        {hidden.length > 0 && (
          <>
            <Text style={[styles.groupTitle, { color: colors.label }]}>Not for me</Text>
            <View style={[styles.list, { backgroundColor: colors.card }]}>
              {hidden.map((e, i) => (
                <View
                  key={e.id}
                  style={[
                    styles.row,
                    i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.separator },
                  ]}
                >
                  <GradientIcon icon={e.icon} subcategoryId={e.subcategory} size={32} shape="tile" />
                  <Text style={[styles.rowName, { color: colors.label }]} numberOfLines={1}>
                    {e.name}
                  </Text>
                  <Pressable
                    onPress={() => {
                      Haptics.selectionAsync();
                      unhide(e.id);
                    }}
                    accessibilityLabel={`Bring back ${e.name}`}
                    style={({ pressed }) => [
                      styles.bringBack,
                      { backgroundColor: colors.accentSoft, opacity: pressed ? 0.6 : 1 },
                    ]}
                  >
                    <Icon name="undo" size={16} color={colors.accent} />
                    <Text style={[styles.bringBackText, { color: colors.accent }]}>Bring back</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: colors.separator, backgroundColor: colors.background }]}>
        <Pressable
          onPress={() => update(NO_FILTERS)}
          style={({ pressed }) => [styles.button, styles.grow, { backgroundColor: colors.card, opacity: pressed ? 0.7 : 1 }]}
        >
          <Text style={[styles.buttonText, { color: colors.label }]}>Reset</Text>
        </Pressable>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.button,
            styles.wide,
            { backgroundColor: colors.accent, opacity: pressed ? 0.8 : 1 },
          ]}
        >
          <Text style={[styles.buttonText, { color: 'white' }]}>
            {matchCount === 0 ? 'Nothing matches' : `Show ${matchCount} ${matchCount === 1 ? 'idea' : 'ideas'}`}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function Group({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  const colors = useColors();
  return (
    <View style={styles.group}>
      <Text style={[styles.groupTitle, { color: colors.label }]}>{title}</Text>
      {!!hint && <Text style={[styles.hint, { color: colors.secondary }]}>{hint}</Text>}
      <View style={styles.chips}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 16, paddingTop: 24, gap: 18 },
  header: { flexDirection: 'row', alignItems: 'center' },
  title: { flex: 1, fontSize: 24, fontWeight: '700' },
  close: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  group: { gap: 8 },
  groupTitle: { fontSize: 17, fontWeight: '700' },
  hint: { fontSize: 13 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  list: { borderRadius: 16, overflow: 'hidden', marginTop: -8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 14 },
  rowName: { flex: 1, fontSize: 15, fontWeight: '600' },
  bringBack: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 34, paddingHorizontal: 12, borderRadius: 17 },
  bringBackText: { fontSize: 14, fontWeight: '600' },
  footer: { flexDirection: 'row', gap: 8, padding: 16, paddingBottom: 32, borderTopWidth: StyleSheet.hairlineWidth },
  button: { minHeight: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  grow: { flex: 1 },
  wide: { flex: 2 },
  buttonText: { fontSize: 16, fontWeight: '600' },
});
