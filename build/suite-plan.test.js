'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { selectSuites } = require('../tests/suite-plan');
const suites = fs.readdirSync(path.join(__dirname, '../tests')).filter(name => name.endsWith('.test.js')).sort();

test('two and four shards cover every discovered suite once and preserve local order', () => {
  for (const total of [2, 4]) {
    const plans = Array.from({ length: total }, (_, index) => selectSuites(suites, [], `${index + 1}/${total}`));
    const selected = plans.flatMap(plan => plan.suites);
    assert.equal(new Set(selected).size, suites.length);
    assert.deepEqual(selected.sort(), suites);
    for (const plan of plans) {
      assert.deepEqual(plan.suites, [...plan.suites].sort());
      assert.equal(plan.totalSuites, suites.length);
      assert.ok(plan.suites.length);
    }
  }
});

test('unsharded and filtered selections retain their explicit suite identities', () => {
  assert.deepEqual(selectSuites(suites, [], undefined).suites, suites);
  const filtered = suites.filter(name => name.includes('row-actions'));
  assert.deepEqual(selectSuites(suites, ['row-actions'], '').suites, filtered);
  assert.deepEqual([1, 2].flatMap(index => selectSuites(suites, ['row-actions'], `${index}/2`).suites).sort(), filtered);
});

test('invalid or empty selections fail instead of yielding a green empty run', () => {
  for (const value of ['0/2', '1/0', '3/2', '1/9999', '1.5/2', '1/2/3', ' 1/2', '1/9007199254740993']) {
    assert.throws(() => selectSuites(suites, [], value), /PUDL_SHARD/);
  }
  assert.throws(() => selectSuites(suites, ['no-such-suite'], undefined), /No suites/);
  assert.throws(() => selectSuites([], [], undefined), /No suites/);
});
