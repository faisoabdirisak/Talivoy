import { useEffect, useState } from 'react';
import { Link2, ShieldCheck, X, Copy } from 'lucide-react';
import type { AdviserShare, AdviserShareInput, Opportunity } from '@talivoy/shared';
import { createAdviserShare, listAdviserShares, revokeAdviserShare } from '../lib/api';

export function AdviserReviewLink({
  opportunity,
  demo,
}: {
  opportunity: Opportunity;
  demo: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [includeTitle, setTitle] = useState(true);
  const [includeSummary, setSummary] = useState(false);
  const [includeReasoning, setReasoning] = useState(false);
  const [includeProgress, setProgress] = useState(false);
  const [taskIds, setTasks] = useState<string[]>([]);
  const [days, setDays] = useState<1 | 7 | 30>(7);
  const [shares, setShares] = useState<AdviserShare[]>([]);
  const [url, setUrl] = useState('');
  const [createdId, setCreatedId] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!open || demo) return;
    let active = true;
    listAdviserShares()
      .then((items) => {
        if (active) setShares(items);
      })
      .catch(() => {
        if (active) setMessage('Could not load your active review links.');
      });
    return () => {
      active = false;
    };
  }, [open, demo]);

  const selection: AdviserShareInput = {
    opportunityId: opportunity.id,
    includeTitle,
    includeSummary,
    includeReasoning,
    includeProgress,
    taskIds,
    expiresInDays: days,
  };
  const button =
    'rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-50';

  async function create() {
    if (busy) return;
    setBusy(true);
    setMessage('');
    try {
      const share = await createAdviserShare(selection);
      setShares((current) => [share, ...current]);
      setCreatedId(share.id);
      setUrl(window.location.origin + window.location.pathname + '#adviser-review=' + share.token);
      setMessage('Link created. Send it to your adviser using your preferred messaging app.');
    } catch {
      setMessage('Could not create a link. Check your session and try again.');
    } finally {
      setBusy(false);
    }
  }

  async function revoke(id: string) {
    setBusy(true);
    try {
      await revokeAdviserShare(id);
      setShares((current) => current.filter((item) => item.id !== id));
      if (createdId === id) setUrl('');
      setMessage('Review link revoked.');
    } catch {
      setMessage('Could not revoke this link. Try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-4 rounded-2xl border border-primary/20 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-app">
          <Link2 size={20} />
          Career adviser review link
        </h2>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          className={button}
        >
          {open ? 'Hide sharing options' : 'Choose details to share'}
        </button>
      </div>
      {open && (
        <>
          {demo ? (
            <p className="text-sm text-muted">
              Create review links from a saved live plan. You can print a fictional demo report
              using Print / Save as PDF.
            </p>
          ) : (
            <>
              <p className="text-sm text-muted">
                Choose exactly what your adviser can view. Anyone with the link can read the
                selected snapshot until it expires or you revoke it. Shared details can be copied by
                the recipient.
              </p>
              <fieldset disabled={busy} className="space-y-3 text-sm text-app">
                <legend className="mb-2 font-semibold">Include in the review</legend>
                {(
                  [
                    ['Opportunity title', includeTitle, setTitle],
                    ['Opportunity summary', includeSummary, setSummary],
                    ['Why this opportunity fits', includeReasoning, setReasoning],
                    ['Completion status for selected milestones', includeProgress, setProgress],
                  ] as const
                ).map(([label, value, setter]) => (
                  <label key={label} className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      checked={value}
                      onChange={(event) => setter(event.target.checked)}
                    />
                    {label}
                  </label>
                ))}
                <p className="pt-2 font-semibold">Milestones to include</p>
                {opportunity.planItems.map((item) => (
                  <label key={item.id} className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      checked={taskIds.includes(item.id)}
                      onChange={(event) =>
                        setTasks((current) =>
                          event.target.checked
                            ? [...current, item.id]
                            : current.filter((id) => id !== item.id)
                        )
                      }
                    />
                    <span>
                      Week {item.week} · {item.title}
                    </span>
                  </label>
                ))}
                <label className="flex items-center gap-2">
                  Link expires in
                  <select
                    value={days}
                    onChange={(event) => setDays(Number(event.target.value) as 1 | 7 | 30)}
                    className="rounded-lg border border-primary/20 bg-surface-light dark:bg-surface-dark p-2"
                  >
                    <option value={1}>1 day</option>
                    <option value={7}>7 days</option>
                    <option value={30}>30 days</option>
                  </select>
                </label>
              </fieldset>
              <div className="space-y-2 rounded-xl border border-primary/20 p-4 text-sm text-app">
                <h3 className="flex items-center gap-2 font-semibold">
                  <ShieldCheck size={16} />
                  Selected preview
                </h3>
                {includeTitle && <p className="font-semibold">{opportunity.title}</p>}
                {includeSummary && <p>{opportunity.summary}</p>}
                {includeReasoning && <p>{opportunity.reasoning}</p>}
                {opportunity.planItems
                  .filter((item) => taskIds.includes(item.id))
                  .map((item) => (
                    <article key={item.id}>
                      <p>
                        Week {item.week} · Day {item.day} · {item.title}
                        {includeProgress ? (item.isCompleted ? ' · Complete' : ' · To do') : ''}
                      </p>
                      {item.description && <p className="text-muted">{item.description}</p>}
                    </article>
                  ))}
              </div>
              <button
                type="button"
                className={button}
                disabled={
                  busy || !(includeTitle || includeSummary || includeReasoning || taskIds.length)
                }
                onClick={() => void create()}
              >
                {busy ? 'Working…' : 'Create Review Link'}
              </button>
              {url && (
                <div className="space-y-2">
                  <label className="block text-sm text-app">
                    Your adviser review link
                    <input
                      readOnly
                      value={url}
                      className="mt-1 w-full rounded-lg border border-primary/20 bg-surface-light dark:bg-surface-dark p-2"
                    />
                  </label>
                  <button
                    type="button"
                    className={button}
                    onClick={() => {
                      if (!navigator.clipboard) {
                        setMessage('Select and copy the link from the field above.');
                        return;
                      }
                      void navigator.clipboard
                        .writeText(url)
                        .then(() => setMessage('Link copied.'))
                        .catch(() => setMessage('Select and copy the link from the field above.'));
                    }}
                  >
                    <Copy size={16} className="mr-2 inline" />
                    Copy link
                  </button>
                  <p className="text-xs text-muted">
                    On localhost, the adviser must use this computer. Share remote links after the
                    app is deployed to a public HTTPS address.
                  </p>
                </div>
              )}
              {shares.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-semibold text-app">Active links for your session</h3>
                  {shares.map((item) => (
                    <div
                      key={item.id}
                      className="flex flex-wrap items-center justify-between gap-2 text-sm text-app"
                    >
                      <span>
                        Created {new Date(item.createdAt).toLocaleString()} · expires{' '}
                        {new Date(item.expiresAt).toLocaleDateString()}
                      </span>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void revoke(item.id)}
                        className="rounded-lg px-2 py-1 text-danger"
                      >
                        <X size={14} className="mr-1 inline" />
                        Revoke
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {message && (
                <p role="status" className="text-sm text-app">
                  {message}
                </p>
              )}
            </>
          )}
        </>
      )}
    </section>
  );
}
