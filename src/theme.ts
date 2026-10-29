import { useColorScheme } from 'react-native';
import type { IconName } from '@/icons/paths';
import type { Kind } from '@/data/vocab';

// Dusk Ember: warm neutrals with a rose accent. Every text color here passes WCAG AA (4.5:1)
// on the backgrounds it sits on, including onAccent and onDone on their buttons.
const light = {
  background: '#FCF5F4',
  card: '#FFFFFF',
  fill: 'rgba(120,80,88,0.1)',
  label: '#23151A',
  secondary: '#6E5A5E',
  tertiary: 'rgba(110,90,94,0.45)',
  separator: 'rgba(110,80,88,0.22)',
  accent: '#B8274A',
  accentSoft: 'rgba(184,39,74,0.08)',
  onAccent: '#FFFFFF',
  done: '#1E8048',
  doneSoft: 'rgba(30,128,72,0.06)',
  onDone: '#FFFFFF',
  blue: '#2F6BD8',
  red: '#C62828',
};

const dark: typeof light = {
  background: '#1C1013',
  card: '#2B1D21',
  fill: 'rgba(220,180,188,0.14)',
  label: '#F8EEEF',
  secondary: '#B8A4A8',
  tertiary: 'rgba(184,164,168,0.45)',
  separator: 'rgba(220,170,180,0.2)',
  accent: '#FF8A8A',
  accentSoft: 'rgba(255,138,138,0.12)',
  onAccent: '#1C1013',
  done: '#4CD488',
  doneSoft: 'rgba(76,212,136,0.08)',
  onDone: '#0E1F15',
  blue: '#6EA4FF',
  red: '#FF6B6B',
};

/** The app icon's gradient, for brand moments like the widget and confetti. */
export const BRAND = { gold: '#FFC24D', rose: '#F0405A', violet: '#7A2BE2' } as const;

/** Surfaces that stay dark in both modes, like the toast. */
export const INK = { surface: 'rgba(35,21,26,0.94)', label: '#FFFFFF', accent: '#FF8A8A' } as const;

export type Colors = typeof light;

/** White or near-black, whichever reads better on a solid hex background. */
export function readableOn(background: string): string {
  const [r, g, b] = [1, 3, 5]
    .map((i) => parseInt(background.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  // Contrast with white beats contrast with #1C1013 when the color is darker than this.
  return luminance < 0.19 ? '#FFFFFF' : '#1C1013';
}

export function useColors(): Colors {
  return useColorScheme() === 'dark' ? dark : light;
}

type Subcategory = { label: string; icon: IconName; color: string; gradient: [string, string] };

// Category colors, tuned to sit beside the Dusk Ember accent. White labels pass 4.5:1 on each.
const ORANGE = '#D04A12';
const RED = '#D93A4A';
const PURPLE = '#7A2BE2';
const INDIGO = '#5B47D1';
const GREEN = '#23804B';
const TEAL = '#0F7F70';
const CYAN = '#1A76AE';
const BLUE = '#2F6BD8';
const PINK = '#D02A63';
const BROWN = '#9C6B3F';
const CRAFT = '#C2389A';

// Kinds group by what you'd be doing, not by venue, so they stay the same in every region.
export const SUBCATEGORIES: Record<Kind, Subcategory> = {
  move: { label: 'Move', icon: 'directions_run', color: ORANGE, gradient: [ORANGE, RED] },
  outdoors: { label: 'Outdoors', icon: 'hiking', color: GREEN, gradient: [GREEN, TEAL] },
  water: { label: 'Water', icon: 'waves', color: CYAN, gradient: [CYAN, BLUE] },
  make: { label: 'Make', icon: 'palette', color: CRAFT, gradient: [CRAFT, PURPLE] },
  food: { label: 'Food & Drink', icon: 'restaurant', color: RED, gradient: [RED, ORANGE] },
  learn: { label: 'See & Learn', icon: 'museum', color: TEAL, gradient: [TEAL, INDIGO] },
  explore: { label: 'Explore', icon: 'explore', color: BROWN, gradient: [BROWN, ORANGE] },
  shows: { label: 'Shows', icon: 'theater_comedy', color: INDIGO, gradient: [INDIGO, BLUE] },
  play: { label: 'Play', icon: 'attractions', color: PINK, gradient: [PINK, PURPLE] },
};

export function subcategory(id: string): Subcategory {
  return SUBCATEGORIES[id as Kind] ?? { label: id, icon: 'help', color: '#8A7A7E', gradient: ['#8A7A7E', '#6E5A5E'] };
}

/** Keeps lists and cards a comfortable width on tablets. */
export const readable = { width: '100%', maxWidth: 680, alignSelf: 'center' } as const;
