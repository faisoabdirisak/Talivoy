import { useRef, useState } from 'react';
import { Send, CheckCircle2 } from 'lucide-react';
import { submitAdviserFeedback } from '../lib/api';
import { AdviserFeedbackInputSchema, type AdviserFeedbackInput } from '@talivoy/shared';

export function AdviserResponseForm({ token }: { token: string }) {
  const requestId = useRef(crypto.randomUUID());
  const [values, setValues] = useState({
    reviewerName: '',
    reviewerRole: '',
    practicality: 'More information needed' as AdviserFeedbackInput['practicality'],
    assessment: '',
    milestoneSuggestion: '',
    nextStep: '',
    nextStepDetails: '',
  });
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const control =
    'mt-1 w-full rounded-xl border border-primary/20 bg-surface-light p-3 text-sm text-app dark:bg-surface-dark';
  const labels = {
    reviewerName: 'Your name',
    reviewerRole: 'Your role',
    assessment: 'How practical is this plan?',
    milestoneSuggestion: 'Milestone suggestions',
    nextStep: 'One recommended next step',
    nextStepDetails: 'How to take this next step',
  };
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy || sent) return;
    const parsed = AdviserFeedbackInputSchema.safeParse({
      ...values,
      token,
      requestId: requestId.current,
    });
    if (!parsed.success) {
      setError('Complete your name, role, assessment and recommended next step.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await submitAdviserFeedback(parsed.data);
      setSent(true);
    } catch {
      setError(
        'Could not submit feedback. The link may have expired or been revoked. Ask the worker for a new link or try again.'
      );
    } finally {
      setBusy(false);
    }
  }
  if (sent)
    return (
      <section role="status" className="rounded-xl border border-success/30 p-4">
        <p className="flex items-center gap-2 font-semibold">
          <CheckCircle2 size={18} />
          Feedback sent to the worker
        </p>
        <p className="mt-2 text-sm text-muted">
          They can review it privately and decide whether to add your recommended next step.
        </p>
      </section>
    );
  return (
    <section className="space-y-3 border-t border-primary/20 pt-5">
      <h2 className="text-xl font-semibold">Send private feedback</h2>
      <p className="text-sm text-muted">
        Your name, role and responses will be visible to the worker who shared this plan. Your role
        is self-reported. Review only the details shown above.
      </p>
      <form onSubmit={(event) => void submit(event)}>
        <fieldset disabled={busy} className="space-y-3">
          {(['reviewerName', 'reviewerRole'] as const).map((field) => (
            <label key={field} className="block text-sm font-medium">
              {labels[field]} *
              <input
                required
                maxLength={100}
                value={values[field]}
                className={control}
                onChange={(event) => {
                  setValues((current) => ({ ...current, [field]: event.target.value }));
                  requestId.current = crypto.randomUUID();
                }}
              />
            </label>
          ))}
          <label className="block text-sm font-medium">
            Practicality
            <select
              className={control}
              value={values.practicality}
              onChange={(event) => {
                setValues((current) => ({
                  ...current,
                  practicality: event.target.value as AdviserFeedbackInput['practicality'],
                }));
                requestId.current = crypto.randomUUID();
              }}
            >
              <option>Practical</option>
              <option>Needs changes</option>
              <option>More information needed</option>
            </select>
          </label>
          {(['assessment', 'milestoneSuggestion', 'nextStep', 'nextStepDetails'] as const).map(
            (field) => (
              <label key={field} className="block text-sm font-medium">
                {labels[field]}
                {field === 'assessment' || field === 'nextStep' ? ' *' : ''}
                <textarea
                  required={field === 'assessment' || field === 'nextStep'}
                  rows={field === 'nextStep' ? 2 : 3}
                  maxLength={field === 'nextStep' ? 200 : 1000}
                  value={values[field]}
                  className={control}
                  onChange={(event) => {
                    setValues((current) => ({ ...current, [field]: event.target.value }));
                    requestId.current = crypto.randomUUID();
                  }}
                />
              </label>
            )
          )}
          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}
          <button
            type="submit"
            className="rounded-xl bg-primary px-4 py-2 font-semibold text-white disabled:opacity-50"
          >
            <Send size={16} className="mr-2 inline" />
            {busy ? 'Sending…' : 'Send Feedback to Worker'}
          </button>
        </fieldset>
      </form>
    </section>
  );
}
