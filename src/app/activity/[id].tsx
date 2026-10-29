import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { LEVELS, otherWays, seasonLabel } from '@/data/catalog';
import { formatDay } from '@/data/days';
import { openDirections, searchNearby } from '@/data/directions';
import { inviteFriend } from '@/data/invite';
import { placeSources } from '@/data/credits';
import { canReport, reportPlace } from '@/data/report';
import { formatMinutes, placesByDistance } from '@/data/drive';
import { useAppState } from '@/state/app-state';
import { useMarkDone } from '@/state/use-mark-done';
import { subcategory, useColors } from '@/theme';
import { GradientIcon, Icon } from '@/components/icon';

// Big cities have hundreds of parks or restaurants for one activity, so the list starts with the closest.
const FIRST_PLACES = 20;

export default function ActivitySheet() {
  const colors = useColors();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { city, origin, driveTimes, isDone, savedIds, toggleSaved, visitedPlaceIds, toggleVisited, plans, findEntry, removeCustom } =
    useAppState();
  const markDone = useMarkDone();
  const entry = findEntry(id);
  const [showAll, setShowAll] = useState(false);

  if (!entry) {
    return (
      <View style={styles.missing}>
        <Text style={[styles.meta, { color: colors.secondary }]}>This isn&apos;t available in {city.name}.</Text>
      </View>
    );
  }

  const sub = subcategory(entry.subcategory);
  const places = placesByDistance(entry, origin, driveTimes);
  const done = isDone(entry.id);
  const saved = savedIds.has(entry.id);
  const visitedCount = places.filter(({ place }) => visitedPlaceIds.has(place.id)).length;
  const plan = plans.get(entry.id);
  const planPlace = plan && places.find(({ place }) => place.id === plan.placeId)?.place;
  const ways = otherWays(entry);
  const sources = placeSources(places.map(({ place }) => place));

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <GradientIcon icon={entry.icon} subcategoryId={entry.subcategory} size={64} shape="tile" />
          <View style={styles.grow}>
            <Text style={[styles.title, { color: colors.label }]}>{entry.name}</Text>
            <Text style={[styles.meta, { color: colors.secondary }]}>
              {/* Line breaking allows a break inside "$$", so the cost gets word joiners and each part keeps its spaces. */}
              {[sub.label, entry.duration, entry.cost.split('').join('⁠'), LEVELS[entry.level].label]
                .map((part) => part.replaceAll(' ', ' '))
                .join(' · ')}
            </Text>
            {entry.months && (
              <Text style={[styles.meta, { color: colors.secondary }]}>In season {seasonLabel(entry.months)}</Text>
            )}
          </View>
          <Pressable
            onPress={() => inviteFriend(entry, planPlace ?? places[0]?.place ?? null, plan?.day ?? null)}
            hitSlop={8}
            accessibilityLabel="Invite a friend"
            style={[styles.close, { backgroundColor: colors.fill }]}
          >
            <Icon name={process.env.EXPO_OS === 'ios' ? 'ios_share' : 'share'} size={18} color={colors.secondary} />
          </Pressable>
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
              {plan ? (planPlace?.name ?? plan.placeName ?? 'Tap to change') : 'Deciding when helps you follow through'}
            </Text>
          </View>
          <Icon name="chevron_right" size={20} color={colors.tertiary} />
        </Pressable>

        {places.length > 0 && (
          <>
            <Text style={[styles.section, { color: colors.secondary }]}>
              {places.length} {places.length === 1 ? 'place' : 'places'} in {city.name}
              {visitedCount > 0 && places.length > 1 ? ` · ${visitedCount} visited` : ''}
            </Text>
            <View style={[styles.list, { backgroundColor: colors.card }]}>
              {(showAll ? places : places.slice(0, FIRST_PLACES)).map(({ place, minutes }, i) => {
                const visited = visitedPlaceIds.has(place.id);
                const meta = [
                  minutes != null && `${formatMinutes(minutes)} away`,
                  place.cost && place.cost !== entry.cost && place.cost,
                  place.duration && place.duration !== entry.duration && place.duration,
                ].filter(Boolean);
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
                      {meta.length > 0 && (
                        <Text style={[styles.meta, { color: colors.secondary }]}>{meta.join(' · ')}</Text>
                      )}
                    </View>
                    {canReport && (
                      <Pressable
                        onPress={() => reportPlace(place, entry, city.name)}
                        hitSlop={8}
                        accessibilityLabel={`Report a problem with ${place.name}`}
                        style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
                      >
                        <Icon name="flag" size={18} color={colors.tertiary} />
                      </Pressable>
                    )}
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
              {!showAll && places.length > FIRST_PLACES && (
                <Pressable
                  onPress={() => setShowAll(true)}
                  style={({ pressed }) => [
                    styles.row,
                    { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.separator, opacity: pressed ? 0.6 : 1 },
                  ]}
                >
                  <Text style={[styles.placeName, styles.grow, { color: colors.accent }]}>Show all {places.length} places</Text>
                  <Icon name="keyboard_arrow_down" size={20} color={colors.accent} />
                </Pressable>
              )}
            </View>
            {sources.length > 0 && (
              <Pressable onPress={() => router.push('/about')} accessibilityRole="link" hitSlop={8}>
                <Text style={[styles.credit, { color: colors.tertiary }]}>
                  Places from {sources.map((c) => c.name).join(' and ')}
                </Text>
              </Pressable>
            )}
          </>
        )}

        {ways.length > 0 && (
          <>
            <Text style={[styles.section, { color: colors.secondary }]}>
              {places.length ? 'Other ways' : 'Ways to try it'}
            </Text>
            <View style={[styles.list, { backgroundColor: colors.card }]}>
              {ways.map((way, i) => {
                const action =
                  way.kind === 'search'
                    ? { label: 'Search', icon: 'search' as const, onPress: () => searchNearby(entry.search!, origin) }
                    : way.kind === 'host'
                      ? { label: 'Invite', icon: 'person_add' as const, onPress: () => inviteFriend(entry, null, plan?.day ?? null) }
                      : null;
                return (
                  <View
                    key={way.kind}
                    style={[
                      styles.row,
                      i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.separator },
                    ]}
                  >
                    <Icon name={way.icon} size={24} color={colors.accent} />
                    <View style={styles.grow}>
                      <Text style={[styles.placeName, { color: colors.label }]}>{way.title}</Text>
                      <Text style={[styles.meta, { color: colors.secondary }]}>{way.detail}</Text>
                    </View>
                    {action && (
                      <Pressable
                        onPress={action.onPress}
                        accessibilityLabel={`${action.label}: ${way.title}`}
                        style={({ pressed }) => [
                          styles.go,
                          { backgroundColor: colors.accentSoft, opacity: pressed ? 0.6 : 1 },
                        ]}
                      >
                        <Icon name={action.icon} size={18} color={colors.accent} />
                        <Text style={[styles.goText, { color: colors.accent }]}>{action.label}</Text>
                      </Pressable>
                    )}
                  </View>
                );
              })}
            </View>
          </>
        )}

        {entry.custom && (
          <Pressable
            onPress={() => {
              removeCustom(entry.id);
              router.back();
            }}
            accessibilityRole="button"
            style={styles.delete}
          >
            <Text style={[styles.deleteText, { color: colors.secondary }]}>Remove from my list</Text>
          </Pressable>
        )}
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
            { backgroundColor: saved ? colors.accent : `${colors.accent}1F`, opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Icon name="bookmark" size={20} color={saved ? colors.onAccent : colors.accent} />
          <Text style={[styles.buttonText, { color: saved ? colors.onAccent : colors.accent }]}>
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
          <Icon name={done ? 'check_circle' : 'radio_button_unchecked'} size={20} color={done ? colors.done : colors.onDone} />
          <Text style={[styles.buttonText, { color: done ? colors.done : colors.onDone }]}>
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
  delete: { alignSelf: 'center', paddingVertical: 12, paddingHorizontal: 16 },
  deleteText: { fontSize: 15, fontWeight: '600' },
  plan: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 16, marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14 },
  placeName: { fontSize: 16, fontWeight: '600' },
  go: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 36, paddingHorizontal: 12, borderRadius: 18 },
  goText: { fontSize: 15, fontWeight: '600' },
  credit: { fontSize: 12, marginLeft: 4 },
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
