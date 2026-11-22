import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = fileURLToPath(new URL('../', import.meta.url));
const source = await readFile(new URL('../prisma/schema.prisma', import.meta.url), 'utf8');
if (!source.includes('provider = "sqlite"')) throw new Error('Expected the local SQLite schema.');
const schema = source.replace('provider = "sqlite"', 'provider = "postgresql"')
  .replace('provider = "prisma-client-js"', 'provider = "prisma-client-js"\n  output = "../node_modules/@talivoy/netlify-prisma"\n  binaryTargets = ["native", "rhel-openssl-3.0.x"]');
await writeFile(new URL('../prisma/netlify.generated.prisma', import.meta.url), schema);

const action = process.argv[2];
const args = action === 'sql'
  ? ['migrate', 'diff', '--from-empty', '--to-schema-datamodel', 'prisma/netlify.generated.prisma', '--script']
  : ['generate', '--schema=prisma/netlify.generated.prisma'];
const result = spawnSync(process.execPath, ['node_modules/prisma/build/index.js', ...args], {
  cwd: root, encoding: 'utf8', env: { ...process.env,
    DATABASE_URL: process.env.NETLIFY_DB_URL || 'postgresql://unused:unused@localhost:5432/unused' },
});
if (result.status !== 0) { process.stderr.write(result.stderr || 'Prisma preparation failed.'); process.exit(1); }
if (action === 'sql') process.stdout.write(result.stdout);
else process.stdout.write('Netlify PostgreSQL client generated.\n');
