#!/usr/bin/env node
// Builds the at-a-glance roadmap page from ROADMAP.md.
// Usage: node scripts/roadmap-page/build.mjs [out.html]   (default: dist/roadmap.html)
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');
const out = process.argv[2] ?? join(root, 'dist', 'roadmap.html');

// JSON is valid JS; escape "</" so the roadmap can never close the <script> tag.
const js = (v) => JSON.stringify(v).replace(/<\//g, '<\\/');
let commit = '';
try { commit = execSync('git rev-parse --short HEAD', { cwd: root }).toString().trim(); } catch {}

const html = readFileSync(join(here, 'template.html'), 'utf8')
  .replace('__ROADMAP_JSON__', () => js(readFileSync(join(root, 'ROADMAP.md'), 'utf8')))
  .replace('__BUILT_JSON__', () => js({ date: new Date().toISOString().slice(0, 10), commit }));

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, html);
console.log(`Wrote ${out}`);
