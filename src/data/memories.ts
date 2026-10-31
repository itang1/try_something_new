import type { City, Entry } from './catalog';
import type { Memory } from './storage';

export type MemoryItem = Memory & { entry: Entry; city: City };

export type Finder = (id: string, placeId?: string | null) => { entry: Entry; city: City } | undefined;

/** Memories joined to their activity and city, without the duplicate a city icon leaves behind. */
export function memoryItems(memories: Memory[], find: Finder): MemoryItem[] {
  const items = memories.flatMap((m) => {
    const found = find(m.entryId, m.placeId);
    if (!found) return [];
    const placeName = found.city.places.find((p) => p.id === m.placeId)?.name ?? m.placeName;
    return [{ ...m, entry: found.entry, city: found.city, placeName }];
  });
  // Checking off a city icon also checks off its activity, which would show the same outing twice.
  const iconTimes = items.filter((i) => i.entry.kind === 'icon').map((i) => [i.entry.activityId, Date.parse(i.at)] as const);
  return items.filter(
    (i) =>
      i.entry.kind === 'icon' ||
      i.rating ||
      i.note ||
      i.photo ||
      !iconTimes.some(([id, t]) => id === i.entry.id && Math.abs(t - Date.parse(i.at)) < 10_000),
  );
}

/** Which thing tried in its city this was, counting from the first: the "#12" in "#12 in Seattle". */
export function triedNumber(items: MemoryItem[], item: MemoryItem): number {
  const at = Date.parse(item.at);
  return items.filter((i) => i.city.id === item.city.id && Date.parse(i.at) <= at).length;
}
