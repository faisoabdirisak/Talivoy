import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowLeft,
  Columns2,
  Target,
  X,
  Wallet,
  Clock3,
  GraduationCap,
  ShieldCheck,
  Footprints,
  Sparkles,
  ExternalLink,
  ListChecks,
} from 'lucide-react';
import type { AnalyzeRequest, Opportunity } from '@talivoy/shared';
import { getPathwaySteps, PATHWAY_STATES, PATHWAY_CAREERS } from '@talivoy/shared';
import {
  compareCareerPreference,
  weeklyTimeFit,
  type CareerPreference,
  type OptionReview,
} from '../lib/careerComparison';
import { CategoryBadge } from './CategoryBadge';

const usd = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
});
const control =
  'w-full rounded-xl border border-border-light bg-surface-light p-2.5 text-sm text-app focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:border-border-dark dark:bg-surface-dark';
const preferences = [
  { id: 'balanced', label: 'See all trade-offs', icon: Columns2 },
  { id: 'cost', label: 'Lower cost', icon: Wallet },
  { id: 'speed', label: 'Faster transition', icon: Clock3 },
  { id: 'physical', label: 'Less physical work', icon: Footprints },
] as const;
const cueLabels = {
  cost: 'Lowest known estimated cost',
  speed: 'Shortest known launch estimate',
  physical: 'Lowest physical demand in your review',
};

