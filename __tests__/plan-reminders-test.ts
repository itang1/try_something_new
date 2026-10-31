import { planReminders, reminderText } from '@/data/plan-reminders';
import type { Plan } from '@/data/storage';

const plan = (entryId: string, day: string, cityId = 'seattle'): Plan => ({
  entryId,
  cityId,
  placeId: null,
  placeName: null,
  day,
});

describe('plan reminders', () => {
  it('reminds at 9 am local time on the plan day', () => {
    const [reminder] = planReminders([plan('kayak', '2026-11-07')], new Date(2026, 10, 1, 12));
    expect(reminder.date).toEqual(new Date(2026, 10, 7, 9));
    expect(reminder.id).toBe('plan-seattle-kayak');
  });

  it('skips a plan whose morning has passed, including today after 9', () => {
    const now = new Date(2026, 10, 7, 10);
    expect(planReminders([plan('a', '2026-11-06'), plan('b', '2026-11-07')], now)).toEqual([]);
    expect(planReminders([plan('c', '2026-11-07')], new Date(2026, 10, 7, 8))).toHaveLength(1);
  });

  it('keeps the same activity in two cities apart, soonest first', () => {
    const reminders = planReminders(
      [plan('kayak', '2026-11-08', 'seattle'), plan('kayak', '2026-11-07', 'chicago')],
      new Date(2026, 10, 1),
    );
    expect(reminders.map((r) => r.id)).toEqual(['plan-chicago-kayak', 'plan-seattle-kayak']);
  });

  it('names the place when there is one', () => {
    expect(reminderText('Go kayaking', 'Green Lake')).toEqual({ title: 'Today: Go kayaking', body: 'At Green Lake. Have fun!' });
    expect(reminderText('Bake bread', null).body).toBe('You planned this for today. Have fun!');
  });
});
