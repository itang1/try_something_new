import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { findEntry, LEVELS } from '@/data/catalog';
import { formatDay } from '@/data/days';
import { openDirections } from '@/data/directions';
import { formatMinutes, placesByDistance } from '@/data/drive';
import { useAppState } from '@/state/app-state';
import { useMarkDone } from '@/state/use-mark-done';
import { subcategory, useColors } from '@/theme';
import { GradientIcon, Icon } from '@/components/icon';

export default function ActivitySheet() {
  const colors = useColors();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { city, origin, isDone, savedIds, toggleSaved, visitedPlaceIds, toggleVisited, plans } = useAppState();
  const markDone = useMarkDone();
  const entry = findEntry(city.id, id);

  if (!entry) {
    return (
      <View style={styles.missing}>
        <Text style={[styles.meta, { color: colors.secondary }]}>This isn&apos;t available in {city.name}.</Text>
      </View>
    );
  }

  const sub = subcategory(entry.subcategory);
  const places = placesByDistance(entry, origin);
  const done = isDone(entry.id);
  const saved = savedIds.has(entry.id);
  const visitedCount = places.filter(({ place }) => visitedPlaceIds.has(place.id)).length;
  const plan = plans.get(entry.id);
  const planPlace = plan && places.find(({ place }) => place.id === plan.placeId)?.place;

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <GradientIcon icon={entry.icon} subcategoryId={entry.subcategory} size={64} shape="tile" />
          <View style={styles.grow}>
            <Text style={[styles.title, { color: colors.label }]}>{entry.name}</Text>
            <Text style={[styles.meta, { color: colors.secondary }]}>
              {sub.label} · {entry.duration} · {entry.cost} · {LEVELS[entry.level].label}
            </Text>
          </View>
          <Pressable
            onPress={() => router.back()}
            hitSlop={8}
            accessibilityLabel="Close"
            style={[styles.close, { backgroundColor: colors.fill }]}
          >
            <Icon name="close" size={18} color={colors.secondary} />
          </Pressable>
        </View>

        <Pressable
          onPress={() => router.push(`/plan/${entry.id}`)}
          accessibilityRole="button"
          style={({ pressed }) => [styles.plan, { backgroundColor: colors.card, opacity: pressed ? 0.7 : 1 }]}
        >
          <Icon name="calendar_month" size={22} color={colors.accent} />
          <View style={styles.grow}>
            <Text style={[styles.placeName, { color: colors.label }]}>
              {plan ? `Planned for ${formatDay(plan.day)}` : 'Pick a day'}
            </Text>
            <Text style={[styles.meta, { color: colors.secondary }]} numberOfLines={1}>
              {plan ? (planPlace?.name ?? 'Tap to change') : 'Deciding when makes it easier to follow through'}
            </Text>
          </View>
          <Icon name="chevron_right" size={20} color={colors.tertiary} />
        </Pressable>

        <Text style={[styles.section, { color: colors.secondary }]}>
          {places.length} {places.length === 1 ? 'place' : 'places'} in {city.name}
          {visitedCount > 0 && places.length > 1 ? ` · ${visitedCount} visited` : ''}
        </Text>
        <View style={[styles.list, { backgroundColor: colors.card }]}>
          {places.map(({ place, minutes }, i) => {
            const visited = visitedPlaceIds.has(place.id);
            return (
              <View
                key={place.id}
                style={[
                  styles.row,
                  i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.separator },
                ]}
              >
                <Pressable
                  onPress={() => {
                    Haptics.selectionAsync();
                    toggleVisited(place.id, entry.activityId);
                  }}
                  hitSlop={10}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: visited }}
                  accessibilityLabel={`Been to ${place.name}`}
                >
                  <Icon
                    name={visited ? 'check_circle' : 'radio_button_unchecked'}
                    size={24}
                    color={visited ? colors.done : colors.tertiary}
                  />
                </Pressable>
                <View style={styles.grow}>
                  <Text style={[styles.placeName, { color: colors.label }]}>{place.name}</Text>
                  {minutes != null && (
                    <Text style={[styles.meta, { color: colors.secondary }]}>{formatMinutes(minutes)} away</Text>
                  )}
                </View>
                <Pressable
                  onPress={() => openDirections(place)}
                  accessibilityLabel={`Directions to ${place.name}`}
                  style={({ pressed }) => [
                    styles.go,
                    { backgroundColor: colors.accentSoft, opacity: pressed ? 0.6 : 1 },
                  ]}
                >
                  <Icon name="directions" size={18} color={colors.accent} />
                  <Text style={[styles.goText, { color: colors.accent }]}>Go</Text>
                </Pressable>
              </View>
            );
          })}
        </View>
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: colors.separator, backgroundColor: colors.background }]}>
        <Pressable
          onPress={() => {
            Haptics.selectionAsync();
            toggleSaved(entry.id);
          }}
          accessibilityState={{ selected: saved }}
          style={({ pressed }) => [
            styles.button,
            styles.grow,
            { backgroundColor: saved ? colors.accentSoft : colors.card, opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Icon name="bookmark" size={20} color={saved ? colors.accent : colors.secondary} />
          <Text style={[styles.buttonText, { color: saved ? colors.accent : colors.label }]}>
            {saved ? 'Saved' : 'Save'}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => {
            Haptics.selectionAsync();
            markDone(entry);
          }}
          accessibilityState={{ checked: done }}
          style={({ pressed }) => [
            styles.button,
            styles.wide,
            { backgroundColor: done ? `${colors.done}26` : colors.done, opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Icon name={done ? 'check_circle' : 'radio_button_unchecked'} size={20} color={done ? colors.done : 'white'} />
          <Text style={[styles.buttonText, { color: done ? colors.done : 'white' }]}>
            {done ? 'Done!' : 'Mark as Done'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 16, paddingTop: 24, gap: 12 },
  missing: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 8 },
  grow: { flex: 1 },
  title: { fontSize: 24, fontWeight: '700' },
  meta: { fontSize: 14, marginTop: 2 },
  close: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  section: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', marginLeft: 4 },
  list: { borderRadius: 16, overflow: 'hidden' },
  plan: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 16, marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14 },
  placeName: { fontSize: 16, fontWeight: '600' },
  go: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 36, paddingHorizontal: 12, borderRadius: 18 },
  goText: { fontSize: 15, fontWeight: '600' },
  footer: {
    flexDirection: 'row',
    gap: 8,
    padding: 16,
    paddingBottom: 32,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  button: {
    minHeight: 50,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  wide: { flex: 2 },
  buttonText: { fontSize: 16, fontWeight: '600' },
});
