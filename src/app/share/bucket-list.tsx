import { useMemo } from 'react';
import { BucketCard, type BucketItem } from '@/components/bucket-card';
import { ShareSheet } from '@/components/share-sheet';
import { useAppState } from '@/state/app-state';

/** The city's checklist as a poster, with what's done lit up, from the progress card. */
export default function ShareBucketListSheet() {
  const { city, entries, doneIds } = useAppState();
  // Grouped by kind, so the lit tiles read as colors, not noise.
  const items = useMemo(
    () =>
      [...entries]
        .sort((a, b) => a.subcategory.localeCompare(b.subcategory) || a.name.localeCompare(b.name))
        .map((e): BucketItem => ({ id: e.id, icon: e.icon, subcategory: e.subcategory, done: doneIds.has(e.id) })),
    [entries, doneIds],
  );
  const done = items.filter((i) => i.done).length;

  return (
    <ShareSheet
      title="Share your bucket list"
      shareTitle={`My ${city.name} bucket list`}
      description={`Poster: my ${city.name} bucket list, ${done} of ${items.length} tried`}
      hint={done ? undefined : 'Check off a few things and they light up on the poster.'}
    >
      {({ ref, shape, width }) => <BucketCard ref={ref} shape={shape} width={width} cityName={city.name} items={items} />}
    </ShareSheet>
  );
}
