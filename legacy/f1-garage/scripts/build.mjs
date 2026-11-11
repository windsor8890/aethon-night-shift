import { build } from 'esbuild';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const outdir = path.join(root, 'dist');
await mkdir(outdir, { recursive: true });

const result = await build({
  entryPoints: [path.join(root, 'src/main.js')],
  bundle: true,
  format: 'iife',
  target: ['es2020'],
  platform: 'browser',
  minify: !process.argv.includes('--dev'),
  sourcemap: false,
  write: false,
  legalComments: 'none',
});

const js = result.outputFiles[0].text;
const css = await readFile(path.join(root, 'src/styles.css'), 'utf8');
let html = await readFile(path.join(root, 'src/index.html'), 'utf8');
html = html.replace('/*__INLINE_CSS__*/', () => css);
html = html.replace('/*__INLINE_JS__*/', () => js);
await writeFile(path.join(outdir, 'index.html'), html, 'utf8');
console.log(`built dist/index.html  ${(Buffer.byteLength(html) / 1024 / 1024).toFixed(2)} MB`);
