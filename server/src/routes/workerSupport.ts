import { buildSessionResponse } from './sessions.js';
import { createHash, randomBytes } from 'node:crypto';
import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import {
  PathwayItemInputSchema,
  getPathwaySteps,
  PATHWAY_STATES,
  PATHWAY_CAREERS,
  AdviserFeedbackInputSchema,
  WeeklyCheckInInputSchema,
  refineRemainingTasks,
  ReminderInputSchema,
  AdviserShareInputSchema,
  AdviserSnapshotSchema,
} from '@talivoy/shared';
import { asyncHandler } from '../lib/asyncHandler.js';
import { prisma } from '../lib/db.js';
import { getSessionToken } from '../lib/session.js';

export const workerSupportRouter = Router();
workerSupportRouter.use(
  rateLimit({
    windowMs: 60_000,
    limit: 60,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Please wait before trying again.' },
  })
);

// A review link is an expiring bearer credential. Store only its hash.
workerSupportRouter.post(
  '/adviser-review/read',
  asyncHandler(async (req, res) => {
    const input = z.object({ token: z.string().regex(/^[a-f0-9]{64}$/) }).safeParse(req.body);
    if (!input.success) {
      res.status(404).json({ error: 'Review link unavailable.' });
      return;
    }
    const share = await prisma.adviserShare.findUnique({
      where: { tokenHash: createHash('sha256').update(input.data.token).digest('hex') },
    });
    if (!share || share.expiresAt.getTime() <= Date.now()) {
      res.status(404).json({ error: 'This review link has expired or was revoked.' });
      return;
    }
    const snapshot = AdviserSnapshotSchema.safeParse(JSON.parse(share.snapshotJson));
    if (!snapshot.success) {
      res.status(404).json({ error: 'Review link unavailable.' });
      return;
    }
    res.json({
      snapshot: snapshot.data,
      expiresAt: share.expiresAt,
      canRespond: Boolean(share.opportunityId),
    });
  })
);

workerSupportRouter.post(
  '/adviser-review/respond',
  asyncHandler(async (req, res) => {
    const parsed = AdviserFeedbackInputSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Complete the required feedback fields.' });
      return;
    }
    const { token, requestId, ...answers } = parsed.data;
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const submitted = await prisma.$transaction(async (tx) => {
      const share = await tx.adviserShare.findUnique({ where: { tokenHash } });
      if (!share || share.expiresAt.getTime() <= Date.now() || !share.opportunityId) return false;
      const opportunity = await tx.opportunity.findFirst({
        where: { id: share.opportunityId, sessionId: share.sessionId },
      });
      if (!opportunity) return false;
      const id =
        'advice-' +
        createHash('sha256')
          .update(JSON.stringify([tokenHash, requestId]))
          .digest('hex');
      await tx.adviserFeedback.upsert({
        where: { id },
        update: {},
        create: { id, shareId: share.id, opportunityId: opportunity.id, ...answers },
      });
      return true;
    });
    if (!submitted) {
      res.status(404).json({ error: 'This feedback link is unavailable. Ask for a new link.' });
      return;
    }
    res.status(201).json({ submitted: true });
  })
);

workerSupportRouter.use((req, res, next) => {
  if (!getSessionToken(req)) {
    res.status(401).json({ error: 'Restore your saved session first.' });
    return;
  }
  next();
});

workerSupportRouter.get(
  '/reminders',
  asyncHandler(async (req, res) => {
    const reminders = await prisma.milestoneReminder.findMany({
      where: { planItem: { opportunity: { session: { cookieToken: getSessionToken(req)! } } } },
      select: { id: true, planItemId: true, dueAt: true },
      orderBy: { dueAt: 'asc' },
    });
    res.json(reminders);
  })
);

workerSupportRouter.post(
  '/reminders',
  asyncHandler(async (req, res) => {
    const parsed = ReminderInputSchema.safeParse(req.body);
    if (!parsed.success || Date.parse(parsed.data.dueAt) <= Date.now()) {
      res.status(400).json({ error: 'Choose a future reminder date and time.' });
      return;
    }
    const saved = await prisma.$transaction(async (tx) => {
      const task = await tx.planItem.findFirst({
        where: {
          id: parsed.data.planItemId,
          opportunity: { session: { cookieToken: getSessionToken(req)! } },
        },
      });
      if (!task) return null;
      return tx.milestoneReminder.upsert({
        where: { planItemId: task.id },
        update: { dueAt: new Date(parsed.data.dueAt) },
        create: { planItemId: task.id, dueAt: new Date(parsed.data.dueAt) },
        select: { id: true, planItemId: true, dueAt: true },
      });
    });
    if (!saved) {
      res.status(403).json({ error: 'This milestone is unavailable.' });
      return;
    }
    res.json(saved);
  })
);

