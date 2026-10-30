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

test('bevel preserves geometry and limits focus changes to opaque paint', () => {
  const css = compile(skin());
  assert.ok(css.includes('--raise-shadow: inset 1px 1px'));
  const properties = [...css.matchAll(/^  --([a-z-]+):/gm)].map(match => match[1]);
  assert.ok(properties.filter(name => !['focus-ring', 'focus-ring-danger', 'win-chrome-focus-shadow', 'tb-focus-ring'].includes(name)).every(name => !name.split('-').some(part =>
    ['width', 'height', 'padding', 'focus', 'font', 'hit', 'order'].includes(part))));
  assert.ok(css.includes('--focus-ring: var(--accent);'));
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
