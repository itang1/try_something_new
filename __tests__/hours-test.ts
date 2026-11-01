import { isOpenAt, openLabel } from '@/data/hours';

// Wednesday, October 28, 2026, at a local time.
const wed = (h: number, m = 0) => new Date(2026, 9, 28, h, m);
const sun = (h: number, m = 0) => new Date(2026, 10, 1, h, m);

describe('opening hours', () => {
  it('reads weekdays and times', () => {
    const hours = 'Mo-Fr 09:00-17:00; Sa 10:00-14:00; Su off';
    expect(isOpenAt(hours, wed(9))).toBe(true);
    expect(isOpenAt(hours, wed(16, 59))).toBe(true);
    expect(isOpenAt(hours, wed(17))).toBe(false);
    expect(isOpenAt(hours, sun(12))).toBe(false);
  });

  it('treats days with no rule as closed when other days have one', () => {
    expect(isOpenAt('Tu-Su 10:00-18:00', new Date(2026, 9, 26, 12))).toBe(false);
    expect(isOpenAt('Tu-Su 10:00-18:00', wed(12))).toBe(true);
  });

  it('reads lists of days and times, and a comma between rules', () => {
    const hours = 'Mo, We, Fr-Sa 07:00-15:00, 17:00-21:00; Tu, Th 07:00-21:00';
    expect(isOpenAt(hours, wed(16))).toBe(false);
    expect(isOpenAt(hours, wed(18))).toBe(true);
    expect(isOpenAt('Mo-Fr 12:00-22:00, Sa 09:00-17:00', wed(13))).toBe(true);
  });

  it('carries late hours past midnight into the next day', () => {
    expect(isOpenAt('Mo-Su 10:00-02:00', wed(1))).toBe(true);
    expect(isOpenAt('We 18:00-02:00', new Date(2026, 9, 29, 1))).toBe(true);
    expect(isOpenAt('We 18:00-02:00', new Date(2026, 9, 29, 3))).toBe(false);
  });

  it('reads every day and 24/7', () => {
    expect(isOpenAt('24/7', wed(3))).toBe(true);
    expect(isOpenAt('06:00-22:00', wed(5))).toBe(false);
    expect(isOpenAt('06:00-22:00', wed(6))).toBe(true);
  });

  it('answers for sunrise and dusk only when it is the same all year', () => {
    expect(isOpenAt('dawn-dusk', wed(12))).toBe(true);
    expect(isOpenAt('sunrise-sunset', wed(23))).toBe(false);
    expect(isOpenAt('sunrise-sunset', wed(19))).toBeNull();
    expect(isOpenAt('08:00-dusk', wed(9))).toBe(true);
  });

  it("says it doesn't know rather than guessing", () => {
    expect(isOpenAt(undefined, wed(12))).toBeNull();
    expect(isOpenAt('May-Oct: Sa 08:00-12:00', wed(9))).toBeNull();
    expect(isOpenAt('"by appointment"', wed(12))).toBeNull();
    expect(isOpenAt('We-Fr 10:00-16:00; Sa[1] 10:00-14:00', wed(12))).toBeNull();
  });

  it('skips holiday rules', () => {
    expect(isOpenAt('Tu-Su 10:00-17:00; PH off', wed(12))).toBe(true);
  });

  it('labels a place', () => {
    expect(openLabel({ hours: '24/7' }, wed(12))).toBe('Open now');
    expect(openLabel({ hours: 'Mo 09:00-10:00' }, wed(12))).toBe('Closed now');
    expect(openLabel({}, wed(12))).toBeNull();
  });
});
