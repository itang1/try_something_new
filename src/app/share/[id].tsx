import { useMemo, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { FilterChip } from '@/components/chips';
import { Icon } from '@/components/icon';
import { CARD_ASPECT, TriedCard, type CardView } from '@/components/tried-card';
import { memoryItems, triedNumber } from '@/data/memories';
import { keptPhotoUri } from '@/data/photos';
import { shareCard, type CardShape } from '@/data/share-card';
import { loadMemories } from '@/data/storage';
import { useAppState } from '@/state/app-state';
import { useColors } from '@/theme';

const SHAPES: { id: CardShape; label: string }[] = [
  { id: 'story', label: 'Story' },
  { id: 'square', label: 'Square' },
];

/** Offers a "tried it" image card for a memory, in story and square sizes, through the share sheet. */
export default function ShareCardSheet() {
  const colors = useColors();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { findAnyEntry } = useAppState();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const card = useRef<CardView>(null);
  const [shape, setShape] = useState<CardShape>('story');
  const [busy, setBusy] = useState(false);

  const memory = useMemo(() => {
    const items = memoryItems(loadMemories(), findAnyEntry);
    const item = items.find((i) => i.entry.id === id);
    return item && { item, number: triedNumber(items, item) };
  }, [findAnyEntry, id]);

  if (!memory) return null;
  const { item, number } = memory;

  // As large as fits above the buttons, so what you see is what gets shared.
  const width = Math.min(screenWidth - 48, 340, (screenHeight * 0.58) / CARD_ASPECT[shape]);

  const share = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await shareCard(card, shape, `Share ${item.entry.name}`);
    } catch (e) {
      Alert.alert("Couldn't make the card", e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: colors.label }]}>Share what you tried</Text>
        <View style={styles.chips}>
          {SHAPES.map((s) => (
            <FilterChip
              key={s.id}
              title={s.label}
              icon={s.id === 'story' ? 'photo_album' : 'grid_view'}
              color={colors.accent}
              selected={shape === s.id}
              onPress={() => setShape(s.id)}
            />
          ))}
        </View>
        <View
          style={[styles.preview, { boxShadow: '0 8px 24px rgba(0,0,0,0.18)' }]}
          accessible
          accessibilityRole="image"
          accessibilityLabel={`Card: I tried ${item.entry.name}, number ${number} in ${item.city.name}`}
        >
          <View style={styles.clip}>
            <TriedCard
              ref={card}
              shape={shape}
              width={width}
              name={item.entry.name}
              icon={item.entry.icon}
              subcategoryId={item.entry.subcategory}
              badge={`#${number} in ${item.city.name}`}
              place={item.placeName}
              loved={item.rating === 'loved'}
              photo={item.photo ? keptPhotoUri(item.photo) : null}
            />
          </View>
        </View>
        {!item.photo && (
          <Text style={[styles.hint, { color: colors.secondary }]}>Add a photo next time and it fills the card.</Text>
        )}
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: colors.separator, backgroundColor: colors.background }]}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.back()}
          style={({ pressed }) => [styles.button, styles.skip, { backgroundColor: colors.card, opacity: pressed ? 0.7 : 1 }]}
        >
          <Text style={[styles.buttonText, { color: colors.label }]}>Not now</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ busy }}
          onPress={share}
          style={({ pressed }) => [
            styles.button,
            styles.share,
            { backgroundColor: colors.accent, opacity: pressed || busy ? 0.8 : 1 },
          ]}
        >
          <Icon name="ios_share" size={20} color={colors.onAccent} />
          <Text style={[styles.buttonText, { color: colors.onAccent }]}>Share</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 20, paddingTop: 28, gap: 14, alignItems: 'center' },
  title: { fontSize: 22, fontWeight: '700', textAlign: 'center' },
  chips: { flexDirection: 'row', gap: 8 },
  preview: { borderRadius: 20 },
  clip: { borderRadius: 20, overflow: 'hidden' },
  hint: { fontSize: 13, textAlign: 'center' },
  footer: { flexDirection: 'row', gap: 8, padding: 16, paddingBottom: 32, borderTopWidth: StyleSheet.hairlineWidth },
  button: { minHeight: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  skip: { flex: 1 },
  share: { flex: 2 },
  buttonText: { fontSize: 16, fontWeight: '600' },
});
