import type { Entry } from '@/data/catalog';
import { useAppState } from './app-state';
import { useToast, type UndoAction } from './toast';

/** Toggles done from a list's checkbox and offers Undo, since a stray tap there is easy. */
export function useToggleWithUndo() {
  const { doneIds, visitedPlaceIds, toggleDone } = useAppState();
  const toast = useToast();

  return (entry: Entry) => {
    const wasDone = doneIds.has(entry.id);
    const place = entry.kind === 'icon' ? entry.places[0] : undefined;
    // Undo reverses exactly what this toggle changes, including an icon's activity and place.
    const changed = wasDone
      ? [entry.id]
      : [entry.id, ...(entry.kind === 'icon' ? [entry.activityId] : [])].filter((id) => !doneIds.has(id));
    const visitChanges = place && visitedPlaceIds.has(place.id) === wasDone;
    const undo: UndoAction = {
      type: 'done',
      ids: changed,
      done: wasDone,
      visit: place && visitChanges ? { placeId: place.id, activityId: entry.activityId, visited: wasDone } : undefined,
    };
    toggleDone(entry);
    toast(wasDone ? `Unchecked ${entry.name}` : `Checked off ${entry.name}`, undo);
  };
}
