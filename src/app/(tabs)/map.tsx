import { useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, type Region } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, { SlideInDown, SlideOutDown } from 'react-native-reanimated';
import type { Entry, Place } from '@/data/catalog';
import { nearestCity } from '@/data/cities';
import { placeSources } from '@/data/credits';
import { buildIndex, featuresInRegion, zoomToDelta } from '@/data/clusters';
import { openDirections } from '@/data/directions';
import { formatMinutes, haversineKm, minutesTo } from '@/data/drive';
import { useAppState } from '@/state/app-state';
import { readable, subcategory, useColors } from '@/theme';
import { GradientIcon, Icon } from '@/components/icon';
import { LocationControl } from '@/components/location-control';
import { ClusterPin, PlacePin } from '@/components/map-pins';

// Farther than this from the city, the map opens on the city instead of on you.
const NEAR_KM = 150;

type PinPlace = Place & { entries: Entry[] };

export default function MapScreen() {
  const colors = useColors();
  const router = useRouter();
  const { city, entries, origin, driveTimes, doneIds } = useAppState();
  const mapRef = useRef<MapView>(null);
  const [notDoneOnly, setNotDoneOnly] = useState(false);
  // Selection remembers its city, so switching cities clears it without an effect.
  const [selection, setSelection] = useState<{ city: string; placeId: string } | null>(null);

  const start = origin && nearestCity(origin).city.id === city.id && haversineKm(origin, city.lat, city.lng) < NEAR_KM
    ? origin
    : { latitude: city.lat, longitude: city.lng };
  const initialRegion = { ...start, latitudeDelta: 0.35, longitudeDelta: 0.35 };
  const [region, setRegion] = useState<Region>(initialRegion);

  const places = useMemo(() => {
    const byPlace = new Map<string, Entry[]>();
    // Icons first, so a must-do sets the pin's look.
    for (const e of [...entries].sort((a, b) => (a.kind === b.kind ? 0 : a.kind === 'icon' ? -1 : 1))) {
      for (const p of e.places) byPlace.set(p.id, [...(byPlace.get(p.id) ?? []), e]);
    }
    return city.places.map((p): PinPlace => ({ ...p, entries: byPlace.get(p.id) ?? [] }));
  }, [city, entries]);

  const isPlaceDone = (p: PinPlace) => p.entries.length > 0 && p.entries.every((e) => doneIds.has(e.id));
  const shown = useMemo(
    () =>
      notDoneOnly ? places.filter((p) => !(p.entries.length > 0 && p.entries.every((e) => doneIds.has(e.id)))) : places,
    [notDoneOnly, places, doneIds],
  );
  const byId = useMemo(() => new Map(places.map((p) => [p.id, p])), [places]);
  const sources = useMemo(() => placeSources(city.places), [city]);
  const index = useMemo(() => buildIndex(shown), [shown]);
  const features = featuresInRegion(index, region);
  const selected = selection?.city === city.id ? byId.get(selection.placeId) : undefined;

  const select = (p: PinPlace) => {
    setSelection({ city: city.id, placeId: p.id });
    // Aim a little south of the pin so the card doesn't cover it.
    const delta = Math.min(region.latitudeDelta, 0.12);
    mapRef.current?.animateToRegion(
      { latitude: p.lat - delta * 0.18, longitude: p.lng, latitudeDelta: delta, longitudeDelta: delta },
      350,
    );
  };

  return (
    <View style={styles.screen}>
      <MapView
        key={city.id}
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={initialRegion}
        onRegionChangeComplete={setRegion}
        onPress={(e) => {
          if (e.nativeEvent.action !== 'marker-press') setSelection(null);
        }}
        showsPointsOfInterests={false}
        showsCompass={false}
        toolbarEnabled={false}
      >
        {features.map((f) => {
          const [lng, lat] = f.geometry.coordinates;
          if ('cluster' in f.properties && f.properties.cluster) {
            const id = f.properties.cluster_id;
            return (
              <ClusterPin
                key={`c${id}`}
                latitude={lat}
                longitude={lng}
                count={f.properties.point_count}
                color={colors.accent}
                onPress={() => {
                  const zoom = Math.min(index.getClusterExpansionZoom(id), 16);
                  const delta = zoomToDelta(zoom);
                  mapRef.current?.animateToRegion(
                    { latitude: lat, longitude: lng, latitudeDelta: delta, longitudeDelta: delta },
                    350,
                  );
                }}
              />
            );
          }
          const place = byId.get((f.properties as { placeId: string }).placeId);
          const lead = place?.entries[0];
          if (!place || !lead) return null;
          const isSelected = place.id === selected?.id;
          return (
            <PlacePin
              key={`${place.id}${isSelected ? '-s' : ''}`}
              latitude={lat}
              longitude={lng}
              icon={lead.icon}
              subcategoryId={lead.subcategory}
              done={isPlaceDone(place)}
              selected={isSelected}
              label={isPlaceDone(place) ? `${place.name}, done` : place.name}
              onPress={() => select(place)}
            />
          );
        })}
        {origin && (
          <Marker coordinate={origin} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges={false}>
            <View style={[styles.origin, { backgroundColor: colors.blue }]} />
          </Marker>
        )}
      </MapView>

      <SafeAreaView edges={['top']} style={styles.top} pointerEvents="box-none">
        <View style={[styles.control, { backgroundColor: colors.card }]}>
          <LocationControl />
        </View>
        <Pressable
          onPress={() => setNotDoneOnly(!notDoneOnly)}
          accessibilityRole="switch"
          accessibilityState={{ checked: notDoneOnly }}
          style={[
            styles.chip,
            { backgroundColor: notDoneOnly ? colors.accent : colors.card },
          ]}
        >
          <Text style={[styles.chipText, { color: notDoneOnly ? 'white' : colors.label }]}>Not done</Text>
        </Pressable>
      </SafeAreaView>

      <SafeAreaView edges={['bottom']} style={styles.bottom} pointerEvents="box-none">
        {selected && (
          <Animated.View
            key={selected.id}
            entering={SlideInDown.springify().damping(18)}
            exiting={SlideOutDown.duration(180)}
            style={[styles.card, { backgroundColor: colors.card }]}
          >
            <PlaceCard
              place={selected}
              minutes={origin ? minutesTo(selected, origin, driveTimes) : null}
              doneIds={doneIds}
              onOpen={(id) => router.push(`/activity/${id}`)}
            />
          </Animated.View>
        )}
        {sources.length > 0 && (
          <Pressable
            onPress={() => router.push('/about')}
            accessibilityRole="link"
            accessibilityLabel={`Place data ${sources.map((c) => c.notice).join(', ')}. Opens credits.`}
            hitSlop={8}
            style={({ pressed }) => [styles.attribution, { backgroundColor: colors.card, opacity: pressed ? 0.6 : 0.85 }]}
          >
            <Text style={[styles.attributionText, { color: colors.secondary }]} numberOfLines={1}>
              {sources.map((c) => c.notice).join(' · ')}
            </Text>
          </Pressable>
        )}
      </SafeAreaView>
    </View>
  );
}

