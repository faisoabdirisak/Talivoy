import { afterAll, beforeAll, expect, it, vi } from 'vitest';
import request from 'supertest';
import { mkdtempSync, writeFileSync, unlinkSync, rmdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
vi.mock('./lib/granite.js', () => ({ generateGraniteContent: vi.fn() }));
import { generateGraniteContent } from './lib/granite.js';
const folder = mkdtempSync(path.join(tmpdir(), 'talivoy-evidence-'));
const database = path.join(folder, 'test.db');
let prisma: (typeof import('./lib/db.js'))['prisma'];
let app: (typeof import('./index.js'))['default'];
beforeAll(async () => {
  vi.stubEnv('DATABASE_URL', 'file:' + database.replaceAll('\\', '/'));
  vi.stubEnv('NODE_ENV', 'test');
  vi.stubEnv('AI_PROVIDER', 'granite');
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
      /* absent auxiliary file */
    }
  }
  try {
    rmdirSync(folder);
  } catch {
    /* keep unexpected diagnostics */
  }
  vi.unstubAllEnvs();
});

it('persists private evidence, gates wording, protects revisions, and shares only chosen approved fields', async () => {
  const session = await prisma.session.create({
    data: {
      cookieToken: 'evidence-owner',
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
  const url = '/api/skills-evidence';
  const cookie = 'talivoy_sid=evidence-owner';
  const base = {
    opportunityId,
    skill: 'Team leadership',
    source: 'work',
    evidence: 'I supervised six warehouse staff.',
    status: 'have-evidence',
    nextStep: 'Prepare an interview example',
  };
  expect((await request(app).post(url).send(base)).status).toBe(401);
  expect(
    (
      await request(app)
        .post(url)
        .set('Cookie', cookie)
        .send({ ...base, evidence: '' })
    ).status
  ).toBe(400);
  const added = await request(app).post(url).set('Cookie', cookie).send(base);
  expect(added.status).toBe(201);
  const item = added.body;
  const list = await request(app)
    .get(url + '?opportunityId=' + opportunityId)
    .set('Cookie', cookie);
  expect(list.body).toContainEqual(item);
  expect(
    (
      await request(app)
        .get(url + '?opportunityId=' + opportunityId)
        .set('Cookie', 'talivoy_sid=other-worker')
    ).status
  ).toBe(404);
  expect(
    (
      await request(app)
        .put(url + '/' + item.id)
        .set('Cookie', 'talivoy_sid=other-worker')
        .send({ ...base, revision: item.revision })
    ).status
  ).toBe(404);
  const draft = await request(app)
    .post(url + '/' + item.id + '/suggest')
    .set('Cookie', cookie)
    .send({ mode: 'template' });
  expect(draft.body.bullet).toBe('Supervised six warehouse staff.');
  expect(draft.body.requiresConfirmation).toBe(true);
  expect(
    (
      await request(app)
        .put(url + '/' + item.id)
        .set('Cookie', cookie)
        .send({ ...base, revision: item.revision, bullet: draft.body.bullet })
    ).status
  ).toBe(400);
  const approved = await request(app)
    .put(url + '/' + item.id)
    .set('Cookie', cookie)
    .send({ ...base, revision: item.revision, bullet: draft.body.bullet, confirmWording: true });
  expect(approved.status).toBe(200);
  expect(approved.body.bulletReviewedAt).toBeTruthy();
  expect(
    (
      await request(app)
        .put(url + '/' + item.id)
        .set('Cookie', cookie)
        .send({ ...base, revision: item.revision })
    ).status
  ).toBe(409);
  const privateRecord = await request(app)
    .post(url)
    .set('Cookie', cookie)
    .send({ ...base, skill: 'Private example', evidence: 'PRIVATE EVIDENCE NOT SELECTED' });
  const sharing = {
    opportunityId,
    includeTitle: true,
    includeSummary: false,
    includeReasoning: false,
    includeProgress: false,
    taskIds: [],
    expiresInDays: 1,
  };
  const defaultShare = await request(app)
    .post('/api/support/adviser-shares')
    .set('Cookie', cookie)
    .send(sharing);
  expect(defaultShare.status).toBe(201);
  const defaultRead = await request(app)
    .post('/api/support/adviser-review/read')
    .send({ token: defaultShare.body.token });
  expect(defaultRead.body.snapshot.skillsEvidence).toBeUndefined();
  const selected = await request(app)
    .post('/api/support/adviser-shares')
    .set('Cookie', cookie)
    .send({ ...sharing, evidenceIds: [item.id] });
  const read = await request(app)
    .post('/api/support/adviser-review/read')
    .send({ token: selected.body.token });
  expect(read.body.snapshot.skillsEvidence).toEqual([
    {
      skill: base.skill,
      source: base.source,
      evidence: base.evidence,
      status: base.status,
      nextStep: base.nextStep,
      selfReported: true,
      bullet: draft.body.bullet,
    },
  ]);
  expect(JSON.stringify(read.body)).not.toContain('PRIVATE EVIDENCE NOT SELECTED');
  expect(
    (
      await request(app)
        .post('/api/support/adviser-shares')
        .set('Cookie', cookie)
        .send({ ...sharing, evidenceIds: ['someone-elses-evidence'] })
    ).status
  ).toBe(403);
  vi.mocked(generateGraniteContent).mockResolvedValue(
    JSON.stringify({ bullet: 'Managed 500 staff.' })
  );
  expect(
    (
      await request(app)
        .post(url + '/' + item.id + '/suggest')
        .set('Cookie', cookie)
        .send({ mode: 'ai' })
    ).status
  ).toBe(502);
  vi.mocked(generateGraniteContent).mockResolvedValue(
    JSON.stringify({ bullet: 'Supervised six warehouse staff.' })
  );
  const ai = await request(app)
    .post(url + '/' + item.id + '/suggest')
    .set('Cookie', cookie)
    .send({ mode: 'ai' });
  expect(ai.status).toBe(200);
  expect(ai.body.source).toBe('ai');
  expect((await prisma.skillEvidence.findUniqueOrThrow({ where: { id: item.id } })).bullet).toBe(
    draft.body.bullet
  );
  const changed = await request(app)
    .put(url + '/' + item.id)
    .set('Cookie', cookie)
    .send({
      ...base,
      evidence: 'I coordinated a volunteer activity.',
      revision: approved.body.revision,
    });
  expect(changed.status).toBe(200);
  expect(changed.body.bullet).toBe('');
  expect(changed.body.bulletReviewedAt).toBeNull();
  expect(
    (
      await request(app)
        .delete(url + '/' + item.id)
        .set('Cookie', cookie)
        .send({ revision: approved.body.revision })
    ).status
  ).toBe(409);
  expect(
    (
      await request(app)
        .delete(url + '/' + item.id)
        .set('Cookie', cookie)
        .send({ revision: changed.body.revision })
    ).status
  ).toBe(204);
  const preserved = await request(app)
    .post('/api/support/adviser-review/read')
    .send({ token: selected.body.token });
  expect(preserved.body.snapshot.skillsEvidence[0].evidence).toBe(base.evidence);
  expect((await request(app).delete('/api/sessions/me').set('Cookie', cookie)).status).toBe(204);
  expect(
    await prisma.skillEvidence.findUnique({ where: { id: privateRecord.body.id } })
  ).toBeNull();
});
