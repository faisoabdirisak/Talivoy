import { EVIDENCE_SOURCES, type SharedSkillEvidence } from '@talivoy/shared';

export function SkillsEvidenceSummary({ items }: { items: SharedSkillEvidence[] }) {
  if (!items.length) return null;
  return (
    <section className="space-y-3">
      <h2 className="font-semibold">My Skills Evidence</h2>
      <p className="text-sm">
        Self-reported by the worker. Skills and qualifications have not been independently verified.
      </p>
      {items.map((item, index) => (
        <article key={index} className="space-y-1 rounded-xl border border-primary/20 p-3">
          <h3 className="font-semibold">{item.skill}</h3>
          <p>
            {EVIDENCE_SOURCES[item.source]} ·{' '}
            {item.status === 'have-evidence' ? 'I have evidence' : 'I want to develop this'}
          </p>
          <p>{item.evidence || 'No evidence added yet.'}</p>
          {item.nextStep && (
            <p>
              <strong>Next step:</strong> {item.nextStep}
            </p>
          )}
          {item.bullet && (
            <p>
              <strong>Worker-reviewed résumé wording:</strong> {item.bullet}
            </p>
          )}
        </article>
      ))}
    </section>
  );
}
