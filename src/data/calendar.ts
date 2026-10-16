// The legacy dialog is the only one that needs no calendar permission: iOS 17+ and Android own the form.
import { createEventInCalendarAsync } from 'expo-calendar/legacy';
import { addDays, parseDay } from './days';

export async function addToCalendar(event: { title: string; day: string; location: string | null }) {
  const start = parseDay(event.day);
  try {
    await createEventInCalendarAsync({
      title: event.title,
      startDate: start,
      endDate: addDays(start, 1),
      allDay: true,
      location: event.location ?? undefined,
      notes: 'Planned with Try Something New',
    });
  } catch {
    // Without a calendar app or account there is nothing to add to, and the plan is still saved here.
  }
}
