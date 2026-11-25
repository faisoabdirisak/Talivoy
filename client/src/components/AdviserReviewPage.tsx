import { Brand } from './Brand';
import { AdviserResponseForm } from './AdviserResponseForm';
import { useEffect, useState } from 'react';
import { SkillsEvidenceSummary } from './SkillsEvidenceSummary';
import type { AdviserSnapshot } from '@talivoy/shared';
import { readAdviserShare } from '../lib/api';

export function AdviserReviewPage({ token }: { token: string }) {
  const [review, setReview] = useState<{
    snapshot: AdviserSnapshot;
    expiresAt: string;
    canRespond?: boolean;
  }>();
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    setReview(undefined);
    setError('');
    readAdviserShare(token)
      .then((value) => {
        if (active) setReview(value);
      })
      .catch(() => {
        if (active)
          setError('This link is unavailable, expired or revoked. Ask the worker for a new link.');
      });
    return () => {
      active = false;
    };
  }, [token]);
  return (
    <main className="min-h-screen bg-background-light px-6 py-12 text-app dark:bg-background-dark">
      <article className="mx-auto max-w-3xl space-y-5 rounded-2xl border border-primary/20 bg-surface-light p-6 dark:bg-surface-dark">
        <Brand />
        <p className="font-semibold text-primary">Adviser review</p>
        {error && <p role="alert">{error}</p>}
        {!review && !error && <p role="status">Loading shared plan…</p>}
        {review && (
          <>
            <h1 className="text-2xl font-bold">
              {review.snapshot.title || 'Career transition plan'}
            </h1>
            <p className="text-sm text-muted">
              The worker chose these details from a saved plan. This is a snapshot created when the
              link was shared. Expires {new Date(review.expiresAt).toLocaleString()}.
            </p>
            {review.snapshot.summary && (
              <section>
                <h2 className="font-semibold">Opportunity summary</h2>
                <p>{review.snapshot.summary}</p>
              </section>
            )}
            {review.snapshot.reasoning && (
              <section>
                <h2 className="font-semibold">Why this opportunity fits</h2>
                <p>{review.snapshot.reasoning}</p>
              </section>
            )}
            {review.snapshot.tasks.length > 0 && (
              <section className="space-y-3">
                <h2 className="font-semibold">Shared milestones</h2>
                {review.snapshot.tasks.map((task, index) => (
                  <article
                    key={index}
                    className="space-y-1 rounded-xl border border-primary/20 p-4"
                  >
                    <p className="text-xs text-muted">
                      Week {task.week} · Day {task.day}
                    </p>
                    <h3 className="font-semibold">{task.title}</h3>
                    {task.description && <p className="text-sm">{task.description}</p>}
                    {task.isCompleted !== undefined && (
                      <p className="text-sm">{task.isCompleted ? 'Complete' : 'To do'}</p>
                    )}
                  </article>
                ))}
              </section>
            )}
            <SkillsEvidenceSummary items={review.snapshot.skillsEvidence ?? []} />
            {review.canRespond ? (
              <AdviserResponseForm key={token} token={token} />
            ) : (
              <p className="text-sm text-muted">
                To send private feedback, ask the worker to create a new review link with the
                updated app.
              </p>
            )}
            <p className="text-sm text-muted">
              Career suggestions are AI estimates. Discuss local requirements, costs and practical
              next steps with the worker.
            </p>
          </>
        )}
        <a
          href={window.location.pathname}
          className="inline-block text-sm font-semibold text-primary"
        >
          Open Talivoy
        </a>
      </article>
    </main>
  );
}
