import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { NetlifyDB } from '@netlify/database-dev';

// Disposable in-memory PostgreSQL; never loads .env or connects to a live database.
const database = new NetlifyDB({ logger: () => {} });
try {
  process.env.NETLIFY_DB_URL = await database.start();
  process.env.URL = 'https://talivoy-test.netlify.app';
  process.env.CLIENT_ORIGIN = process.env.URL;
  process.env.ACTION_SIGNING_SECRET = 'test-only-secret-not-a-production-credential';
  await database.applyMigrations('netlify/database/migrations');
  const { default: handler } = await import('../.netlify/functions/api.mjs');
  const prisma = globalThis.prisma;
  const invoke = async (path, method = 'GET', body, headers = {}) => {
    const response = await handler(new Request(new URL(path, process.env.URL), {
      method, body: body === undefined ? undefined : JSON.stringify(body),
      headers: { origin: process.env.URL, 'content-type': 'application/json', ...headers },
    }), { ip: '127.0.0.1' });
    return { statusCode: response.status, body: await response.text() };
  };
  assert.equal((await invoke('/health')).statusCode, 200);
  assert.equal((await invoke('/.netlify/functions/api/health')).statusCode, 200);
  assert.equal((await invoke('/api/not-found')).statusCode, 404);
  assert.equal((await invoke('/api/sessions/me')).statusCode, 204);
  const oversized = await handler(new Request(new URL('/api/resume', process.env.URL), {
    method: 'POST', headers: { origin: process.env.URL, 'content-type': 'application/pdf' },
    body: new Uint8Array(4 * 1024 * 1024 + 1),
  }), { ip: '127.0.0.2' });
  assert.equal(oversized.status, 413);

  const session = await prisma.session.create({ data: { cookieToken: 'test-owner-token',
    opportunities: { create: { title: 'Test opportunity', category: 'upskilling',
      summary: 'Fictional', reasoning: 'Fictional', feasibilityScore: 75, rank: 1,
      planItems: { create: { day: 1, week: 1, title: 'Review requirements' } } } } },
    include: { opportunities: { include: { planItems: true } } } });
  const headers = { cookie: 'talivoy_sid=test-owner-token' };
  const planItemId = session.opportunities[0].planItems[0].id;
  assert.equal((await invoke('/api/sessions/me/progress', 'PATCH', { planItemId, isCompleted: true }, headers)).statusCode, 204);
  assert.equal((await invoke('/api/sessions/me/progress', 'PATCH', { planItemId, isCompleted: false },
    { ...headers, origin: 'https://other.example' })).statusCode, 403);
  assert.equal((await invoke('/api/sessions/me/progress', 'PATCH', { planItemId, isCompleted: false })).statusCode, 401);
  const restored = JSON.parse((await invoke('/api/sessions/me', 'GET', undefined, headers)).body);
  assert.equal(restored.opportunities[0].planItems[0].isCompleted, true);
  assert.equal(restored.cookieToken, undefined);
  // A new database connection sees saved work, independently of the function instance.
  const require = createRequire(import.meta.url);
  const { PrismaClient } = require('@talivoy/netlify-prisma');
  const reconnected = new PrismaClient();
  try { assert.equal((await reconnected.progressEntry.findUnique({ where: { planItemId } })).isCompleted, true); }
  finally { await reconnected.$disconnect(); }
  console.log('Netlify adapter + PostgreSQL migration, ownership, progress and reconnection checks passed.');
} finally {
  await globalThis.prisma?.$disconnect();
  await database.stop();
}
