import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { ACTIVITY_ALIASES, anywhereSpotId, AT_HOME, entryHint, homeSpotId, kindsOf, LEVELS, otherWays, seasonLabel } from '@/data/catalog';
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
import type { IconName } from '@/icons/paths';

// Big cities have hundreds of parks or restaurants for one activity, so the list starts with the closest.
const FIRST_PLACES = 20;

export default function ActivitySheet() {
  const colors = useColors();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { city, entries, origin, travelTimes, isDone, savedIds, toggleSaved, visitedPlaceIds, toggleVisited, plans, findEntry, removeCustom } =
    useAppState();
  const markDone = useMarkDone();
  // Links from the website and old shares carry an activity id, which may have been renamed or merged since, and
  // may only be in this city as a landmark. Anything else in the link, like ?s=invite, is for the website's counts.
  const activityId = ACTIVITY_ALIASES[id] ?? id;
  const entry = findEntry(activityId) ?? entries.find((e) => e.activityId === activityId);
  const [showAll, setShowAll] = useState(false);

  if (!entry) {
    return (
      <View style={styles.missing}>
        <Text style={[styles.meta, { color: colors.secondary }]}>This isn&apos;t available in {city.name}.</Text>
      </View>
    );
  }

  const sub = subcategory(entry.subcategory);
  const places = placesByDistance(entry, origin, travelTimes);
  const done = isDone(entry.id);
  const saved = savedIds.has(entry.id);
  const visitedCount = places.filter(({ place }) => visitedPlaceIds.has(place.id)).length;
  const plan = plans.get(entry.id);
  const planPlace = plan && places.find(({ place }) => place.id === plan.placeId)?.place;
  const ways = otherWays(entry);
  const homeWay = ways.find((w) => w.kind === 'home');
  const anywhereWay = ways.find((w) => w.kind === 'anywhere');
  const hostWay = ways.find((w) => w.kind === 'host');
  const searchWay = ways.find((w) => w.kind === 'search');
  // Doing it at home checks off like a place of its own.
  const homeId = homeSpotId(entry.activityId);
  // So does doing it anywhere without a set venue, like a backyard or any public court.
  const anywhereId = anywhereSpotId(entry.activityId);
  const hasSpots = !!homeWay || places.length > 0 || !!anywhereWay || !!searchWay;
  const placeCount = `${places.length} ${places.length === 1 ? 'place' : 'places'} in ${city.name}`;
  const spotsTitle =
    homeWay && places.length ? `At home or ${placeCount}` : places.length ? placeCount : 'Where to do it';
  const sources = placeSources(places.map(({ place }) => place));
  const kinds = kindsOf(entries, entry);
  const parent = entry.parent ? findEntry(entry.parent) : undefined;

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
            {parent && (
              <Pressable onPress={() => router.push(`/activity/${parent.id}`)} accessibilityRole="link" hitSlop={6}>
                <Text style={[styles.meta, { color: colors.accent }]}>One way to {parent.name[0].toLowerCase() + parent.name.slice(1)}</Text>
              </Pressable>
            )}
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => inviteFriend(entry, planPlace ?? places[0]?.place ?? null, plan?.day ?? null)}
            hitSlop={8}
            accessibilityLabel="Invite a friend"
            style={[styles.close, { backgroundColor: colors.fill }]}
          >
            <Icon name={process.env.EXPO_OS === 'ios' ? 'ios_share' : 'share'} size={18} color={colors.secondary} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
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

        {kinds.length > 0 && (
          <>
            <Text style={[styles.section, { color: colors.secondary }]}>Pick one to try</Text>
            <View style={[styles.list, { backgroundColor: colors.card }]}>
              {kinds.map((kind, i) => (
                <Pressable
                  key={kind.id}
                  onPress={() => router.push(`/activity/${kind.id}`)}
                  accessibilityRole="button"
                  style={({ pressed }) => [
                    styles.row,
                    i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.separator },
                    { opacity: pressed ? 0.6 : 1 },
                  ]}
                >
                  <GradientIcon icon={kind.icon} subcategoryId={kind.subcategory} size={32} shape="tile" />
                  <View style={styles.grow}>
                    <Text style={[styles.placeName, { color: colors.label }]}>{kind.name}</Text>
                    <Text style={[styles.meta, { color: colors.secondary }]} numberOfLines={1}>
                      {(kind.places.length || kind.search) && kind.home ? 'Out or at home' : entryHint(kind)}
                    </Text>
                  </View>
                  {isDone(kind.id) && <Icon name="check_circle" size={20} color={colors.done} />}
                  <Icon name="chevron_right" size={20} color={colors.tertiary} />
                </Pressable>
              ))}
            </View>
          </>
        )}

        {hasSpots && (
          <>
            <Text style={[styles.section, { color: colors.secondary }]}>
              {spotsTitle}
              {visitedCount > 0 && places.length > 1 ? ` · ${visitedCount} visited` : ''}
            </Text>
            <View style={[styles.list, { backgroundColor: colors.card }]}>
              {/* Home comes first: one row that would otherwise sink under a long list of places. */}
              {homeWay && (
                <View style={styles.row}>
                  <VisitCheck
                    checked={visitedPlaceIds.has(homeId)}
                    label="Did it at home"
                    onPress={() => toggleVisited(homeId, entry.activityId)}
                  />
                  <View style={styles.grow}>
                    <Text style={[styles.placeName, { color: colors.label }]}>{AT_HOME}</Text>
                    <Text style={[styles.meta, { color: colors.secondary }]}>{homeWay.detail}</Text>
                  </View>
                  <Icon name="cottage" size={20} color={colors.tertiary} />
                </View>
              )}
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
                      (i > 0 || homeWay) && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.separator },
                    ]}
                  >
                    <VisitCheck checked={visited} label={`Been to ${place.name}`} onPress={() => toggleVisited(place.id, entry.activityId)} />
                    <View style={styles.grow}>
                      <Text style={[styles.placeName, { color: colors.label }]}>{place.name}</Text>
                      {meta.length > 0 && (
                        <Text style={[styles.meta, { color: colors.secondary }]}>{meta.join(' · ')}</Text>
                      )}
                    </View>
                    {canReport && (
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => reportPlace(place, entry, city.name)}
                        hitSlop={8}
                        accessibilityLabel={`Report a problem with ${place.name}`}
                        style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
                      >
                        <Icon name="flag" size={18} color={colors.tertiary} />
                      </Pressable>
                    )}
                    <RowAction
                      icon="directions"
                      label="Go"
                      accessibilityLabel={`Directions to ${place.name}`}
                      onPress={() => openDirections(place, travelTimes.mode)}
                    />
                  </View>
                );
              })}
              {!showAll && places.length > FIRST_PLACES && (
                <Pressable
                  accessibilityRole="button"
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
              {anywhereWay && (
                <View
                  style={[
                    styles.row,
                    (homeWay || places.length > 0) && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.separator },
                  ]}
                >
                  <VisitCheck
                    checked={visitedPlaceIds.has(anywhereId)}
                    label={`Did it: ${anywhereWay.title}`}
                    onPress={() => toggleVisited(anywhereId, entry.activityId)}
                  />
                  <View style={styles.grow}>
                    <Text style={[styles.placeName, { color: colors.label }]}>{anywhereWay.title}</Text>
                    <Text style={[styles.meta, { color: colors.secondary }]}>{anywhereWay.detail}</Text>
                  </View>
                  <Icon name="explore" size={20} color={colors.tertiary} />
                </View>
              )}
              {/* Venues open map data can't list, like paint-your-own pottery studios. */}
              {searchWay && (
                <View
                  style={[
                    styles.row,
                    (homeWay || places.length > 0 || anywhereWay) && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.separator },
                  ]}
                >
                  <Icon name="search" size={24} color={colors.accent} />
                  <View style={styles.grow}>
                    <Text style={[styles.placeName, { color: colors.label }]}>
                      {places.length ? 'Find another near you' : searchWay.title}
                    </Text>
                    <Text style={[styles.meta, { color: colors.secondary }]}>{searchWay.detail}</Text>
                  </View>
                  <RowAction
                    icon="search"
                    label="Search"
                    accessibilityLabel={`Search maps for ${entry.search}`}
                    onPress={() => searchNearby(entry.search!, origin)}
                  />
                </View>
              )}
            </View>
            {sources.length > 0 && (
              <Pressable onPress={() => router.push('/settings')} accessibilityRole="link" hitSlop={8}>
                <Text style={[styles.credit, { color: colors.tertiary }]}>
                  Places from {sources.map((c) => c.name).join(' and ')}
                </Text>
              </Pressable>
            )}
          </>
        )}

        {hostWay && (
          <>
            <Text style={[styles.section, { color: colors.secondary }]}>With friends</Text>
            <View style={[styles.list, { backgroundColor: colors.card }]}>
              <View style={styles.row}>
                <Icon name={hostWay.icon} size={24} color={colors.accent} />
                <View style={styles.grow}>
                  <Text style={[styles.placeName, { color: colors.label }]}>{hostWay.title}</Text>
                  <Text style={[styles.meta, { color: colors.secondary }]}>{hostWay.detail}</Text>
                </View>
                <RowAction
                  icon="person_add"
                  label="Invite"
                  accessibilityLabel={`Invite: ${hostWay.title}`}
                  onPress={() => inviteFriend(entry, null, plan?.day ?? null)}
                />
              </View>
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
          accessibilityRole="button"
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
          accessibilityRole="checkbox"
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

function VisitCheck({ checked, label, onPress }: { checked: boolean; label: string; onPress: () => void }) {
  const colors = useColors();
  return (
    <Pressable
      onPress={() => {
        Haptics.selectionAsync();
        onPress();
      }}
      hitSlop={10}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={label}
    >
      <Icon
        name={checked ? 'check_circle' : 'radio_button_unchecked'}
        size={24}
        color={checked ? colors.done : colors.tertiary}
      />
    </Pressable>
  );
}

type RowActionProps = { icon: IconName; label: string; accessibilityLabel: string; onPress: () => void };

function RowAction({ icon, label, accessibilityLabel, onPress }: RowActionProps) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [styles.go, { backgroundColor: colors.accentSoft, opacity: pressed ? 0.6 : 1 }]}
    >
      <Icon name={icon} size={18} color={colors.accent} />
      <Text style={[styles.goText, { color: colors.accent }]}>{label}</Text>
    </Pressable>
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
