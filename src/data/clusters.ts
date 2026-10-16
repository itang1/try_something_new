import Supercluster from 'supercluster';
import type { Region } from 'react-native-maps';
import type { Place } from './catalog';

export type ClusterIndex = Supercluster<{ placeId: string }>;
export type MapFeature = ReturnType<ClusterIndex['getClusters']>[number];

export function buildIndex(places: Place[]): ClusterIndex {
  const index = new Supercluster<{ placeId: string }>({ radius: 60, maxZoom: 16 });
  index.load(
    places.map((p) => ({
      type: 'Feature' as const,
      properties: { placeId: p.id },
      geometry: { type: 'Point' as const, coordinates: [p.lng, p.lat] },
    })),
  );
  return index;
}

export function regionToZoom(region: Region): number {
  return Math.round(Math.log2(360 / region.longitudeDelta));
}

export function zoomToDelta(zoom: number): number {
  return 360 / 2 ** zoom;
}

export function featuresInRegion(index: ClusterIndex, region: Region): MapFeature[] {
  const west = region.longitude - region.longitudeDelta / 2;
  const east = region.longitude + region.longitudeDelta / 2;
  const south = region.latitude - region.latitudeDelta / 2;
  const north = region.latitude + region.latitudeDelta / 2;
  return index.getClusters([west, south, east, north], regionToZoom(region));
}
