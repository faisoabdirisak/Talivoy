import { useEffect, useState } from 'react';
import { Bell, CalendarPlus, Trash2 } from 'lucide-react';
import type { MilestoneReminder, Opportunity } from '@restart-ai/shared';
import { listReminders, saveReminder, removeReminder } from '../lib/api';
import { reminderCalendar } from '../lib/reminderCalendar';

export function MilestoneReminders({
  opportunity,
  demo,
}: {
  opportunity: Opportunity;
  demo: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [reminders, setReminders] = useState<MilestoneReminder[]>([]);
  const [taskId, setTaskId] = useState('');
  const [when, setWhen] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const clock = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(clock);
  }, []);
  useEffect(() => {
    if (demo) return;
    let active = true;
    listReminders()
      .then((items) => {
        if (active) setReminders(items);
      })
      .catch(() => {
        if (active) setMessage('Could not load your reminders.');
      });
    return () => {
      active = false;
    };
  }, [demo, opportunity.id]);
  const unfinished = opportunity.planItems.filter((task) => !task.isCompleted);
  const visible = reminders.flatMap((reminder) => {
    const task = unfinished.find((item) => item.id === reminder.planItemId);
    return task ? [{ reminder, task }] : [];
  });
  const due = visible.filter(({ reminder }) => Date.parse(reminder.dueAt) <= now);
  const button =
    'rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-50';

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setMessage('');
    try {
      const reminder = await saveReminder(taskId, new Date(when).toISOString());
      setReminders((current) => [
        ...current.filter((item) => item.planItemId !== reminder.planItemId),
        reminder,
      ]);
      setMessage('Reminder saved. Download it to your calendar for alerts when the app is closed.');
    } catch {
      setMessage('Could not save the reminder. Choose a future date and try again.');
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    setBusy(true);
    try {
      await removeReminder(id);
      setReminders((current) => current.filter((item) => item.id !== id));
      setMessage('Reminder removed. Delete any imported calendar event from your calendar too.');
    } catch {
      setMessage('Could not remove the reminder. Try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-4 rounded-2xl border border-primary/20 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-app">
          <Bell size={20} />
          Milestone reminders
        </h2>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          className={button}
        >
          {open ? 'Hide reminders' : 'Set a reminder'}
        </button>
      </div>
      {due.length > 0 && (
        <div role="status" className="rounded-xl bg-warning/10 p-3 text-sm text-app">
          {due.map(({ reminder, task }) => (
            <p key={reminder.id}>Due now · {task.title}</p>
          ))}
        </div>
      )}
      {open &&
        (demo ? (
          <p className="text-sm text-muted">
            Milestone reminders are available for saved live plans. Exit demo to set reminders for
            your own milestones.
          </p>
        ) : (
          <>
            <p className="text-sm text-muted">
              Saved reminders appear here while the app is open. Download a reminder and import it
              into your calendar for alerts while the app is closed. Your calendar controls
              notification delivery.
            </p>
            <form onSubmit={(event) => void save(event)}>
              <fieldset disabled={busy} className="space-y-3 text-sm text-app">
                <label className="block space-y-1">
                  <span>Milestone</span>
                  <select
                    required
                    value={taskId}
                    onChange={(event) => setTaskId(event.target.value)}
                    className="w-full rounded-lg border border-primary/20 bg-surface-light p-2 dark:bg-surface-dark"
                  >
                    <option value="">Choose an unfinished milestone</option>
                    {unfinished.map((task) => (
                      <option key={task.id} value={task.id}>
                        Week {task.week} · {task.title}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block space-y-1">
                  <span>Reminder date and time · your local time</span>
                  <input
                    type="datetime-local"
                    required
                    value={when}
                    onChange={(event) => setWhen(event.target.value)}
                    className="rounded-lg border border-primary/20 bg-surface-light p-2 dark:bg-surface-dark"
                  />
                </label>
                <button type="submit" disabled={!taskId || !when || busy} className={button}>
                  Save Reminder
                </button>
              </fieldset>
            </form>
            {visible.map(({ reminder, task }) => (
              <article
                key={reminder.id}
                className="space-y-2 rounded-xl border border-primary/20 p-3 text-sm text-app"
              >
                <h3 className="font-semibold">{task.title}</h3>
                <p>{new Date(reminder.dueAt).toLocaleString()}</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className={button}
                    onClick={() => {
                      const url = URL.createObjectURL(
                        new Blob([reminderCalendar(reminder, task)], {
                          type: 'text/calendar;charset=utf-8',
                        })
                      );
                      const anchor = document.createElement('a');
                      anchor.href = url;
                      anchor.download = 'restart-milestone.ics';
                      document.body.append(anchor);
                      anchor.click();
                      anchor.remove();
                      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
                    }}
                  >
                    <CalendarPlus size={16} className="mr-2 inline" />
                    Download calendar reminder
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void remove(reminder.id)}
                    className="rounded-lg px-3 py-2 text-danger"
                  >
                    <Trash2 size={16} className="mr-1 inline" />
                    Remove
                  </button>
                </div>
              </article>
            ))}
            {message && (
              <p role="status" className="text-sm text-app">
                {message}
              </p>
            )}
          </>
        ))}
    </section>
  );
}
