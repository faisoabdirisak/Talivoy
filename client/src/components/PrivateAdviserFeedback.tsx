import { useEffect, useState } from 'react';
import { MessageSquare, Plus, RefreshCw } from 'lucide-react';
import type { AdviserFeedback, Opportunity, PlanItem } from '@talivoy/shared';
import { listAdviserFeedback, acceptAdviserFeedback } from '../lib/api';

export function PrivateAdviserFeedback({
  opportunity,
  demo,
  onAdded,
}: {
  opportunity: Opportunity;
  demo: boolean;
  onAdded: (opportunityId: string, task: PlanItem) => void;
}) {
  const [open, setOpen] = useState(false);
  const [responses, setResponses] = useState<AdviserFeedback[]>([]);
  const [reviewed, setReviewed] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => {
    if (demo) return;
    let active = true;
    listAdviserFeedback(opportunity.id)
      .then((items) => {
        if (active) setResponses(items);
      })
      .catch(() => {
        if (active) setMessage('Could not load adviser feedback. Refresh to try again.');
      });
    return () => {
      active = false;
    };
  }, [demo, opportunity.id]);

  async function refresh() {
    setBusy(true);
    setMessage('');
    try {
      setResponses(await listAdviserFeedback(opportunity.id));
    } catch {
      setMessage('Could not load adviser feedback. Try again.');
    } finally {
      setBusy(false);
    }
  }
  async function accept(feedback: AdviserFeedback) {
    if (busy || !reviewed.includes(feedback.id)) return;
    setBusy(true);
    setMessage('');
    try {
      const item = await acceptAdviserFeedback(feedback.id);
      onAdded(opportunity.id, item);
      setResponses((current) =>
        current.map((row) =>
          row.id === feedback.id ? { ...row, acceptedAt: new Date().toISOString() } : row
        )
      );
      setMessage('Recommended next step added to Week 4.');
    } catch {
      setMessage('Could not add this next step. Check your session and try again.');
    } finally {
      setBusy(false);
    }
  }
  const button =
    'rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-50';
  return (
    <section className="space-y-4 rounded-2xl border border-primary/20 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-app">
          <MessageSquare size={20} />
          Private adviser feedback{' '}
          {responses.length > 0 && <span className="text-sm text-muted">({responses.length})</span>}
        </h2>
        <button
          type="button"
          className={button}
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          {open ? 'Hide feedback' : 'Review feedback'}
        </button>
      </div>
      {open &&
        (demo ? (
          <p className="text-sm text-muted">
            Use a saved live plan and create a review link to invite private adviser feedback.
          </p>
        ) : (
          <>
            <p className="text-sm text-muted">
              Responses below are private to your guest session. Names and roles are self-reported.
              Review each suggestion before adding a next step.
            </p>
            <button type="button" disabled={busy} onClick={() => void refresh()} className={button}>
              <RefreshCw size={14} className="mr-2 inline" />
              Refresh responses
            </button>
            {responses.length === 0 && (
              <p className="text-sm text-muted">
                No responses yet. Create an adviser review link and share it with your adviser.
              </p>
            )}
            {responses.map((feedback) => (
              <article
                key={feedback.id}
                className="space-y-3 rounded-xl border border-primary/20 p-4 text-sm text-app"
              >
                <h3 className="font-semibold">
                  {feedback.reviewerName} · {feedback.reviewerRole}
                </h3>
                <p className="text-xs text-muted">
                  {new Date(feedback.createdAt).toLocaleString()} · {feedback.practicality}
                </p>
                <p>{feedback.assessment}</p>
                {feedback.milestoneSuggestion && (
                  <div>
                    <h4 className="font-semibold">Milestone suggestions</h4>
                    <p>{feedback.milestoneSuggestion}</p>
                  </div>
                )}
                <div className="rounded-lg bg-primary/5 p-3">
                  <h4 className="font-semibold">Recommended next step</h4>
                  <p>{feedback.nextStep}</p>
                  {feedback.nextStepDetails && <p>{feedback.nextStepDetails}</p>}
                </div>
                {!feedback.acceptedAt && (
                  <label className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      disabled={busy}
                      checked={reviewed.includes(feedback.id)}
                      onChange={(event) =>
                        setReviewed((current) =>
                          event.target.checked
                            ? [...current, feedback.id]
                            : current.filter((id) => id !== feedback.id)
                        )
                      }
                    />
                    I reviewed this next step and want to add it to my plan.
                  </label>
                )}
                <button
                  type="button"
                  className={button}
                  disabled={busy || Boolean(feedback.acceptedAt) || !reviewed.includes(feedback.id)}
                  onClick={() => void accept(feedback)}
                >
                  <Plus size={14} className="mr-2 inline" />
                  {feedback.acceptedAt ? 'Added to plan' : 'Add Reviewed Next Step'}
                </button>
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
