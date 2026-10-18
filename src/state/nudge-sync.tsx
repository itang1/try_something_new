import { useEffect } from 'react';
import { inSeason } from '@/data/catalog';
import { cancelNudges, NUDGE_WEEKS, scheduleNudges } from '@/data/nudge';
import { useAppState } from '@/state/app-state';

/** Keeps the coming Thursdays' ideas in step with the list, saved ones first. */
export function NudgeSync() {
  const { entries, isDone, hiddenIds, savedIds, weekendNudge } = useAppState();

  useEffect(() => {
    if (!weekendNudge) {
      cancelNudges().catch(() => {});
      return;
    }
    const fresh = entries.filter((e) => !isDone(e.id) && !hiddenIds.has(e.id) && inSeason(e) && e.level !== 'stretch');
    const shuffled = [...fresh].sort(() => Math.random() - 0.5);
    const ideas = [...shuffled.filter((e) => savedIds.has(e.id)), ...shuffled.filter((e) => !savedIds.has(e.id))];
    scheduleNudges(ideas.slice(0, NUDGE_WEEKS)).catch(() => {});
  }, [entries, isDone, hiddenIds, savedIds, weekendNudge]);

  return null;
}
