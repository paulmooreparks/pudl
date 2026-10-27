/* Diffs (0.93.0): the tint keeps every syntax colour at 4.5:1 and each
   sign at 3:1; every changed line shows its sign; gutters are not
   selected; lines that can be chosen are 24px tall and a chosen one has
   the accent edge; the two sides of a side-by-side diff stay aligned; and
   in forced colours the kinds show as solid and dashed edges. */
const fs = require('fs');
const path = require('path');
const { launch, ROOT } = require('./lib');
let failures = 0;
function check(name, ok, detail) {
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail !== undefined && !ok ? ' ' + JSON.stringify(detail) : ''));
  if (!ok) failures++;
}

/* The token rule, from the vendored palette and derived.json. */
const hex = h => { h = h.replace('#', ''); return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16) / 255); };
const lin = c => c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
const lum = rgb => { const [r, g, b] = rgb.map(lin); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const contrast = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const mix = (a, b, p) => a.map((v, i) => v * p + b[i] * (1 - p));
const dir = path.join(__dirname, '..', 'vendor', 'pudl-spec', 'tokens');
const derived = JSON.parse(fs.readFileSync(path.join(dir, 'derived.json'), 'utf8')).diff;
for (const form of ['light', 'dark']) {
  const raw = JSON.parse(fs.readFileSync(path.join(dir, 'palette.' + form + '.tokens.json'), 'utf8')), p = {};
  Object.values(raw).forEach(g => { if (g && typeof g === 'object') Object.entries(g).forEach(([k, v]) => { if (v && v.$value !== undefined) p[k] = v.$value; }); });
  const c = n => hex(p[n].hex);
  const inputBg = mix(c('light'), c('surface'), p.lit);
  for (const kind of ['add', 'del']) {
    const base = derived['diff-' + kind], tint = derived['diff-' + kind + '-bg'];
    const fill = mix(c(base), inputBg, tint.by);
    const low = Object.keys(p).filter(k => k.startsWith('syntax-')).map(k => [k, +contrast(c(k), fill).toFixed(2)]).filter(x => x[1] < 4.5);
    check(form + ' ' + kind + ': every syntax colour reaches 4.5:1 on the tint', low.length === 0, low);
    const sign = contrast(c(base), fill);
    check(form + ' ' + kind + ': the sign reaches 3:1 on the tint', sign >= 3, sign.toFixed(2));
  }
}

(async () => {
  const browser = await launch();
  const page = await browser.newPage({ viewport: { width: 1000, height: 800 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(ROOT + '/tests/fixtures/diff.html');

  const signs = await page.evaluate(() => [...document.querySelectorAll('#inline .diff-line')].map(l => {
    const s = getComputedStyle(l.querySelector('.diff-sign'), '::before');
    return [l.dataset.diff, s.content !== 'none' && s.content !== 'normal' && parseFloat(s.width) === 12];
  }));
  check('every added and removed line shows its sign, and unchanged lines none', signs.every(([k, on]) => on === (k === 'add' || k === 'del')), signs);
  const tints = await page.evaluate(() => ['add', 'del', 'same'].map(k => getComputedStyle(document.querySelector('#inline [data-diff="' + k + '"]')).backgroundColor));
  check('added and removed lines are tinted and unchanged ones are not', tints[0] !== tints[2] && tints[1] !== tints[2] && /0\)$|transparent/.test(tints[2]), tints);
  const gutters = await page.evaluate(() => ['.diff-no', '.diff-sign', '.diff-choose', '.diff-hunk-head', '.diff-fold'].map(s => { const cs = getComputedStyle(document.querySelector('#inline ' + s)); return cs.userSelect || cs.webkitUserSelect; }));
  check('gutters, signs, headings and folded bands are not selectable', gutters.every(v => v === 'none'), gutters);
  const heights = await page.evaluate(() => [...document.querySelectorAll('#inline .diff-line')].map(l => l.getBoundingClientRect().height));
  check('lines that can be chosen are at least 24px tall', heights.every(h => h >= 24), heights);
  await page.check('#pick');
  const edge = await page.evaluate(() => [getComputedStyle(document.getElementById('add')).boxShadow, getComputedStyle(document.documentElement).getPropertyValue('--accent').trim()]);
  check('a chosen line has a 3px accent edge', /inset/.test(edge[0]) && /3px 0px 0px 0px|3px 0px 0px/.test(edge[0]), edge);
  const words = await page.evaluate(() => ['ins', 'del'].map(t => getComputedStyle(document.querySelector('#inline ' + t + '.diff-word')).textDecorationLine));
  check('changed words are underlined', words.every(w => /underline/.test(w)), words);
  const aligned = await page.evaluate(() => {
    const sides = [...document.querySelectorAll('#split .diff-side')].map(s => [...s.querySelectorAll('.diff-line')].map(l => Math.round(l.getBoundingClientRect().top)));
    return { same: JSON.stringify(sides[0]) === JSON.stringify(sides[1]), sides };
  });
  check('the two sides of a side-by-side diff stay aligned line for line', aligned.same, aligned.sides);

  await page.emulateMedia({ forcedColors: 'active' });
  const forced = await page.evaluate(() => {
    const cs = id => getComputedStyle(document.getElementById(id));
    return { add: cs('add').borderInlineStartStyle + ' ' + cs('add').borderInlineStartWidth, del: cs('del').borderInlineStartStyle,
      struck: getComputedStyle(document.querySelector('#inline del.diff-word')).textDecorationLine };
  });
  check('in forced colours added lines have a solid edge, removed lines a dashed one, and removed words are struck through', forced.add === 'solid 2px' && forced.del === 'dashed' && /line-through/.test(forced.struck), forced);

  check('no errors', errors.length === 0, errors);
  await browser.close();
  console.log(failures ? failures + ' FAILED' : 'ALL PASSED');
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
