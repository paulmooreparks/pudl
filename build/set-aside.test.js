'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { check, load, isSetAside } = require('../tests/set-aside');
const suites = fs.readdirSync(path.join(__dirname, '../tests')).filter(name => name.endsWith('.test.js')).sort();
const entry = { suite: suites[0], engine: 'firefox', owner: 'A maintainer', until: '2026-12-05', issue: 60 };

test('the committed list is valid and none of it has passed its date', () => {
  assert.ok(Array.isArray(load(suites)));
});

test('an entry needs a real suite, an engine, an owner, an issue and a date', () => {
  assert.deepEqual(check([entry], suites, '2026-12-05'), [entry]);
  for (const bad of [{ suite: 'missing.test.js' }, { engine: 'edge' }, { owner: ' ' }, { issue: undefined }, { until: 'soon' }]) {
    assert.throws(() => check([Object.assign({}, entry, bad)], suites, '2026-12-01'));
  }
});

test('an entry past its date fails, and an entry covers only its own engine', () => {
  assert.throws(() => check([entry], suites, '2026-12-06'), /passed its date/);
  assert.equal(isSetAside([entry], suites[0], 'firefox'), true);
  assert.equal(isSetAside([entry], suites[0], 'webkit'), false);
});
