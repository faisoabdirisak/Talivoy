import express from 'express';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

vi.mock('../lib/db.js', () => ({
  prisma: {
    opportunity: { findFirst: vi.fn() },
    $transaction: vi.fn(),
  },
}));
vi.mock('../lib/granite.js', () => ({ generateGraniteContent: vi.fn() }));
vi.mock('../lib/gemini.js', () => ({ generateContent: vi.fn() }));
vi.mock('express-rate-limit', () => ({ rateLimit: () => express.Router() }));
import { prisma } from '../lib/db.js';
import { generateGraniteContent } from '../lib/granite.js';
import { generateContent } from '../lib/gemini.js';
import { jobComparisonRouter } from './jobComparison.js';

const app = express();
app.use(express.json(), cookieParser());
app.use('/comparison', jobComparisonRouter);
const input = {
  opportunityId: 'opp-1',
  opportunityTitle: 'Logistics coordinator',
  profile: 'Warehouse associate with inventory management experience.',
  posting: 'We require inventory management experience and spreadsheet reporting skills.',
  demo: false,
};
const result = {
  matches: [
    {
      requirement: 'Inventory management',
      postingQuote: 'inventory management experience',
      profileQuote: 'inventory management experience',
      explanation: 'The worker states this experience.',
    },
  ],
  gaps: [
    {
      requirement: 'Spreadsheets',
      postingQuote: 'spreadsheet reporting skills',
      question: 'Have you created spreadsheet reports?',
    },
  ],
  action: {
    title: 'Build a stock report',
    description: 'Create a small stock report in a spreadsheet.',
  },
};

beforeEach(() => {
  vi.stubEnv('AI_PROVIDER', 'granite');
  vi.mocked(prisma.opportunity.findFirst).mockResolvedValue({ id: 'opp-1' } as never);
  vi.mocked(generateGraniteContent).mockResolvedValue(JSON.stringify(result));
});
afterEach(() => {
  vi.resetAllMocks();
  vi.unstubAllEnvs();
});

const compare = (body = input, cookie = 'restart_sid=owner') =>
  request(app).post('/comparison').set('Cookie', cookie).send(body);

it('returns evidence and a signed action only after checking ownership', async () => {
  const response = await compare();
  expect(response.status).toBe(200);
  expect(response.body.matches).toEqual(result.matches);
  expect(JSON.parse(response.body.actionToken).token).toHaveLength(64);
  expect(prisma.opportunity.findFirst).toHaveBeenCalledWith({
    where: { id: 'opp-1', session: { cookieToken: 'owner' } },
  });
});

it('rejects unsupported quoted evidence from the model', async () => {
  vi.mocked(generateGraniteContent).mockResolvedValue(
    JSON.stringify({
      ...result,
      matches: [{ ...result.matches[0], profileQuote: 'Certified accountant' }],
    })
  );
  expect((await compare()).status).toBe(502);
});

it('rejects an invalid input before an AI request', async () => {
  expect((await compare({ ...input, posting: 'short' })).status).toBe(400);
  expect(generateGraniteContent).not.toHaveBeenCalled();
});

it('requires live session ownership', async () => {
  expect((await compare(input, '')).status).toBe(401);
  vi.mocked(prisma.opportunity.findFirst).mockResolvedValue(null);
  expect((await compare()).status).toBe(403);
  expect(generateGraniteContent).not.toHaveBeenCalled();
});

it('supports demo comparisons with Gemini without issuing a persistent action', async () => {
  vi.stubEnv('AI_PROVIDER', 'gemini');
  vi.mocked(generateContent).mockResolvedValue(JSON.stringify(result));
  const response = await compare({ ...input, demo: true }, '');
  expect(response.status).toBe(200);
  expect(response.body.actionToken).toBeUndefined();
  expect(prisma.opportunity.findFirst).not.toHaveBeenCalled();
});

it('saves a reviewed action with a stable id and an empty update for retries', async () => {
  const response = await compare();
  const action = {
    opportunityId: 'opp-1',
    ...result.action,
    ...JSON.parse(response.body.actionToken),
  };
  const findFirst = vi.fn().mockResolvedValue({ id: 'opp-1' });
  const upsert = vi
    .fn()
    .mockImplementation(({ create }) => Promise.resolve({ ...create, progressEntry: null }));
  vi.mocked(prisma.$transaction).mockImplementation(
    async (work: unknown) =>
      (work as (tx: unknown) => Promise<unknown>)({
        opportunity: { findFirst },
        planItem: { upsert },
      }) as never
  );
  const saved = await request(app)
    .post('/comparison/action')
    .set('Cookie', 'restart_sid=owner')
    .send(action);
  const retry = await request(app)
    .post('/comparison/action')
    .set('Cookie', 'restart_sid=owner')
    .send(action);
  expect(saved.status).toBe(200);
  expect(saved.body.day).toBe(30);
  expect(saved.body.isCompleted).toBe(false);
  expect(retry.body.id).toBe(saved.body.id);
  expect(upsert.mock.calls[0][0].update).toEqual({});
  const changed = await request(app)
    .post('/comparison/action')
    .set('Cookie', 'restart_sid=owner')
    .send({ ...action, title: 'Changed action' });
  expect(changed.status).toBe(409);
});

it('rejects another guest using the action and a session deleted after comparison', async () => {
  const response = await compare();
  const action = {
    opportunityId: 'opp-1',
    ...result.action,
    ...JSON.parse(response.body.actionToken),
  };
  expect(
    (await request(app).post('/comparison/action').set('Cookie', 'restart_sid=other').send(action))
      .status
  ).toBe(409);
  vi.mocked(prisma.$transaction).mockImplementation(
    async (work: unknown) =>
      (work as (tx: unknown) => Promise<unknown>)({
        opportunity: { findFirst: async () => null },
      }) as never
  );
  expect(
    (await request(app).post('/comparison/action').set('Cookie', 'restart_sid=owner').send(action))
      .status
  ).toBe(403);
});
