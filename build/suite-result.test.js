'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { suiteResult } = require('../tests/suite-result');

test('printed failures override a successful process exit', () => {
  for (const output of ['PASS setup\nFAIL light: focus ring\n2 FAILED\n', '2 FAILED\r\n']) {
    assert.deepEqual(suiteResult(0, output, false), { code: 1, printedFailure: true });
  }
});

test('process errors and timeouts remain failures without printed assertions', () => {
  assert.equal(suiteResult(2, '', false).code, 2);
  assert.equal(suiteResult(0, '', true).code, 1);
  assert.equal(suiteResult(null, '', false).code, null);
});

test('silent success and prose mentioning failure remain successful', () => {
  for (const output of ['', 'PASS rejects FAIL output\nALL PASSED\n', '0 FAILED\n']) {
    assert.deepEqual(suiteResult(0, output, false), { code: 0, printedFailure: false });
  }
});
