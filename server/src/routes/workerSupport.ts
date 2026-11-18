import { createHash, randomBytes } from 'node:crypto';
import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import {
  ReminderInputSchema,
  AdviserShareInputSchema,
  AdviserSnapshotSchema,
} from '@restart-ai/shared';
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
    res.json({ snapshot: snapshot.data, expiresAt: share.expiresAt });
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
