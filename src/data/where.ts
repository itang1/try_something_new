import { AT_HOME, homeSpotId, type Entry, type Place } from '@/data/catalog';
import { formatMinutes } from '@/data/drive';

/** One way to do an idea, as the Explore card offers it: at home, at a place, a maps search for one, or hosting friends. */
export type WhereOption =
  | { kind: 'home'; id: string; title: string; detail: string }
  | { kind: 'place'; id: string; title: string; detail: string | null; place: Place }
  | { kind: 'search'; id: 'search'; title: string; detail: string }
  | { kind: 'host'; id: 'host'; title: string; detail: string };

/** How many places the card lists before pointing to the full sheet. */
export const CARD_PLACES = 4;

/**
 * The card's choices for where to do an entry, in the activity sheet's order: home, the closest places, a maps search, then hosting friends.
 * `selectedId` keeps a farther place in the list if it was picked elsewhere.
 */
export function whereOptions(
  entry: Entry,
  places: { place: Place; minutes: number | null }[],
  selectedId?: string | null,
): WhereOption[] {
  const shown = places.slice(0, CARD_PLACES);
  const extra = selectedId && places.find((p, i) => i >= CARD_PLACES && p.place.id === selectedId);
  if (extra) shown.push(extra);
  return [
    ...(entry.kind === 'activity' && entry.home
      ? [{ kind: 'home' as const, id: homeSpotId(entry.activityId), title: AT_HOME, detail: entry.home }]
      : []),
    ...shown.map(({ place, minutes }) => ({
      kind: 'place' as const,
      id: place.id,
      title: place.name,
      detail: minutes != null ? `${formatMinutes(minutes)} away` : null,
      place,
    })),
    ...(entry.search
      ? [{ kind: 'search' as const, id: 'search' as const, title: 'Find one near you', detail: `Search maps for “${entry.search}”` }]
      : []),
    ...(entry.host ? [{ kind: 'host' as const, id: 'host' as const, title: 'Host friends', detail: entry.host }] : []),
  ];
}

/** What the card shows before anyone changes it: home when staying in, otherwise the closest place, a search, home, or hosting. */
export function defaultWhere(options: WhereOption[], stayIn: boolean): WhereOption | undefined {
  const of = (kind: WhereOption['kind']) => options.find((o) => o.kind === kind);
  return (stayIn && of('home')) || of('place') || of('search') || of('home') || of('host');
}

/**
 * Where a plan started from the card begins: the place or home it shows. Hosting happens at home when the entry
 * can be done there; a search or a host-only idea leaves the plan to pick.
 */
export function planSpot(option: WhereOption | undefined, options: WhereOption[]): string | null {
  if (!option || option.kind === 'search') return null;
  if (option.kind === 'host') return options.find((o) => o.kind === 'home')?.id ?? null;
  return option.id;
}
