import type { Entry } from './catalog';
import type { IconName } from '@/icons/paths';

/** A themed set of ideas, built from tags the catalog already has. */
export type CollectionId = 'date' | 'rainy' | 'cheap' | 'kids' | 'free';

export type Collection = { id: CollectionId; label: string; icon: IconName; hint: string };

/**
 * Activities that make a good date: something two people can do and talk over, out or at home. The catalog has no date
 * tag, so this is a hand-picked list by activity id. City icons count through their activity.
 */
export const DATE_IDEAS = new Set([
  'afternoon-tea',
  'apple-picking',
  'arcade',
  'art-museum',
  'axe-throwing',
  'beach-day',
  'board-game-cafe',
  'bookstore',
  'botanical-garden',
  'bowling',
  'brewery-tasting',
  'candle-making',
  'cave-tour',
  'coffee-roaster',
  'cooking-class',
  'dance-class',
  'dim-sum',
  'drive-in-movie',
  'escape-room',
  'flea-market',
  'food-market',
  'food-tour',
  'glassblowing',
  'hike-a-trail',
  'holiday-lights',
  'horseback-riding',
  'hot-pot',
  'ice-skating',
  'island-ferry',
  'jewelry-making',
  'karaoke',
  'kayaking',
  'live-music',
  'live-show',
  'make-dumplings',
  'make-pasta',
  'mini-golf',
  'neighborhood',
  'new-cuisine',
  'open-mic',
  'paddleboarding',
  'paint-your-own-pottery',
  'pottery-class',
  'rock-climbing',
  'roll-sushi',
  'roller-skating',
  'sailing-lesson',
  'sauna',
  'science-history-museum',
  'stand-up-comedy',
  'stargazing',
  'sunrise',
  'terrarium',
  'trivia-night',
  'waterfall-hike',
  'zoo-aquarium',
]);

export const COLLECTIONS: Collection[] = [
  { id: 'date', label: 'Date ideas', icon: 'favorite', hint: 'Things for two, out or at home' },
  { id: 'rainy', label: 'Rainy day', icon: 'rainy', hint: 'Indoors, or a version to do at home' },
  { id: 'cheap', label: 'Under $20', icon: 'payments', hint: 'Free or about $20 a person' },
  { id: 'kids', label: 'With kids', icon: 'family_restroom', hint: 'Good for children too' },
  { id: 'free', label: 'Free this weekend', icon: 'celebration', hint: 'Costs nothing' },
];

export function collection(id: CollectionId): Collection | undefined {
  return COLLECTIONS.find((c) => c.id === id);
}

export function inCollection(entry: Entry, id: CollectionId): boolean {
  switch (id) {
    case 'date':
      return DATE_IDEAS.has(entry.activityId);
    case 'rainy':
      // No setting means it works either way, so it can be done inside.
      return entry.setting !== 'outdoor' || !!entry.home || !!entry.host;
    case 'cheap':
      return entry.costLevel <= 1;
    case 'kids':
      return !!entry.kids;
    case 'free':
      return entry.costLevel === 0;
    default:
      return true;
  }
}
