'use strict';
const assert = require('node:assert/strict');
const test = require('node:test');
const { validate } = require('./skin-definition');

function skin() {
  return { version: 1, id: 'bevel', name: 'Bevel', treatment: 'bevel',
    radii: { radius: 0, 'radius-sm': 0, 'radius-xs': 0, 'radius-pill': 0 },
    palette: { light: {}, dark: {} } };
}

test('accepts a bounded definition without claiming rendered conformance', () => {
  const value = skin();
  assert.equal(validate(value), value);
  assert.equal(Object.hasOwn(value, 'conformant'), false);
});

test('rejects CSS escape paths and unknown tokens at every input boundary', () => {
  const cases = [
    s => { s.css = '.btn { display:none }'; },
    s => { s.radii.selector = '.btn'; },
    s => { s.palette.light['raise-grad'] = '#ffffff'; },
    s => { s.palette.light.accent = 'url(https://example.test/a)'; },
    s => { s.palette.light.accent = '#ffffff;display:none'; },
    s => { s.id = 'x"] .btn'; },
    s => { s.treatment = 'arbitrary-css'; },
    s => { s.palette.light = JSON.parse('{"__proto__":"#ffffff"}'); }
  ];
  cases.forEach(change => { const value = skin(); change(value); assert.throws(() => validate(value)); });
});

test('rejects malformed, inherited and out-of-domain inputs', () => {
  [null, [], {}, Object.create(skin())].forEach(value => assert.throws(() => validate(value)));
  const cases = [
    s => { s.version = 2; }, s => { s.id = 'standard'; },
    s => { delete s.radii.radius; }, s => { s.name = ' '; }, s => { s.name = 'bad\nname'; },
    s => { s.radii.radius = '0'; }, s => { s.radii.radius = -1; },
    s => { s.radii.radius = 33; }, s => { s.radii.radius = NaN; },
    s => { s.radii.radius = Infinity; }, s => { s.radii['radius-pill'] = 1000; },
    s => { s.palette.light.depth = 1.1; }, s => { s.palette.light = []; }
  ];
  cases.forEach(change => { const value = skin(); change(value); assert.throws(() => validate(value)); });
});

test('requires paired palette overrides and complete category overrides for changed surfaces', () => {
  const value = skin();
  value.palette.light.accent = '#123456';
  assert.throws(() => validate(value), /same tokens/);
  value.palette.dark.accent = '#abcdef';
  assert.doesNotThrow(() => validate(value));
  value.palette.light.surface = '#ffffff';
  value.palette.dark.surface = '#111111';
  assert.throws(() => validate(value), /category colours/);
  for (let i = 1; i <= 8; i++) {
    value.palette.light['category-' + i] = '#123456';
    value.palette.dark['category-' + i] = '#abcdef';
  }
  /* These equal colours are structurally valid, but cannot pass the separate
     categorical-distance and rendered conformance gate. */
  assert.doesNotThrow(() => validate(value));
});
