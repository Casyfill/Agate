// Headless smoke test (ADR-0001 D8, Layer 2 precursor): compile every fixture spec in
// test-vault/charts, inject rows in the D4 shape, and render to SVG with real Vega.
// No Obsidian needed:  npm run smoke
import * as vega from 'vega';
import * as vl from 'vega-lite';
import { readFileSync, readdirSync } from 'fs';
import { join, resolve } from 'path';

const root = resolve(import.meta.dirname, '..');
const rows = [
  { file: { name: 'Dune', path: 'Library/Dune.md' }, note: { author: 'Herbert', genre: 'sci-fi', rating: 5, pages: 412, published: '1965-08-01', status: 'read' }, formula: { age: 61, decade: 1960 }, group: 'sci-fi' },
  { file: { name: 'Hobbit', path: 'Library/The Hobbit.md' }, note: { author: 'Tolkien', genre: 'fantasy', rating: 5, pages: 310, published: '1937-09-21', status: 'read' }, formula: { age: 88, decade: 1930 }, group: 'fantasy' },
  { file: { name: 'Gone Girl', path: 'Library/Gone Girl.md' }, note: { author: 'Flynn', genre: 'thriller', rating: 3, pages: 415, published: '2012-06-05', status: 'read' }, formula: { age: 14, decade: 2010 }, group: 'thriller' },
  { file: { name: 'Draft', path: 'Library/Unrated Draft.md' }, note: { author: 'Unknown', genre: 'sci-fi', rating: null, pages: 120, published: null, status: 'to-read' }, formula: { age: null, decade: null }, group: 'sci-fi' },
];

const loader = vega.loader();
loader.load = async (uri) => readFileSync(join(root, 'test-vault', uri), 'utf8');

let failed = 0;
for (const name of readdirSync(join(root, 'test-vault/charts'))) {
  const spec = JSON.parse(readFileSync(join(root, 'test-vault/charts', name), 'utf8'));
  const isVL = /vega-lite/.test(spec.$schema ?? '');
  try {
    let vgSpec = spec;
    if (isVL) {
      const s = { ...spec };
      if (s.width === 'container') s.width = 500; // no DOM here
      vgSpec = vl.compile(s).spec;
    }
    const view = new vega.View(vega.parse(vgSpec), { renderer: 'none', loader });
    const hasBase = (vgSpec.data ?? []).some((d) => d.name === 'base');
    if (hasBase) view.data('base', rows);
    const svg = await view.toSVG();
    const marks = (svg.match(/<path|<rect|<circle|<line/g) ?? []).length;
    console.log(`ok   ${name}  (${isVL ? 'VL' : 'VG'}, ${svg.length} chars, ${marks} shapes)`);
    view.finalize();
  } catch (e) {
    failed++;
    console.log(`FAIL ${name}: ${e.message}`);
  }
}
process.exit(failed ? 1 : 0);
