import { useCallback, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import MapView, { type Region } from 'react-native-maps';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { CITIES, makeVenues, type Venue } from './src/data';
import { buildIndex, featuresInRegion, zoomToDelta, type MapFeature } from './src/clusters';
import { ClusterPin, VenuePin } from './src/Pins';
import { VenueCard } from './src/VenueCard';
import { PerfOverlay, type PerfStats } from './src/PerfOverlay';

// Hermes's performance.now() isn't zeroed at app start, so measure from when this module loads.
const JS_START = performance.now();
const VENUE_COUNT = 5000;
const venues = makeVenues(VENUE_COUNT);
const index = buildIndex(venues);

const cityRegion = (c: (typeof CITIES)[number]): Region => ({
  latitude: c.lat,
  longitude: c.lng,
  latitudeDelta: 0.6,
  longitudeDelta: 0.6,
});

export default function App() {
  // Markers are snapshotted once, so the icon font has to be loaded before any render.
  const [fontsLoaded] = useFonts(MaterialCommunityIcons.font);
  const map = useRef<MapView>(null);
  const [features, setFeatures] = useState<MapFeature[]>([]);
  const [selected, setSelected] = useState<Venue | null>(null);
  const [stats, setStats] = useState<PerfStats>({ mapReadyMs: null, clusterMs: 0, pinCount: 0 });

  const recluster = useCallback((region: Region) => {
    const t = performance.now();
    const next = featuresInRegion(index, region);
    const ms = performance.now() - t;
    setFeatures(next);
    setStats((s) => ({ ...s, clusterMs: ms, pinCount: next.length }));
  }, []);

  const selectVenue = useCallback((v: Venue) => {
    setSelected(v);
    map.current?.animateCamera({ center: { latitude: v.lat - 0.004, longitude: v.lng } }, { duration: 450 });
  }, []);

  const markers = useMemo(
    () =>
      features.map((f) => {
        const [lng, lat] = f.geometry.coordinates;
        if ('cluster' in f.properties && f.properties.cluster) {
          const id = f.properties.cluster_id;
          return (
            <ClusterPin
              key={`c${id}`}
              latitude={lat}
              longitude={lng}
              count={f.properties.point_count}
              onPress={() => {
                const delta = zoomToDelta(Math.min(index.getClusterExpansionZoom(id), 17));
                map.current?.animateToRegion(
                  { latitude: lat, longitude: lng, latitudeDelta: delta, longitudeDelta: delta },
                  450,
                );
              }}
            />
          );
        }
        const v = venues[(f.properties as { venueId: number }).venueId];
        const isSelected = selected?.id === v.id;
        return <VenuePin key={`p${v.id}${isSelected ? 's' : ''}`} venue={v} selected={isSelected} onPress={selectVenue} />;
      }),
    [features, selected, selectVenue],
  );

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={styles.root}>
      <StatusBar style="dark" />
      <MapView
        ref={map}
        style={StyleSheet.absoluteFill}
        initialRegion={cityRegion(CITIES[0])}
        onMapReady={() => setStats((s) => ({ ...s, mapReadyMs: performance.now() - JS_START }))}
        onRegionChangeComplete={recluster}
        onPress={(e) => {
          if (e.nativeEvent.action !== 'marker-press') setSelected(null);
        }}
        showsPointsOfInterests={false}
        rotateEnabled={false}
        pitchEnabled={false}
      >
        {markers}
      </MapView>

      <PerfOverlay stats={stats} />

      <View style={styles.cities}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cityRow}>
          {CITIES.map((c) => (
            <Pressable
              key={c.name}
              style={styles.chip}
              onPress={() => {
                setSelected(null);
                map.current?.animateToRegion(cityRegion(c), 600);
              }}
            >
              <Text style={styles.chipText}>{c.name}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <VenueCard venue={selected} onClose={() => setSelected(null)} />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  cities: { position: 'absolute', top: 150, left: 0, right: 0 },
  cityRow: { paddingHorizontal: 12, gap: 8 },
  chip: {
    backgroundColor: 'white',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  chipText: { fontSize: 14, fontWeight: '600', color: '#111827' },
});
