import { useEffect, useMemo } from 'react';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { ShareSheet } from '@/components/share-sheet';
import { TriedCard } from '@/components/tried-card';
import { memoryItems, triedNumber } from '@/data/memories';
import { keptPhotoUri } from '@/data/photos';
import { askForReviewAfterLoved } from '@/data/review';
import { loadMemories } from '@/data/storage';
import { useAppState } from '@/state/app-state';

/** Offers a "tried it" image card for a memory, in story and square sizes, through the share sheet. */
export default function ShareCardSheet() {
  const navigation = useNavigation<{ addListener(event: 'beforeRemove', listener: () => void): () => void }>();
  const { id, justLoved } = useLocalSearchParams<{ id: string; justLoved?: string }>();
  const { findAnyEntry } = useAppState();

  const memory = useMemo(() => {
    const items = memoryItems(loadMemories(), findAnyEntry);
    const item = items.find((i) => i.entry.id === id);
    return item && { item, number: triedNumber(items, item) };
  }, [findAnyEntry, id]);

  // Right after saving something they loved, ask for a rating once this sheet closes, whether they
  // shared or not, so the prompt never covers the card.
  useEffect(() => {
    if (justLoved !== '1') return;
    return navigation.addListener('beforeRemove', () => {
      setTimeout(() => void askForReviewAfterLoved(), 600);
    });
  }, [justLoved, navigation]);

  if (!memory) return null;
  const { item, number } = memory;

  return (
    <ShareSheet
      title="Share what you tried"
      shareTitle={`Share ${item.entry.name}`}
      description={`Card: I tried ${item.entry.name}, number ${number} in ${item.city.name}`}
      hint={item.photo ? undefined : 'Add a photo next time and it fills the card.'}
    >
      {({ ref, shape, width }) => (
        <TriedCard
          ref={ref}
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
      )}
    </ShareSheet>
  );
}
