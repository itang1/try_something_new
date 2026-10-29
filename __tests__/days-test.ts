import { addDays, dayKey, formatDay, nextWeekendDay, parseDay } from '@/data/days';

describe('days', () => {
  it('round-trips a local day key', () => {
    const date = new Date(2026, 0, 5);
    expect(dayKey(date)).toBe('2026-01-05');
    expect(parseDay('2026-01-05')).toEqual(date);
  });

  it('adds days across a month boundary', () => {
    expect(dayKey(addDays(new Date(2026, 0, 30), 3))).toBe('2026-02-02');
  });

  it('picks the coming Saturday on a weekday and today on a weekend', () => {
    // Wednesday, October 28, 2026.
    expect(dayKey(nextWeekendDay(new Date(2026, 9, 28, 15)))).toBe('2026-10-31');
    expect(dayKey(nextWeekendDay(new Date(2026, 10, 1, 15)))).toBe('2026-11-01');
  });

  it('names today and tomorrow', () => {
    const today = new Date(2026, 9, 28, 15);
    expect(formatDay('2026-10-28', today)).toBe('Today');
    expect(formatDay('2026-10-29', today)).toBe('Tomorrow');
  });
});
