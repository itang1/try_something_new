import activitiesFile from '../../data/activities.json';
import iconMapping from '../../design/icon-mapping.json';
import aliasesFile from '../../data/aliases.json';
import { ICON_PATHS, type IconName } from '@/icons/paths';
import { subcategory } from '@/theme';
import { COST_LEVEL, DURATION_MINUTES, type Cost, type Duration, type Kind, type Level, type Setting } from './vocab';

export { COSTS, DURATIONS, type Cost, type Duration, type Kind, type Level, type Setting } from './vocab';

export type Place = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  activities: string[];
  duration?: Duration;
  cost?: Cost;
};

/** Something to try, like archery or an art museum. It's done once, at any of its places or in one of its other ways. */
export type Activity = {
  id: string;
  name: string;
  subcategory: Kind;
  duration: Duration;
  cost: Cost;
  level: Level;
  setting?: Setting;
  /** Better with friends or a group than alone. */
  together?: boolean;
  /** Works for families with children. */
  kids?: boolean;
  /** Its season in the northern hemisphere, as months 1 to 12. */
  months?: number[];
  /** Needs warm weather, so it follows the city's warm months. */
  warm?: boolean;
  /** Only happens where winters are cold, like fall colors, so it's left out of cities warm all year. */
  needsWinter?: boolean;
  /** A broader activity this is one kind of, like origami under "Try a new craft". */
  parent?: string;
} & Ways;

/** Ways to do an activity without one of its places: what you'd need at home, how to host it, or a maps search. */
export type Ways = { home?: string; host?: string; search?: string };

export const LEVELS: Record<Level, { label: string; icon: IconName; rank: number }> = {
  easy: { label: 'Easy', icon: 'eco', rank: 0 },
  medium: { label: 'A bit new', icon: 'trending_up', rank: 1 },
  stretch: { label: 'Stretch', icon: 'bolt', rank: 2 },
};

/** A city's must-do, tied to one place. Doing it also counts toward its activity, and takes the activity's kind, duration, cost and level unless set. */
export type CityIcon = Pick<Activity, 'id' | 'name'> &
  Partial<Pick<Activity, 'subcategory' | 'duration' | 'cost' | 'level'>> & {
    place: string;
    activity: string;
    /** A Material Symbol of its own. Missing, or not in this build of the app, means the activity's. */
    glyph?: string;
  };

/** A city as the catalog index lists it, before its places are downloaded. */
export type CitySummary = {
  id: string;
  name: string;
  /** A state or province, where the country uses them in place names. */
  region?: string;
  /** ISO 3166 alpha-2 code. */
  country: string;
  lat: number;
  lng: number;
  /** Changes whenever the city's file does. Bundled cities have none until the index is downloaded. */
  hash?: string;
};

export type City = Omit<CitySummary, 'hash'> & {
  /** Months warm enough for beaches and boats. Missing means all year. */
  warmMonths?: number[];
  icons: CityIcon[];
  places: Place[];
  /** Old place ids mapped to the ids that replaced them, so visits and plans survive a re-import. */
  aliases?: Record<string, string>;
};

/** Like "Columbus, OH" or "Kyoto, JP". */
export function cityLabel(city: CitySummary): string {
  return `${city.name}, ${city.region ?? city.country}`;
}

/** A row in a city's list: an activity with its places there, or a city icon. */
export type Entry = {
  id: string;
  kind: 'activity' | 'icon';
  name: string;
  icon: IconName;
  subcategory: Kind;
  duration: Duration;
  cost: Cost;
  durationMinutes: number;
  costLevel: number;
  level: Level;
  setting?: Setting;
  together?: boolean;
  kids?: boolean;
  activityId: string;
  places: Place[];
  /** Added by the user, so it has no places and can be deleted. */
  custom: boolean;
  /** Months it's in season in this city, in order. Missing means all year. */
  months?: number[];
  /** The broader activity this is one kind of. */
  parent?: string;
} & Ways;

/** Something the user added to a city's list themselves. */
export type CustomActivity = { id: string; cityId: string; name: string; subcategory: Kind; duration: Duration; cost: Cost };

/** Old ids mapped to the ids that replaced them, following chains, so stored history survives renames and merges. */
export function resolveAliases(table: Record<string, string>): Record<string, string> {
  return Object.fromEntries(
    Object.keys(table).map((from) => {
      let to = table[from];
      for (let hops = 0; table[to] && hops < 10; hops++) to = table[to];
      return [from, to];
    }),
  );
}

export const ACTIVITY_ALIASES = resolveAliases(aliasesFile.aliases as Record<string, string>);

const ACTIVITIES = new Map((activitiesFile.activities as Activity[]).map((a) => [a.id, a]));
/** Ids to check off along with these: doing origami also counts as trying a new craft. */
export function withParents(ids: string[]): string[] {
  const parents = ids.map((id) => ACTIVITIES.get(id)?.parent).filter((p): p is string => !!p);
  return [...new Set([...ids, ...parents])];
}

const icons = iconMapping as Record<string, { material: string }>;

function seasonIn(city: City, a: Activity): number[] | undefined {
  // The southern hemisphere's seasons run six months off.
  if (a.months) return city.lat < 0 ? a.months.map((m) => ((m + 5) % 12) + 1) : a.months;
  if (a.warm) return city.warmMonths;
}

function glyphFor(own: Activity | CityIcon, activityId: string): IconName {
  const glyph = 'glyph' in own ? own.glyph : undefined;
  return (glyph && glyph in ICON_PATHS ? glyph : icons[activityId].material) as IconName;
}

