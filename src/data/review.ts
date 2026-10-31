import * as StoreReview from 'expo-store-review';
import { readSetting, writeSetting } from './storage';

/** When the app last asked for a rating, in ms since the epoch. */
const ASKED_AT = 'reviewAskedAt';
/** Never ask more often than this, on top of the limits Apple and Google keep themselves. */
export const REVIEW_GAP_DAYS = 120;

/** Whether enough time has passed since the last time the app asked for a rating. */
export function dueForReview(lastAskedAt: number | null, now: number): boolean {
  return lastAskedAt == null || now - lastAskedAt >= REVIEW_GAP_DAYS * 24 * 60 * 60 * 1000;
}

/**
 * Shows the system's rating prompt, at a happy moment only: right after someone saves an activity
 * they loved and is done with the share card. Never on launch and never after "Not for me". The
 * system may still decide not to show it, which is fine.
 */
export async function askForReviewAfterLoved(now = Date.now()): Promise<void> {
  if (!dueForReview(readSetting<number | null>(ASKED_AT, null), now)) return;
  try {
    if (!(await StoreReview.isAvailableAsync())) return;
    writeSetting(ASKED_AT, now);
    await StoreReview.requestReview();
  } catch {
    // A missing prompt is never worth an error.
  }
}
