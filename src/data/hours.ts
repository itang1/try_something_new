// Reads OpenStreetMap's opening_hours, like "Mo-Fr 09:00-17:00; Sa 10:00-14:00; Su off", well enough to say whether a
// place is open right now. Only the common forms are understood: weekdays, times, times past midnight, "off", "24/7" and
// sunrise or dusk. Anything else, like month ranges or week numbers, makes the answer "don't know", so a place is never
// shown as closed when it might be open.

const DAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
const DAY = '(?:Mo|Tu|We|Th|Fr|Sa|Su)';
const DAY_LIST = new RegExp(`^(${DAY}(?:\\s*-\\s*${DAY})?(?:\\s*,\\s*${DAY}(?:\\s*-\\s*${DAY})?)*)(?:\\s+|$)`);
const SUN_EVENTS = ['sunrise', 'sunset', 'dawn', 'dusk'] as const;
const TIME = `(?:\\d{1,2}:\\d{2}|${SUN_EVENTS.join('|')})`;
const SPAN = new RegExp(`^(${TIME})\\s*-\\s*(${TIME})$|^(${TIME})\\+$`);

type SunEvent = (typeof SUN_EVENTS)[number];
/** Minutes after midnight for sunrise and sunset. The real times move with the season and the city. */
type Sun = { rise: number; set: number };
type Span = { from: string; to: string };
/** Spans for each weekday, Monday first. A missing day has no rule; an empty list means closed. */
type Week = (Span[] | undefined)[];

/** The weekdays a selector like "Mo-Fr" or "Mo,We,Fr-Sa" covers, Monday as 0. */
function daysOf(selector: string): number[] {
  const days = new Set<number>();
  for (const part of selector.split(',')) {
    const [a, b] = part.split('-').map((d) => DAYS.indexOf(d.trim()));
    // A range like "Fr-Mo" wraps past Sunday.
    for (let d = a, n = 0; n < 7; d = (d + 1) % 7, n++) {
      days.add(d);
      if (b === undefined || d === b) break;
    }
  }
  return [...days];
}

/** The rules, split on ";" and on a comma that starts a new weekday after a time, which some mappers use instead. */
function rulesOf(hours: string): string[] {
  return hours
    .replace(/"[^"]*"/g, '')
    .replace(/(\d|off|closed)\s*,\s*(?=(?:Mo|Tu|We|Th|Fr|Sa|Su|PH)\b)/g, '$1;')
    .split(';')
    .map((r) => r.trim())
    .filter(Boolean);
}

/** The week the rules describe, or null when a rule uses something this reader doesn't know. */
function parseWeek(hours: string): Week | null {
  const trimmed = hours.trim();
  if (trimmed === '24/7') return Array.from({ length: 7 }, () => [{ from: '00:00', to: '24:00' }]);
  const week: Week = Array.from({ length: 7 }, () => undefined);
  for (const rule of rulesOf(trimmed)) {
    // Holidays can't be known on the phone, so their rules are skipped.
    if (/^(PH|SH)\b/.test(rule)) continue;
    const match = rule.match(DAY_LIST);
    const days = match ? daysOf(match[1]) : [0, 1, 2, 3, 4, 5, 6];
    const rest = (match ? rule.slice(match[0].length) : rule).trim();
    if (rest === 'off' || rest === 'closed') {
      for (const d of days) week[d] = [];
      continue;
    }
    if (rest === '24/7' || rest === 'open') {
      for (const d of days) week[d] = [{ from: '00:00', to: '24:00' }];
      continue;
    }
    const spans: Span[] = [];
    for (const part of rest.split(',')) {
      const span = part.trim().match(SPAN);
      if (!span) return null;
      spans.push(span[3] ? { from: span[3], to: '24:00' } : { from: span[1], to: span[2] });
    }
    // A later rule replaces an earlier one for the days it names, as in OSM.
    for (const d of days) week[d] = spans;
  }
  return week;
}

function minutes(time: string, sun: Sun): number {
  if ((SUN_EVENTS as readonly string[]).includes(time)) {
    const event = time as SunEvent;
    // Dawn and dusk are about half an hour outside sunrise and sunset.
    if (event === 'sunrise') return sun.rise;
    if (event === 'dawn') return sun.rise - 30;
    if (event === 'sunset') return sun.set;
    return sun.set + 30;
  }
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function openIn(week: Week, date: Date, sun: Sun): boolean {
  const today = (date.getDay() + 6) % 7;
  const yesterday = (today + 6) % 7;
  const now = date.getHours() * 60 + date.getMinutes();
  const range = (s: Span) => {
    const from = minutes(s.from, sun);
    let to = minutes(s.to, sun);
    // "18:00-02:00" runs past midnight into the next day.
    if (to <= from) to += 24 * 60;
    return [from, to];
  };
  if ((week[today] ?? []).some((s) => {
    const [from, to] = range(s);
    return now >= from && now < to;
  })) return true;
  return (week[yesterday] ?? []).some((s) => {
    const [, to] = range(s);
    return to > 24 * 60 && now < to - 24 * 60;
  });
}

// The earliest and latest sunrise and sunset in the cities the app covers, so sunrise and dusk only give an answer
// when it's the same all year, like midday or the middle of the night.
const EARLY_SUN: Sun = { rise: 4 * 60 + 30, set: 16 * 60 + 15 };
const LATE_SUN: Sun = { rise: 8 * 60, set: 21 * 60 + 15 };

/** Whether a place is open at a time: true, false, or null when its hours can't be read or depend on the season. */
export function isOpenAt(hours: string | undefined, date = new Date()): boolean | null {
  if (!hours) return null;
  const week = parseWeek(hours);
  if (!week || week.every((d) => d === undefined)) return null;
  const early = openIn(week, date, EARLY_SUN);
  return early === openIn(week, date, LATE_SUN) ? early : null;
}

/** "Open now" or "Closed now" for a place with readable hours, otherwise null. Places without hours are never hidden. */
export function openLabel(place: { hours?: string }, date = new Date()): string | null {
  const open = isOpenAt(place.hours, date);
  return open == null ? null : open ? 'Open now' : 'Closed now';
}
