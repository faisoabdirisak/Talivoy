import { beforeAll, afterAll, expect, it, vi } from 'vitest';
import request from 'supertest';
import { mkdtempSync, unlinkSync, rmdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const folder = mkdtempSync(path.join(tmpdir(), 'talivoy-pathway-'));
const database = path.join(folder, 'integration.db');
let app: (typeof import('./index.js'))['default'];
let prisma: (typeof import('./lib/db.js'))['prisma'];

beforeAll(async () => {
  vi.stubEnv('DATABASE_URL', 'file:' + database.replaceAll('\\', '/'));
  vi.stubEnv('NODE_ENV', 'test');
  writeFileSync(database, '');
  const root = fileURLToPath(new URL('../../', import.meta.url));
  execFileSync(
    process.execPath,
    [
      path.join(root, 'node_modules/prisma/build/index.js'),
      'db',
      'push',
      '--schema',
      path.join(root, 'prisma/schema.prisma'),
      '--skip-generate',
    ],
    { env: process.env, stdio: 'pipe', timeout: 20_000 }
  );
  ({ prisma } = await import('./lib/db.js'));
  ({ default: app } = await import('./index.js'));
}, 30_000);
afterAll(async () => {
  await prisma?.$disconnect();
  for (const suffix of ['', '-journal', '-wal', '-shm']) {
    try {
      unlinkSync(database + suffix);
    } catch {
      /* SQLite file is absent. */
    }
  }
  try {
    rmdirSync(folder);
  } catch {
    /* Preserve unexpected diagnostics. */
  }
  vi.unstubAllEnvs();
});

it('persists independent sourced checklists and adds shareable actions with guest isolation and safe retries', async () => {
  const session = await prisma.session.create({
    data: {
      cookieToken: 'pathway-owner',
      opportunities: {
        create: {
          title: 'Career exploration',
          category: 'career-pivot',
          summary: 'Summary',
          reasoning: 'Reasoning',
          feasibilityScore: 80,
          rank: 1,
        },
      },
    },
    include: { opportunities: true },
  });
  const opportunityId = session.opportunities[0].id;
  const cookie = 'talivoy_sid=pathway-owner';
  const base = '/api/support/pathway-items';
  const input = {
    opportunityId,
    state: 'IL',
    career: 'registered-nurse',
    stepKey: 'licensure-route',
    status: 'Confirmed',
    notes: 'Discuss which application route fits.',
  };
  expect((await request(app).post(base).send(input)).status).toBe(401);
  expect(
    (
      await request(app)
        .post(base)
        .set('Cookie', cookie)
        .send({ ...input, state: 'CA' })
    ).status
  ).toBe(400);
  expect(
    (
      await request(app)
        .post(base)
        .set('Cookie', cookie)
        .send({ ...input, stepKey: 'invented' })
    ).status
  ).toBe(400);
  expect(
    (await request(app).post(base).set('Cookie', 'talivoy_sid=other').send(input)).status
  ).toBe(403);
  const saved = await request(app).post(base).set('Cookie', cookie).send(input);
  expect(saved.status).toBe(200);
  expect(saved.body.reviewedAt).not.toBeNull();
  const repeated = await request(app)
    .post(base)
    .set('Cookie', cookie)
    .send({ ...input, notes: 'Updated notes' });
  expect(repeated.body.id).toBe(saved.body.id);
  const second = await request(app)
    .post(base)
    .set('Cookie', cookie)
    .send({ ...input, state: 'MN' });
  expect(second.body.id).not.toBe(saved.body.id);
  const list = await request(app)
    .get(base + '?opportunityId=' + opportunityId)
    .set('Cookie', cookie);
  expect(list.body).toHaveLength(2);
  expect(
    (
      await request(app)
        .get(base + '?opportunityId=' + opportunityId)
        .set('Cookie', 'talivoy_sid=other')
    ).body
  ).toEqual([]);
  expect(
    (
      await request(app)
        .post(base + '/' + saved.body.id + '/action')
        .set('Cookie', 'talivoy_sid=other')
        .send({})
    ).status
  ).toBe(404);
  const action = await request(app)
    .post(base + '/' + saved.body.id + '/action')
    .set('Cookie', cookie)
    .send({});
  expect(action.status).toBe(200);
  expect(action.body.day).toBe(30);
  expect(action.body.resourceUrl).toBe('https://idfpr.illinois.gov/profs/nursing.html');
  expect(action.body.description).toContain('Source reviewed 2026-11-22');
  expect(action.body.description).toContain(action.body.resourceUrl);
  await prisma.progressEntry.create({
    data: { planItemId: action.body.id, isCompleted: true, completedAt: new Date('2026-11-01') },
  });
  const retry = await request(app)
    .post(base + '/' + saved.body.id + '/action')
    .set('Cookie', cookie)
    .send({});
  expect(retry.body.id).toBe(action.body.id);
  expect(retry.body.isCompleted).toBe(true);
  expect(await prisma.planItem.count({ where: { opportunityId } })).toBe(1);
  const reset = await request(app)
    .post(base)
    .set('Cookie', cookie)
    .send({ ...input, status: 'To check' });
  expect(reset.body.reviewedAt).toBeNull();
  expect(reset.body.planItemId).toBe(action.body.id);

  const share = await request(app)
    .post('/api/support/adviser-shares')
    .set('Cookie', cookie)
    .send({
      opportunityId,
      includeTitle: false,
      includeSummary: false,
      includeReasoning: false,
      includeProgress: false,
      taskIds: [action.body.id],
      expiresInDays: 7,
    });
  const view = await request(app)
    .post('/api/support/adviser-review/read')
    .send({ token: share.body.token });
  expect(view.status).toBe(200);
  expect(view.body.snapshot.tasks[0].description).toContain(
    'https://idfpr.illinois.gov/profs/nursing.html'
  );
  expect(view.text).not.toContain('Updated notes');
  await prisma.session.delete({ where: { id: session.id } });
  expect(await prisma.careerPathwayItem.count({ where: { opportunityId } })).toBe(0);
});
