// The activities the site has a page for. Wrangler bundles the JSON at deploy time, so a new activity needs a redeploy.
import activitiesFile from '../../data/activities.json';
import aliasesFile from '../../data/aliases.json';

const ACTIVITIES = activitiesFile.activities;
const BY_ID = new Map(ACTIVITIES.map((a) => [a.id, a]));
/** @type {Record<string, string>} Old ids that now point at another activity, like korean-bbq. */
const ALIASES = aliasesFile.aliases;

export const ACTIVITY_COUNT = ACTIVITIES.length;

// Labels as the app shows them (src/theme.ts SUBCATEGORIES and src/data/catalog.ts LEVELS). White text passes AA on each color.
export const KINDS = {
  move: { label: 'Move', color: '#D04A12' },
  outdoors: { label: 'Outdoors', color: '#23804B' },
  water: { label: 'Water', color: '#1A76AE' },
  make: { label: 'Make', color: '#C2389A' },
  food: { label: 'Food & Drink', color: '#D93A4A' },
  learn: { label: 'See & Learn', color: '#0F7F70' },
  explore: { label: 'Explore', color: '#9C6B3F' },
  shows: { label: 'Shows', color: '#5B47D1' },
  play: { label: 'Play', color: '#D02A63' },
};

export const LEVELS = { easy: 'Easy', medium: 'A bit new', stretch: 'Stretch' };

export function kindOf(id) {
  return KINDS[id] ?? { label: id, color: '#6E5A5E' };
}

/** The activity with this id, or null. */
export function findActivity(id) {
  return BY_ID.get(id) ?? null;
}

/** The current id for an old one, or null when it isn't an alias of a known activity. */
export function aliasFor(id) {
  const to = Object.hasOwn(ALIASES, id) ? ALIASES[id] : null;
  return to && BY_ID.has(to) ? to : null;
}

export function isActivityId(id) {
  return BY_ID.has(id);
}
