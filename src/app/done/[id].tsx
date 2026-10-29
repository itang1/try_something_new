import { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Animated, { ZoomIn } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { placesByDistance } from '@/data/drive';
import { pickAndKeepPhoto } from '@/data/photos';
import { recordReflection, type Rating } from '@/data/storage';
import { useAppState } from '@/state/app-state';
import { useColors } from '@/theme';
import { Icon } from '@/components/icon';
import { Confetti } from '@/components/confetti';
import type { IconName } from '@/icons/paths';

const MILESTONES = [5, 10, 25, 50, 75, 100, 150, 200];

/** The milestone this completion just reached, if any. An icon checks off two entries at once. */
function milestoneReached(tried: number, total: number, step: number): string | null {
  const crossed = (m: number) => tried >= m && tried - step < m;
  if (crossed(total)) return 'You tried everything here!';
  if (total >= 10 && crossed(Math.ceil(total / 2))) return 'Halfway there!';
  const m = MILESTONES.find(crossed);
  return m ? `${m} things tried!` : null;
}

const RATINGS: { id: Rating; label: string; icon: IconName }[] = [
  { id: 'loved', label: 'Loved it', icon: 'favorite' },
  { id: 'fine', label: 'It was fine', icon: 'remove' },
  { id: 'not-for-me', label: 'Not for me', icon: 'close' },
];

export default function DoneSheet() {
  const colors = useColors();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { city, origin, driveTimes, doneIds, visitedPlaceIds, toggleVisited, plans, entries, findEntry } = useAppState();
  const entry = findEntry(id);
  const places = entry ? placesByDistance(entry, origin, driveTimes) : [];
  const [placeId, setPlaceId] = useState<string | null>(
    plans.get(id)?.placeId ?? places[0]?.place.id ?? null,
  );
  const [rating, setRating] = useState<Rating | null>(null);
  const [note, setNote] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);

  if (!entry) return null;

  const all = entries;
  const triedCount = all.filter((e) => doneIds.has(e.id)).length;
  const milestone = milestoneReached(triedCount, all.length, entry.kind === 'icon' ? 2 : 1);

  const save = () => {
    if (placeId && entry.kind === 'activity' && !visitedPlaceIds.has(placeId)) toggleVisited(placeId, entry.activityId);
    const placeName = places.find((p) => p.place.id === placeId)?.place.name ?? null;
    recordReflection({ entryId: entry.id, placeId, placeName, rating, note: note.trim(), photo });
    router.back();
  };

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
        <View style={styles.hero}>
          <Confetti />
          <Animated.View
            entering={ZoomIn.springify().damping(12)}
            style={[styles.check, { backgroundColor: colors.done, boxShadow: `0 10px 24px ${colors.done}59` }]}
          >
            <Icon name="check" size={52} color={colors.onDone} />
          </Animated.View>
        </View>
        {milestone && (
          <Animated.View
            entering={ZoomIn.delay(500).springify().damping(10)}
            style={[styles.milestone, { backgroundColor: colors.accentSoft }]}
          >
            <Icon name="trophy" size={18} color={colors.accent} />
            <Text style={[styles.milestoneText, { color: colors.accent }]}>{milestone}</Text>
          </Animated.View>
        )}
        <Text style={[styles.title, { color: colors.label }]}>You did it!</Text>
        <Text style={[styles.name, { color: colors.label }]}>{entry.name}</Text>
        <Text style={[styles.progress, { color: colors.secondary }]}>
          {triedCount} of {all.length} tried in {city.name}
        </Text>

        {entry.kind === 'activity' && places.length > 1 && (
          <View style={styles.group}>
            <Text style={[styles.question, { color: colors.label }]}>Where did you go?</Text>
            <View style={styles.chips}>
              {places.slice(0, 6).map(({ place }) => {
                const selected = place.id === placeId;
                return (
                  <Pressable
                    key={place.id}
                    onPress={() => setPlaceId(selected ? null : place.id)}
                    accessibilityState={{ selected }}
                    style={[
                      styles.chip,
                      { backgroundColor: selected ? colors.accentSoft : colors.fill },
                      selected && { borderColor: colors.accent, borderWidth: 1.5 },
                    ]}
                  >
                    <Text style={[styles.chipText, { color: selected ? colors.accent : colors.label }]}>{place.name}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        <View style={styles.group}>
          <Text style={[styles.question, { color: colors.label }]}>How was it?</Text>
          <View style={styles.ratings}>
            {RATINGS.map((r) => {
              const selected = rating === r.id;
              return (
                <Pressable
                  key={r.id}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setRating(selected ? null : r.id);
                  }}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  style={[
                    styles.rating,
                    { backgroundColor: selected ? colors.accentSoft : colors.fill },
                    selected && { borderColor: colors.accent, borderWidth: 1.5 },
                  ]}
                >
                  <Icon name={r.icon} size={24} color={selected ? colors.accent : colors.secondary} />
                  <Text style={[styles.ratingText, { color: selected ? colors.accent : colors.label }]}>{r.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.group}>
          <Text style={[styles.label, { color: colors.secondary }]}>Note (optional)</Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="Who came along? What would you tell a friend?"
            placeholderTextColor={colors.tertiary}
            multiline
            accessibilityLabel="Note"
            style={[styles.note, { backgroundColor: colors.fill, color: colors.label }]}
          />
          {photo ? (
            <Pressable onPress={() => setPhoto(null)} accessibilityLabel="Remove photo" style={styles.photoWrap}>
              <Image source={{ uri: photo }} style={styles.photo} />
              <View style={[styles.removePhoto, { backgroundColor: colors.card }]}>
                <Icon name="close" size={16} color={colors.label} />
              </View>
            </Pressable>
          ) : (
            <Pressable
              onPress={async () => setPhoto(await pickAndKeepPhoto())}
              style={({ pressed }) => [styles.addPhoto, { backgroundColor: colors.fill, opacity: pressed ? 0.7 : 1 }]}
            >
              <Icon name="photo_camera" size={20} color={colors.secondary} />
              <Text style={[styles.addPhotoText, { color: colors.label }]}>Add a photo</Text>
            </Pressable>
          )}
        </View>

      </ScrollView>

      <View style={[styles.footer, { borderTopColor: colors.separator, backgroundColor: colors.background }]}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.button, styles.skip, { backgroundColor: colors.card, opacity: pressed ? 0.7 : 1 }]}
        >
          <Text style={[styles.buttonText, { color: colors.label }]}>Skip</Text>
        </Pressable>
        <Pressable
          onPress={save}
          style={({ pressed }) => [styles.button, styles.save, { backgroundColor: colors.accent, opacity: pressed ? 0.8 : 1 }]}
        >
          <Text style={[styles.buttonText, { color: colors.onAccent }]}>Save</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  milestone: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    alignSelf: 'center',
  },
  milestoneText: { fontSize: 15, fontWeight: '700' },
  content: { padding: 20, paddingTop: 32, paddingBottom: 24, gap: 8 },
  hero: { height: 140, alignItems: 'center', justifyContent: 'center' },
  check: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: '700', textAlign: 'center' },
  name: { fontSize: 18, fontWeight: '600', textAlign: 'center' },
  progress: { fontSize: 15, textAlign: 'center', marginBottom: 12 },
  group: { gap: 10, marginTop: 12 },
  question: { fontSize: 17, fontWeight: '600' },
  label: { fontSize: 13 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { minHeight: 36, paddingHorizontal: 12, borderRadius: 18, justifyContent: 'center' },
  chipText: { fontSize: 14, fontWeight: '600' },
  ratings: { flexDirection: 'row', gap: 8 },
  rating: { flex: 1, minHeight: 72, borderRadius: 14, alignItems: 'center', justifyContent: 'center', gap: 4 },
  ratingText: { fontSize: 14, fontWeight: '600' },
  note: { minHeight: 80, borderRadius: 12, padding: 12, fontSize: 16, textAlignVertical: 'top' },
  addPhoto: {
    minHeight: 44,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  addPhotoText: { fontSize: 15, fontWeight: '600' },
  photoWrap: { alignSelf: 'flex-start' },
  photo: { width: 120, height: 120, borderRadius: 12 },
  removePhoto: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  screen: { flex: 1 },
  footer: { flexDirection: 'row', gap: 8, padding: 16, paddingBottom: 32, borderTopWidth: StyleSheet.hairlineWidth },
  button: { minHeight: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  skip: { flex: 1 },
  save: { flex: 2 },
  buttonText: { fontSize: 16, fontWeight: '600' },
});