workerSupportRouter.delete(
  '/reminders/:id',
  asyncHandler(async (req, res) => {
    await prisma.milestoneReminder.deleteMany({
      where: {
        id: String(req.params.id),
        planItem: { opportunity: { session: { cookieToken: getSessionToken(req)! } } },
      },
    });
    res.status(204).end();
  })
);

workerSupportRouter.get(
  '/adviser-shares',
  asyncHandler(async (req, res) => {
    res.json(
      await prisma.adviserShare.findMany({
        where: { session: { cookieToken: getSessionToken(req)! }, expiresAt: { gt: new Date() } },
        select: { id: true, createdAt: true, expiresAt: true },
        orderBy: { createdAt: 'desc' },
      })
    );
  })
);

workerSupportRouter.post(
  '/adviser-shares',
  asyncHandler(async (req, res) => {
    const parsed = AdviserShareInputSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Choose the plan details you want to share.' });
      return;
    }
    const input = parsed.data;
    const token = randomBytes(32).toString('hex');
    const saved = await prisma.$transaction(async (tx) => {
      const opportunity = await tx.opportunity.findFirst({
        where: { id: input.opportunityId, session: { cookieToken: getSessionToken(req)! } },
        include: {
          planItems: {
            include: { progressEntry: true },
            orderBy: [{ week: 'asc' }, { day: 'asc' }],
          },
        },
      });
      if (
        !opportunity ||
        input.taskIds.some((id) => !opportunity.planItems.some((item) => item.id === id))
      )
        return null;
      const snapshot = {
        ...(input.includeTitle ? { title: opportunity.title } : {}),
        ...(input.includeSummary ? { summary: opportunity.summary } : {}),
        ...(input.includeReasoning ? { reasoning: opportunity.reasoning } : {}),
        tasks: opportunity.planItems
          .filter((item) => input.taskIds.includes(item.id))
          .map((item) => ({
            title: item.title,
            description: item.description,
            day: item.day,
            week: item.week,
            ...(input.includeProgress
              ? { isCompleted: item.progressEntry?.isCompleted ?? false }
              : {}),
          })),
      };
      return tx.adviserShare.create({
        data: {
          sessionId: opportunity.sessionId,
          opportunityId: opportunity.id,
          tokenHash: createHash('sha256').update(token).digest('hex'),
          snapshotJson: JSON.stringify(snapshot),
          expiresAt: new Date(Date.now() + input.expiresInDays * 86_400_000),
        },
        select: { id: true, createdAt: true, expiresAt: true },
      });
    });
    if (!saved) {
      res.status(403).json({ error: 'The selected plan details are unavailable.' });
      return;
    }
    res.status(201).json({ ...saved, token });
  })
);

workerSupportRouter.delete(
  '/adviser-shares/:id',
  asyncHandler(async (req, res) => {
    await prisma.adviserShare.deleteMany({
      where: { id: String(req.params.id), session: { cookieToken: getSessionToken(req)! } },
    });
    res.status(204).end();
  })
);

const feedbackFields = {
  id: true,
  opportunityId: true,
  reviewerName: true,
  reviewerRole: true,
  practicality: true,
  assessment: true,
  milestoneSuggestion: true,
  nextStep: true,
  nextStepDetails: true,
  createdAt: true,
  acceptedAt: true,
} as const;
const checkInFields = {
  id: true,
  opportunityId: true,
  completedWork: true,
  blockers: true,
  budget: true,
  hours: true,
  createdAt: true,
  appliedAt: true,
} as const;

workerSupportRouter.get(
  '/adviser-feedback',
  asyncHandler(async (req, res) => {
    const opportunityId =
      typeof req.query.opportunityId === 'string' ? req.query.opportunityId : '';
    res.json(
      await prisma.adviserFeedback.findMany({
        where: { opportunityId, opportunity: { session: { cookieToken: getSessionToken(req)! } } },
        select: feedbackFields,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      })
    );
  })
);

