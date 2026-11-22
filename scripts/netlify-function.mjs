import { mkdir, writeFile } from 'node:fs/promises';
import { build } from 'esbuild';

await mkdir('.netlify/functions', { recursive: true });
await writeFile('.netlify/functions/package.json', '{"type":"module"}\n');
await build({
  entryPoints: ['netlify/functions/api.mjs'], outfile: '.netlify/functions/api.mjs',
  bundle: true, platform: 'node', format: 'esm', target: 'node22',
  external: ['@prisma/client', '@talivoy/netlify-prisma', 'pdfjs-dist'],
  banner: { js: 'import { createRequire as makeRequire } from "node:module"; const require = makeRequire(import.meta.url);' },
});
console.log('Netlify API bundled.');
