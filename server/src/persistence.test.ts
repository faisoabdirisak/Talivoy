import { afterAll, beforeAll, expect, it, vi } from 'vitest';
import request from 'supertest';
import { mkdtempSync, unlinkSync, rmdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
vi.mock('./lib/gemini.js', () => ({
  generateContent: vi.fn(), GeminiError: class extends Error {},
}));
import { generateContent } from './lib/gemini.js';
const folder = mkdtempSync(path.join(tmpdir(), 'restart-st5-db-'));
const database = path.join(folder, 'integration.db');
let app: (typeof import('./index.js'))['default'];
let prisma: (typeof import('./lib/db.js'))['prisma'];
beforeAll(async () => {
  vi.stubEnv('DATABASE_URL', `file:${database.replaceAll('\\', '/')}`);
  vi.stubEnv('NODE_ENV', 'test');
  vi.stubEnv('AI_PROVIDER', 'gemini');
  writeFileSync(database, '');
  const root = fileURLToPath(new URL('../../', import.meta.url));
  execFileSync(process.execPath, [path.join(root, 'node_modules/prisma/build/index.js'), 'db', 'push',
    '--schema', path.join(root, 'prisma/schema.prisma'), '--skip-generate'], { env: process.env, stdio: 'pipe', timeout: 20_000 });
  ({ prisma } = await import('./lib/db.js'));
  ({ default: app } = await import('./index.js'));
}, 30_000);
afterAll(async () => {
  await prisma?.$disconnect();
  for (const suffix of ['', '-journal', '-wal', '-shm']) {
    try { unlinkSync(database + suffix); } catch { /* absent SQLite auxiliary file */ }
  }
  try { rmdirSync(folder); } catch { /* keep diagnostics if an unexpected file remains */ }
  vi.unstubAllEnvs();
});
it('persists results, selection and progress, enforces ownership, and deletes only the current guest', async () => {
  const raw = { opportunities: ['career-pivot', 'upskilling', 'micro-business'].map((category, i) => ({
    title: `Fictional opportunity ${i + 1}`, category, summary: 'Fictional summary', reasoning: 'Fictional reasoning',
    estimatedCostUSD: i === 0 ? 0 : 200, risks: 'Training takes time', assumptions: ['Some study time available'], questionsToVerify: ['Which local requirements apply?'],
    signals: { skillFitPct: 80, affordabilityPct: 70, launchTimeDays: 30, complexityScore: 3 },
    planItems: Array.from({ length: 12 }, (_, j) => ({ day: j + 1, week: Math.floor(j / 3) + 1, title: `Task ${j + 1}` })),
  })) };
  vi.mocked(generateContent).mockResolvedValue(JSON.stringify(raw));
  const profile = { currentRole: 'Fictional worker', skills: 'Planning', experience: 'Two years', location: 'Chicago', goals: 'Explore options' };
  const guest = request.agent(app);
  const created = await guest.post('/api/analyze').send(profile);
  expect(created.status).toBe(200);
  const opportunity = created.body.opportunities[0];
  expect((await guest.patch('/api/sessions/me/select').send({ opportunityId: opportunity.id })).status).toBe(204);
  expect((await guest.patch('/api/sessions/me/progress').send({ planItemId: opportunity.planItems[0].id, isCompleted: true })).status).toBe(204);
  const restored = await guest.get('/api/sessions/me');
  expect(restored.body.selectedOpportunityId).toBe(opportunity.id);
  expect(restored.body.opportunities[0].planItems[0].isCompleted).toBe(true);
  expect(restored.body.opportunities[0].planItems[0].completedAt).toBeTruthy();
  expect(restored.body.cookieToken).toBeUndefined();
  expect(restored.body.opportunities[0].explanation).toEqual(created.body.opportunities[0].explanation);
  expect(restored.body.opportunities[0].explanation.source).toBe('ai-estimate');
  expect(restored.body.opportunities[0].explanation.estimatedCostUSD).toBe(0);
  expect(restored.body.opportunities[0].explanation.assumptions).toEqual(['Some study time available']);
  const saved = await prisma.opportunity.findUniqueOrThrow({ where: { id: opportunity.id } });
  await prisma.opportunity.update({ where: { id: opportunity.id }, data: { explanationJson: null } });
  const legacy = await guest.get('/api/sessions/me');
  expect(legacy.body.opportunities[0].explanation).toBeNull();
  expect(legacy.body.opportunities[0].feasibilityScore).toBe(saved.feasibilityScore);
  expect(legacy.body.opportunities[0].planItems[0].isCompleted).toBe(true);
  const refinePath = '/api/sessions/me/refine';
  const input = { opportunityId: opportunity.id, constraints: { budget: 0, hours: 1 } };
  const preview = await guest.post(refinePath).send(input);
  expect(preview.status).toBe(200);
  expect(preview.body.refined.planItems.find((item: { id: string }) => item.id === opportunity.planItems[0].id))
    .toEqual(legacy.body.opportunities[0].planItems.find((item: { id: string }) => item.id === opportunity.planItems[0].id));
  const unchanged = await guest.get('/api/sessions/me');
  expect(unchanged.body.opportunities[0].planItems).toEqual(legacy.body.opportunities[0].planItems);
  expect((await guest.patch('/api/sessions/me/progress').send({ planItemId: opportunity.planItems[1].id, isCompleted: true })).status).toBe(204);
  expect((await guest.post(refinePath).send({ ...input, revision: preview.body.revision })).status).toBe(409);
  const fresh = await guest.post(refinePath).send(input);
  expect((await guest.post(refinePath).send({ ...input, revision: fresh.body.revision })).status).toBe(200);
  const after = (await guest.get('/api/sessions/me')).body.opportunities[0];
  expect(after.planItems.filter((item: { isCompleted: boolean }) => item.isCompleted)).toHaveLength(2);
  expect(after.planItems.find((item: { id: string }) => item.id === opportunity.planItems[2].id).description).toContain('Use free resources');
  const evaluation = {
    opportunityId: opportunity.id, name: 'Example Reviewer', role: 'Lecturer',
    affiliation: 'Example College', reviewerCode: 'PRIVATE-01', fit: 'Well',
    reason: 'Uses transferable skills', firstStep: 'Compare requirements',
    usefulness: 'Useful', reportChanges: 'Add a time estimate', friction: '', publish: true,
  };
  expect((await request(app).post('/api/evaluations').send(evaluation)).status).toBe(401);
  expect((await guest.post('/api/evaluations').send({ ...evaluation, publish: false })).status).toBe(400);
  expect((await guest.post('/api/evaluations').send({ ...evaluation, opportunityId: 'unknown' })).status).toBe(404);
  const review = await guest.post('/api/evaluations').send(evaluation);
  expect(review.status).toBe(201);
  expect(review.body).toMatchObject({ name: evaluation.name, opportunityTitle: opportunity.title, firstStep: evaluation.firstStep });
  const feed = await request(app).get('/api/evaluations');
  expect(feed.body).toContainEqual(review.body);
  expect(JSON.stringify(feed.body)).not.toContain('PRIVATE-01');
  const demoReview = await request(app).post('/api/evaluations').send({
    ...evaluation, opportunityId: 'demo-james-opp-1', demoPersona: 'james',
  });
  expect(demoReview.status).toBe(201);
  expect(demoReview.body).toMatchObject({ source: 'james', opportunityTitle: 'Fleet & Logistics Coordinator' });
  expect((await request(app).post('/api/evaluations').send({
    ...evaluation, opportunityId: 'demo-james-opp-1', demoPersona: 'maria',
  })).status).toBe(404);
  const combinedFeed = await request(app).get('/api/evaluations');
  expect(combinedFeed.body).toEqual(expect.arrayContaining([review.body, demoReview.body]));
  const other = request.agent(app);
  expect((await other.post('/api/analyze').send(profile)).status).toBe(200);
  expect((await other.post(refinePath).send(input)).status).toBe(404);
  expect((await other.patch('/api/sessions/me/progress').send({ planItemId: opportunity.planItems[0].id, isCompleted: false })).status).toBe(403);
  expect((await guest.delete('/api/sessions/me')).status).toBe(204);
  expect((await guest.get('/api/sessions/me')).status).toBe(204);
  expect((await other.get('/api/sessions/me')).status).toBe(200);
  expect(await prisma.session.count()).toBe(1);
});

it('seeds distinct persona plans idempotently without changing live guest records', async () => {
  const root = fileURLToPath(new URL('../../', import.meta.url));
  const before = await prisma.session.findMany({ include: { opportunities: true } });
  for (let run = 0; run < 2; run++) {
    execFileSync(process.execPath, ['--import', 'tsx', path.join(root, 'prisma/seed.ts')],
      { cwd: root, env: process.env, stdio: 'pipe', timeout: 20_000 });
  }
  const titles = new Set<string>();
  for (const personaId of ['maria', 'james', 'aisha']) {
    const res = await request(app).post('/api/sessions/demo').send({ personaId });
    expect(res.status).toBe(200);
    expect(res.body.opportunities).toHaveLength(3);
    res.body.opportunities.forEach((opp: { title: string; planItems: { title: string }[] }) => {
      titles.add(opp.title); expect(opp.planItems[0].title).toContain(opp.title);
    });
  }
  expect(titles.size).toBe(9);
  expect(await prisma.session.count()).toBe(before.length + 3);
  for (const session of before) {
    expect(await prisma.session.findUnique({ where: { id: session.id }, include: { opportunities: true } })).toEqual(session);
  }
}, 30_000);

it('persists reminders and shares only selected plan details through an expiring revocable link', async () => {
  const ownerToken = 'worker-support-owner';
  const otherToken = 'worker-support-other';
  const session = await prisma.session.create({
    data: {
      cookieToken: ownerToken,
      opportunities: { create: {
        title: 'Private opportunity title', category: 'career-pivot', summary: 'Private summary',
        reasoning: 'Private reasoning', feasibilityScore: 80, rank: 1,
        planItems: { create: [
          { title: 'Shared milestone', description: 'Shared instructions', day: 7, week: 1,
            progressEntry: { create: { isCompleted: true, completedAt: new Date() } } },
          { title: 'Unshared milestone', description: 'Private task description', day: 14, week: 2 },
        ] },
      } },
    },
    include: { opportunities: { include: { planItems: true } } },
  });
  const opportunity = session.opportunities[0];
  const task = opportunity.planItems.find((item) => item.title === 'Shared milestone')!;
  const cookie = 'restart_sid=' + ownerToken;
  const path = '/api/support';
  const future = new Date(Date.now() + 86_400_000).toISOString();

  expect((await request(app).post(path + '/reminders').send({ planItemId: task.id, dueAt: future })).status).toBe(401);
  expect((await request(app).post(path + '/reminders').set('Cookie', cookie)
    .send({ planItemId: task.id, dueAt: new Date(0).toISOString() })).status).toBe(400);
  expect((await request(app).post(path + '/reminders').set('Cookie', 'restart_sid=' + otherToken)
    .send({ planItemId: task.id, dueAt: future })).status).toBe(403);
  const reminder = await request(app).post(path + '/reminders').set('Cookie', cookie)
    .send({ planItemId: task.id, dueAt: future });
  expect(reminder.status).toBe(200);
  const updated = await request(app).post(path + '/reminders').set('Cookie', cookie)
    .send({ planItemId: task.id, dueAt: new Date(Date.now() + 172_800_000).toISOString() });
  expect(updated.body.id).toBe(reminder.body.id);
  expect((await request(app).get(path + '/reminders').set('Cookie', cookie)).body).toHaveLength(1);
  expect((await request(app).get(path + '/reminders').set('Cookie', 'restart_sid=' + otherToken)).body).toEqual([]);

  const selection = { opportunityId: opportunity.id, includeTitle: false, includeSummary: false,
    includeReasoning: false, includeProgress: false, taskIds: [task.id], expiresInDays: 7 };
  expect((await request(app).post(path + '/adviser-shares').set('Cookie', cookie)
    .send({ ...selection, taskIds: ['foreign-task'] })).status).toBe(403);
  expect((await request(app).post(path + '/adviser-shares').set('Cookie', cookie)
    .send({ ...selection, taskIds: [] })).status).toBe(400);
  const created = await request(app).post(path + '/adviser-shares').set('Cookie', cookie).send(selection);
  expect(created.status).toBe(201);
  expect(created.body.token).toMatch(/^[a-f0-9]{64}$/);
  const stored = await prisma.adviserShare.findUniqueOrThrow({ where: { id: created.body.id } });
  expect(stored.tokenHash).not.toBe(created.body.token);
  expect(stored.snapshotJson).not.toContain('Private');

  const read = await request(app).post(path + '/adviser-review/read').send({ token: created.body.token });
  expect(read.status).toBe(200);
  expect(read.body.snapshot).toEqual({
    tasks: [{ title: 'Shared milestone', description: 'Shared instructions', day: 7, week: 1 }],
  });
  expect(read.text).not.toContain('cookieToken');
  expect(read.text).not.toContain('isCompleted');
  expect(read.headers['cache-control']).toBe('no-store');
  const list = await request(app).get(path + '/adviser-shares').set('Cookie', cookie);
  expect(list.body).toHaveLength(1);
  expect(list.text).not.toContain(created.body.token);
  expect((await request(app).get(path + '/adviser-shares').set('Cookie', 'restart_sid=' + otherToken)).body).toEqual([]);
  await request(app).delete(path + '/adviser-shares/' + created.body.id).set('Cookie', 'restart_sid=' + otherToken);
  expect((await request(app).post(path + '/adviser-review/read').send({ token: created.body.token })).status).toBe(200);

  await prisma.adviserShare.update({ where: { id: created.body.id }, data: { expiresAt: new Date(0) } });
  expect((await request(app).post(path + '/adviser-review/read').send({ token: created.body.token })).status).toBe(404);
  expect((await request(app).post(path + '/adviser-review/read').send({ token: 'invalid' })).status).toBe(404);
  const second = await request(app).post(path + '/adviser-shares').set('Cookie', cookie)
    .send({ ...selection, includeTitle: true, includeSummary: true, includeReasoning: true, includeProgress: true });
  const fullRead = await request(app).post(path + '/adviser-review/read').send({ token: second.body.token });
  expect(fullRead.body.snapshot.title).toBe(opportunity.title);
  expect(fullRead.body.snapshot.tasks[0].isCompleted).toBe(true);
  await request(app).delete(path + '/adviser-shares/' + second.body.id).set('Cookie', cookie);
  expect((await request(app).post(path + '/adviser-review/read').send({ token: second.body.token })).status).toBe(404);

  await request(app).delete(path + '/reminders/' + reminder.body.id).set('Cookie', 'restart_sid=' + otherToken);
  expect((await request(app).get(path + '/reminders').set('Cookie', cookie)).body).toHaveLength(1);
  await request(app).delete(path + '/reminders/' + reminder.body.id).set('Cookie', cookie);
  expect((await request(app).get(path + '/reminders').set('Cookie', cookie)).body).toEqual([]);
  await prisma.session.delete({ where: { id: session.id } });
  expect(await prisma.adviserShare.count({ where: { sessionId: session.id } })).toBe(0);
});
