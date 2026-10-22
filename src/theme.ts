import { useColorScheme } from 'react-native';
import type { IconName } from '@/icons/paths';
import type { Kind } from '@/data/vocab';

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
  red: '#FF3B30',
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
  red: '#FF453A',
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

// Kinds group by what you'd be doing, not by venue, so they stay the same in every region.
export const SUBCATEGORIES: Record<Kind, Subcategory> = {
  move: { label: 'Move', icon: 'directions_run', color: ORANGE, gradient: [ORANGE, RED] },
  outdoors: { label: 'Outdoors', icon: 'hiking', color: GREEN, gradient: [GREEN, TEAL] },
  water: { label: 'Water & Snow', icon: 'waves', color: CYAN, gradient: [CYAN, BLUE] },
  make: { label: 'Make', icon: 'palette', color: CRAFT, gradient: [CRAFT, PURPLE] },
  food: { label: 'Food & Drink', icon: 'restaurant', color: RED, gradient: [RED, ORANGE] },
  learn: { label: 'See & Learn', icon: 'museum', color: TEAL, gradient: [TEAL, INDIGO] },
  explore: { label: 'Explore', icon: 'explore', color: BROWN, gradient: [BROWN, ORANGE] },
  shows: { label: 'Shows', icon: 'theater_comedy', color: INDIGO, gradient: [INDIGO, BLUE] },
  play: { label: 'Play', icon: 'attractions', color: PINK, gradient: [PINK, PURPLE] },
  social: { label: 'Social', icon: 'groups', color: PURPLE, gradient: [PURPLE, INDIGO] },
  calm: { label: 'Calm', icon: 'self_improvement', color: MINT, gradient: [MINT, CYAN] },
};

export function subcategory(id: string): Subcategory {
  return SUBCATEGORIES[id as Kind] ?? { label: id, icon: 'help', color: '#8E8E93', gradient: ['#8E8E93', '#636366'] };
}

/** Keeps lists and cards a comfortable width on tablets. */
export const readable = { width: '100%', maxWidth: 680, alignSelf: 'center' } as const;
