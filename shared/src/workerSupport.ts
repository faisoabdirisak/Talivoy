import { z } from 'zod';

export const ReminderInputSchema = z.object({
  planItemId: z.string().min(1).max(200),
  dueAt: z.string().datetime(),
});
export const AdviserShareInputSchema = z
  .object({
    opportunityId: z.string().min(1).max(200),
    includeTitle: z.boolean(),
    includeSummary: z.boolean(),
    includeReasoning: z.boolean(),
    includeProgress: z.boolean(),
    taskIds: z.array(z.string().min(1).max(200)).max(50),
    expiresInDays: z.union([z.literal(1), z.literal(7), z.literal(30)]).default(7),
  })
  .refine(
    (value) =>
      value.includeTitle ||
      value.includeSummary ||
      value.includeReasoning ||
      value.taskIds.length > 0
  );

export const AdviserSnapshotSchema = z.object({
  title: z.string().optional(),
  summary: z.string().optional(),
  reasoning: z.string().optional(),
  tasks: z.array(
    z.object({
      title: z.string(),
      description: z.string().nullable(),
      week: z.number(),
      day: z.number(),
      isCompleted: z.boolean().optional(),
    })
  ),
});
export type AdviserSnapshot = z.infer<typeof AdviserSnapshotSchema>;
export type AdviserShareInput = z.infer<typeof AdviserShareInputSchema>;
export type MilestoneReminder = { id: string; planItemId: string; dueAt: string };
export type AdviserShare = { id: string; createdAt: string; expiresAt: string };

export const AdviserFeedbackInputSchema = z.object({
  token: z.string().regex(/^[a-f0-9]{64}$/),
  requestId: z.string().uuid(),
  reviewerName: z.string().trim().min(1).max(100),
  reviewerRole: z.string().trim().min(1).max(100),
  practicality: z.enum(['Practical', 'Needs changes', 'More information needed']),
  assessment: z.string().trim().min(1).max(1000),
  milestoneSuggestion: z.string().trim().max(1000),
  nextStep: z.string().trim().min(1).max(200),
  nextStepDetails: z.string().trim().max(1000),
});
export type AdviserFeedbackInput = z.infer<typeof AdviserFeedbackInputSchema>;
export type AdviserFeedback = Omit<AdviserFeedbackInput, 'token' | 'requestId'> & {
  id: string;
  opportunityId: string;
  createdAt: string;
  acceptedAt: string | null;
};

export const WeeklyCheckInInputSchema = z.object({
  opportunityId: z.string().min(1).max(200),
  requestId: z.string().uuid(),
  completedWork: z.string().trim().min(1).max(1000),
  blockers: z.string().trim().max(1000),
  budget: z.number().int().min(0).max(1_000_000),
  hours: z.number().min(0.5).max(168),
});
export type WeeklyCheckInInput = z.infer<typeof WeeklyCheckInInputSchema>;
export type WeeklyCheckIn = Omit<WeeklyCheckInInput, 'requestId'> & {
  id: string;
  createdAt: string;
  appliedAt: string | null;
};
