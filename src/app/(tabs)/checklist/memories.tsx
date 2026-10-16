import { useState } from 'react';
import { Image, ScrollView, SectionList, StyleSheet, Text, View } from 'react-native';
import { findEntryAnywhere, type Entry } from '@/data/catalog';
import { keptPhotoUri } from '@/data/photos';
import { loadMemories, type Memory, type Rating } from '@/data/storage';
import { useColors } from '@/theme';
import { FilterChip } from '@/components/chips';
import { GradientIcon, Icon } from '@/components/icon';
import type { IconName } from '@/icons/paths';

const RATING: Record<Rating, { label: string; icon: IconName }> = {
  loved: { label: 'Loved it', icon: 'favorite' },
  fine: { label: 'It was fine', icon: 'remove' },
  'not-for-me': { label: 'Not for me', icon: 'close' },
};

const FILTERS = ['All', 'Loved it', 'With photos'] as const;
type Filter = (typeof FILTERS)[number];

type Item = Memory & { entry: Entry; placeName: string | null };

function toItems(memories: Memory[]): Item[] {
  const items = memories.flatMap((m) => {
    const found = findEntryAnywhere(m.entryId, m.placeId);
    if (!found) return [];
    const placeName = found.city.places.find((p) => p.id === m.placeId)?.name ?? null;
    return [{ ...m, entry: found.entry, placeName }];
  });
  // Checking off a city icon also checks off its activity, which would show the same outing twice.
  const iconTimes = items.filter((i) => i.entry.kind === 'icon').map((i) => [i.entry.activityId, Date.parse(i.at)] as const);
  return items.filter(
    (i) =>
      i.entry.kind === 'icon' ||
      i.rating ||
      i.note ||
      i.photo ||
      !iconTimes.some(([id, t]) => id === i.entry.id && Math.abs(t - Date.parse(i.at)) < 10_000),
  );
}

export default function MemoriesScreen() {
  const colors = useColors();
  const [items] = useState(() => toItems(loadMemories()));
  const [filter, setFilter] = useState<Filter>('All');

  const shown = items.filter(
    (i) => filter === 'All' || (filter === 'Loved it' ? i.rating === 'loved' : !!i.photo),
  );
  const sections: { title: string; data: Item[] }[] = [];
  for (const item of shown) {
    const title = new Date(item.at).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    const last = sections.at(-1);
    if (last?.title === title) last.data.push(item);
    else sections.push({ title, data: [item] });
  }
  const loved = items.filter((i) => i.rating === 'loved').length;

  return (
    <SectionList
      sections={sections}
      keyExtractor={(item) => `${item.entry.id}-${item.at}`}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.list}
      style={{ backgroundColor: colors.background }}
      stickySectionHeadersEnabled={false}
      ListHeaderComponent={
        items.length > 0 ? (
          <View style={styles.header}>
            <Text style={[styles.summary, { color: colors.secondary }]}>
              {items.length} {items.length === 1 ? 'thing' : 'things'} tried
              {loved > 0 ? ` · ${loved} loved` : ''}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
              {FILTERS.map((f) => (
                <FilterChip
                  key={f}
                  title={f}
                  icon={f === 'All' ? 'grid_view' : f === 'Loved it' ? 'favorite' : 'photo_camera'}
                  color={colors.accent}
                  selected={filter === f}
                  onPress={() => setFilter(f)}
                />
              ))}
            </ScrollView>
          </View>
        ) : undefined
      }
      renderSectionHeader={({ section }) => (
        <Text style={[styles.section, { color: colors.secondary }]}>{section.title}</Text>
      )}
      renderItem={({ item }) => <MemoryCard item={item} />}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Icon name={items.length ? 'search' : 'history'} size={44} color={colors.tertiary} />
          <Text style={[styles.emptyTitle, { color: colors.label }]}>
            {items.length ? 'Nothing here yet' : 'Your memories show up here'}
          </Text>
          <Text style={[styles.caption, { color: colors.secondary }]}>
            {items.length
              ? 'Try another filter.'
              : 'Mark something done, then say how it went. Looking back is half the fun.'}
          </Text>
        </View>
      }
    />
  );
}

function MemoryCard({ item }: { item: Item }) {
  const colors = useColors();
  const rating = item.rating ? RATING[item.rating] : null;
  const date = new Date(item.at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return (
    <View style={[styles.card, { backgroundColor: colors.card }]}>
      <View style={styles.cardTop}>
        <GradientIcon icon={item.entry.icon} subcategoryId={item.entry.subcategory} size={44} shape="tile" />
        <View style={styles.grow}>
          <Text style={[styles.name, { color: colors.label }]}>{item.entry.name}</Text>
          <Text style={[styles.meta, { color: colors.secondary }]} numberOfLines={1}>
            {item.placeName ? `${item.placeName} · ${date}` : date}
          </Text>
        </View>
        {rating && (
          <View
            style={[styles.rating, { backgroundColor: item.rating === 'loved' ? colors.accentSoft : colors.fill }]}
            accessibilityLabel={rating.label}
          >
            <Icon
              name={rating.icon}
              size={16}
              color={item.rating === 'loved' ? colors.accent : colors.secondary}
            />
          </View>
        )}
      </View>
      {!!item.note && <Text style={[styles.note, { color: colors.label }]}>{item.note}</Text>}
      {!!item.photo && <Image source={{ uri: keptPhotoUri(item.photo) }} style={styles.photo} />}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: 16, paddingBottom: 32, gap: 10 },
  header: { gap: 12, paddingTop: 4 },
  summary: { fontSize: 15, fontWeight: '600' },
  chips: { gap: 8, paddingVertical: 2 },
  section: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', marginTop: 14, marginLeft: 4 },
  card: { borderRadius: 18, padding: 14, gap: 10 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  grow: { flex: 1 },
  name: { fontSize: 16, fontWeight: '700' },
  meta: { fontSize: 13, marginTop: 2 },
  rating: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  note: { fontSize: 15, lineHeight: 21 },
  photo: { width: '100%', aspectRatio: 4 / 3, borderRadius: 12 },
  empty: { alignItems: 'center', gap: 8, paddingTop: 64, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 20, fontWeight: '700' },
  caption: { fontSize: 14, textAlign: 'center' },
});
