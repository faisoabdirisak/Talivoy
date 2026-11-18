import { z } from 'zod';

export const JobComparisonInputSchema = z.object({
  opportunityId: z.string().min(1).max(200),
  opportunityTitle: z.string().min(1).max(200),
  profile: z.string().trim().min(20).max(4000),
  posting: z.string().trim().min(50).max(7000),
  demo: z.boolean().default(false),
});

const requirement = z.object({
  requirement: z.string().trim().min(1).max(300),
  postingQuote: z.string().trim().min(1).max(500),
});

export const JobComparisonSchema = z.object({
  matches: z
    .array(
      requirement.extend({
        profileQuote: z.string().trim().min(1).max(500),
        explanation: z.string().trim().min(1).max(500),
      })
    )
    .max(6),
  gaps: z
    .array(
      requirement.extend({
        question: z.string().trim().min(1).max(500),
      })
    )
    .max(6),
  action: z.object({
    title: z.string().trim().min(1).max(200),
    description: z.string().trim().min(1).max(1000),
  }),
});
export type JobComparison = z.infer<typeof JobComparisonSchema>;
export type JobComparisonInput = z.infer<typeof JobComparisonInputSchema>;
export type JobComparisonResult = JobComparison & { actionToken?: string };
