import { createContext, use, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  ALIASES,
  CITIES,
  cityById,
  customEntry,
  entriesForCity,
  findEntryAnywhere,
  nearestCity,
  type City,
  type CustomActivity,
  type Entry,
} from '@/data/catalog';
import type { Coordinate, DriveTimes } from '@/data/drive';
import { NO_FILTERS, type Filters } from '@/data/filters';
import { cachedDriveTimes, refreshDriveTimes } from '@/data/routing';
import {
  applyAliases,
  deleteCustomActivity,
  loadCustomActivities,
  loadDoneIds,
  loadPlans,
  loadVisitedPlaceIds,
  planKey,
  readSetting,
  recordCompletion,
  recordPlan,
  recordVisit,
  saveCustomActivity,
  writeSetting,
  type Plan,
} from '@/data/storage';

export type HomeLocation = Coordinate & { name: string };

/** Visiting another city. Drive times start from where you're staying, once it's set. */
export type Trip = { cityId: string; start: HomeLocation | null };

type AppState = {
  /** The trip's city, or else the city nearest home. */
  city: City;
  /** The city's list: its activities and icons, plus any the user added. */
  entries: Entry[];
  findEntry: (id: string) => Entry | undefined;
  /** Looks in every city, for history that may come from another one. */
  findAnyEntry: (id: string, placeId?: string | null) => { entry: Entry; city: City } | undefined;
  addCustom: (activity: Omit<CustomActivity, 'id' | 'cityId'>) => Entry;
  removeCustom: (id: string) => void;
  home: HomeLocation | null;
  trip: Trip | null;
  /** Where drive times start. */
  origin: HomeLocation | null;
  /** Real drive minutes from the origin, by place id, as far as they're known. */
  driveTimes: DriveTimes;
  /** Sets the trip's starting point during a trip, or home otherwise. Typed and picked places are remembered. */
  setLocation: (location: HomeLocation, options?: { remember?: boolean }) => void;
  startTrip: (cityId: string) => void;
  endTrip: () => void;
  recentPlaces: HomeLocation[];
  doneIds: Set<string>;
  isDone: (activityId: string) => boolean;
  /** Checking off a city icon also logs a visit to its place and checks off its activity. */
  toggleDone: (entry: Entry) => void;
  /** Sets entries done or not, with no cascading. Used to undo. */
  /** Earlier marks things done before using the app, which stay out of memories. */
  setDone: (ids: string[], done: boolean, earlier?: boolean) => void;
  visitedPlaceIds: Set<string>;
  setVisited: (placeId: string, activityId: string, visited: boolean) => void;
  /** Visiting any place also checks off the activity. */
  toggleVisited: (placeId: string, activityId: string) => void;
  savedIds: Set<string>;
  toggleSaved: (id: string) => void;
  save: (ids: string[]) => void;
  /** Marked "Not for me", so Explore stops suggesting them. */
  hiddenIds: Set<string>;
  hide: (id: string) => void;
  unhide: (id: string) => void;
  /** Whether to send one idea on Thursday evenings. Off until the person turns it on. */
  weekendNudge: boolean;
  setWeekendNudge: (on: boolean) => void;
  /** Explore's filters, kept across launches. */
  filters: Filters;
  setFilters: (filters: Filters) => void;
  /** Plans in the current city, by entry id. */
  plans: Map<string, Plan>;
  /** Pass null to clear the plan. */
  setPlan: (entryId: string, plan: Pick<Plan, 'placeId' | 'day'> | null) => void;
};

const AppStateContext = createContext<AppState | null>(null);

const MAX_RECENT = 5;

