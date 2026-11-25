import { z } from 'zod';

export const EVIDENCE_SOURCES = {
  work: 'Work',
  education: 'Education',
  volunteering: 'Volunteering',
  'personal-project': 'Personal project',
} as const;
export const SkillEvidenceFieldsSchema = z.object({
  skill: z.string().trim().min(1).max(120),
  source: z.enum(['work', 'education', 'volunteering', 'personal-project']),
  evidence: z.string().trim().max(1200),
  status: z.enum(['have-evidence', 'develop']),
  nextStep: z.string().trim().max(300),
  bullet: z.string().trim().max(600).default(''),
  confirmWording: z.boolean().default(false),
});
export const SkillEvidenceInputSchema = SkillEvidenceFieldsSchema.extend({
  opportunityId: z.string().min(1).max(200),
  revision: z
    .string()
    .regex(/^[a-f0-9]{64}$/)
    .optional(),
}).superRefine((value, ctx) => {
  if (value.status === 'have-evidence' && !value.evidence)
    ctx.addIssue({
      code: 'custom',
      path: ['evidence'],
      message: 'Add an example to support this skill.',
    });
  if (
    value.bullet &&
    (!value.confirmWording || !value.evidence || value.status !== 'have-evidence')
  )
    ctx.addIssue({
      code: 'custom',
      path: ['confirmWording'],
      message: 'Review and confirm wording against your example before saving it.',
    });
});
export type SkillEvidenceInput = z.infer<typeof SkillEvidenceInputSchema>;
export type SkillEvidence = Omit<SkillEvidenceInput, 'confirmWording' | 'revision'> & {
  id: string;
  bullet: string;
  bulletReviewedAt: string | null;
  revision: string;
};
export const SharedSkillEvidenceSchema = z.object({
  skill: z.string(),
  source: z.enum(['work', 'education', 'volunteering', 'personal-project']),
  evidence: z.string(),
  status: z.enum(['have-evidence', 'develop']),
  nextStep: z.string(),
  bullet: z.string().optional(),
  selfReported: z.literal(true),
});
export type SharedSkillEvidence = z.infer<typeof SharedSkillEvidenceSchema>;
export function evidenceForSharing(item: SkillEvidence): SharedSkillEvidence {
  return {
    skill: item.skill,
    source: item.source,
    evidence: item.evidence,
    status: item.status,
    nextStep: item.nextStep,
    selfReported: true,
    ...(item.bullet && item.bulletReviewedAt ? { bullet: item.bullet } : {}),
  };
}
/** Reuses only the worker's text: no new skills, quantities or qualifications. */
export function evidenceBulletTemplate(evidence: string) {
  const text = evidence.trim().replace(/^I\s+/i, '');
  return text ? (text[0].toUpperCase() + text.slice(1)).slice(0, 600) : '';
}
