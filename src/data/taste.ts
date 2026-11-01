// Learns from ratings, all on the phone: "Loved it" makes that kind and level come up more, "Not for me" less. Ideas are
// never ruled out, only weighted, so a bad evening at one pottery class doesn't hide every craft.
import type { Entry, Kind, Level } from './catalog';
import type { Rating } from './storage';

export type Taste = { kinds: Partial<Record<Kind, number>>; levels: Partial<Record<Level, number>> };

export type Rated = { subcategory: Kind; level: Level; rating: Rating };

const POINTS: Record<Rating, number> = { loved: 1, fine: 0.25, 'not-for-me': -1 };
/** Hiding an idea with "Not for me" on the card says less than rating something you tried. */
const HIDDEN = -0.3;

export function learnTaste(rated: Rated[], hidden: Pick<Entry, 'subcategory' | 'level'>[] = []): Taste {
  const taste: Taste = { kinds: {}, levels: {} };
  const add = (kind: Kind, level: Level, points: number) => {
    taste.kinds[kind] = (taste.kinds[kind] ?? 0) + points;
    taste.levels[level] = (taste.levels[level] ?? 0) + points / 2;
  };
  for (const r of rated) add(r.subcategory, r.level, POINTS[r.rating]);
  for (const h of hidden) add(h.subcategory, h.level, HIDDEN);
  return taste;
}

/** How likely an entry is to be picked against an unrated one: from a third as likely to three times. */
export function tasteWeight(entry: Pick<Entry, 'subcategory' | 'level'>, taste: Taste): number {
  const score = (taste.kinds[entry.subcategory] ?? 0) + (taste.levels[entry.level] ?? 0);
  return Math.min(3, Math.max(1 / 3, Math.exp(score * 0.4)));
}

/** A random pick where each item's chance follows its weight. */
export function weightedPick<T>(items: T[], weight: (item: T) => number, random = Math.random): T {
  const weights = items.map(weight);
  let left = random() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < items.length; i++) {
    left -= weights[i];
    if (left < 0) return items[i];
  }
  return items[items.length - 1];
}
