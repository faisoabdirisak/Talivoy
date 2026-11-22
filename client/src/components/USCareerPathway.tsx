import { useEffect, useState } from 'react';
import { Compass, ExternalLink, Save, Plus, CheckCircle2 } from 'lucide-react';
import type {
  AnalyzeRequest,
  Opportunity,
  PlanItem,
  CareerPathwayItem,
  PathwayStep,
  PathwayItemInput,
} from '@talivoy/shared';
import {
  PATHWAY_STATES,
  PATHWAY_CAREERS,
  getPathwaySteps,
  PathwayStateSchema,
  PathwayCareerSchema,
} from '@talivoy/shared';
import { listPathwayItems, savePathwayItem, addPathwayAction } from '../lib/api';

type State = keyof typeof PATHWAY_STATES;
type Career = keyof typeof PATHWAY_CAREERS;
type Props = {
  opportunity: Opportunity;
  profile?: Partial<AnalyzeRequest>;
  demo: boolean;
  onAdded: (opportunityId: string, task: PlanItem) => void;
};
const button =
  'rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-50';
const control =
  'mt-1 w-full rounded-xl border border-primary/20 bg-surface-light p-3 text-sm text-app dark:bg-surface-dark';

export function USCareerPathway({ opportunity, profile, demo, onAdded }: Props) {
  const [open, setOpen] = useState(false);
  const [backgroundNotes, setBackgroundNotes] = useState(() =>
    [profile?.currentRole, profile?.skills, profile?.experience, profile?.education]
      .filter(Boolean)
      .join('\n')
  );
  const [state, setState] = useState<State | ''>('');
  const [career, setCareer] = useState<Career | ''>('');
  const [items, setItems] = useState<CareerPathwayItem[]>([]);
  const [loading, setLoading] = useState(!demo);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (demo) return;
    let active = true;
    setLoading(true);
    listPathwayItems(opportunity.id)
      .then((rows) => {
        if (!active) return;
        setItems(rows);
        const latest = rows[0];
        if (
          latest &&
          PathwayStateSchema.safeParse(latest.state).success &&
          PathwayCareerSchema.safeParse(latest.career).success
        ) {
          setState(latest.state);
          setCareer(latest.career);
        }
        setError('');
      })
      .catch(() => {
        if (active) setError('Could not load saved pathway steps. Retry before making changes.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [opportunity.id, demo, attempt]);

  const steps = state && career ? getPathwaySteps(state, career) : [];
  const selected = items.filter((item) => item.state === state && item.career === career);
  const completed = selected.filter((item) => item.status === 'Completed').length;

  function update(item: CareerPathwayItem) {
    setItems((current) => [
      item,
      ...current.filter(
        (row) =>
          !(row.state === item.state && row.career === item.career && row.stepKey === item.stepKey)
      ),
    ]);
  }
  return (
    <section className="space-y-4 rounded-2xl border border-primary/20 bg-primary/5 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-app">
            <Compass size={20} />
            My U.S. Career Pathway
          </h2>
          <p className="mt-1 text-sm text-muted">
            Connect your experience with local requirements and practical next steps.
          </p>
        </div>
        <button
          type="button"
          className={button}
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          {open ? 'Hide pathway' : 'Explore My Pathway'}
        </button>
      </div>
      {open && (
        <>
          <p className="text-sm text-muted">
            Initial coverage includes Illinois and Minnesota for Registered Nurse and Software
            Developer. These are sourced questions to investigate. Confirm current requirements with
            the relevant board, employer or adviser.
          </p>
          <article className="space-y-2 rounded-xl border border-primary/20 p-4 text-sm text-app">
            <h3 className="font-semibold">Your background to discuss</h3>
            <label className="block font-medium">
              Strengths, experience and qualifications
              <textarea
                rows={3}
                maxLength={4000}
                className={control}
                value={backgroundNotes}
                onChange={(event) => setBackgroundNotes(event.target.value)}
                placeholder="Review your existing experience and qualifications, including those earned abroad."
              />
            </label>
            <p className="text-xs text-muted">
              This space starts with profile details available in this visit. These notes stay on
              this page; record any findings you want to keep in the checklist below.
            </p>
          </article>
          <p className="text-xs text-muted">
            Checklist labels reflect your own review. A “Confirmed” label records your update; the
            relevant authority decides qualification or licensing requirements. Plan checkboxes
            track action completion.
          </p>
          {demo && (
            <p className="text-sm text-muted">
              Fictional demo · pathway notes and actions are temporary.
            </p>
          )}
          {loading && (
            <p role="status" className="text-sm text-muted">
              Loading saved pathway…
            </p>
          )}
          {error && (
            <div role="alert" className="space-y-2 text-sm text-danger">
              <p>{error}</p>
              <button
                type="button"
                className={button}
                onClick={() => setAttempt((value) => value + 1)}
              >
                Retry
              </button>
            </div>
          )}
          <fieldset disabled={loading || Boolean(error)} className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-medium text-app">
              State you want to work in
              <select
                value={state}
                className={control}
                onChange={(event) => setState(event.target.value as State | '')}
              >
                <option value="">Choose a state</option>
                {Object.entries(PATHWAY_STATES).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-medium text-app">
              Career to explore
              <select
                value={career}
                className={control}
                onChange={(event) => setCareer(event.target.value as Career | '')}
              >
                <option value="">Choose a career</option>
                {Object.entries(PATHWAY_CAREERS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </fieldset>
          {state && career && !loading && !error && (
            <>
              <p className="flex items-center gap-2 text-sm font-medium text-app">
                <CheckCircle2 size={16} />
                {completed}/{steps.length} checklist steps marked completed ·{' '}
                {PATHWAY_CAREERS[career]} in {PATHWAY_STATES[state]}
              </p>
              <p className="text-sm text-muted">
                Approved actions will be added to the plan for <strong>{opportunity.title}</strong>.
              </p>
              <div className="space-y-4">
                {steps.map((step) => {
                  const saved = selected.find((item) => item.stepKey === step.key);
                  return (
                    <PathwayStepCard
                      key={state + career + step.key + (saved?.id ?? '')}
                      step={step}
                      saved={saved}
                      state={state}
                      career={career}
                      opportunityId={opportunity.id}
                      demo={demo}
                      onSaved={update}
                      onAdded={onAdded}
                    />
                  );
                })}
              </div>
              <p className="text-sm text-muted">
                To discuss a step with an adviser, add its reviewed action to your plan, then choose
                that milestone when creating a review link.
              </p>
            </>
          )}
        </>
      )}
    </section>
  );
}

function PathwayStepCard({
  step,
  saved,
  state,
  career,
  opportunityId,
  demo,
  onSaved,
  onAdded,
}: {
  step: PathwayStep;
  saved?: CareerPathwayItem;
  state: State;
  career: Career;
  opportunityId: string;
  demo: boolean;
  onSaved: (item: CareerPathwayItem) => void;
  onAdded: Props['onAdded'];
}) {
  const [status, setStatus] = useState<PathwayItemInput['status']>(saved?.status ?? 'To check');
  const [notes, setNotes] = useState(saved?.notes ?? '');
  const [reviewed, setReviewed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const dirty = !saved || status !== saved.status || notes !== saved.notes;

  async function save() {
    if (busy) return;
    setBusy(true);
    setMessage('');
    const input = { opportunityId, state, career, stepKey: step.key, status, notes };
    try {
      const item = demo
        ? {
            ...input,
            id: saved?.id ?? crypto.randomUUID(),
            reviewedAt: status === 'To check' ? null : new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            planItemId: saved?.planItemId ?? null,
          }
        : await savePathwayItem(input);
      setNotes(item.notes);
      setStatus(item.status);
      onSaved(item);
      setReviewed(false);
      setMessage('Checklist step saved.');
    } catch {
      setMessage('Could not save this step. Try again.');
    } finally {
      setBusy(false);
    }
  }

  async function add() {
    if (!saved || !reviewed || busy || dirty) return;
    setBusy(true);
    setMessage('');
    try {
      const item: PlanItem = demo
        ? {
            id: 'pathway-demo-' + saved.id,
            title: step.title,
            description: step.description + '\nQuestion to discuss: ' + step.question,
            resourceUrl: step.sourceUrl,
            day: 30,
            week: 4,
            isCompleted: false,
          }
        : await addPathwayAction(saved.id);
      onAdded(opportunityId, item);
      onSaved({ ...saved, planItemId: item.id });
      setMessage('Reviewed action added to Week 4. You can select it for adviser sharing.');
    } catch {
      setMessage('Could not add this action. Check your session and try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="space-y-3 rounded-xl border border-primary/20 bg-surface-light p-4 text-sm text-app dark:bg-surface-dark">
      <h3 className="font-semibold">{step.title}</h3>
      <p>{step.description}</p>
      <p className="rounded-lg bg-primary/5 p-3">
        <strong>Ask your adviser</strong> · {step.question}
      </p>
      <div className="text-xs text-muted">
        <a
          className="inline-flex items-center gap-1 text-primary hover:underline"
          href={step.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          {step.sourceName}
          <ExternalLink size={12} aria-hidden="true" />
        </a>
        <p>Source reviewed {step.sourceReviewed}</p>
        {saved?.reviewedAt && (
          <p>Your review recorded {new Date(saved.reviewedAt).toLocaleString()}</p>
        )}
      </div>
      <fieldset disabled={busy} className="space-y-3">
        <label className="block font-medium">
          My checklist status
          <select
            value={status}
            className={control}
            onChange={(event) => {
              setStatus(event.target.value as PathwayItemInput['status']);
              setReviewed(false);
            }}
          >
            <option>To check</option>
            <option>Confirmed</option>
            <option>Completed</option>
          </select>
        </label>
        <label className="block font-medium">
          My notes
          <textarea
            rows={2}
            maxLength={1000}
            value={notes}
            className={control}
            onChange={(event) => {
              setNotes(event.target.value);
              setReviewed(false);
            }}
            placeholder="Record what you checked and questions to discuss."
          />
        </label>
        <button
          type="button"
          className={button}
          disabled={!dirty || busy}
          onClick={() => void save()}
        >
          <Save size={14} className="mr-2 inline" />
          Save Step
        </button>
        {!saved?.planItemId && status !== 'Completed' && (
          <label className="flex items-start gap-2">
            <input
              type="checkbox"
              checked={reviewed}
              disabled={dirty}
              onChange={(event) => setReviewed(event.target.checked)}
            />
            I reviewed this action and want to add it to my 30-day plan.
          </label>
        )}
        <button
          type="button"
          className={button}
          disabled={
            busy || dirty || !reviewed || Boolean(saved?.planItemId) || status === 'Completed'
          }
          onClick={() => void add()}
        >
          <Plus size={14} className="mr-2 inline" />
          {saved?.planItemId ? 'Added to plan' : 'Add Reviewed Action'}
        </button>
      </fieldset>
      {message && <p role="status">{message}</p>}
    </article>
  );
}
