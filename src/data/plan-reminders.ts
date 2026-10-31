import { parseDay } from './days';
import type { Plan } from './storage';

/** The hour, local time, of the morning reminder on a plan's day. */
export const REMINDER_HOUR = 9;

export type PlanReminder = { id: string; plan: Plan; date: Date };

/**
 * One reminder per plan, at 9 am on its day, for the plans whose morning is still ahead.
 * A plan made for today after 9 gets none: it's fresh in mind already.
 */
export function planReminders(plans: Iterable<Plan>, now = new Date()): PlanReminder[] {
  const reminders: PlanReminder[] = [];
  for (const plan of plans) {
    const date = parseDay(plan.day);
    date.setHours(REMINDER_HOUR);
    if (date > now) reminders.push({ id: `plan-${plan.cityId}-${plan.entryId}`, plan, date });
  }
  return reminders.sort((a, b) => a.date.getTime() - b.date.getTime());
}

/** What the notification says. */
export function reminderText(name: string, placeName: string | null): { title: string; body: string } {
  return {
    title: `Today: ${name}`,
    body: placeName ? `At ${placeName}. Have fun!` : 'You planned this for today. Have fun!',
  };
}
