import { useMemo } from 'react';
import { RecapCard } from '@/components/recap-card';
import { ShareSheet } from '@/components/share-sheet';
import { memoryItems } from '@/data/memories';
import { lastMonthRecap } from '@/data/milestones';
import { loadMemories } from '@/data/storage';
import { useAppState } from '@/state/app-state';

/** Last month in review as a shareable card, from the recap on Memories. */
export default function ShareRecapSheet() {
  const { findAnyEntry } = useAppState();
  const recap = useMemo(() => lastMonthRecap(memoryItems(loadMemories(), findAnyEntry)), [findAnyEntry]);
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
