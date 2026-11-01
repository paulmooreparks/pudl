'use strict';
const assert = require('node:assert/strict');
const test = require('node:test');
const { compile } = require('./skin-css');

function skin() {
  return { version: 1, id: 'probe', name: 'Probe', treatment: 'bevel',
    radii: { radius: 0, 'radius-sm': 0, 'radius-xs': 0, 'radius-pill': 0 },
    palette: { light: { accent: '#123456', positive: '#234567' }, dark: { accent: '#abcdef', positive: '#bcdef0' } } };
}

test('compilation is deterministic and does not mutate authored data', () => {
  const input = skin(), before = JSON.stringify(input);
  const first = compile(input);
  input.palette.light = { positive: '#234567', accent: '#123456' };
  assert.equal(compile(input), first);
  assert.equal(JSON.stringify(skin()), before);
  const copy = JSON.stringify(input);
  compile(input);
  assert.equal(JSON.stringify(input), copy);
});

test('selection is scoped, palette forms are distinct, and display names cannot inject CSS', () => {
  const input = skin();
  input.name = '*/ body { display:none } /*';
  const css = compile(input);
  assert.ok(css.includes(':root:where([data-skin="probe"])'));
  assert.ok(css.includes(':root:where([data-skin="probe"]:not([data-theme="dark"]))'));
  assert.ok(css.includes(':root:where([data-skin="probe"][data-theme="dark"])'));
  assert.ok(css.includes('--pr: #234567;'));
  assert.ok(css.includes('--pr: #bcdef0;'));
  assert.ok(!css.includes(input.name));
  assert.ok(!css.includes('!important'));
});

test('bevel preserves target geometry and bounds its focus paint', () => {
  const css = compile(skin());
  assert.ok(css.includes('--raise-shadow: inset 1px 1px'));
  const properties = [...css.matchAll(/^  --([a-z-]+):/gm)].map(match => match[1]);
  assert.ok(properties.filter(name => !['focus-ring', 'focus-ring-width', 'focus-ring-danger', 'win-chrome-focus-shadow', 'tb-focus-ring'].includes(name)).every(name => !name.split('-').some(part =>
    ['width', 'height', 'padding', 'focus', 'font', 'hit', 'order'].includes(part))));
  assert.ok(css.includes('--focus-ring: color-mix(in srgb, var(--accent) 85%, var(--surface));'));
  assert.ok(css.includes('--focus-ring-width: 2px;'));
  assert.ok(css.includes('--focus-ring-danger: color-mix(in srgb, var(--danger) 80%, var(--text));'));
  assert.ok(!/\n\s+(?!-)[a-z-]+:/.test(css));
});

test('invalid input fails before CSS emission and standard treatment leaves paint alone', () => {
  const input = skin();
  input.treatment = 'custom';
  assert.throws(() => compile(input));
  input.treatment = 'standard';
  assert.ok(!compile(input).includes('--raise-shadow'));
});

test('material treatments retain bounded geometry and distinct surface paints', () => {
  const paints = new Set();
  for (const treatment of ['matte', 'ink', 'alloy', 'glass']) {
    const input = skin(); input.treatment = treatment;
    const css = compile(input);
    paints.add(css.match(/--raise-shadow: ([^;]+);/)[1]);
    assert.ok(css.includes('--entry-shadow: inset'));
    assert.ok(css.includes('--focus-ring: color-mix(in srgb, var(--accent) 85%, var(--surface));'));
    assert.ok(!/--(?:font|space|win-hit|win-band|win-head-docked|win-min)-/.test(css));
    assert.ok(!/!important|url\(/.test(css));
  }
  assert.equal(paints.size, 4);
});

test('Glass scopes its enhancement to the selected identifier and supplies an opaque fallback', () => {
  const input = skin(); input.id = 'glass-probe'; input.treatment = 'glass';
  const css = compile(input);
  assert.ok(css.startsWith('@media screen and (forced-colors: none)'));
  assert.ok(css.includes(':where(:root[data-skin="glass-probe"]) .win-head'));
  assert.ok(!css.includes('[data-skin="glass"]'));
  assert.ok(css.includes('@supports (backdrop-filter: blur(2px))'));
  assert.ok(css.includes('@media (prefers-reduced-transparency: reduce)'));
  assert.ok(css.includes('backdrop-filter: none'));
  assert.ok(css.includes('.win::before'));
  assert.ok(css.includes('prefers-reduced-transparency: no-preference'));
  assert.ok(css.includes('pointer-events: none'));
  assert.ok(css.includes('text-shadow:'));
  assert.ok(css.includes('drop-shadow(0 0 1px var(--surface))'));
  assert.ok(css.includes('.win-head { background: var(--raise-grad); }'));
  assert.ok(!css.includes('.win-head > :is('), 'titles must not have rectangular backing patches');
  assert.ok(!/\.win \{[^}]*backdrop-filter/.test(css), 'filter must not change the containing block of window popovers');
});
