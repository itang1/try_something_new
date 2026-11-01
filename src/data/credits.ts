import { Linking } from 'react-native';
import type { Place } from './catalog';

/** Someone whose data or work the app uses, and the license that asks us to say so. */
export type Credit = {
  id: string;
  name: string;
  /** The line their license asks for. */
  notice: string;
  /** What the app uses it for. */
  use: string;
  license: string;
  url: string;
};

export const OSM: Credit = {
  id: 'osm',
  name: 'OpenStreetMap',
  notice: '© OpenStreetMap contributors',
  use: 'Parks, trails, beaches, bike routes, and other outdoor places.',
  license: 'Open Database License (ODbL)',
  url: 'https://www.openstreetmap.org/copyright',
};

export const OVERTURE: Credit = {
  id: 'overture',
  name: 'Overture Maps',
  notice: '© Overture Maps Foundation',
  use: 'Studios, venues, restaurants, and other businesses.',
  license: 'CDLA Permissive 2.0',
  url: 'https://docs.overturemaps.org/attribution/',
};

export const OPENROUTESERVICE: Credit = {
  id: 'ors',
  name: 'openrouteservice',
  notice: '© openrouteservice.org by HeiGIT',
  use: 'Drive, walking and cycling times from your home to each place.',
  license: 'Terms of openrouteservice',
  url: 'https://openrouteservice.org/terms-of-service/',
};

export const MATERIAL_SYMBOLS: Credit = {
  id: 'material-symbols',
  name: 'Material Symbols',
  notice: '© Google',
  use: 'Activity and interface icons.',
  license: 'Apache License 2.0',
  url: 'https://github.com/google/material-design-icons',
};

/** Every credit, in the order the Settings screen lists them. */
export const CREDITS: Credit[] = [OSM, OVERTURE, OPENROUTESERVICE, MATERIAL_SYMBOLS];

/** Where a place's data came from, read from its id. Hand-picked places have none. */
export function placeSource(place: Pick<Place, 'id'>): Credit | null {
  if (place.id.startsWith('osm:')) return OSM;
  if (place.id.startsWith('ovt:')) return OVERTURE;
  return null;
}

/** The sources behind a list of places, in the Settings screen's order. */
export function placeSources(places: Pick<Place, 'id'>[]): Credit[] {
  const ids = new Set(places.map((p) => placeSource(p)?.id));
  return CREDITS.filter((c) => ids.has(c.id));
}

export function openCredit(credit: Credit) {
  Linking.openURL(credit.url);
}
