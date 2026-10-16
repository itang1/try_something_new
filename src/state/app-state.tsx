import { createContext, use, useCallback, useMemo, useState, type ReactNode } from 'react';
import { CITIES, cityById, nearestCity, type City, type Entry } from '@/data/catalog';
import type { Coordinate } from '@/data/drive';
import {
  loadDoneIds,
  loadVisitedPlaceIds,
  readSetting,
  recordCompletion,
  recordVisit,
  writeSetting,
} from '@/data/storage';

export type HomeLocation = Coordinate & { name: string };

/** Visiting another city. Drive times start from where you're staying, once it's set. */
export type Trip = { cityId: string; start: HomeLocation | null };

type AppState = {
  /** The trip's city, or else the city nearest home. */
  city: City;
  home: HomeLocation | null;
  trip: Trip | null;
  /** Where drive times start. */
  origin: HomeLocation | null;
  /** Sets the trip's starting point during a trip, or home otherwise. Typed and picked places are remembered. */
  setLocation: (location: HomeLocation, options?: { remember?: boolean }) => void;
  startTrip: (cityId: string) => void;
  endTrip: () => void;
  recentPlaces: HomeLocation[];
  doneIds: Set<string>;
  isDone: (activityId: string) => boolean;
  /** Checking off a city icon also logs a visit to its place and checks off its activity. */
  toggleDone: (entry: Entry) => void;
  visitedPlaceIds: Set<string>;
  /** Visiting any place also checks off the activity. */
  toggleVisited: (placeId: string, activityId: string) => void;
  savedIds: Set<string>;
  toggleSaved: (id: string) => void;
  /** Marked "Not for me", so Explore stops suggesting them. */
  hiddenIds: Set<string>;
  hide: (id: string) => void;
};

const AppStateContext = createContext<AppState | null>(null);

const MAX_RECENT = 5;

function usePersistedState<T>(key: string, fallback: T) {
  const [value, setValue] = useState<T>(() => readSetting(key, fallback));
  const set = useCallback(
    (next: T) => {
      setValue(next);
      writeSetting(key, next);
    },
    [key],
  );
  return [value, set] as const;
}

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [home, setHome] = usePersistedState<HomeLocation | null>('homeLocation', null);
  const [trip, setTrip] = usePersistedState<Trip | null>('trip', null);
  const [recentPlaces, setRecentPlaces] = usePersistedState<HomeLocation[]>('recentPlaces', []);
  const [doneIds, setDoneIds] = useState(loadDoneIds);
  const [visitedPlaceIds, setVisitedPlaceIds] = useState(loadVisitedPlaceIds);
  const [saved, setSaved] = usePersistedState<string[]>('savedIds', []);
  const [hidden, setHidden] = usePersistedState<string[]>('hiddenIds', []);
  const savedIds = useMemo(() => new Set(saved), [saved]);
  const hiddenIds = useMemo(() => new Set(hidden), [hidden]);

  const city = (trip && cityById(trip.cityId)) || (home ? nearestCity(home).city : CITIES[0]);
  const origin = trip ? trip.start : home;

  const setLocation = useCallback(
    (next: HomeLocation, options?: { remember?: boolean }) => {
      if (trip) setTrip({ ...trip, start: next });
      else setHome(next);
      if (options?.remember) {
        setRecentPlaces([next, ...recentPlaces.filter((p) => p.name !== next.name)].slice(0, MAX_RECENT));
      }
    },
    [trip, setTrip, setHome, recentPlaces, setRecentPlaces],
  );

  const startTrip = useCallback((cityId: string) => setTrip({ cityId, start: null }), [setTrip]);
  const endTrip = useCallback(() => setTrip(null), [setTrip]);

  // Undoing never cascades: unchecking an icon or a place leaves the activity checked off.
  const markDone = useCallback(
    (ids: string[], done: boolean) => {
      const next = new Set(doneIds);
      for (const id of ids) {
        if (next.has(id) === done) continue;
        recordCompletion(id, done);
        if (done) next.add(id);
        else next.delete(id);
      }
      setDoneIds(next);
    },
    [doneIds],
  );

  const setVisited = useCallback(
    (placeId: string, activityId: string, visited: boolean) => {
      if (visitedPlaceIds.has(placeId) === visited) return;
      recordVisit(placeId, activityId, visited);
      const next = new Set(visitedPlaceIds);
      if (visited) next.add(placeId);
      else next.delete(placeId);
      setVisitedPlaceIds(next);
    },
    [visitedPlaceIds],
  );

  const toggleDone = useCallback(
    (entry: Entry) => {
      const done = !doneIds.has(entry.id);
      if (entry.kind === 'icon') {
        markDone(done ? [entry.id, entry.activityId] : [entry.id], done);
        setVisited(entry.places[0].id, entry.activityId, done);
      } else {
        markDone([entry.id], done);
      }
    },
    [doneIds, markDone, setVisited],
  );

  const toggleVisited = useCallback(
    (placeId: string, activityId: string) => {
      const visited = !visitedPlaceIds.has(placeId);
      setVisited(placeId, activityId, visited);
      if (visited) markDone([activityId], true);
    },
    [visitedPlaceIds, setVisited, markDone],
  );

  const isDone = useCallback((activityId: string) => doneIds.has(activityId), [doneIds]);

  const toggleSaved = useCallback(
    (id: string) => setSaved(saved.includes(id) ? saved.filter((s) => s !== id) : [...saved, id]),
    [saved, setSaved],
  );
  const hide = useCallback((id: string) => setHidden([...new Set([...hidden, id])]), [hidden, setHidden]);

  return (
    <AppStateContext
      value={{
        city,
        home,
        trip,
        origin,
        setLocation,
        startTrip,
        endTrip,
        recentPlaces,
        doneIds,
        isDone,
        toggleDone,
        visitedPlaceIds,
        toggleVisited,
        savedIds,
        toggleSaved,
        hiddenIds,
        hide,
      }}
    >
      {children}
    </AppStateContext>
  );
}

export function useAppState(): AppState {
  const state = use(AppStateContext);
  if (!state) throw new Error('useAppState must be used inside AppStateProvider');
  return state;
}
