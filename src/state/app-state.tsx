import { createContext, use, useCallback, useState, type ReactNode } from 'react';
import { CITIES } from '@/data/catalog';
import type { Coordinate } from '@/data/drive';
import { loadDoneIds, readSetting, recordCompletion, writeSetting } from '@/data/storage';

export type HomeLocation = Coordinate & { name: string };

type AppState = {
  city: string;
  setCity: (city: string) => void;
  location: HomeLocation | null;
  /** `remember` adds the place to recent addresses, as typed and picked addresses do. */
  setLocation: (location: HomeLocation, options?: { remember?: boolean }) => void;
  recentAddresses: string[];
  doneIds: Set<string>;
  isDone: (activityId: string) => boolean;
  toggleDone: (activityId: string) => void;
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
  const [city, setCity] = usePersistedState('selectedCity', CITIES[0].name);
  const [location, saveLocation] = usePersistedState<HomeLocation | null>('homeLocation', null);
  const [recentAddresses, setRecentAddresses] = usePersistedState<string[]>('recentAddresses', []);
  const [doneIds, setDoneIds] = useState(loadDoneIds);

  const setLocation = useCallback(
    (next: HomeLocation, options?: { remember?: boolean }) => {
      saveLocation(next);
      if (options?.remember) {
        setRecentAddresses([next.name, ...recentAddresses.filter((a) => a !== next.name)].slice(0, MAX_RECENT));
      }
    },
    [saveLocation, recentAddresses, setRecentAddresses],
  );

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

  return (
    <AppStateContext
      value={{ city, setCity, location, setLocation, recentAddresses, doneIds, isDone, toggleDone }}
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
