import { useState } from 'react';
import { BriefcaseBusiness, CheckCircle2, Search, Plus, CircleHelp } from 'lucide-react';
import type {
  AnalyzeRequest,
  Opportunity,
  PlanItem,
  JobComparisonResult,
} from '@talivoy/shared';
import { compareJob, addJobAction } from '../lib/api';

interface Props {
  opportunity: Opportunity;
  profile?: Partial<AnalyzeRequest>;
  demo: boolean;
  onAdded: (opportunityId: string, item: PlanItem) => void;
}

export function JobPostingComparison({ opportunity, profile, demo, onAdded }: Props) {
  const [open, setOpen] = useState(false);
  const [worker, setWorker] = useState(() =>
    profile
      ? [profile.currentRole, profile.skills, profile.experience, profile.education]
          .filter(Boolean)
          .join('\n')
      : ''
  );
  const [posting, setPosting] = useState('');
  const [result, setResult] = useState<JobComparisonResult | null>(null);
  const [pending, setPending] = useState(false);
  const [saving, setSaving] = useState(false);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState('');
  const control =
    'w-full rounded-xl border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark p-3 text-sm text-app';
  const button =
    'rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-50';

  async function compare(event: React.FormEvent) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError('');
    setResult(null);
    setAdded(false);
    try {
      setResult(
        await compareJob({
          opportunityId: opportunity.id,
          opportunityTitle: opportunity.title,
          profile: worker,
          posting,
          demo,
        })
      );
    } catch {
      setError('Could not compare this posting. Check your session and try again.');
    } finally {
      setPending(false);
    }
  }

  async function save() {
    if (!result || saving || added) return;
    setSaving(true);
    setError('');
    try {
      const item = demo
        ? {
            id: 'job-demo-' + crypto.randomUUID(),
            ...result.action,
            day: 30,
            week: 4,
            isCompleted: false,
          }
        : await addJobAction(opportunity.id, result);
      onAdded(opportunity.id, item);
      setAdded(true);
    } catch {
      setError('Could not save the action. Retry or run the comparison again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section
      className="mt-6 space-y-4 rounded-2xl border border-primary/20 bg-primary/5 p-5"
      aria-label="Job posting comparison"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-app">
            <BriefcaseBusiness size={20} />
            Compare My Skills to a Job Posting
          </h2>
          <p className="mt-1 text-sm text-muted">{opportunity.title}</p>
        </div>
        <button
          type="button"
          className={button}
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          {open ? 'Hide comparison' : 'Compare a job'}
        </button>
      </div>
      {open && (
        <>
          <p className="text-sm text-muted">
            Review your career details and paste a job posting. The configured AI service receives
            both when you compare.
            {demo && ' Demo actions stay in this tab. Use a fictional profile.'}
          </p>
          <form onSubmit={(event) => void compare(event)} className="space-y-4">
            <fieldset disabled={pending || saving} className="space-y-4">
              <label className="block space-y-2 text-sm font-medium text-app">
                <span>Your confirmed skills, role, experience and qualifications</span>
                <textarea
                  className={control}
                  rows={4}
                  required
                  minLength={20}
                  maxLength={4000}
                  value={worker}
                  placeholder="Add the details you want compared. You can paste them again after a page refresh."
                  onChange={(event) => {
                    setWorker(event.target.value);
                    setResult(null);
                    setAdded(false);
                  }}
                />
              </label>
              <label className="block space-y-2 text-sm font-medium text-app">
                <span>Job posting</span>
                <textarea
                  className={control}
                  rows={6}
                  required
                  minLength={50}
                  maxLength={7000}
                  value={posting}
                  placeholder="Paste the job title, responsibilities and requirements."
                  onChange={(event) => {
                    setPosting(event.target.value);
                    setResult(null);
                    setAdded(false);
                  }}
                />
              </label>
              <button className={button} type="submit">
                <Search size={16} className="mr-2 inline" />
                {pending ? 'Comparing…' : 'Compare My Skills'}
              </button>
            </fieldset>
          </form>
          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}
          {result && (
            <div className="space-y-4" aria-live="polite">
              <p className="text-sm text-muted">
                Review these AI suggestions against the original posting. Requirements and job
                availability need checking with the employer.
              </p>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-3 rounded-xl border border-success/20 p-4">
                  <h3 className="flex items-center gap-2 font-semibold text-app">
                    <CheckCircle2 size={18} />
                    What you already bring
                  </h3>
                  {result.matches.length === 0 && (
                    <p className="text-sm text-muted">No supported matches identified.</p>
                  )}
                  {result.matches.map((item, index) => (
                    <article
                      key={index}
                      className="space-y-1 border-t border-success/20 pt-3 text-sm text-app"
                    >
                      <h4 className="font-semibold">{item.requirement}</h4>
                      <p>{item.explanation}</p>
                      <p className="text-muted">Your profile — “{item.profileQuote}”</p>
                      <p className="text-muted">Posting — “{item.postingQuote}”</p>
                    </article>
                  ))}
                </div>
                <div className="space-y-3 rounded-xl border border-warning/30 p-4">
                  <h3 className="flex items-center gap-2 font-semibold text-app">
                    <CircleHelp size={18} />
                    What to check or build
                  </h3>
                  {result.gaps.length === 0 && (
                    <p className="text-sm text-muted">No additional questions identified.</p>
                  )}
                  {result.gaps.map((item, index) => (
                    <article
                      key={index}
                      className="space-y-1 border-t border-warning/30 pt-3 text-sm text-app"
                    >
                      <h4 className="font-semibold">{item.requirement}</h4>
                      <p>{item.question}</p>
                      <p className="text-muted">Posting — “{item.postingQuote}”</p>
                    </article>
                  ))}
                </div>
              </div>
              <article className="space-y-3 rounded-xl border border-primary/20 p-4 text-app">
                <h3 className="font-semibold">A practical next step</h3>
                <h4 className="font-medium">{result.action.title}</h4>
                <p className="text-sm">{result.action.description}</p>
                <p className="text-xs text-muted">
                  Review this suggestion before adding it as an additional Week 4 milestone.
                </p>
                <button
                  type="button"
                  className={button}
                  disabled={saving || added}
                  onClick={() => void save()}
                >
                  <Plus size={16} className="mr-2 inline" />
                  {added ? 'Added to your plan' : saving ? 'Saving…' : 'Add to My 30-Day Plan'}
                </button>
              </article>
            </div>
          )}
        </>
      )}
    </section>
  );
}
