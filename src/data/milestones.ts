// Gentle milestones for Memories: counts that only go up, never streaks, so a quiet month costs nothing.
import { isHomeSpot } from './catalog';
import type { MemoryItem } from './memories';
import { KINDS } from './vocab';
import type { IconName } from '@/icons/paths';

export type Milestone = { id: string; title: string; detail: string; icon: IconName; earned: boolean; progress: number; goal: number };

type Facts = { tried: number; kinds: number; loved: number; cities: number; atHome: number; withPhotos: number };

function factsOf(items: Pick<MemoryItem, 'entry' | 'city' | 'rating' | 'placeId' | 'photo'>[]): Facts {
  return {
    tried: items.length,
    kinds: new Set(items.map((i) => i.entry.subcategory)).size,
    loved: items.filter((i) => i.rating === 'loved').length,
    cities: new Set(items.map((i) => i.city.id)).size,
    atHome: items.filter((i) => isHomeSpot(i.placeId)).length,
    withPhotos: items.filter((i) => i.photo).length,
  };
}

const DEFINITIONS: { id: string; title: string; detail: string; icon: IconName; goal: number; fact: keyof Facts }[] = [
  { id: 'first', title: 'First try', detail: 'Tried your first new thing', icon: 'check_circle', goal: 1, fact: 'tried' },
  { id: 'five', title: 'Five new things', detail: 'Tried 5 new things', icon: 'trending_up', goal: 5, fact: 'tried' },
  { id: 'ten', title: 'Ten new things', detail: 'Tried 10 new things', icon: 'trending_up', goal: 10, fact: 'tried' },
  { id: 'twenty-five', title: 'Twenty-five', detail: 'Tried 25 new things', icon: 'trophy', goal: 25, fact: 'tried' },
  { id: 'fifty', title: 'Fifty', detail: 'Tried 50 new things', icon: 'trophy', goal: 50, fact: 'tried' },
  { id: 'all-kinds', title: 'Every kind', detail: `Tried something from all ${KINDS.length} kinds`, icon: 'grid_view', goal: KINDS.length, fact: 'kinds' },
  { id: 'loved-five', title: 'Five favorites', detail: 'Loved 5 things you tried', icon: 'favorite', goal: 5, fact: 'loved' },
  { id: 'home', title: 'Homebody', detail: 'Tried 3 things at home', icon: 'cottage', goal: 3, fact: 'atHome' },
  { id: 'photos', title: 'Keepsakes', detail: 'Kept photos of 5 memories', icon: 'photo_camera', goal: 5, fact: 'withPhotos' },
  { id: 'cities', title: 'Out of town', detail: 'Tried something in 2 cities', icon: 'flight', goal: 2, fact: 'cities' },
];

/** Every milestone with how far along it is. */
export function milestones(items: Parameters<typeof factsOf>[0]): Milestone[] {
  const facts = factsOf(items);
  return DEFINITIONS.map(({ fact, goal, ...d }) => ({ ...d, goal, progress: Math.min(goal, facts[fact]), earned: facts[fact] >= goal }));
}

/** What to show: the earned ones, then the closest one not reached yet. */
export function milestonesToShow(all: Milestone[]): { earned: Milestone[]; next: Milestone | undefined } {
  const earned = all.filter((m) => m.earned);
  // Closest by share done, ties in list order. Another city isn't something to aim for from home, so it's never "next".
  const next = all
    .filter((m) => !m.earned && m.id !== 'cities')
    .sort((a, b) => b.progress / b.goal - a.progress / a.goal)[0];
  return { earned, next };
}

export type MonthRecap = {
  label: string;
  tried: number;
  kinds: number;
  loved: number;
  favorite?: string;
  /** What was tried, in order, for the recap card. */
  picks: { id: string; name: string; icon: IconName; subcategory: string; loved: boolean }[];
};

/** Last month in review, shown in the first week of the next one. Null otherwise, or when nothing was tried. */
export function lastMonthRecap(items: Pick<MemoryItem, 'at' | 'entry' | 'rating'>[], now = new Date()): MonthRecap | null {
  if (now.getDate() > 7) return null;
  const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const end = new Date(now.getFullYear(), now.getMonth(), 1);
  const month = items.filter((i) => {
    const t = new Date(i.at);
    return t >= start && t < end;
  });
  if (!month.length) return null;
  return {
    label: start.toLocaleDateString('en-US', { month: 'long' }),
    tried: month.length,
    kinds: new Set(month.map((i) => i.entry.subcategory)).size,
    loved: month.filter((i) => i.rating === 'loved').length,
    favorite: month.find((i) => i.rating === 'loved')?.entry.name,
    picks: [...month]
      .sort((a, b) => a.at.localeCompare(b.at))
      .map((i) => ({ id: i.entry.id, name: i.entry.name, icon: i.entry.icon, subcategory: i.entry.subcategory, loved: i.rating === 'loved' })),
  };
}
