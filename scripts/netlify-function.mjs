import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { build } from 'esbuild';

await mkdir('.netlify/functions', { recursive: true });
await writeFile('.netlify/functions/package.json', '{"type":"module"}\n');
await build({
  entryPoints: ['netlify/functions/api.mjs'], outfile: '.netlify/functions/api.mjs',
  bundle: true, platform: 'node', format: 'esm', target: 'node22',
  external: ['@prisma/client', '@talivoy/netlify-prisma', 'pdfjs-dist'],
  banner: { js: 'import { createRequire as talivoyCreateRequire } from "node:module"; globalThis.require ??= talivoyCreateRequire(import.meta.url);' },
});
// Netlify prepends these CommonJS compatibility bindings to ESM functions.
// Run integration checks with the same bindings to catch declaration collisions.
await mkdir('.netlify/compatibility-check', { recursive: true });
await writeFile('.netlify/compatibility-check/api.mjs', [
  'import { createRequire as compatibilityRequire } from "node:module";',
  'import { fileURLToPath as compatibilityFile } from "node:url";',
  'import { dirname as compatibilityDirectory } from "node:path";',
  'let __filename = compatibilityFile(import.meta.url);',
  'let __dirname = compatibilityDirectory(__filename);',
  'let require = compatibilityRequire(import.meta.url);',
  await readFile('.netlify/functions/api.mjs', 'utf8'),
].join('\n'));
console.log('Netlify API bundled.');
