// One set of "what to show" choices, shared by the Checklist and the Map so both read the same way.
export const STATUSES = ['All', 'Not done', 'Done', 'Saved'] as const;
export type Status = (typeof STATUSES)[number];

/**
 * Whether a group of entries (one row, or every entry at a map pin) passes the status filter.
 * A pin counts as done only once everything there is done, and as saved if anything there is saved.
 */
export function matchesStatus(ids: string[], status: Status, doneIds: Set<string>, savedIds: Set<string>): boolean {
  switch (status) {
    case 'All':
      return true;
    case 'Saved':
      return ids.some((id) => savedIds.has(id));
    case 'Done':
      return ids.length > 0 && ids.every((id) => doneIds.has(id));
    case 'Not done':
      return ids.some((id) => !doneIds.has(id));
  }
}
