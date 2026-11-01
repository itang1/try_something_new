import { useMemo, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, SectionList, StyleSheet, Text, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import BackupIcon from '@expo/material-symbols/backup.xml';
import { restoreBackup, shareBackup } from '@/data/backup';
import { memoryItems, type MemoryItem } from '@/data/memories';
import { lastMonthRecap, milestones, milestonesToShow } from '@/data/milestones';
import { keptPhotoUri } from '@/data/photos';
import { loadMemories, type Rating } from '@/data/storage';
import { useAppState } from '@/state/app-state';
import { useToast } from '@/state/toast';
import { readable, subcategory, useColors } from '@/theme';
import { FilterChip } from '@/components/chips';
import { toolbarIcon } from '@/components/header-items';
import { GradientIcon, Icon } from '@/components/icon';
import type { IconName } from '@/icons/paths';

const RATING: Record<Rating, { label: string; icon: IconName }> = {
  loved: { label: 'Loved it', icon: 'favorite' },
  fine: { label: 'It was fine', icon: 'remove' },
  'not-for-me': { label: 'Not for me', icon: 'close' },
};

const FILTERS = ['All', 'Loved it', 'With photos'] as const;
type Filter = (typeof FILTERS)[number];

type Item = MemoryItem;

/** Like "Every kind, 6 of 9: Tried something from all 9 kinds". */
const m = (x: { title: string; detail: string; progress: number; goal: number }) => `${x.title}, ${x.progress} of ${x.goal}: ${x.detail}`;

/** Monday-based week number since the epoch, for counting distinct weeks. */
function weekOf(iso: string): number {
  const d = new Date(iso);
  const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7));
  return Math.round(monday.getTime() / (7 * 86_400_000));
}

