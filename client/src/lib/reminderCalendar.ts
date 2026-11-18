import type { MilestoneReminder, PlanItem } from '@talivoy/shared';

const escapeText = (value: string) =>
  value.replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/;/g, '\\;').replace(/,/g, '\\,');
const stamp = (value: string) =>
  new Date(value)
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, 'Z');

export function reminderCalendar(reminder: MilestoneReminder, task: PlanItem) {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Talivoy//Milestones//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    'UID:' + reminder.id + '@restart-ai-cloud',
    'DTSTAMP:' + stamp(new Date().toISOString()),
    'DTSTART:' + stamp(reminder.dueAt),
    'DURATION:PT15M',
    'SUMMARY:' + escapeText(task.title),
    'DESCRIPTION:' + escapeText('Talivoy milestone. ' + (task.description ?? '')),
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    'TRIGGER:PT0S',
    'DESCRIPTION:' + escapeText(task.title),
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  // Calendar lines fold at 75 octets; continuation lines begin with a space.
  return (
    lines
      .map((line) => {
        const parts: string[] = [];
        let part = '';
        let bytes = 0;
        for (const character of line) {
          const size = new TextEncoder().encode(character).length;
          if (bytes + size > 75) {
            parts.push(part);
            part = ' ';
            bytes = 1;
          }
          part += character;
          bytes += size;
        }
        parts.push(part);
        return parts.join('\r\n');
      })
      .join('\r\n') + '\r\n'
  );
}