workerSupportRouter.post(
  '/adviser-feedback/:id/accept',
  asyncHandler(async (req, res) => {
    const saved = await prisma.$transaction(async (tx) => {
      const feedback = await tx.adviserFeedback.findFirst({
        where: {
          id: String(req.params.id),
          opportunity: { session: { cookieToken: getSessionToken(req)! } },
        },
      });
      if (!feedback) return null;
      const item = await tx.planItem.upsert({
        where: { id: 'adviser-task-' + feedback.id },
        update: {},
        create: {
          id: 'adviser-task-' + feedback.id,
          opportunityId: feedback.opportunityId,
          day: 30,
          week: 4,
          title: feedback.nextStep,
          description: feedback.nextStepDetails || feedback.milestoneSuggestion,
        },
        include: { progressEntry: true },
      });
      await tx.adviserFeedback.update({
        where: { id: feedback.id },
        data: { acceptedAt: feedback.acceptedAt ?? new Date() },
      });
      return {
        id: item.id,
        title: item.title,
        description: item.description,
        day: item.day,
        week: item.week,
        isCompleted: item.progressEntry?.isCompleted ?? false,
        completedAt: item.progressEntry?.completedAt ?? null,
      };
    });
    if (!saved) {
      res.status(404).json({ error: 'Feedback is unavailable.' });
      return;
    }
    res.json(saved);
  })
);

workerSupportRouter.get(
  '/check-ins',
  asyncHandler(async (req, res) => {
    const opportunityId =
      typeof req.query.opportunityId === 'string' ? req.query.opportunityId : '';
    res.json(
      await prisma.weeklyCheckIn.findMany({
        where: { opportunityId, opportunity: { session: { cookieToken: getSessionToken(req)! } } },
        select: checkInFields,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      })
    );
  })
);

workerSupportRouter.post(
  '/check-ins',
  asyncHandler(async (req, res) => {
    const parsed = WeeklyCheckInInputSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Enter completed work, a budget and 0.5–168 weekly hours.' });
      return;
    }
    const { requestId, ...input } = parsed.data;
    const saved = await prisma.$transaction(async (tx) => {
      const opportunity = await tx.opportunity.findFirst({
        where: { id: input.opportunityId, session: { cookieToken: getSessionToken(req)! } },
      });
      if (!opportunity) return null;
      const id =
        'checkin-' +
        createHash('sha256')
          .update(JSON.stringify([input.opportunityId, requestId]))
          .digest('hex');
      return tx.weeklyCheckIn.upsert({
        where: { id },
        update: {},
        create: { id, ...input },
        select: checkInFields,
      });
    });
    if (!saved) {
      res.status(403).json({ error: 'This plan is unavailable.' });
      return;
    }
    res.status(201).json(saved);
  })
);

workerSupportRouter.post(
  '/check-ins/:id/refine',
  asyncHandler(async (req, res) => {
    const parsed = z
      .object({
        revision: z
          .string()
          .regex(/^[a-f0-9]{64}$/)
          .optional(),
      })
      .safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid preview revision.' });
      return;
    }
    const result = await prisma.$transaction(async (tx) => {
      const checkIn = await tx.weeklyCheckIn.findFirst({
        where: {
          id: String(req.params.id),
          opportunity: { session: { cookieToken: getSessionToken(req)! } },
        },
      });
      if (!checkIn) return null;
      const row = await tx.session.findUnique({
        where: { cookieToken: getSessionToken(req)! },
        include: {
          opportunities: {
            where: { id: checkIn.opportunityId },
            include: { planItems: { include: { progressEntry: true } } },
          },
        },
      });
      const original = buildSessionResponse(row)?.opportunities[0];
      if (!original) return null;
      const { revision } = parsed.data;
      if (checkIn.appliedAt) {
        return revision && revision === checkIn.appliedRevision
          ? { original, refined: original, revision }
          : ('applied' as const);
      }
      const constraints = { budget: checkIn.budget, hours: checkIn.hours };
      const fingerprint = createHash('sha256')
        .update(
          JSON.stringify({
            checkInId: checkIn.id,
            constraints,
            tasks: [...original.planItems].sort((a, b) => a.id.localeCompare(b.id)),
          })
        )
        .digest('hex');
      if (revision && revision !== fingerprint) return 'stale' as const;
      const refined = {
        ...original,
        planItems: refineRemainingTasks(original.planItems, constraints),
      };
      if (revision) {
        for (const task of refined.planItems) {
          if (!task.isCompleted)
            await tx.planItem.update({
              where: { id: task.id },
              data: { description: task.description },
            });
        }
        await tx.weeklyCheckIn.update({
          where: { id: checkIn.id },
          data: { appliedAt: new Date(), appliedRevision: revision },
        });
      }
      return { original, refined, revision: fingerprint };
    });
    if (!result) {
      res.status(404).json({ error: 'Check-in unavailable.' });
      return;
    }
    if (result === 'stale' || result === 'applied') {
      res.status(409).json({
        error: 'The plan changed or this check-in was applied. Refresh and review again.',
      });
      return;
    }
    res.json(result);
  })
);