// Before anything reads stored ids, so renamed activities and places keep their history.
applyAliases(ALIASES);

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
  const [allPlans, setAllPlans] = useState(loadPlans);
  const [customs, setCustoms] = useState(loadCustomActivities);
  const [filters, setFilters] = usePersistedState<Filters>('exploreFilters', NO_FILTERS);
  const [weekendNudge, setWeekendNudge] = usePersistedState('weekendNudge', false);
  const savedIds = useMemo(() => new Set(saved), [saved]);
  const hiddenIds = useMemo(() => new Set(hidden), [hidden]);

  const city = (trip && cityById(trip.cityId)) || (home ? nearestCity(home).city : CITIES[0]);
  const origin = trip ? trip.start : home;
  const lat = origin?.latitude;
  const lng = origin?.longitude;
  const cachedTimes = useMemo<DriveTimes>(
    () => (lat != null && lng != null ? cachedDriveTimes({ latitude: lat, longitude: lng }) : new Map()),
    [lat, lng],
  );
  const timesKey = `${lat},${lng},${city.id}`;
  const [fetchedTimes, setFetchedTimes] = useState<{ key: string; times: DriveTimes } | null>(null);
  useEffect(() => {
    if (lat == null || lng == null) return;
    const controller = new AbortController();
    refreshDriveTimes({ latitude: lat, longitude: lng }, city.places, cachedTimes, controller.signal)
      .then((times) => setFetchedTimes({ key: timesKey, times }))
      .catch(() => {});
    return () => controller.abort();
  }, [lat, lng, city, cachedTimes, timesKey]);
  const driveTimes = fetchedTimes?.key === timesKey ? fetchedTimes.times : cachedTimes;
  const entries = useMemo(
    () =>
      [...entriesForCity(city.id), ...customs.filter((c) => c.cityId === city.id).map(customEntry)].sort((a, b) =>
        a.name.localeCompare(b.name),
      ),
    [city.id, customs],
  );
  const findEntry = useCallback((id: string) => entries.find((e) => e.id === id), [entries]);
  const findAnyEntry = useCallback(
    (id: string, placeId?: string | null) => {
      const found = findEntryAnywhere(id, placeId);
      if (found) return found;
      const custom = customs.find((c) => c.id === id);
      const customCity = custom && cityById(custom.cityId);
      return custom && customCity ? { entry: customEntry(custom), city: customCity } : undefined;
    },
    [customs],
  );
  const addCustom = useCallback(
    (activity: Omit<CustomActivity, 'id' | 'cityId'>) => {
      const created = { ...activity, id: `custom-${Date.now().toString(36)}`, cityId: city.id };
      saveCustomActivity(created);
      setCustoms([...customs, created]);
      return customEntry(created);
    },
    [city.id, customs],
  );
  const removeCustom = useCallback(
    (id: string) => {
      deleteCustomActivity(id);
      setCustoms(customs.filter((c) => c.id !== id));
    },
    [customs],
  );
  const plans = useMemo(
    () => new Map([...allPlans.values()].filter((p) => p.cityId === city.id).map((p) => [p.entryId, p])),
    [allPlans, city.id],
  );

  const setPlan = useCallback(
    (entryId: string, choice: Pick<Plan, 'placeId' | 'day'> | null) => {
      const places = entries.find((e) => e.id === entryId)?.places ?? [];
      const plan = choice && { ...choice, placeName: places.find((p) => p.id === choice.placeId)?.name ?? null };
      recordPlan(city.id, entryId, plan);
      const next = new Map(allPlans);
      if (plan) next.set(planKey(city.id, entryId), { entryId, cityId: city.id, ...plan });
      else next.delete(planKey(city.id, entryId));
      setAllPlans(next);
    },
    [allPlans, city.id, entries],
  );

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
    (ids: string[], done: boolean, earlier?: boolean) => {
      const next = new Set(doneIds);
      for (const id of ids) {
        if (next.has(id) === done) continue;
        recordCompletion(id, done, earlier);
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
  const save = useCallback((ids: string[]) => setSaved([...new Set([...saved, ...ids])]), [saved, setSaved]);
  const hide = useCallback((id: string) => setHidden([...new Set([...hidden, id])]), [hidden, setHidden]);
  const unhide = useCallback((id: string) => setHidden(hidden.filter((h) => h !== id)), [hidden, setHidden]);

  return (
    <AppStateContext
      value={{
        city,
        entries,
        findEntry,
        findAnyEntry,
        addCustom,
        removeCustom,
        home,
        trip,
        origin,
        driveTimes,
        setLocation,
        startTrip,
        endTrip,
        recentPlaces,
        doneIds,
        isDone,
        toggleDone,
        setDone: markDone,
        visitedPlaceIds,
        setVisited,
        toggleVisited,
        savedIds,
        toggleSaved,
        save,
        hiddenIds,
        hide,
        unhide,
        weekendNudge,
        setWeekendNudge,
        filters,
        setFilters,
        plans,
        setPlan,
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
