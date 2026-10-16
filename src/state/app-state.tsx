import { createContext, use, useCallback, useMemo, useState, type ReactNode } from 'react';
import { CITIES, cityById, nearestCity, type City } from '@/data/catalog';
import type { Coordinate } from '@/data/drive';
import { loadDoneIds, readSetting, recordCompletion, writeSetting } from '@/data/storage';

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
  toggleDone: (activityId: string) => void;
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

  const toggleDone = useCallback(
    (activityId: string) => {
      const done = !doneIds.has(activityId);
      recordCompletion(activityId, done);
      const next = new Set(doneIds);
      if (done) next.add(activityId);
      else next.delete(activityId);
      setDoneIds(next);
    },
    [doneIds],
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
