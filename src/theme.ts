import { useColorScheme } from 'react-native';
import type { IconName } from '@/icons/paths';

// iOS system colors, so the app looks at home on iOS and stays consistent on Android.
const light = {
  background: '#F2F2F7',
  card: '#FFFFFF',
  fill: 'rgba(118,118,128,0.12)',
  label: '#000000',
  secondary: 'rgba(60,60,67,0.6)',
  tertiary: 'rgba(60,60,67,0.3)',
  separator: 'rgba(60,60,67,0.29)',
  accent: '#FF9500',
  accentSoft: 'rgba(255,149,0,0.08)',
  done: '#34C759',
  doneSoft: 'rgba(52,199,89,0.05)',
  blue: '#007AFF',
};

const dark: typeof light = {
  background: '#000000',
  card: '#1C1C1E',
  fill: 'rgba(118,118,128,0.24)',
  label: '#FFFFFF',
  secondary: 'rgba(235,235,245,0.6)',
  tertiary: 'rgba(235,235,245,0.3)',
  separator: 'rgba(84,84,88,0.65)',
  accent: '#FF9F0A',
  accentSoft: 'rgba(255,159,10,0.12)',
  done: '#30D158',
  doneSoft: 'rgba(48,209,88,0.08)',
  blue: '#0A84FF',
};

export type Colors = typeof light;

export function useColors(): Colors {
  return useColorScheme() === 'dark' ? dark : light;
}

type Subcategory = { label: string; icon: IconName; color: string; gradient: [string, string] };

const ORANGE = '#FF9500';
const RED = '#FF3B30';
const PURPLE = '#AF52DE';
const INDIGO = '#5856D6';
const GREEN = '#34C759';
const TEAL = '#30B0C7';
const CYAN = '#32ADE6';
const BLUE = '#007AFF';
const PINK = '#FF2D55';
const MINT = '#00C7BE';
const BROWN = '#A2845E';
const CRAFT = '#D940A6';

export const SUBCATEGORIES: Record<string, Subcategory> = {
  outdoor: { label: 'Outdoor', icon: 'directions_run', color: ORANGE, gradient: [ORANGE, RED] },
  museum: { label: 'Museum', icon: 'account_balance', color: PURPLE, gradient: [PURPLE, INDIGO] },
  hike: { label: 'Hike', icon: 'hiking', color: GREEN, gradient: [GREEN, TEAL] },
  beach: { label: 'Beach', icon: 'beach_access', color: CYAN, gradient: [CYAN, BLUE] },
  food: { label: 'Food & Drink', icon: 'restaurant', color: RED, gradient: [RED, ORANGE] },
  shopping: { label: 'Shopping', icon: 'shopping_bag', color: PINK, gradient: [PINK, PURPLE] },
  nature: { label: 'Nature', icon: 'eco', color: MINT, gradient: [MINT, GREEN] },
  entertainment: { label: 'Entertainment', icon: 'star', color: INDIGO, gradient: [INDIGO, PURPLE] },
  landmark: { label: 'Landmark', icon: 'location_on', color: BROWN, gradient: [BROWN, ORANGE] },
  neighborhoods: { label: 'Neighborhoods', icon: 'location_city', color: TEAL, gradient: [TEAL, CYAN] },
  craft: { label: 'Craft', icon: 'content_cut', color: CRAFT, gradient: [CRAFT, PURPLE] },
};

export function subcategory(id: string): Subcategory {
  return SUBCATEGORIES[id] ?? { label: id, icon: 'help', color: '#8E8E93', gradient: ['#8E8E93', '#636366'] };
}

/** Keeps lists and cards a comfortable width on tablets. */
export const readable = { width: '100%', maxWidth: 680, alignSelf: 'center' } as const;
