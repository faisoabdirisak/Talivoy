import { expect, it } from 'vitest';
import { reminderCalendar } from '../lib/reminderCalendar';

it('exports a UTC calendar reminder with a stable id, escaped text and valid line folding', () => {
  const event = reminderCalendar(
    { id: 'reminder-1', planItemId: 'task-1', dueAt: '2026-12-01T09:30:00-06:00' },
    {
      id: 'task-1',
      title: 'Review, plan; next\nstep',
      description: 'Résumé '.repeat(30),
      day: 7,
      week: 1,
      isCompleted: false,
    }
  );
  expect(event).toContain('DTSTART:20261201T153000Z\r\n');
  expect(event).toContain('UID:reminder-1@restart-ai-cloud');
  expect(event).toContain('SUMMARY:Review\\, plan\\; next\\nstep');
  expect(event).toContain('BEGIN:VALARM\r\nACTION:DISPLAY\r\nTRIGGER:PT0S');
  expect(event.endsWith('END:VCALENDAR\r\n')).toBe(true);
  for (const line of event.split('\r\n'))
    expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
});
