import { useEffect } from 'react';
import { addDays, dayKey } from '@/data/days';
import { useAppState } from '@/state/app-state';
import { subcategory } from '@/theme';
import IdeaWidget, { type IdeaProps } from '@/widgets/idea-widget';

const DAYS = 7;

function seeded(seed: string) {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    return ((h >>> 0) % 1_000_000) / 1_000_000;
  };
}

/** Keeps the home screen widget's week of daily ideas in step with the list. */
export function WidgetSync() {
  const { city, entries, isDone, hiddenIds } = useAppState();

  useEffect(() => {
    if (process.env.EXPO_OS !== 'ios') return;
    const fresh = entries.filter((e) => !isDone(e.id) && !hiddenIds.has(e.id));
    const warmingUp = entries.filter((e) => isDone(e.id)).length < 3;
    const gentle = warmingUp ? fresh.filter((e) => e.level !== 'stretch') : fresh;
    const pool = gentle.length ? gentle : fresh;
    // Seeded by the day, so reopening the app doesn't reshuffle today's idea.
    const random = seeded(`${city.id}:${dayKey(new Date())}`);
    const picks = pool
      .map((e) => ({ e, r: random() }))
      .sort((a, b) => a.r - b.r)
      .slice(0, DAYS)
      .map(({ e }) => e);

    const now = new Date();
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const timelineEntry = (props: IdeaProps, i: number) => ({ date: i === 0 ? now : addDays(midnight, i), props });
    try {
      if (!picks.length) {
        IdeaWidget.updateSnapshot({
          id: '',
          name: `You've tried everything in ${city.name}!`,
          meta: 'Add your own ideas in the app',
          city: city.name,
          colors: ['#34C759', '#30B0C7'],
        });
        return;
      }
      IdeaWidget.updateTimeline(
        picks.map((e, i) => {
          const sub = subcategory(e.subcategory);
          return timelineEntry(
            { id: e.id, name: e.name, meta: `${sub.label} · ${e.duration}`, city: city.name, colors: [...sub.gradient] },
            i,
          );
        }),
      );
    } catch {
      // Widgets are optional, so a missing extension shouldn't break the app.
    }
  }, [city, entries, isDone, hiddenIds]);

  return null;
}