function entry(own: Activity | CityIcon, kind: Entry['kind'], activityId: string, places: Place[], months?: number[]): Entry {
  const base = { ...ACTIVITIES.get(activityId)!, ...own };
  return {
    id: base.id,
    kind,
    name: base.name,
    icon: glyphFor(own, activityId),
    subcategory: base.subcategory,
    duration: base.duration,
    cost: base.cost,
    durationMinutes: DURATION_MINUTES[base.duration],
    costLevel: COST_LEVEL[base.cost],
    level: base.level,
    setting: base.setting,
    together: base.together,
    kids: base.kids,
    activityId,
    places,
    custom: false,
    months,
    ...(kind === 'activity' && { home: base.home, host: base.host, search: base.search, parent: base.parent }),
  };
}

export function customEntry(c: CustomActivity): Entry {
  return {
    id: c.id,
    kind: 'activity',
    name: c.name,
    icon: subcategory(c.subcategory).icon,
    subcategory: c.subcategory,
    duration: c.duration,
    cost: c.cost,
    durationMinutes: DURATION_MINUTES[c.duration] ?? 0,
    costLevel: COST_LEVEL[c.cost] ?? 0,
    level: 'medium',
    activityId: c.id,
    places: [],
    custom: true,
  };
}

function buildEntries(city: City): Entry[] {
  const placesByActivity = new Map<string, Place[]>();
  for (const p of city.places) {
    for (const id of p.activities) {
      const list = placesByActivity.get(id);
      if (list) list.push(p);
      else placesByActivity.set(id, [p]);
    }
  }
  const placeById = new Map(city.places.map((p) => [p.id, p]));
  const activities = [...ACTIVITIES.values()]
    // Activities that need no venue show up in every city.
    .filter((a) => placesByActivity.has(a.id) || a.home || a.host || a.search)
    .filter((a) => !a.needsWinter || city.warmMonths)
    .map((a) => entry(a, 'activity', a.id, placesByActivity.get(a.id) ?? [], seasonIn(city, a)));
  // A city file newer than the app can name an activity this build doesn't have yet.
  const cityIcons = city.icons
    .filter((i) => ACTIVITIES.has(i.activity) && placeById.has(i.place))
    .map((i) => entry(i, 'icon', i.activity, [placeById.get(i.place)!]));
  return [...activities, ...cityIcons].sort((a, b) => a.name.localeCompare(b.name));
}

// Keyed by the city object, so a downloaded update gets fresh entries.
const ENTRIES = new WeakMap<City, Entry[]>();

export function entriesForCity(city: City): Entry[] {
  let entries = ENTRIES.get(city);
  if (!entries) {
    entries = buildEntries(city);
    ENTRIES.set(city, entries);
  }
  return entries;
}

export function findEntry(city: City, id: string): Entry | undefined {
  return entriesForCity(city).find((e) => e.id === id);
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function inSeason(entry: Entry, date = new Date()): boolean {
  return !entry.months || entry.months.includes(date.getMonth() + 1);
}

/** Like "Dec to Mar". */
export function seasonLabel(months: number[]): string {
  return `${MONTHS[months[0] - 1]} to ${MONTHS[months[months.length - 1] - 1]}`;
}

export const AT_HOME = 'At home';

/** Doing an activity at home is logged like a visit to a place of its own, so it checks off and can be planned like one. */
export function homeSpotId(activityId: string): string {
  return `home:${activityId}`;
}

export function isHomeSpot(id: string | null | undefined): boolean {
  return !!id?.startsWith('home:');
}

export type Spot = { id: string; name: string };

/** What to pick from when planning or looking back: home first when it can be done there, then its places. */
export function spotsFor(entry: Entry, places: Place[]): Spot[] {
  const home = entry.kind === 'activity' && entry.home ? [{ id: homeSpotId(entry.activityId), name: AT_HOME }] : [];
  return [...home, ...places.map((p) => ({ id: p.id, name: p.name }))];
}

/** The specific activities under a broad one, like origami and tie-dye under "Try a new craft". */
export function kindsOf(entries: Entry[], entry: Entry): Entry[] {
  return entries.filter((e) => e.parent === entry.id);
}

/** Like "origami, tie-dye, or embroidery". */
export function listOr(names: string[]): string {
  if (names.length < 3) return names.join(' or ');
  return `${names.slice(0, -1).join(', ')}, or ${names[names.length - 1]}`;
}

export function placeNames(entry: Entry): string {
  return entry.places.map((p) => p.name).join(', ');
}

/** The row's second line: an icon names the activity it counts toward, an activity lists its places. */
export function entryHint(entry: Entry): string {
  if (entry.custom) return 'Added by you';
  if (entry.kind === 'icon') return `Counts toward: ${ACTIVITIES.get(entry.activityId)?.name ?? 'an activity'}`;
  return placeNames(entry) || otherWays(entry)[0]?.title || '';
}

export type Way = { kind: keyof Ways; icon: IconName; title: string; detail: string };

/** The ways to do an entry besides going to one of its places, in the order the card offers them. */
export function otherWays(entry: Entry): Way[] {
  const ways: (Way | false)[] = [
    !!entry.search && { kind: 'search', icon: 'search', title: 'Find one near you', detail: `Search maps for “${entry.search}”` },
    !!entry.home && { kind: 'home', icon: 'cottage', title: 'Try it at home', detail: entry.home },
    !!entry.host && { kind: 'host', icon: 'groups', title: 'Host friends', detail: entry.host },
  ];
  return ways.filter((w): w is Way => !!w);
}
