// The catalog's allowed values. No imports, so scripts/validate-catalog.mjs can load this file with plain Node.

export const KINDS = ['move', 'outdoors', 'water', 'make', 'food', 'explore', 'shows', 'play', 'social', 'calm'] as const;
export type Kind = (typeof KINDS)[number];

export const DURATION_MINUTES = {
  '30 min': 30,
  '1 hour': 60,
  '1-2 hours': 90,
  '2-3 hours': 150,
  'Half day': 240,
  'Full day': 480,
} as const;
export type Duration = keyof typeof DURATION_MINUTES;
export const DURATIONS = Object.keys(DURATION_MINUTES) as Duration[];

export const COST_LEVEL = { Free: 0, $: 1, $$: 2, $$$: 3 } as const;
export type Cost = keyof typeof COST_LEVEL;
export const COSTS = Object.keys(COST_LEVEL) as Cost[];

/** How far outside a comfort zone it is. Starting easy and building up keeps people going. */
export const LEVEL_IDS = ['easy', 'medium', 'stretch'] as const;
export type Level = (typeof LEVEL_IDS)[number];
