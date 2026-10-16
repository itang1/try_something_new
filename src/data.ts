import type { ComponentProps } from 'react';
import type { MaterialCommunityIcons } from '@expo/vector-icons';

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

export type Subcategory = {
  id: string;
  label: string;
  color: string;
  icons: IconName[];
};

export const SUBCATEGORIES: Subcategory[] = [
  { id: 'outdoor', label: 'Outdoor', color: '#F97316', icons: ['bow-arrow', 'bike', 'kayaking', 'golf'] },
  { id: 'museum', label: 'Museum', color: '#8B5CF6', icons: ['bank', 'palette', 'bone'] },
  { id: 'entertainment', label: 'Entertainment', color: '#6366F1', icons: ['drama-masks', 'movie-open', 'bowling'] },
  { id: 'food', label: 'Food & Drink', color: '#EF4444', icons: ['food-fork-drink', 'coffee', 'ice-cream'] },
  { id: 'nature', label: 'Nature', color: '#22C55E', icons: ['flower', 'tree', 'butterfly'] },
  { id: 'craft', label: 'Craft', color: '#EC4899', icons: ['scissors-cutting', 'brush', 'needle'] },
  { id: 'landmark', label: 'Landmark', color: '#F59E0B', icons: ['bridge', 'castle', 'lighthouse'] },
  { id: 'hike', label: 'Hike', color: '#16A34A', icons: ['hiking', 'image-filter-hdr', 'pine-tree'] },
  { id: 'beach', label: 'Beach', color: '#06B6D4', icons: ['beach', 'surfing', 'waves'] },
  { id: 'neighborhoods', label: 'Neighborhoods', color: '#0EA5E9', icons: ['home-city', 'storefront', 'walk'] },
  { id: 'shopping', label: 'Shopping', color: '#D946EF', icons: ['shopping', 'tag', 'gift'] },
];

export const CITIES = [
  { name: 'Los Angeles', lat: 34.05, lng: -118.25 },
  { name: 'Columbus', lat: 39.96, lng: -83.0 },
  { name: 'New York', lat: 40.73, lng: -73.99 },
  { name: 'Chicago', lat: 41.88, lng: -87.63 },
  { name: 'Seattle', lat: 47.61, lng: -122.33 },
  { name: 'Austin', lat: 30.27, lng: -97.74 },
  { name: 'Denver', lat: 39.74, lng: -104.99 },
  { name: 'Miami', lat: 25.76, lng: -80.19 },
  { name: 'Boston', lat: 42.36, lng: -71.06 },
  { name: 'Portland', lat: 45.52, lng: -122.68 },
];

export type Venue = {
  id: number;
  name: string;
  city: string;
  subcategory: Subcategory;
  icon: IconName;
  lat: number;
  lng: number;
};

// Seeded so every run (and every device) shows the same pins.
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeVenues(count: number): Venue[] {
  const rand = mulberry32(42);
  const venues: Venue[] = [];
  for (let i = 0; i < count; i++) {
    const city = CITIES[i % CITIES.length];
    const sub = SUBCATEGORIES[Math.floor(rand() * SUBCATEGORIES.length)];
    // Squaring the radius clusters venues toward downtown, like real cities.
    const r = 0.35 * rand() ** 2;
    const a = rand() * 2 * Math.PI;
    venues.push({
      id: i,
      name: `${sub.label} spot ${i + 1}`,
      city: city.name,
      subcategory: sub,
      icon: sub.icons[Math.floor(rand() * sub.icons.length)],
      lat: city.lat + r * Math.sin(a),
      lng: city.lng + r * Math.cos(a) * 1.25,
    });
  }
  return venues;
}
