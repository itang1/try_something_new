import { createContext, use, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AT_HOME, customEntry, entriesForCity, isHomeSpot, withParents, type City, type CitySummary, type CustomActivity, type Entry } from '@/data/catalog';
import {
  applyCatalogAliases,
  citySummary,
  DEFAULT_CITY_ID,
  downloadCity,
  findEntryAnywhere,
  localCity,
  nearestCity,
  needsDownload,
  refreshCatalog,
} from '@/data/cities';
import type { Coordinate, DriveTimes } from '@/data/drive';
import { NO_FILTERS, type Filters } from '@/data/filters';
import { cachedDriveTimes, refreshDriveTimes } from '@/data/routing';
import {
  deleteCustomActivity,
  loadCustomActivities,
  loadDoneIds,
  loadList,
  loadPlans,
  loadVisitedPlaceIds,
  newId,
  planKey,
  readSetting,
  recordCompletion,
  recordListChange,
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
  /** That city while it downloads, when the closest city already on the device stands in for it. */
  pendingCity: CitySummary | null;
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
  /** Reads everything from storage again, after a backup is restored. */
  reload: () => void;
};

const AppStateContext = createContext<AppState | null>(null);

const MAX_RECENT = 5;

applyCatalogAliases();

function usePersistedState<T>(key: string, fallback: T) {
  const [value, setValue] = useState<T>(() => readSetting(key, fallback));
  const set = useCallback(
    (next: T) => {
      setValue(next);
      writeSetting(key, next);
    },
    [key],
  );
  const reload = useCallback(() => setValue(readSetting(key, fallback)), [key, fallback]);
  return [value, set, reload] as const;
}

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [home, setHome, reloadHome] = usePersistedState<HomeLocation | null>('homeLocation', null);
  const [trip, setTrip, reloadTrip] = usePersistedState<Trip | null>('trip', null);
  const [recentPlaces, setRecentPlaces, reloadRecentPlaces] = usePersistedState<HomeLocation[]>('recentPlaces', []);
  const [doneIds, setDoneIds] = useState(loadDoneIds);
  const [visitedPlaceIds, setVisitedPlaceIds] = useState(loadVisitedPlaceIds);
  const [saved, setSaved] = useState(() => loadList('saved'));
  const [hidden, setHidden] = useState(() => loadList('hidden'));
  const [allPlans, setAllPlans] = useState(loadPlans);
  const [customs, setCustoms] = useState(loadCustomActivities);
  const [filters, setFilters, reloadFilters] = usePersistedState<Filters>('exploreFilters', NO_FILTERS);
  const [weekendNudge, setWeekendNudge] = usePersistedState('weekendNudge', false);
  const savedIds = useMemo(() => new Set(saved), [saved]);
  const hiddenIds = useMemo(() => new Set(hidden), [hidden]);

  const [catalogVersion, setCatalogVersion] = useState(0);
  const wantedId = trip?.cityId ?? (home ? nearestCity(home).city.id : DEFAULT_CITY_ID);
  const wanted = localCity(wantedId);
  const wantedSummary = citySummary(wantedId);
  const standIn = wantedSummary && nearestCity({ latitude: wantedSummary.lat, longitude: wantedSummary.lng }, true).city.id;
  const city = wanted ?? localCity(standIn ?? DEFAULT_CITY_ID)!;
  const pendingCity = wanted ? null : (wantedSummary ?? null);
  const bump = useCallback((changed: boolean) => changed && setCatalogVersion((v) => v + 1), []);
  useEffect(() => {
    refreshCatalog().then(bump, () => {});
  }, [bump]);
  useEffect(() => {
    if (needsDownload(wantedId)) downloadCity(wantedId).then(bump, () => {});
  }, [wantedId, catalogVersion, bump]);
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
      [...entriesForCity(city), ...customs.filter((c) => c.cityId === city.id).map(customEntry)].sort((a, b) =>
        a.name.localeCompare(b.name),
      ),
    [city, customs],
  );
  const findEntry = useCallback((id: string) => entries.find((e) => e.id === id), [entries]);
  const findAnyEntry = useCallback(
    (id: string, placeId?: string | null) => {
      const found = findEntryAnywhere(id, placeId);
      if (found) return found;
      const custom = customs.find((c) => c.id === id);
      const customCity = custom && localCity(custom.cityId);
      return custom && customCity ? { entry: customEntry(custom), city: customCity } : undefined;
    },
    [customs],
  );
  const addCustom = useCallback(
    (activity: Omit<CustomActivity, 'id' | 'cityId'>) => {
      const created = { ...activity, id: `custom-${newId()}`, cityId: city.id };
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
      const plan = choice && { ...choice, placeName: places.find((p) => p.id === choice.placeId)?.name ?? (isHomeSpot(choice.placeId) ? AT_HOME : null) };
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

  // Undoing never cascades: unchecking an icon, a place or a kind of craft leaves the broader one checked off.
  const markDone = useCallback(
    (ids: string[], done: boolean, earlier?: boolean) => {
      const next = new Set(doneIds);
      for (const id of done ? withParents(ids) : ids) {
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

  const reload = useCallback(() => {
    reloadHome();
    reloadTrip();
    reloadRecentPlaces();
    setSaved(loadList('saved'));
    setHidden(loadList('hidden'));
    reloadFilters();
    setDoneIds(loadDoneIds());
    setVisitedPlaceIds(loadVisitedPlaceIds());
    setAllPlans(loadPlans());
    setCustoms(loadCustomActivities());
  }, [reloadHome, reloadTrip, reloadRecentPlaces, reloadFilters]);

  const isDone = useCallback((activityId: string) => doneIds.has(activityId), [doneIds]);

  // Saved and hidden ideas are logs, so only real changes are recorded.
  const toggleSaved = useCallback(
    (id: string) => {
      const on = !saved.includes(id);
      recordListChange('saved', id, on);
      setSaved(on ? [...saved, id] : saved.filter((s) => s !== id));
    },
    [saved],
  );
  const save = useCallback(
    (ids: string[]) => {
      const fresh = [...new Set(ids)].filter((id) => !saved.includes(id));
      for (const id of fresh) recordListChange('saved', id, true);
      if (fresh.length) setSaved([...saved, ...fresh]);
    },
    [saved],
  );
  const hide = useCallback(
    (id: string) => {
      if (hidden.includes(id)) return;
      recordListChange('hidden', id, true);
      setHidden([...hidden, id]);
    },
    [hidden],
  );
  const unhide = useCallback(
    (id: string) => {
      if (!hidden.includes(id)) return;
      recordListChange('hidden', id, false);
      setHidden(hidden.filter((h) => h !== id));
    },
    [hidden],
  );

  return (
    <AppStateContext
      value={{
        city,
        pendingCity,
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
        reload,
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
