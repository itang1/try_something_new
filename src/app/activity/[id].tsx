import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { findEntry } from '@/data/catalog';
import { openDirections } from '@/data/directions';
import { formatMinutes, placesByDistance } from '@/data/drive';
import { useAppState } from '@/state/app-state';
import { subcategory, useColors } from '@/theme';
import { GradientIcon, Icon } from '@/components/icon';

export default function ActivitySheet() {
  const colors = useColors();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { city, origin, isDone, toggleDone, savedIds, toggleSaved } = useAppState();
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

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <GradientIcon icon={entry.icon} subcategoryId={entry.subcategory} size={64} shape="tile" />
          <View style={styles.grow}>
            <Text style={[styles.title, { color: colors.label }]}>{entry.name}</Text>
            <Text style={[styles.meta, { color: colors.secondary }]}>
              {sub.label} · {entry.duration} · {entry.cost}
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

        <Text style={[styles.section, { color: colors.secondary }]}>
          {places.length} {places.length === 1 ? 'place' : 'places'} in {city.name}
        </Text>
        <View style={[styles.list, { backgroundColor: colors.card }]}>
          {places.map(({ place, minutes }, i) => (
            <View
              key={place.id}
              style={[
                styles.row,
                i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.separator },
              ]}
            >
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
          ))}
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
            toggleDone(entry.id);
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
