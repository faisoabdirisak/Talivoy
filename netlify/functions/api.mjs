import serverless from 'serverless-http';
import { createRequire } from 'node:module';

// Set configuration before Express and its route modules are evaluated.
process.env.TALIVOY_NETLIFY = 'true';
process.env.NODE_ENV = 'production';
if (!process.env.CLIENT_ORIGIN) process.env.CLIENT_ORIGIN = process.env.URL;
if (!process.env.ACTION_SIGNING_SECRET || process.env.ACTION_SIGNING_SECRET.length < 32) {
  throw new Error('Set ACTION_SIGNING_SECRET to at least 32 random characters in Netlify.');
}
if (!process.env.NETLIFY_DB_URL) throw new Error('Enable Netlify Database before deploying.');
const databaseURL = new URL(process.env.NETLIFY_DB_URL);
if (!databaseURL.searchParams.has('connection_limit')) databaseURL.searchParams.set('connection_limit', '1');
if (!databaseURL.searchParams.has('pool_timeout')) databaseURL.searchParams.set('pool_timeout', '10');
process.env.DATABASE_URL = databaseURL.href;
const require = createRequire(import.meta.url);
const { PrismaClient } = require('@talivoy/netlify-prisma');
globalThis.prisma ??= new PrismaClient({ log: ['error'] });

const { default: app } = await import('../../server/src/index.ts');
const serve = serverless(app, { binary: ['application/pdf', 'application/octet-stream',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'] });

const handler = (event, context) => {
  // Accept both direct function URLs and rewrites; keep Express's /api prefix.
  const prefix = '/.netlify/functions/api';
  const path = event.path.startsWith(prefix) ? event.path.slice(prefix.length) || '/' : event.path;
  return serve({ ...event, path }, context);
};

export default async (request, context) => {
  const url = new URL(request.url);
  const query = {};
  for (const [key, value] of url.searchParams) (query[key] ??= []).push(value);
  const result = await handler({
    path: url.pathname, httpMethod: request.method,
    headers: Object.fromEntries(request.headers),
    body: Buffer.from(await request.arrayBuffer()), isBase64Encoded: false,
    multiValueQueryStringParameters: query,
    requestContext: { identity: { sourceIp: context.ip || '127.0.0.1' } },
  }, { callbackWaitsForEmptyEventLoop: false });
  const headers = new Headers(result.headers);
  for (const [key, values] of Object.entries(result.multiValueHeaders || {})) {
    headers.delete(key);
    for (const value of values) headers.append(key, value);
  }
  return new Response(result.statusCode === 204 || result.statusCode === 304 ? null
    : Buffer.from(result.body || '', result.isBase64Encoded ? 'base64' : 'utf8'),
  { status: result.statusCode, headers });
};

export const config = { path: ['/api/*', '/health'] };