const pathwayItemFields = {
  id: true,
  opportunityId: true,
  state: true,
  career: true,
  stepKey: true,
  status: true,
  notes: true,
  reviewedAt: true,
  updatedAt: true,
  planItemId: true,
} as const;

workerSupportRouter.get(
  '/pathway-items',
  asyncHandler(async (req, res) => {
    const opportunityId =
      typeof req.query.opportunityId === 'string' ? req.query.opportunityId : '';
    res.json(
      await prisma.careerPathwayItem.findMany({
        where: { opportunityId, opportunity: { session: { cookieToken: getSessionToken(req)! } } },
        select: pathwayItemFields,
        orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
      })
    );
  })
);

workerSupportRouter.post(
  '/pathway-items',
  asyncHandler(async (req, res) => {
    const parsed = PathwayItemInputSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Choose a supported state, career and checklist step.' });
      return;
    }
    const input = parsed.data;
    const item = await prisma.$transaction(async (tx) => {
      const opportunity = await tx.opportunity.findFirst({
        where: { id: input.opportunityId, session: { cookieToken: getSessionToken(req)! } },
      });
      if (!opportunity) return null;
      const reviewedAt = input.status === 'To check' ? null : new Date();
      return tx.careerPathwayItem.upsert({
        where: {
          opportunityId_state_career_stepKey: {
            opportunityId: input.opportunityId,
            state: input.state,
            career: input.career,
            stepKey: input.stepKey,
          },
        },
        update: { status: input.status, notes: input.notes, reviewedAt },
        create: { ...input, reviewedAt },
        select: pathwayItemFields,
      });
    });
    if (!item) {
      res.status(403).json({ error: 'This plan is unavailable.' });
      return;
    }
    res.json(item);
  })
);

workerSupportRouter.post(
  '/pathway-items/:id/action',
  asyncHandler(async (req, res) => {
    const item = await prisma.$transaction(async (tx) => {
      const row = await tx.careerPathwayItem.findFirst({
        where: {
          id: String(req.params.id),
          opportunity: { session: { cookieToken: getSessionToken(req)! } },
        },
      });
      if (!row) return null;
      const parsed = PathwayItemInputSchema.safeParse(row);
      if (!parsed.success) return null;
      const step = getPathwaySteps(parsed.data.state, parsed.data.career).find(
        (value) => value.key === row.stepKey
      )!;
      const task = await tx.planItem.upsert({
        where: { id: 'pathway-task-' + row.id },
        update: {},
        create: {
          id: 'pathway-task-' + row.id,
          opportunityId: row.opportunityId,
          title: step.title,
          description: [
            PATHWAY_CAREERS[parsed.data.career] + ' · ' + PATHWAY_STATES[parsed.data.state],
            step.description,
            'Question to discuss: ' + step.question,
            'Source reviewed ' + step.sourceReviewed + ': ' + step.sourceName,
            step.sourceUrl,
          ].join('\n'),
          resourceUrl: step.sourceUrl,
          day: 30,
          week: 4,
        },
        include: { progressEntry: true },
      });
      await tx.careerPathwayItem.update({ where: { id: row.id }, data: { planItemId: task.id } });
      return {
        id: task.id,
        title: task.title,
        description: task.description,
        resourceUrl: task.resourceUrl,
        day: task.day,
        week: task.week,
        isCompleted: task.progressEntry?.isCompleted ?? false,
        completedAt: task.progressEntry?.completedAt ?? null,
      };
    });
    if (!item) {
      res.status(404).json({ error: 'This pathway step is unavailable.' });
      return;
    }
    res.json(item);
  })
);
