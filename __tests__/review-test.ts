import { dueForReview, REVIEW_GAP_DAYS } from '@/data/review';

jest.mock('expo-store-review', () => ({ isAvailableAsync: jest.fn(), requestReview: jest.fn() }));
jest.mock('@/data/storage', () => ({ readSetting: jest.fn(), writeSetting: jest.fn() }));

const DAY = 24 * 60 * 60 * 1000;

describe('dueForReview', () => {
  it('asks the first time', () => {
    expect(dueForReview(null, Date.now())).toBe(true);
  });

  it('waits the full gap before asking again', () => {
    const asked = Date.UTC(2026, 0, 1);
    expect(dueForReview(asked, asked + DAY)).toBe(false);
    expect(dueForReview(asked, asked + (REVIEW_GAP_DAYS - 1) * DAY)).toBe(false);
    expect(dueForReview(asked, asked + REVIEW_GAP_DAYS * DAY)).toBe(true);
  });
});