function Stats({ items }: { items: Item[] }) {
  const colors = useColors();
  const router = useRouter();
  const now = new Date();
  const thisMonth = items.filter((i) => {
    const d = new Date(i.at);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;
  const loved = items.filter((i) => i.rating === 'loved').length;
  // A running count of weeks, not a streak, so a quiet week never resets anything.
  const weeks = new Set(items.map((i) => weekOf(i.at))).size;
  const counts = new Map<string, number>();
  for (const i of items) counts.set(i.entry.subcategory, (counts.get(i.entry.subcategory) ?? 0) + 1);
  const kinds = [...counts]
    .map(([id, count]) => ({ id, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  const most = kinds[0]?.count ?? 1;

  const recap = lastMonthRecap(items, now);
  const { earned, next } = milestonesToShow(milestones(items));

  return (
    <View style={styles.stats}>
      {recap && (
        <View style={[styles.recap, { backgroundColor: colors.accentSoft }]}>
          <View accessible>
            <Text style={[styles.recapTitle, { color: colors.accent }]}>{recap.label} in review</Text>
            <Text style={[styles.recapBody, { color: colors.label }]}>
              {recap.tried} new {recap.tried === 1 ? 'thing' : 'things'} across {recap.kinds} {recap.kinds === 1 ? 'kind' : 'kinds'}
              {recap.loved ? `, ${recap.loved} loved` : ''}.{recap.favorite ? ` A favorite: ${recap.favorite}.` : ''}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Share your ${recap.label} as a card`}
            onPress={() => router.push('/share/recap')}
            style={({ pressed }) => [styles.recapShare, { backgroundColor: colors.accent, opacity: pressed ? 0.8 : 1 }]}
          >
            <Icon name="ios_share" size={16} color={colors.onAccent} />
            <Text style={[styles.recapShareText, { color: colors.onAccent }]}>Share your {recap.label}</Text>
          </Pressable>
        </View>
      )}
      <View style={styles.tiles}>
        <Tile value={thisMonth} label="This month" />
        <Tile value={loved} label="Loved" />
        <Tile value={weeks} label={weeks === 1 ? 'Week out' : 'Weeks out'} />
      </View>
      {(earned.length > 0 || next) && (
        <View style={[styles.kinds, { backgroundColor: colors.card }]}>
          <Text style={[styles.milestonesTitle, { color: colors.label }]}>Milestones</Text>
          {earned.length > 0 && (
            <View style={styles.badges}>
              {earned.map((m) => (
                <View
                  key={m.id}
                  style={[styles.badge, { backgroundColor: colors.accentSoft }]}
                  accessible
                  accessibilityLabel={`${m.title}: ${m.detail}`}
                >
                  <Icon name={m.icon} size={16} color={colors.accent} />
                  <Text style={[styles.badgeText, { color: colors.label }]}>{m.title}</Text>
                </View>
              ))}
            </View>
          )}
          {next && (
            <View style={styles.kindRow} accessible accessibilityLabel={`Next: ${m(next)}`}>
              <Text style={[styles.kindLabel, { color: colors.secondary }]} numberOfLines={2}>
                Next: {next.title}
              </Text>
              <View style={[styles.kindTrack, { backgroundColor: colors.fill }]}>
                <View style={[styles.kindBar, { width: `${(next.progress / next.goal) * 100}%`, backgroundColor: colors.accent }]} />
              </View>
              <Text style={[styles.kindCount, { color: colors.secondary }]}>
                {next.progress}/{next.goal}
              </Text>
            </View>
          )}
        </View>
      )}
      {kinds.length > 1 && (
        <View style={[styles.kinds, { backgroundColor: colors.card }]}>
          {kinds.map(({ id, count }) => (
            <View key={id} style={styles.kindRow} accessible accessibilityLabel={`${subcategory(id).label}, ${count}`}>
              <Text style={[styles.kindLabel, { color: colors.label }]} numberOfLines={1}>
                {subcategory(id).label}
              </Text>
              <View style={[styles.kindTrack, { backgroundColor: colors.fill }]}>
                <View
                  style={[styles.kindBar, { width: `${(count / most) * 100}%`, backgroundColor: subcategory(id).color }]}
                />
              </View>
              <Text style={[styles.kindCount, { color: colors.secondary }]}>{count}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function Tile({ value, label }: { value: number; label: string }) {
  const colors = useColors();
  return (
    <View style={[styles.tile, { backgroundColor: colors.card }]}>
      <Text style={[styles.tileValue, { color: colors.accent }]}>{value}</Text>
      <Text style={[styles.tileLabel, { color: colors.secondary }]}>{label}</Text>
    </View>
  );
}

export default function MemoriesScreen() {
  const colors = useColors();
  const { findAnyEntry, reload } = useAppState();
  const showToast = useToast();
  // A restore reloads the app state, which gives a new finder, so the list reads the merged history.
  const items = useMemo(() => memoryItems(loadMemories(), findAnyEntry), [findAnyEntry]);
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

  const [busy, setBusy] = useState(false);
  const run = async (work: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    try {
      await work();
    } catch (e) {
      Alert.alert("Couldn't finish", e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };
  const restore = () =>
    run(async () => {
      const added = await restoreBackup();
      if (added == null) return;
      reload();
      showToast(added ? `Restored ${added} ${added === 1 ? 'item' : 'items'}` : 'Everything in that backup was already here');
    });

  return (
    <>
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
              </Text>
              <Stats items={items} />
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
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Menu accessibilityLabel="Backup" tintColor={colors.accent}>
          <Stack.Toolbar.Icon {...toolbarIcon('arrow.up.doc', BackupIcon)} />
          <Stack.Toolbar.MenuAction
            icon={process.env.EXPO_OS === 'ios' ? 'square.and.arrow.up' : undefined}
            onPress={() => run(shareBackup)}
          >
            Export backup
          </Stack.Toolbar.MenuAction>
          <Stack.Toolbar.MenuAction
            icon={process.env.EXPO_OS === 'ios' ? 'square.and.arrow.down' : undefined}
            onPress={restore}
          >
            Restore from backup
          </Stack.Toolbar.MenuAction>
        </Stack.Toolbar.Menu>
      </Stack.Toolbar>
    </>
  );
}

function MemoryCard({ item }: { item: Item }) {
  const colors = useColors();
  const router = useRouter();
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
            accessible
            accessibilityLabel={rating.label}
          >
            <Icon
              name={rating.icon}
              size={16}
              color={item.rating === 'loved' ? colors.accent : colors.secondary}
            />
          </View>
        )}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Share a card for ${item.entry.name}`}
          hitSlop={6}
          onPress={() => router.push({ pathname: '/share/[id]', params: { id: item.entry.id } })}
          style={({ pressed }) => [styles.rating, { backgroundColor: colors.fill, opacity: pressed ? 0.6 : 1 }]}
        >
          <Icon name="ios_share" size={16} color={colors.accent} />
        </Pressable>
      </View>
      {!!item.note && <Text style={[styles.note, { color: colors.label }]}>{item.note}</Text>}
      {!!item.photo && (
        <Image
          source={{ uri: keptPhotoUri(item.photo) }}
          style={styles.photo}
          accessible
          accessibilityLabel={`Your photo from ${item.entry.name}`}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { ...readable, paddingHorizontal: 16, paddingBottom: 32, gap: 10 },
  header: { gap: 12, paddingTop: 4 },
  summary: { fontSize: 15, fontWeight: '600' },
  stats: { gap: 10 },
  tiles: { flexDirection: 'row', gap: 10 },
  tile: { flex: 1, borderRadius: 16, paddingVertical: 14, alignItems: 'center', gap: 2 },
  tileValue: { fontSize: 26, fontWeight: '800' },
  tileLabel: { fontSize: 13, fontWeight: '600' },
  kinds: { borderRadius: 16, padding: 14, gap: 10 },
  recap: { borderRadius: 16, padding: 14, gap: 4 },
  recapTitle: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase' },
  recapBody: { fontSize: 15, lineHeight: 21 },
  recapShare: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', minHeight: 36, paddingHorizontal: 14, borderRadius: 18, marginTop: 6 },
  recapShareText: { fontSize: 14, fontWeight: '600' },
  milestonesTitle: { fontSize: 15, fontWeight: '700' },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, minHeight: 30, borderRadius: 15 },
  badgeText: { fontSize: 13, fontWeight: '600' },
  kindRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  kindLabel: { width: '35%', fontSize: 14, fontWeight: '600' },
  kindTrack: { flex: 1, height: 8, borderRadius: 4, overflow: 'hidden' },
  kindBar: { height: 8, borderRadius: 4 },
  kindCount: { minWidth: 24, fontSize: 14, textAlign: 'right' },
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
