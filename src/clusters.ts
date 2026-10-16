import Supercluster from 'supercluster';
import type { Region } from 'react-native-maps';
import type { Venue } from './data';

export type PinProps = { venueId: number };
export type ClusterIndex = Supercluster<PinProps>;
export type MapFeature = ReturnType<ClusterIndex['getClusters']>[number];

export function buildIndex(venues: Venue[]): ClusterIndex {
  const index = new Supercluster<PinProps>({ radius: 60, maxZoom: 16 });
  index.load(
    venues.map((v) => ({
      type: 'Feature' as const,
      properties: { venueId: v.id },
      geometry: { type: 'Point' as const, coordinates: [v.lng, v.lat] },
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
