/* The categorical palette (0.91.0) keeps chapter 3's rules in both forms:
   3:1 against bg, surface and input-bg; apart from the status colours and
   the accent; neighbours apart for normal and simulated colour vision.
   The stylesheet gives the eight colours in each theme, and the reader's
   text colour in forced colours. */
const fs = require('fs');
const path = require('path');
const { launch, ROOT } = require('./lib');
let failures = 0;
function check(name, ok, detail) {
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail !== undefined && !ok ? ' ' + JSON.stringify(detail) : ''));
  if (!ok) failures++;
}

const hex = h => { h = h.replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join(''); return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16) / 255); };
const lin = c => c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
const lum = rgb => { const [r, g, b] = rgb.map(lin); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const contrast = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
function oklab([r, g, b]) {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s, 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s];
}
const distLin = (a, b) => { const x = oklab(a), y = oklab(b); return 100 * Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]); };
const dist = (a, b) => distLin(a.map(lin), b.map(lin));
const hue = rgb => { const [, a, b] = oklab(rgb.map(lin)); return (Math.atan2(b, a) * 180 / Math.PI + 360) % 360; };
const hueGap = (a, b) => { const d = Math.abs(hue(a) - hue(b)) % 360; return Math.min(d, 360 - d); };
/* Machado, Oliveira and Fernandes (2009), full severity, on linear RGB. */
const CVD = {
  protanopia: [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]],
  deuteranopia: [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.011820, 0.042940, 0.968881]]
};
const simulate = (rgb, m) => { const l = rgb.map(lin); return m.map(r => Math.min(1, Math.max(0, r[0] * l[0] + r[1] * l[1] + r[2] * l[2]))); };

const dir = path.join(__dirname, '..', 'vendor', 'pudl-spec', 'tokens');
const derived = JSON.parse(fs.readFileSync(path.join(dir, 'derived.json'), 'utf8'));
const palettes = {};
for (const form of ['light', 'dark']) {
  const raw = JSON.parse(fs.readFileSync(path.join(dir, 'palette.' + form + '.tokens.json'), 'utf8'));
  const flat = {};
  Object.values(raw).forEach(g => { if (g && typeof g === 'object') Object.entries(g).forEach(([k, v]) => { if (v && v.$value !== undefined) flat[k] = v.$value; }); });
  palettes[form] = flat;
}
check('derived.json still makes input-bg from light and surface by lit', JSON.stringify(derived.sunken['input-bg']) === JSON.stringify({ mix: ['light', 'surface'], by: 'lit' }), derived.sunken['input-bg']);

const values = {};
for (const form of ['light', 'dark']) {
  const p = palettes[form], c = n => hex(p[n].hex);
  const lit = p.lit, light = c('light'), surface = c('surface');
  const bases = { bg: c('bg'), surface, 'input-bg': light.map((v, i) => v * lit + surface[i] * (1 - lit)) };
  const slots = [1, 2, 3, 4, 5, 6, 7, 8].map(n => p['category-' + n] && c('category-' + n));
  values[form] = slots.map((s, i) => p['category-' + (i + 1)] && p['category-' + (i + 1)].hex);
  check(form + ': all eight category colours are set', slots.every(Boolean));
  if (!slots.every(Boolean)) continue;
  const low = [];
  slots.forEach((s, i) => Object.entries(bases).forEach(([b, v]) => { const r = contrast(s, v); if (r < 3) low.push([i + 1, b, +r.toFixed(2)]); }));
  check(form + ': every slot reaches 3:1 on bg, surface and input-bg', low.length === 0, low);
  const near = [];
  slots.forEach((s, i) => ['warn', 'danger', 'positive'].forEach(st => { const d = dist(s, c(st)), h = hueGap(s, c(st)); if (d < 12 || h < 20) near.push([i + 1, st, +d.toFixed(1), +h.toFixed(0)]); }));
  check(form + ': every slot is at least 12 and 20 degrees from each status colour', near.length === 0, near);
  const acc = slots.map((s, i) => [i + 1, +dist(s, c('accent')).toFixed(1)]).filter(x => x[1] < 8);
  check(form + ': every slot is at least 8 from the accent', acc.length === 0, acc);
  const nb = [];
  for (let i = 0; i < 7; i++) {
    const d = dist(slots[i], slots[i + 1]);
    const s = Math.min(...Object.values(CVD).map(m => distLin(simulate(slots[i], m), simulate(slots[i + 1], m))));
    if (d < 15 || s < 8) nb.push([i + 1, i + 2, +d.toFixed(1), +s.toFixed(1)]);
  }
  check(form + ': neighbouring slots are 15 apart, and 8 under simulated protanopia and deuteranopia', nb.length === 0, nb);
}

(async () => {
  const browser = await launch();
  const page = await browser.newPage();
  await page.goto(ROOT + '/reference.html');
  const read = () => page.evaluate(() => { const cs = getComputedStyle(document.documentElement); return [1, 2, 3, 4, 5, 6, 7, 8].map(n => cs.getPropertyValue('--category-' + n).trim().toLowerCase()); });
  for (const form of ['light', 'dark']) {
    await page.evaluate(f => document.documentElement.setAttribute('data-theme', f), form);
    const got = await read();
    check('the stylesheet gives the ' + form + ' values', JSON.stringify(got) === JSON.stringify(values[form]), { got, want: values[form] });
  }
  await page.emulateMedia({ forcedColors: 'active' });
  const forced = await read();
  check('in forced colours every slot is the system text colour', forced.every(v => v === 'canvastext'), forced);
  const nested = await page.evaluate(() => { const d = document.createElement('div'); d.setAttribute('data-theme', 'light'); document.body.append(d); return getComputedStyle(d).getPropertyValue('--category-3').trim().toLowerCase(); });
  check('a nested theme also gives the system text colour in forced colours', nested === 'canvastext', nested);
  await browser.close();
  console.log(failures ? failures + ' FAILED' : 'ALL PASSED');
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
