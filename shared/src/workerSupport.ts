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
