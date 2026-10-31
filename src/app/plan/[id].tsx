import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { addToCalendar } from '@/data/calendar';
import { inviteFriend } from '@/data/invite';
import { dayKey, formatDay, isWeekend, nextWeekendDay, upcomingDays } from '@/data/days';
import { isHomeSpot, spotsFor } from '@/data/catalog';
import { placesByDistance } from '@/data/drive';
import { readSetting, writeSetting } from '@/data/storage';
import { useAppState } from '@/state/app-state';
import { useColors } from '@/theme';
import { GradientIcon, Icon } from '@/components/icon';

const DAYS_AHEAD = 21;

export default function PlanSheet() {
  const colors = useColors();
  const router = useRouter();
  // `spot` is where the Explore card was showing, so a new plan starts there.
  const { id, spot } = useLocalSearchParams<{ id: string; spot?: string }>();
  const { city, origin, driveTimes, plans, setPlan, findEntry, filters } = useAppState();
  const entry = findEntry(id);
  const existing = plans.get(id);
  const days = upcomingDays(DAYS_AHEAD);
  const keys = days.map(dayKey);
  const places = entry ? placesByDistance(entry, origin, driveTimes) : [];
  const shown = places.slice(0, 6);
  const picked = places.find((p) => p.place.id === spot);
  if (picked && !shown.includes(picked)) shown.push(picked);
  const spots = entry ? spotsFor(entry, shown.map((p) => p.place)) : [];
  const home = spots.find((s) => isHomeSpot(s.id));

  const [day, setDay] = useState(() =>
    existing && keys.includes(existing.day) ? existing.day : dayKey(nextWeekendDay()),
  );
  const [placeId, setPlaceId] = useState<string | null>(
    existing?.placeId ?? spots.find((s) => s.id === spot)?.id ?? (filters.where === 'home' ? home?.id : undefined) ?? spots.find((s) => s !== home)?.id ?? home?.id ?? null,
  );
  const [calendar, setCalendar] = useState(() => readSetting('planAddsToCalendar', true));

  if (!entry) return null;

  const save = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setPlan(entry.id, { placeId, day });
    if (calendar) {
      const place = places.find((p) => p.place.id === placeId)?.place;
      await addToCalendar({ title: entry.name, day, location: place ? `${place.name}, ${city.name}` : null });
    }
    router.back();
  };

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <GradientIcon icon={entry.icon} subcategoryId={entry.subcategory} size={48} shape="tile" />
          <View style={styles.grow}>
            <Text style={[styles.title, { color: colors.label }]}>Pick a day</Text>
            <Text style={[styles.meta, { color: colors.secondary }]} numberOfLines={1}>
              {entry.name}
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

        <Text style={[styles.question, { color: colors.label }]}>When?</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.days}>
          {days.map((date, i) => {
            const key = keys[i];
            const selected = key === day;
            const weekend = isWeekend(date);
            return (
              <Pressable
                key={key}
                onPress={() => {
                  Haptics.selectionAsync();
                  setDay(key);
                }}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                style={[styles.day, { backgroundColor: selected ? colors.accent : colors.card }]}
              >
                <Text
                  style={[
                    styles.weekday,
                    { color: selected ? colors.onAccent : weekend ? colors.accent : colors.secondary },
                  ]}
                >
                  {i === 0 ? 'Today' : date.toLocaleDateString(undefined, { weekday: 'short' })}
                </Text>
                <Text style={[styles.date, { color: selected ? colors.onAccent : colors.label }]}>{date.getDate()}</Text>
                <Text style={[styles.month, { color: selected ? colors.onAccent : colors.tertiary }]}>
                  {date.toLocaleDateString(undefined, { month: 'short' })}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {spots.length > 1 && (
          <>
            <Text style={[styles.question, { color: colors.label }]}>Where?</Text>
            <View style={styles.chips}>
              {spots.map((place) => {
                const selected = place.id === placeId;
                return (
                  <Pressable
                    key={place.id}
                    onPress={() => setPlaceId(place.id)}
                    accessibilityState={{ selected }}
                    style={[
                      styles.chip,
                      { backgroundColor: selected ? colors.accentSoft : colors.fill },
                      selected && { borderColor: colors.accent, borderWidth: 1.5 },
                    ]}
                  >
                    <Text style={[styles.chipText, { color: selected ? colors.accent : colors.label }]}>
                      {place.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        )}

        <Pressable
          onPress={() => inviteFriend(entry, places.find((p) => p.place.id === placeId)?.place ?? null, day)}
          accessibilityRole="button"
          style={({ pressed }) => [styles.toggle, { backgroundColor: colors.card, opacity: pressed ? 0.7 : 1 }]}
        >
          <Icon name="person_add" size={22} color={colors.accent} />
          <View style={styles.grow}>
            <Text style={[styles.toggleTitle, { color: colors.label }]}>Invite a friend</Text>
            <Text style={[styles.meta, { color: colors.secondary }]}>Plans with someone are easier to keep</Text>
          </View>
          <Icon name="chevron_right" size={20} color={colors.tertiary} />
        </Pressable>

        <View style={[styles.toggle, styles.flush, { backgroundColor: colors.card }]}>
          <Icon name="calendar_month" size={22} color={colors.accent} />
          <View style={styles.grow}>
            <Text style={[styles.toggleTitle, { color: colors.label }]}>Add to my calendar</Text>
            <Text style={[styles.meta, { color: colors.secondary }]}>Set a time and an alert there</Text>
          </View>
          <Switch
            value={calendar}
            onValueChange={(on) => {
              setCalendar(on);
              writeSetting('planAddsToCalendar', on);
            }}
            trackColor={{ true: colors.accent }}
          />
        </View>
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: colors.separator, backgroundColor: colors.background }]}>
        {existing && (
          <Pressable
            onPress={() => {
              Haptics.selectionAsync();
              setPlan(entry.id, null);
              router.back();
            }}
            style={({ pressed }) => [styles.button, styles.grow, { backgroundColor: colors.card, opacity: pressed ? 0.7 : 1 }]}
          >
            <Text style={[styles.buttonText, { color: colors.label }]}>Remove plan</Text>
          </Pressable>
        )}
        <Pressable
          onPress={save}
          style={({ pressed }) => [
            styles.button,
            styles.wide,
            { backgroundColor: colors.accent, opacity: pressed ? 0.8 : 1 },
          ]}
        >
          <Icon name="calendar_month" size={20} color={colors.onAccent} />
          <Text style={[styles.buttonText, { color: colors.onAccent }]}>Plan for {formatDay(day)}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 16, paddingTop: 24, gap: 12 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 4 },
  grow: { flex: 1 },
  title: { fontSize: 24, fontWeight: '700' },
  meta: { fontSize: 14, marginTop: 2 },
  close: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  question: { fontSize: 17, fontWeight: '700', marginTop: 8 },
  days: { gap: 8, paddingVertical: 2 },
  day: { width: 60, paddingVertical: 10, borderRadius: 14, alignItems: 'center', gap: 2 },
  weekday: { fontSize: 12, fontWeight: '700' },
  date: { fontSize: 22, fontWeight: '700' },
  month: { fontSize: 12, fontWeight: '600' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { minHeight: 36, paddingHorizontal: 12, borderRadius: 18, justifyContent: 'center' },
  chipText: { fontSize: 14, fontWeight: '600' },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 16, marginTop: 12 },
  flush: { marginTop: 0 },
  toggleTitle: { fontSize: 16, fontWeight: '600' },
  footer: { flexDirection: 'row', gap: 8, padding: 16, paddingBottom: 32, borderTopWidth: StyleSheet.hairlineWidth },
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
