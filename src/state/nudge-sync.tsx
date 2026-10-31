import { useEffect } from 'react';
import { inSeason } from '@/data/catalog';
import { cancelNudges, NUDGE_WEEKS, schedulePlanReminders, scheduleNudges } from '@/data/nudge';
import { planReminders } from '@/data/plan-reminders';
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

/** Keeps a reminder on the morning of each plan, in every city, while plan reminders are on. */
export function PlanReminderSync() {
  const { allPlans, city, findEntry, findAnyEntry, isDone, planReminders: on } = useAppState();

  useEffect(() => {
    const reminders = on
      ? planReminders(allPlans.values()).flatMap((r) => {
          if (isDone(r.plan.entryId)) return [];
          const here = r.plan.cityId === city.id;
          const entry = here ? findEntry(r.plan.entryId) : findAnyEntry(r.plan.entryId, r.plan.placeId)?.entry;
          return entry ? [{ ...r, name: entry.name, url: here ? `/activity/${entry.id}` : null }] : [];
        })
      : [];
    schedulePlanReminders(reminders).catch(() => {});
  }, [allPlans, city.id, findEntry, findAnyEntry, isDone, on]);

  return null;
}
