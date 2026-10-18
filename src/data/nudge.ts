import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import type { Entry } from './catalog';

export const NUDGE_WEEKS = 4;
const CHANNEL = 'weekend';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/** Asks to send notifications, and resolves to whether the person said yes. */
export async function allowNudges(): Promise<boolean> {
  // Android only shows the permission prompt once a channel exists.
  if (process.env.EXPO_OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL, {
      name: 'Weekend ideas',
      importance: AndroidImportance.DEFAULT,
    });
  }
  const { granted } = await Notifications.requestPermissionsAsync();
  return granted;
}

/** Thursdays at 6 pm, starting with the next one still ahead. */
function thursdays(count: number): Date[] {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), now.getDate() + ((4 - now.getDay() + 7) % 7), 18);
  if (first <= now) first.setDate(first.getDate() + 7);
  return Array.from({ length: count }, (_, i) => new Date(first.getFullYear(), first.getMonth(), first.getDate() + i * 7, 18));
}

// Runs one at a time, so a quick second update can't interleave with the first and leave duplicates.
let queue: Promise<void> = Promise.resolve();

/** One idea per coming Thursday, scheduled ahead instead of repeating so they stop if the app goes unused. */
export function scheduleNudges(ideas: Entry[]) {
  queue = queue.catch(() => {}).then(() => replaceNudges(ideas));
  return queue;
}

export function cancelNudges() {
  queue = queue.catch(() => {}).then(() => Notifications.cancelAllScheduledNotificationsAsync());
  return queue;
}

async function replaceNudges(ideas: Entry[]) {
  await Notifications.cancelAllScheduledNotificationsAsync();
  const dates = thursdays(ideas.length);
  for (const [i, idea] of ideas.entries()) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Free this weekend?',
        body: `${idea.name}? Tap to pick a day.`,
        data: { url: `/activity/${idea.id}` },
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: dates[i], channelId: CHANNEL },
    });
  }
}
