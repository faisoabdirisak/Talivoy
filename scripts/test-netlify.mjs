import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { NetlifyDB } from '@netlify/database-dev';

// Disposable in-memory PostgreSQL; never loads .env or connects to a live database.
const database = new NetlifyDB({ logger: () => {} });
try {
  process.env.NETLIFY_DB_URL = await database.start();
  process.env.DOCLING_ENABLED = 'false'; // Keep the PDF fixture local even if Prisma discovers a .env.
  process.env.URL = 'https://talivoy-test.netlify.app';
  process.env.CLIENT_ORIGIN = process.env.URL;
  process.env.ACTION_SIGNING_SECRET = 'test-only-secret-not-a-production-credential';
  await database.applyMigrations('netlify/database/migrations');
  const { default: handler } = await import('../.netlify/compatibility-check/api.mjs');
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
  // A real text PDF exercises binary upload + PDF.js, without an external AI call.
  const text = 'BT /F1 12 Tf 50 750 Td (Current role: Warehouse Associate) Tj 0 -20 Td (Years of experience: 2 years) Tj ET';
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${text.length} >>\nstream\n${text}\nendstream`,
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  for (const [index, object] of objects.entries()) {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  }
  const xref = Buffer.byteLength(pdf);
  pdf += `xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  const uploaded = await handler(new Request(new URL('/api/resume', process.env.URL), {
    method: 'POST', headers: { origin: process.env.URL, 'content-type': 'application/pdf' },
    body: Buffer.from(pdf),
  }), { ip: '127.0.0.3' });
  assert.equal(uploaded.status, 200);
  const extracted = await uploaded.json();
  assert.equal(extracted.draft.currentRole, 'Warehouse Associate');
  assert.equal(extracted.draft.experience, '2 years');

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
  const evidenceInput = { opportunityId: session.opportunities[0].id, skill: 'Inventory management', source: 'work', evidence: 'I used stock-tracking software for two years.', status: 'have-evidence', nextStep: 'Prepare a resume example' };
  const createdEvidence = await invoke('/api/skills-evidence', 'POST', evidenceInput, headers);
  assert.equal(createdEvidence.statusCode, 201);
  const evidence = JSON.parse(createdEvidence.body);
  assert.equal((await invoke('/api/skills-evidence?opportunityId=' + evidenceInput.opportunityId)).statusCode, 401);
  await database.applyMigrations('netlify/database/migrations');
  // A new database connection sees saved work, independently of the function instance.
  const require = createRequire(import.meta.url);
  const { PrismaClient } = require('@talivoy/netlify-prisma');
  const reconnected = new PrismaClient();
  try {
    assert.equal((await reconnected.progressEntry.findUnique({ where: { planItemId } })).isCompleted, true);
    assert.equal((await reconnected.skillEvidence.findUnique({ where: { id: evidence.id } })).evidence, evidenceInput.evidence);
  }
  finally { await reconnected.$disconnect(); }
  console.log('Netlify adapter + PostgreSQL migration, ownership, progress and reconnection checks passed.');
} finally {
  await globalThis.prisma?.$disconnect();
  await database.stop();
}
