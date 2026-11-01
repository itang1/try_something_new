import { useMemo } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { RecapCard } from '@/components/recap-card';
import { ShareSheet } from '@/components/share-sheet';
import { memoryItems } from '@/data/memories';
import { lastMonthRecap, yearRecap } from '@/data/milestones';
import { loadMemories } from '@/data/storage';
import { useAppState } from '@/state/app-state';

/** Last month, or the year, in review as a shareable card, from the recaps on Memories. */
export default function ShareRecapSheet() {
  const { period } = useLocalSearchParams<{ period?: 'month' | 'year' }>();
  const { findAnyEntry } = useAppState();
  const recap = useMemo(() => {
    const items = memoryItems(loadMemories(), findAnyEntry);
    return period === 'year' ? yearRecap(items) : lastMonthRecap(items);
  }, [findAnyEntry, period]);
  if (!recap) return null;

  return (
    <ShareSheet
      title={`Share your ${recap.label}`}
      shareTitle={`My ${recap.label} in review`}
      description={`Card: my ${recap.label} in review. ${recap.tried} new ${recap.tried === 1 ? 'thing' : 'things'}, ${recap.kinds} ${recap.kinds === 1 ? 'kind' : 'kinds'}${recap.favorite ? `. Favorite: ${recap.favorite}` : ''}`}
    >
      {({ ref, shape, width }) => <RecapCard ref={ref} shape={shape} width={width} recap={recap} />}
    </ShareSheet>
  );
}
