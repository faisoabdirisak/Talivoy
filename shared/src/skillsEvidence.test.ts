import { expect, it } from 'vitest';
import {
  SkillEvidenceInputSchema,
  evidenceBulletTemplate,
  evidenceForSharing,
  type SkillEvidence,
} from './skillsEvidence.js';

const input = {
  opportunityId: 'opp',
  skill: 'Team leadership',
  source: 'work',
  evidence: 'I supervised six staff.',
  status: 'have-evidence',
  nextStep: 'Prepare an interview example',
};
it('requires actual evidence and explicit review before accepting wording', () => {
  expect(SkillEvidenceInputSchema.safeParse({ ...input, evidence: '' }).success).toBe(false);
  expect(
    SkillEvidenceInputSchema.safeParse({ ...input, bullet: 'Supervised six staff.' }).success
  ).toBe(false);
  expect(
    SkillEvidenceInputSchema.safeParse({
      ...input,
      bullet: 'Supervised six staff.',
      confirmWording: true,
    }).success
  ).toBe(true);
  expect(
    SkillEvidenceInputSchema.safeParse({ ...input, status: 'develop', evidence: '', bullet: '' })
      .success
  ).toBe(true);
});
it('uses only the worker text in templates and omits unreviewed wording from reports', () => {
  expect(evidenceBulletTemplate(input.evidence)).toBe('Supervised six staff.');
  const item = {
    ...input,
    id: 'skill',
    revision: '0'.repeat(64),
    bullet: 'Draft not approved',
    bulletReviewedAt: null,
  } as SkillEvidence;
  expect(evidenceForSharing(item).bullet).toBeUndefined();
  expect(evidenceForSharing(item).selfReported).toBe(true);
});
