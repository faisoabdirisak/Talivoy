import { useEffect, useState } from 'react';
import { FileCheck2, Plus, Pencil, Sparkles, Trash2 } from 'lucide-react';
import {
  EVIDENCE_SOURCES,
  SkillEvidenceInputSchema,
  evidenceBulletTemplate,
  type SkillEvidence,
  type SkillEvidenceInput,
} from '@talivoy/shared';
import {
  listSkillsEvidence,
  saveSkillsEvidence,
  suggestSkillsWording,
  deleteSkillsEvidence,
} from '../lib/api';

const control =
  'mt-1 w-full rounded-xl border border-primary/20 bg-surface-light p-3 text-sm text-app dark:bg-surface-dark';
const button =
  'rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-50';
export function MySkillsEvidence({
  opportunityId,
  demo,
  onChange,
}: {
  opportunityId: string;
  demo: boolean;
  onChange?: (items: SkillEvidence[]) => void;
}) {
  const blank = (): SkillEvidenceInput => ({
    opportunityId,
    skill: '',
    source: 'work',
    evidence: '',
    status: 'develop',
    nextStep: '',
    bullet: '',
    confirmWording: false,
  });
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<SkillEvidence[]>([]);
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState<string>();
  const [draftLabel, setDraftLabel] = useState('');
  const [allowAI, setAllowAI] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(!demo);
  const [loadFailed, setLoadFailed] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (demo) return;
    let active = true;
    setLoading(true);
    listSkillsEvidence(opportunityId)
      .then((rows) => {
        if (active) {
          setItems(rows);
          onChange?.(rows);
          setError('');
          setLoadFailed(false);
        }
      })
      .catch(() => {
        if (active) {
          setError('Could not load saved evidence. Retry before making changes.');
          setLoadFailed(true);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
    // onChange only reports loaded rows; opportunity identity controls this component's lifetime.
  }, [opportunityId, demo, attempt]);
  function change(rows: SkillEvidence[]) {
    setItems(rows);
    onChange?.(rows);
  }
  function reset() {
    setEditing(undefined);
    setForm(blank());
    setDraftLabel('');
    setAllowAI(false);
  }
  function edit(item: SkillEvidence) {
    setEditing(item.id);
    setForm({ ...item, confirmWording: false });
    setDraftLabel(
      item.bullet ? 'Previously worker-reviewed wording. Confirm again after edits.' : ''
    );
    setAllowAI(false);
    setNotice('');
  }
  function field(patch: Partial<SkillEvidenceInput>) {
    setForm((previous) => ({ ...previous, ...patch, bullet: '', confirmWording: false }));
    setDraftLabel('');
  }
  async function save(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    setNotice('');
    const parsed = SkillEvidenceInputSchema.safeParse(form);
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    setBusy(true);
    try {
      const item = demo
        ? ({
            ...parsed.data,
            id: editing ?? crypto.randomUUID(),
            revision: (crypto.randomUUID() + crypto.randomUUID()).replace(/-/g, ''),
            bulletReviewedAt: form.bullet ? new Date().toISOString() : null,
          } as SkillEvidence)
        : await saveSkillsEvidence(parsed.data, editing);
      change(editing ? items.map((row) => (row.id === item.id ? item : row)) : [...items, item]);
      reset();
      setNotice(
        demo
          ? 'Fictional demo evidence updated for this view.'
          : 'Evidence saved. You choose which examples enter an adviser report.'
      );
    } catch {
      setError('Could not save evidence. Reload before retrying if it changed in another tab.');
    } finally {
      setBusy(false);
    }
  }
  async function suggest(item: SkillEvidence, mode: 'template' | 'ai') {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const result = demo
        ? { bullet: evidenceBulletTemplate(item.evidence), item }
        : await suggestSkillsWording(item.id, mode);
      setEditing(item.id);
      setForm({ ...result.item, bullet: result.bullet, confirmWording: false });
      setDraftLabel(
        mode === 'ai'
          ? 'AI draft — check every fact before using it.'
          : 'Template draft — uses only your original example.'
      );
    } catch {
      setError('Could not generate supported wording. Edit your own text or try the template.');
    } finally {
      setBusy(false);
    }
  }
  async function remove(item: SkillEvidence) {
    if (
      !window.confirm(
        'Delete this skill evidence? Existing shared snapshots keep previously shared copies.'
      )
    )
      return;
    setBusy(true);
    setError('');
    try {
      if (!demo) await deleteSkillsEvidence(item);
      change(items.filter((row) => row.id !== item.id));
      if (editing === item.id) reset();
    } catch {
      setError('Could not delete evidence. Reload and retry.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="space-y-4 rounded-2xl border border-primary/20 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-app">
          <FileCheck2 size={20} />
          My Skills Evidence
        </h2>
        <button
          className={button}
          type="button"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          {open ? 'Hide evidence' : 'Build My Skills Evidence'}
        </button>
      </div>
      {open && (
        <>
          <p className="text-sm text-muted">
            Connect skills to work, education, volunteering or projects, including experience from
            another country. All evidence is self-reported, not independently verified. Avoid
            contact details, employer-confidential information and sensitive documents.
          </p>
          {demo && (
            <p className="text-sm text-muted">
              Fictional demo: examples stay in this dashboard view. AI rephrasing is available only
              for saved live evidence.
            </p>
          )}
          {loading && (
            <p role="status" className="text-sm text-muted">
              Loading saved evidence…
            </p>
          )}
          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}{' '}
              <button
                type="button"
                onClick={() => {
                  reset();
                  setAttempt(attempt + 1);
                }}
                className="underline"
              >
                Reload evidence
              </button>
            </p>
          )}
          {notice && (
            <p role="status" className="text-sm text-success">
              {notice}
            </p>
          )}
          <form
            onSubmit={(event) => void save(event)}
            className="space-y-3 rounded-xl bg-primary/5 p-4"
          >
            <fieldset disabled={busy || loading || loadFailed} className="space-y-3">
              <legend className="font-semibold text-app">
                {editing ? 'Review this skill' : 'Add a skill'}
              </legend>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-sm text-app">
                  Skill *
                  <input
                    required
                    maxLength={120}
                    className={control}
                    value={form.skill}
                    onChange={(event) => field({ skill: event.target.value })}
                    placeholder="For example, team leadership"
                  />
                </label>
                <label className="text-sm text-app">
                  Where does my example come from?
                  <select
                    className={control}
                    value={form.source}
                    onChange={(event) =>
                      field({ source: event.target.value as SkillEvidenceInput['source'] })
                    }
                  >
                    {Object.entries(EVIDENCE_SOURCES).map(([id, label]) => (
                      <option key={id} value={id}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="block text-sm text-app">
                My skill status
                <select
                  className={control}
                  value={form.status}
                  onChange={(event) =>
                    field({ status: event.target.value as SkillEvidenceInput['status'] })
                  }
                >
                  <option value="develop">I want to develop this</option>
                  <option value="have-evidence">I have evidence</option>
                </select>
              </label>
              <label className="block text-sm text-app">
                My example {form.status === 'have-evidence' ? '*' : '(optional)'}
                <textarea
                  className={control}
                  rows={3}
                  maxLength={1200}
                  required={form.status === 'have-evidence'}
                  value={form.evidence}
                  onChange={(event) => field({ evidence: event.target.value })}
                  placeholder="What did you do? Describe an actual example in your own words."
                />
              </label>
              <label className="block text-sm text-app">
                My next step
                <input
                  className={control}
                  maxLength={300}
                  value={form.nextStep}
                  onChange={(event) => field({ nextStep: event.target.value })}
                  placeholder="Prepare an interview example, add a résumé bullet, or practice a skill"
                />
              </label>
              {form.bullet && (
                <div className="space-y-2 rounded-xl border border-primary/20 p-3">
                  <p className="text-xs text-muted">{draftLabel}</p>
                  <label className="block text-sm text-app">
                    Résumé wording to review
                    <textarea
                      className={control}
                      rows={3}
                      maxLength={600}
                      value={form.bullet}
                      onChange={(event) =>
                        setForm({ ...form, bullet: event.target.value, confirmWording: false })
                      }
                    />
                  </label>
                  <label className="flex items-start gap-2 text-sm text-app">
                    <input
                      type="checkbox"
                      checked={form.confirmWording}
                      onChange={(event) =>
                        setForm({ ...form, confirmWording: event.target.checked })
                      }
                    />
                    I checked this wording against my example. It adds no unsupported facts, numbers
                    or qualifications.
                  </label>
                  <button
                    type="button"
                    className="text-sm text-primary underline"
                    onClick={() => setForm({ ...form, bullet: '', confirmWording: false })}
                  >
                    Discard wording
                  </button>
                </div>
              )}
              <div className="flex gap-3">
                <button type="submit" className={button}>
                  {busy ? 'Working…' : editing ? 'Save Reviewed Evidence' : 'Save Skill Evidence'}
                </button>
                {editing && (
                  <button type="button" onClick={reset} className="text-sm text-primary">
                    Cancel editing
                  </button>
                )}
              </div>
            </fieldset>
          </form>
          <label className="flex items-start gap-2 text-sm text-muted">
            <input
              type="checkbox"
              checked={allowAI}
              disabled={demo || busy}
              onChange={(event) => setAllowAI(event.target.checked)}
            />
            Allow sending a selected saved skill and example to the configured AI service when I
            click “Ask AI to rephrase”. Review is still required.
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            {items.map((item) => (
              <article
                key={item.id}
                aria-label={`Evidence for ${item.skill}`}
                className="space-y-2 rounded-xl border border-primary/20 p-4"
              >
                <h3 className="font-semibold text-app">{item.skill}</h3>
                <p className="text-xs text-primary">
                  {EVIDENCE_SOURCES[item.source]} ·{' '}
                  {item.status === 'have-evidence' ? 'I have evidence' : 'I want to develop this'} ·
                  Self-reported
                </p>
                <p className="whitespace-pre-wrap text-sm text-muted">
                  {item.evidence || 'No evidence added yet.'}
                </p>
                {item.nextStep && (
                  <p className="text-sm text-app">
                    <strong>Next step:</strong> {item.nextStep}
                  </p>
                )}
                {item.bullet && item.bulletReviewedAt && (
                  <p className="rounded-lg bg-primary/5 p-2 text-sm text-app">
                    <strong>Worker-reviewed résumé bullet:</strong> {item.bullet}
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => edit(item)}
                    disabled={busy}
                    className="inline-flex items-center gap-1 text-sm text-primary"
                  >
                    <Pencil size={14} />
                    Edit {item.skill}
                  </button>
                  <button
                    type="button"
                    onClick={() => void remove(item)}
                    disabled={busy}
                    className="inline-flex items-center gap-1 text-sm text-danger"
                  >
                    <Trash2 size={14} />
                    Delete
                  </button>
                </div>
                {item.status === 'have-evidence' && item.evidence && (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void suggest(item, 'template')}
                      className="inline-flex items-center gap-1 rounded-lg border border-primary/20 p-2 text-xs text-primary"
                    >
                      <Plus size={14} />
                      Draft from my example
                    </button>
                    <button
                      type="button"
                      disabled={busy || demo || !allowAI}
                      onClick={() => void suggest(item, 'ai')}
                      className="inline-flex items-center gap-1 rounded-lg border border-primary/20 p-2 text-xs text-primary disabled:opacity-50"
                    >
                      <Sparkles size={14} />
                      Ask AI to rephrase
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>
          {!items.length && !loading && (
            <p className="text-sm text-muted">
              No evidence added yet. Start with one skill, or record a skill you want to develop.
            </p>
          )}
          <p className="text-xs text-muted">
            {demo
              ? 'Demo examples are temporary. Use a saved live plan to include evidence in adviser reports.'
              : 'Use Print / Save as PDF or Choose details to share to select evidence for an adviser. Nothing is included automatically. Saved examples remain private unless you choose to share them.'}
          </p>
        </>
      )}
    </section>
  );
}