function PlaceCard({
  place,
  minutes,
  doneIds,
  onOpen,
}: {
  place: PinPlace;
  minutes: number | null;
  doneIds: Set<string>;
  onOpen: (id: string) => void;
}) {
  const colors = useColors();
  const lead = place.entries[0];
  return (
    <View style={styles.cardBody}>
      <View style={styles.cardHeader}>
        <GradientIcon icon={lead.icon} subcategoryId={lead.subcategory} size={48} shape="tile" />
        <View style={styles.grow}>
          <Text style={[styles.placeName, { color: colors.label }]} numberOfLines={2}>
            {place.name}
          </Text>
          <Text style={[styles.meta, { color: colors.secondary }]}>
            {[minutes != null && `${formatMinutes(minutes)} away`, subcategory(lead.subcategory).label]
              .filter(Boolean)
              .join(' · ')}
          </Text>
        </View>
      </View>

      {place.entries.slice(0, 3).map((e) => (
        <Pressable
          key={e.id}
          onPress={() => onOpen(e.id)}
          style={({ pressed }) => [styles.entry, { backgroundColor: colors.fill, opacity: pressed ? 0.7 : 1 }]}
        >
          <Icon
            name={doneIds.has(e.id) ? 'check_circle' : e.kind === 'icon' ? 'star' : 'radio_button_unchecked'}
            size={18}
            color={doneIds.has(e.id) ? colors.done : e.kind === 'icon' ? colors.accent : colors.tertiary}
          />
          <Text style={[styles.entryName, { color: colors.label }]} numberOfLines={1}>
            {e.name}
          </Text>
          <Icon name="chevron_right" size={18} color={colors.tertiary} />
        </Pressable>
      ))}

      <Pressable
        onPress={() => openDirections(place)}
        style={({ pressed }) => [styles.directions, { backgroundColor: colors.accent, opacity: pressed ? 0.8 : 1 }]}
      >
        <Icon name="directions" size={20} color="white" />
        <Text style={styles.directionsText}>Directions</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  top: { position: 'absolute', top: 0, left: 16, right: 16, gap: 8, alignItems: 'flex-start' },
  control: { borderRadius: 22, paddingHorizontal: 12, marginTop: 8, boxShadow: '0 4px 14px rgba(0,0,0,0.12)' },
  chip: { minHeight: 36, paddingHorizontal: 14, borderRadius: 18, justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' },
  chipText: { fontSize: 14, fontWeight: '600' },
  origin: { width: 18, height: 18, borderRadius: 9, borderWidth: 3, borderColor: 'white', boxShadow: '0 0 0 8px rgba(0,122,255,0.15)' },
  bottom: { position: 'absolute', left: 12, right: 12, bottom: 0, alignItems: 'center' },
  attribution: { alignSelf: 'flex-end', maxWidth: '100%', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginBottom: 4 },
  attributionText: { fontSize: 11 },
  card: { ...readable, maxWidth: 480, borderRadius: 24, marginBottom: 12, boxShadow: '0 8px 28px rgba(0,0,0,0.18)' },
  cardBody: { padding: 16, gap: 10 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  grow: { flex: 1 },
  placeName: { fontSize: 17, fontWeight: '700' },
  meta: { fontSize: 13, marginTop: 2 },
  entry: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44, paddingHorizontal: 12, borderRadius: 12 },
  entryName: { flex: 1, fontSize: 15, fontWeight: '600' },
  directions: {
    minHeight: 48,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 2,
  },
  directionsText: { color: 'white', fontSize: 16, fontWeight: '600' },
});
