// Builds income-limits-data.js: projected OR + WA county paths joined to HUD FY2026 income limits.
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { geoConicConformal, geoPath } from 'd3-geo';
import { feature, mesh } from 'topojson-client';
import { presimplify, simplify, quantile } from 'topojson-simplify';

const [, , csvPath, outPath] = process.argv;
const require = createRequire(import.meta.url);
let topo = require('us-atlas/counties-10m.json');
topo = presimplify(topo);
topo = simplify(topo, quantile(topo, 0.35));

const keep = (id) => id.startsWith('41') || id.startsWith('53');
const counties = feature(topo, topo.objects.counties).features.filter((f) => keep(f.id));
const fc = { type: 'FeatureCollection', features: counties };

const W = 800, H = 760;
const proj = geoConicConformal().parallels([43, 48]).rotate([120.5, 0]).fitExtent([[6, 6], [W - 6, H - 6]], fc);
const path = geoPath(proj).digits(1);

// HUD CSV (quoted, comma-separated, no embedded commas except inside quotes)
const lines = readFileSync(csvPath, 'utf8').trim().split(/\r?\n/);
const parse = (l) => [...l.matchAll(/"([^"]*)"/g)].map((m) => m[1]);
const hdr = parse(lines[0]);
const hud = new Map();
for (const l of lines.slice(1)) {
  const r = Object.fromEntries(parse(l).map((v, i) => [hdr[i], v]));
  hud.set(r.fips.slice(0, 5), r);
}

const out = counties.map((f) => {
  const r = hud.get(f.id);
  if (!r) throw new Error('No HUD row for ' + f.id + ' ' + f.properties.name);
  const n = (k) => Number(r[k]);
  return {
    fips: f.id,
    name: r.County_Name,
    state: r.stusps,
    area: r.hud_area_name,
    metro: r.metro === '1',
    median: n('median2026'),
    l80: [1, 2, 3, 4, 5, 6, 7, 8].map((i) => n('l80_' + i)),
    l50: [1, 2, 3, 4, 5, 6, 7, 8].map((i) => n('l50_' + i)),
    c: path.centroid(f).map((v) => Math.round(v)),
    d: path(f),
  };
}).sort((a, b) => a.state.localeCompare(b.state) || a.name.localeCompare(b.name));

const stateBorder = path(mesh(topo, topo.objects.counties, (a, b) => a !== b && keep(a.id) && keep(b.id) && a.id.slice(0, 2) !== b.id.slice(0, 2)));
const outline = path(mesh(topo, topo.objects.counties, (a, b) => (a === b && keep(a.id)) || (keep(a.id) !== keep(b.id))));

const [[x0, y0], [x1, y1]] = path.bounds(fc);
const vb = [Math.floor(x0) - 4, Math.floor(y0) - 4, Math.ceil(x1 - x0) + 8, Math.ceil(y1 - y0) + 8].join(' ');
const data = { source: 'HUD FY2026 Income Limits (effective 2026)', viewBox: vb, stateBorder, outline, counties: out };
writeFileSync(outPath, '/* Generated from HUD FY2026 Section 8 income limits + us-atlas counties. Do not hand-edit; regenerate. */\nwindow.IL_DATA = ' + JSON.stringify(data) + ';\n');
console.log('counties', out.length, 'OR', out.filter((c) => c.state === 'OR').length, 'WA', out.filter((c) => c.state === 'WA').length, 'bytes', readFileSync(outPath).length);