export function OpportunityComparison({
  opportunities,
  budget,
  focusedId,
  onFocus,
  error,
  profile,
  onViewPlan,
}: {
  opportunities: Opportunity[];
  budget?: number;
  focusedId: string | null;
  onFocus: (id: string) => Promise<void>;
  error: string | null;
  profile?: Partial<AnalyzeRequest>;
  onViewPlan?: (id: string) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const headingId = useId();
  const [open, setOpen] = useState(false);
  const [preference, setPreference] = useState<CareerPreference>('balanced');
  const [budgetText, setBudgetText] = useState(budget?.toString() ?? '');
  const [hours, setHours] = useState('');
  const [state, setState] = useState<'' | 'IL' | 'MN'>('');
  const [reviews, setReviews] = useState<Record<string, OptionReview>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);
  const comparisonBudget =
    budgetText.trim() && Number.isFinite(Number(budgetText)) && Number(budgetText) >= 0
      ? Number(budgetText)
      : undefined;
  const cue = compareCareerPreference(opportunities, preference, reviews);
  function review(id: string, patch: Partial<OptionReview>) {
    setReviews((previous) => ({ ...previous, [id]: { ...previous[id], ...patch } }));
  }
  function close() {
    dialog.current?.close();
    setOpen(false);
  }
  async function focus(id: string) {
    setSaving(true);
    setSaveError('');
    try {
      await onFocus(id);
    } catch {
      setSaveError('Could not save your choice. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          dialog.current?.showModal();
          setOpen(true);
        }}
        className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-md transition hover:-translate-y-0.5 hover:bg-primary-hover focus-visible:ring-2 focus-visible:ring-primary"
      >
        <Columns2 size={18} aria-hidden="true" /> Compare My Career Options
      </button>
      {createPortal(
        <dialog
          ref={dialog}
          aria-labelledby={headingId}
          onClose={() => setOpen(false)}
          className="m-auto max-h-[96dvh] w-[calc(100%_-_1rem)] max-w-7xl overflow-y-auto rounded-2xl bg-surface-light p-0 text-app shadow-2xl backdrop:bg-black/65 dark:bg-surface-dark"
        >
          <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-primary/20 bg-surface-light px-4 py-4 dark:bg-surface-dark sm:px-6">
            <button
              type="button"
              onClick={close}
              className="inline-flex items-center gap-1 rounded-lg p-2 text-primary hover:bg-primary/10"
            >
              <ArrowLeft size={18} aria-hidden="true" /> Back
            </button>
            <h2 id={headingId} className="text-center text-lg font-bold sm:text-xl">
              Compare My Career Options
            </h2>
            <button
              type="button"
              aria-label="Close comparison"
              onClick={close}
              className="rounded-lg p-2 hover:bg-primary/10"
            >
              <X size={20} aria-hidden="true" />
            </button>
          </header>
          <div className="space-y-6 p-4 sm:p-6">
            <section className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 to-emerald-500/5 p-5">
              <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-primary">
                <Sparkles size={18} aria-hidden="true" /> Your next chapter, your choice
              </p>
              <p className="text-sm text-muted">
                Compare all your recommendations before choosing a plan. Preferences highlight one
                trade-off; they do not change your fit scores, completed tasks or selected plan.
              </p>
              <fieldset className="mt-4">
                <legend className="mb-2 font-semibold">What matters most to me?</legend>
                <div className="flex flex-wrap gap-2">
                  {preferences.map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      type="button"
                      aria-pressed={preference === id}
                      onClick={() => setPreference(id)}
                      className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm transition ${preference === id ? 'border-primary bg-primary text-white' : 'border-primary/20 bg-surface-light text-app hover:bg-primary/10 dark:bg-surface-dark'}`}
                    >
                      <Icon size={16} aria-hidden="true" />
                      {label}
                    </button>
                  ))}
                </div>
              </fieldset>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <label className="grid gap-1 text-sm">
                  Budget for this comparison (USD)
                  <input
                    className={control}
                    type="number"
                    min="0"
                    step="0.01"
                    value={budgetText}
                    placeholder="Unknown until entered"
                    onChange={(event) => setBudgetText(event.target.value)}
                  />
                </label>
                <label className="grid gap-1 text-sm">
                  My available hours per week
                  <input
                    className={control}
                    type="number"
                    min="0.5"
                    max="168"
                    step="0.5"
                    value={hours}
                    placeholder="For example, 2"
                    onChange={(event) => setHours(event.target.value)}
                  />
                </label>
                <label className="grid gap-1 text-sm">
                  State for entry sources
                  <select
                    className={control}
                    value={state}
                    onChange={(event) => setState(event.target.value as typeof state)}
                  >
                    <option value="">Choose a state</option>
                    {Object.entries(PATHWAY_STATES).map(([id, name]) => (
                      <option key={id} value={id}>
                        {name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <p className="mt-3 text-xs text-muted">
                {profile?.skills
                  ? `Skills you entered: ${profile.skills}`
                  : 'Original profile details are not restored after refresh. Add your own skills and training notes below.'}
              </p>
            </section>
            <div role="status" className="rounded-xl border border-primary/20 p-4 text-sm">
              {preference === 'balanced' ? (
                'Review the factors below. No preference-based recommendation is selected.'
              ) : (
                <>
                  <strong>{cueLabels[preference]}: </strong>
                  {cue.ids.length
                    ? opportunities
                        .filter((item) => cue.ids.includes(item.id))
                        .map((item) => item.title)
                        .join(' · ')
                    : 'Not enough information yet.'}
                  {preference === 'physical'
                    ? ' Based only on the physical-demand ratings you enter below; no physical demands are inferred from job titles.'
                    : ' Based on saved unverified estimates, not current quotes or employment guarantees.'}
                  {cue.missing > 0 &&
                    ` ${cue.missing} option(s) have unknown values, so this is not a complete ranking.`}
                  {cue.ids.length > 1 && ' These options are tied on this factor.'}
                </>
              )}
            </div>
            <p className="text-xs text-muted">
              Fictional demo data stays fictional. Live AI costs, skill-fit ratings and launch times
              are unverified estimates. Your notes, time estimates and physical-demand ratings are
              temporary: they clear when you leave these results or refresh, and are not saved or
              sent to AI.
            </p>
            {(error || saveError) && (
              <p
                role="alert"
                className="rounded-xl border border-danger/30 p-3 text-sm text-danger"
              >
                {error || saveError}
              </p>
            )}
            <div className="grid items-start gap-4 lg:grid-cols-3">
              {opportunities.map((item) => {
                const assessment = reviews[item.id] ?? {};
                const cost = item.explanation?.estimatedCostUSD;
                const focused = focusedId === item.id;
                const next = [...item.planItems]
                  .sort((a, b) => a.day - b.day)
                  .find((task) => !task.isCompleted);
                const steps =
                  state && assessment.career ? getPathwaySteps(state, assessment.career) : [];
                return (
                  <article
                    key={item.id}
                    aria-label={item.title}
                    className={`min-w-0 overflow-hidden rounded-2xl border shadow-card ${cue.ids.includes(item.id) ? 'border-primary ring-2 ring-primary/20' : 'border-border-light dark:border-border-dark'}`}
                  >
                    <div className="space-y-3 border-b border-primary/10 bg-primary/5 p-5">
                      <CategoryBadge category={item.category} />
                      <h3 className="text-lg font-bold">{item.title}</h3>
                      <p className="text-sm text-muted">{item.summary}</p>
                      <span className="inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                        Fit score {item.feasibilityScore}/100 · unchanged
                      </span>
                      {cue.ids.includes(item.id) && (
                        <p className="text-xs font-semibold text-primary">
                          Highlighted for your chosen factor
                        </p>
                      )}
                    </div>
                    <div className="space-y-5 p-5">
                      <section aria-label="Existing skills">
                        <h4 className="flex items-center gap-2 font-semibold">
                          <Target size={17} aria-hidden="true" /> Existing skills
                        </h4>
                        <p className="mt-2 text-sm text-muted">{item.reasoning}</p>
                        <p className="mt-1 text-xs text-muted">
                          {item.explanation
                            ? `Skill-fit estimate: ${item.explanation.signals.skillFitPct}/100. This is not a verified skills assessment.`
                            : 'Skill-fit estimate unavailable.'}
                        </p>
                        <label className="mt-2 grid gap-1 text-xs">
                          My skills to carry into {item.title}
                          <textarea
                            className={control}
                            rows={2}
                            maxLength={1000}
                            value={assessment.skills ?? ''}
                            placeholder="Add skills you can demonstrate"
                            onChange={(event) => review(item.id, { skills: event.target.value })}
                          />
                        </label>
                      </section>
                      <section aria-label="Training">
                        <h4 className="flex items-center gap-2 font-semibold">
                          <GraduationCap size={17} aria-hidden="true" /> Training and skill gaps
                        </h4>
                        <p className="mt-2 text-xs text-muted">
                          No verified qualification or skills-gap assessment is stored for this
                          option. Review the plan and confirm requirements with a provider or
                          adviser.
                        </p>
                        <p className="mt-2 text-xs font-semibold">
                          Proposed early plan steps to investigate
                        </p>
                        <ul className="mt-1 list-inside list-disc space-y-1 text-xs text-muted">
                          {[...item.planItems]
                            .sort((a, b) => a.day - b.day)
                            .slice(0, 3)
                            .map((task) => (
                              <li key={task.id}>{task.title}</li>
                            ))}
                        </ul>
                        <label className="mt-2 grid gap-1 text-xs">
                          Training to investigate for {item.title}
                          <textarea
                            className={control}
                            rows={2}
                            maxLength={1000}
                            value={assessment.training ?? ''}
                            placeholder="Qualifications, learning steps or gaps to check"
                            onChange={(event) => review(item.id, { training: event.target.value })}
                          />
                        </label>
                      </section>
                      <section aria-label="Estimated cost">
                        <h4 className="flex items-center gap-2 font-semibold">
                          <Wallet size={17} aria-hidden="true" /> Estimated cost
                        </h4>
                        <p className="mt-2 text-lg font-bold">
                          {cost == null ? 'Cost unknown' : usd.format(cost)}
                        </p>
                        <p className="text-xs text-muted">
                          {item.explanation?.source === 'fictional-demo'
                            ? 'Fictional demo estimate'
                            : 'Unverified startup estimate'}
                        </p>
                        {cost != null && comparisonBudget !== undefined && (
                          <p
                            className={`mt-1 text-sm font-medium ${cost > comparisonBudget ? 'text-danger' : 'text-app'}`}
                          >
                            {cost <= comparisonBudget
                              ? 'Within budget'
                              : `${usd.format(cost - comparisonBudget)} over budget`}
                          </p>
                        )}
                      </section>
                      <section aria-label="Time commitment">
                        <h4 className="flex items-center gap-2 font-semibold">
                          <Clock3 size={17} aria-hidden="true" /> Time commitment
                        </h4>
                        <p className="mt-2 text-sm text-muted">
                          {item.explanation
                            ? `${item.explanation.signals.launchTimeDays} days · unverified launch estimate`
                            : 'Launch time unknown'}
                        </p>
                        <label className="mt-2 grid gap-1 text-xs">
                          My estimated weekly hours for {item.title}
                          <input
                            className={control}
                            type="number"
                            min="0.5"
                            max="168"
                            step="0.5"
                            value={assessment.hours ?? ''}
                            placeholder="Unknown until reviewed"
                            onChange={(event) => review(item.id, { hours: event.target.value })}
                          />
                        </label>
                        <p className="mt-1 text-xs text-muted">
                          {weeklyTimeFit(assessment.hours, hours)}. Launch time does not establish
                          weekly effort.
                        </p>
                      </section>
                      <section aria-label="Physical demands">
                        <h4 className="flex items-center gap-2 font-semibold">
                          <Footprints size={17} aria-hidden="true" /> Physical demands
                        </h4>
                        <label className="mt-2 grid gap-1 text-xs">
                          My reviewed physical demands for {item.title}
                          <select
                            className={control}
                            value={assessment.physical ?? ''}
                            onChange={(event) =>
                              review(item.id, {
                                physical: event.target.value as OptionReview['physical'],
                              })
                            }
                          >
                            <option value="">Not assessed</option>
                            <option value="low">Lower</option>
                            <option value="medium">Moderate</option>
                            <option value="high">Higher</option>
                          </select>
                        </label>
                        <p className="mt-1 text-xs text-muted">
                          Your assessment only; check actual duties and workplace accommodations.
                        </p>
                      </section>
                      <section aria-label="Entry requirements">
                        <h4 className="flex items-center gap-2 font-semibold">
                          <ShieldCheck size={17} aria-hidden="true" /> Entry requirements
                        </h4>
                        <label className="mt-2 grid gap-1 text-xs">
                          Matching catalog career for {item.title}
                          <select
                            className={control}
                            value={assessment.career ?? ''}
                            onChange={(event) =>
                              review(item.id, {
                                career: event.target.value as OptionReview['career'],
                              })
                            }
                          >
                            <option value="">No matching career selected</option>
                            {Object.entries(PATHWAY_CAREERS).map(([id, name]) => (
                              <option key={id} value={id}>
                                {name}
                              </option>
                            ))}
                          </select>
                        </label>
                        {steps.length ? (
                          <ul className="mt-2 space-y-3">
                            {steps.map((step) => (
                              <li key={step.key} className="rounded-lg bg-primary/5 p-2 text-xs">
                                <p className="font-semibold">{step.title}</p>
                                <p className="my-1 text-muted">{step.question}</p>
                                <a
                                  href={step.sourceUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-primary underline"
                                >
                                  {step.sourceName}
                                  <ExternalLink size={12} aria-hidden="true" />
                                </a>
                                <p className="mt-1 text-muted">
                                  Catalog reviewed {step.sourceReviewed}; verify current rules.
                                </p>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="mt-2 text-xs text-muted">
                            Choose a state and a catalog career only if it matches this opportunity
                            to see sources. The catalog covers Illinois/Minnesota nursing and
                            software development only; other options need adviser research.
                          </p>
                        )}
                      </section>
                      <section aria-label="First milestone">
                        <h4 className="flex items-center gap-2 font-semibold">
                          <ListChecks size={17} aria-hidden="true" /> First unfinished milestone
                        </h4>
                        <p className="mt-2 text-sm">
                          {next
                            ? `Day ${next.day} · ${next.title}`
                            : item.planItems.length
                              ? 'Plan complete'
                              : 'No tasks available'}
                        </p>
                        <p className="mt-1 text-xs text-muted">
                          {next
                            ? 'Review this next action before scheduling it this week.'
                            : 'Review your progress with an adviser.'}
                        </p>
                      </section>
                      {item.explanation?.risks && (
                        <p className="rounded-xl bg-amber-500/10 p-3 text-xs text-muted">
                          <strong>Risk to check: </strong>
                          {item.explanation.risks}
                        </p>
                      )}
                      <button
                        type="button"
                        disabled={saving || focused}
                        onClick={() => void focus(item.id)}
                        aria-label={focused ? `Focused on ${item.title}` : `Focus on ${item.title}`}
                        className="w-full rounded-xl bg-primary px-3 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-60"
                      >
                        {focused ? 'Focused' : saving ? 'Saving choice…' : 'Choose this plan'}
                      </button>
                      {onViewPlan && (
                        <button
                          type="button"
                          onClick={() => {
                            close();
                            onViewPlan(item.id);
                          }}
                          className="w-full rounded-xl border border-primary/30 p-2 text-sm text-primary hover:bg-primary/10"
                          aria-label={`View plan for ${item.title}`}
                        >
                          View 30-day plan
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </dialog>,
        document.body
      )}
    </>
  );
}
