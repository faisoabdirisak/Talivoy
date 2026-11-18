import { useEffect, useRef, useState } from 'react';
import { CalendarCheck, Check, History, SlidersHorizontal } from 'lucide-react';
import type { Opportunity, WeeklyCheckIn } from '@talivoy/shared';
import { WeeklyCheckInInputSchema } from '@talivoy/shared';
import { listCheckIns, saveCheckIn, refineCheckIn } from '../lib/api';

type Preview = Awaited<ReturnType<typeof refineCheckIn>> & { checkInId: string };

export function WeeklyCheckIns({
  opportunity,
  demo,
  onApply,
}: {
  opportunity: Opportunity;
  demo: boolean;
  onApply: (opportunity: Opportunity) => void;
}) {
  const [open, setOpen] = useState(false);
  const [history, setHistory] = useState<WeeklyCheckIn[]>([]);
  const [completedWork, setWork] = useState('');
  const [blockers, setBlockers] = useState('');
  const [budget, setBudget] = useState('0');
  const [hours, setHours] = useState('5');
  const [preview, setPreview] = useState<Preview | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const requestId = useRef(crypto.randomUUID());
  useEffect(() => {
    if (demo) return;
    let active = true;
    listCheckIns(opportunity.id)
      .then((items) => {
        if (active) setHistory(items);
      })
      .catch(() => {
        if (active)
          setMessage('Could not load your check-in history. Use Refresh history to try again.');
      });
    return () => {
      active = false;
    };
  }, [demo, opportunity.id]);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    const parsed = WeeklyCheckInInputSchema.safeParse({
      opportunityId: opportunity.id,
      requestId: requestId.current,
      completedWork,
      blockers,
      budget: budget.trim() ? Number(budget) : undefined,
      hours: hours.trim() ? Number(hours) : undefined,
    });
    if (!parsed.success) {
      setMessage('Record your progress, total available budget and 0.5–168 weekly hours.');
      return;
    }
    setBusy(true);
    setMessage('');
    try {
      const entry = await saveCheckIn(parsed.data);
      setHistory((current) => [entry, ...current.filter((item) => item.id !== entry.id)]);
      setPreview(null);
      setConfirmed(false);
      setWork('');
      setBlockers('');
      requestId.current = crypto.randomUUID();
      setMessage(
        'Check-in saved. Review proposed adjustments from your history when you are ready.'
      );
    } catch {
      setMessage('Could not save this check-in. Try again.');
    } finally {
      setBusy(false);
    }
  }
  async function refresh() {
    setBusy(true);
    setMessage('');
    try {
      setHistory(await listCheckIns(opportunity.id));
    } catch {
      setMessage('Could not load history. Try again.');
    } finally {
      setBusy(false);
    }
  }
  async function propose(id: string) {
    if (busy) return;
    setBusy(true);
    setMessage('');
    setPreview(null);
    setConfirmed(false);
    try {
      setPreview({ ...(await refineCheckIn(id)), checkInId: id });
    } catch {
      setMessage('Could not create a preview. Refresh history and try again.');
    } finally {
      setBusy(false);
    }
  }
  async function apply() {
    if (!preview || !confirmed || busy) return;
    setBusy(true);
    setMessage('');
    try {
      const result = await refineCheckIn(preview.checkInId, preview.revision);
      onApply(result.refined);
      setHistory((current) =>
        current.map((item) =>
          item.id === preview.checkInId ? { ...item, appliedAt: new Date().toISOString() } : item
        )
      );
      setPreview(null);
      setConfirmed(false);
      setMessage('Reviewed guidance applied to unfinished milestones.');
    } catch {
      setPreview(null);
      setConfirmed(false);
      setMessage('The saved plan may have changed. Refresh history and generate a new preview.');
    } finally {
      setBusy(false);
    }
  }
  const button =
    'rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-50';
  const control =
    'mt-1 w-full rounded-xl border border-primary/20 bg-surface-light p-3 text-sm text-app dark:bg-surface-dark';
  return (
    <section className="space-y-4 rounded-2xl border border-primary/20 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-app">
          <CalendarCheck size={20} />
          Weekly check-ins
        </h2>
        <button
          type="button"
          aria-expanded={open}
          className={button}
          onClick={() => setOpen(!open)}
        >
          {open ? 'Hide check-ins' : 'Check In This Week'}
        </button>
      </div>
      {open &&
        (demo ? (
          <p className="text-sm text-muted">
            Save a live plan to keep private weekly check-in history.
          </p>
        ) : (
          <>
            <p className="text-sm text-muted">
              Record your progress and blockers. Budget and available hours help propose time and
              cost guidance. Check off completed tasks in your plan to update dashboard progress.
            </p>
            <form onSubmit={(event) => void save(event)}>
              <fieldset disabled={busy} className="space-y-3">
                <label className="block text-sm font-medium text-app">
                  What did you complete or work on this week? *
                  <textarea
                    rows={3}
                    required
                    maxLength={1000}
                    value={completedWork}
                    className={control}
                    onChange={(event) => {
                      setWork(event.target.value);
                      requestId.current = crypto.randomUUID();
                    }}
                  />
                </label>
                <label className="block text-sm font-medium text-app">
                  What got in the way?
                  <textarea
                    rows={3}
                    maxLength={1000}
                    value={blockers}
                    className={control}
                    onChange={(event) => {
                      setBlockers(event.target.value);
                      requestId.current = crypto.randomUUID();
                    }}
                  />
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block text-sm font-medium text-app">
                    Total available budget (USD) *
                    <input
                      type="number"
                      required
                      min={0}
                      max={1000000}
                      step={1}
                      value={budget}
                      className={control}
                      onChange={(event) => {
                        setBudget(event.target.value);
                        requestId.current = crypto.randomUUID();
                      }}
                    />
                  </label>
                  <label className="block text-sm font-medium text-app">
                    Hours available per week *
                    <input
                      type="number"
                      required
                      min={0.5}
                      max={168}
                      step="any"
                      value={hours}
                      className={control}
                      onChange={(event) => {
                        setHours(event.target.value);
                        requestId.current = crypto.randomUUID();
                      }}
                    />
                  </label>
                </div>
                <button type="submit" className={button}>
                  {busy ? 'Working…' : 'Save Weekly Check-In'}
                </button>
              </fieldset>
            </form>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="flex items-center gap-2 font-semibold text-app">
                <History size={16} />
                Your check-in history
              </h3>
              <button
                type="button"
                disabled={busy}
                className={button}
                onClick={() => void refresh()}
              >
                Refresh history
              </button>
            </div>
            {history.length === 0 && (
              <p className="text-sm text-muted">Your saved check-ins will appear here.</p>
            )}
            {history.map((entry) => (
              <article
                key={entry.id}
                className="space-y-2 rounded-xl border border-primary/20 p-4 text-sm text-app"
              >
                <h4 className="font-semibold">{new Date(entry.createdAt).toLocaleDateString()}</h4>
                <p>
                  <strong>Progress</strong> · {entry.completedWork}
                </p>
                {entry.blockers && (
                  <p>
                    <strong>Blockers</strong> · {entry.blockers}
                  </p>
                )}
                <p>
                  Budget ${entry.budget} · {entry.hours} hours per week
                </p>
                <button
                  type="button"
                  disabled={busy || Boolean(entry.appliedAt)}
                  onClick={() => void propose(entry.id)}
                  className={button}
                >
                  <SlidersHorizontal size={14} className="mr-2 inline" />
                  {entry.appliedAt ? 'Guidance applied' : 'Review Proposed Adjustments'}
                </button>
              </article>
            ))}
            {preview && (
              <section
                className="space-y-3 rounded-xl border border-primary/30 bg-primary/5 p-4 text-sm text-app"
                aria-label="Check-in adjustment preview"
              >
                <h3 className="font-semibold">Review proposed guidance</h3>
                <p>
                  Time and budget rules adjust guidance for unfinished tasks. Your recorded blockers
                  remain in check-in history for discussion.
                </p>
                {preview.refined.planItems
                  .filter((item) => !item.isCompleted)
                  .map((item) => (
                    <article key={item.id} className="space-y-1 border-t border-primary/20 pt-3">
                      <h4 className="font-semibold">{item.title}</h4>
                      <p className="text-muted">
                        Current ·{' '}
                        {preview.original.planItems.find((original) => original.id === item.id)
                          ?.description || 'No guidance recorded.'}
                      </p>
                      <p>Proposed · {item.description}</p>
                    </article>
                  ))}
                <label className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={confirmed}
                    disabled={busy}
                    onChange={(event) => setConfirmed(event.target.checked)}
                  />
                  I reviewed these changes and want to apply them.
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className={button}
                    disabled={busy || !confirmed}
                    onClick={() => void apply()}
                  >
                    <Check size={14} className="mr-2 inline" />
                    Apply Reviewed Adjustments
                  </button>
                  <button
                    type="button"
                    className="rounded-xl px-4 py-2 font-semibold text-primary"
                    disabled={busy}
                    onClick={() => setPreview(null)}
                  >
                    Keep Current Plan
                  </button>
                </div>
              </section>
            )}
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
