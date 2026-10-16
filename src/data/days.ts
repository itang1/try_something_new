/** Local calendar days as YYYY-MM-DD keys, so a plan stays on the same day across time zones. */
export function dayKey(date: Date): string {
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${m}-${d}`;
}

export function parseDay(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(date: Date, n: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + n);
}

export function upcomingDays(count: number, from = new Date()): Date[] {
  return Array.from({ length: count }, (_, i) => addDays(from, i));
}

export const isWeekend = (date: Date) => date.getDay() === 0 || date.getDay() === 6;

/** Today if it's a weekend day, otherwise the coming Saturday. */
export function nextWeekendDay(from = new Date()): Date {
  return isWeekend(from) ? addDays(from, 0) : addDays(from, 6 - from.getDay());
}

export function formatDay(key: string, today = new Date()): string {
  const date = parseDay(key);
  const diff = Math.round((date.getTime() - addDays(today, 0).getTime()) / 86_400_000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}
