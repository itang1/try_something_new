import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import type { Entry } from './catalog';
import { reminderText, type PlanReminder } from './plan-reminders';

export const NUDGE_WEEKS = 4;
const CHANNEL = 'weekend';
const PLAN_CHANNEL = 'plans';
/** Plan reminders' identifiers start with this; everything else scheduled is a weekend idea. */
const PLAN_PREFIX = 'plan-';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function createChannels() {
  if (process.env.EXPO_OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL, {
    name: 'Weekend ideas',
    importance: AndroidImportance.DEFAULT,
  });
  await Notifications.setNotificationChannelAsync(PLAN_CHANNEL, {
    name: 'Plan reminders',
    importance: AndroidImportance.DEFAULT,
  });
}

/** Asks to send notifications, and resolves to whether the person said yes. Asking again after a no shows nothing. */
export async function allowNudges(): Promise<boolean> {
  // Android only shows the permission prompt once a channel exists.
  await createChannels();
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
  queue = queue.catch(() => {}).then(() => cancelWhere((id) => !id.startsWith(PLAN_PREFIX)));
  return queue;
}

/** Older versions scheduled weekend ideas with random identifiers, so anything not a plan reminder counts as one. */
async function cancelWhere(match: (identifier: string) => boolean) {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const { identifier } of scheduled) {
    if (match(identifier)) await Notifications.cancelScheduledNotificationAsync(identifier);
  }
}

async function replaceNudges(ideas: Entry[]) {
  await cancelWhere((id) => !id.startsWith(PLAN_PREFIX));
  const dates = thursdays(ideas.length);
  for (const [i, idea] of ideas.entries()) {
    await Notifications.scheduleNotificationAsync({
      identifier: `weekend-${i}`,
      content: {
        title: 'Free this weekend?',
        body: `${idea.name}? Tap to pick a day.`,
        data: { url: `/activity/${idea.id}` },
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: dates[i], channelId: CHANNEL },
    });
  }
}

export type ScheduledReminder = PlanReminder & { name: string; url: string | null };

/** Replaces every plan reminder with these. Pass none to cancel them. Never asks for permission. */
export function schedulePlanReminders(reminders: ScheduledReminder[]) {
  queue = queue.catch(() => {}).then(() => replacePlanReminders(reminders));
  return queue;
}

async function replacePlanReminders(reminders: ScheduledReminder[]) {
  await cancelWhere((id) => id.startsWith(PLAN_PREFIX));
  if (!reminders.length || !(await Notifications.getPermissionsAsync()).granted) return;
  await createChannels();
  // iOS keeps only 64 pending notifications per app, shared with the weekend ideas. These come soonest first.
  for (const r of reminders.slice(0, 40)) {
    await Notifications.scheduleNotificationAsync({
      identifier: r.id,
      content: { ...reminderText(r.name, r.plan.placeName), data: r.url ? { url: r.url } : {} },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: r.date, channelId: PLAN_CHANNEL },
    });
  }
}
