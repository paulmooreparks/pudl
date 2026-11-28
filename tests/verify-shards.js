'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { suiteResult } = require('./suite-result');
const { selectSuites } = require('./suite-plan');
const setAside = require('./set-aside');

// These identities are the original nested cases, not a count of wrapper exits.
function nestedNames(suite, engine) {
  if (suite === 'palette-themes.test.js') return [
    'companion palettes remain valid complete opaque palette definitions',
    engine + ' companion palettes, focus and Glass title chrome'
  ];
  if (suite !== 'skins.test.js') return null;
  return [
    'one-line fields preserve default height and contain enlarged text',
    'verifies effective cascade, selection and stable control geometry',
    'Gel preview preserves controls and supports both themes',
    'Glaze preview preserves controls and supports both themes',
    'host-owned appearance never accesses storage',
    'material skins preserve live content and control geometry in both forms',
    'material skins leave forced colours and print component-owned',
    'Glass protects text over arbitrary backgrounds and falls back to opaque chrome',
    null,
    'skin observers settle after a redraw and ignore unchanged selection',
    'selects only available skins and preserves content and navigation'
  ].map(name => name === null ? 'catalogue admission matches the registry and admitted bytes stay pinned' : engine + ' ' + name);
}

function cleanLog(log) {
  return log.replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, '').replace(/\r\n/g, '\n');
}

function verifyNested(log, expected) {
  log = cleanLog(log);
  assert.ok(!/^\s*(?:not ok\b|Bail out!|[✖✗])/m.test(log), 'Nested failure');
  assert.ok(!/^\s*(?:ok\b.*#\s*(?:SKIP|TODO)|[﹣-] .*#\s*(?:SKIP|TODO))/im.test(log), 'Nested skipped/todo outcome');
  const tap = /^TAP version 13$/m.test(log);
  const rows = tap
    ? [...log.matchAll(/^ok (\d+) - (.+)$/gm)].map(match => ({ number: Number(match[1]), name: match[2] }))
    : [...log.matchAll(/^✔ (.+) \([\d.]+m?s\)$/gm)].map((match, index) => ({ number: index + 1, name: match[1] }));
  assert.deepEqual(rows.map(row => row.number), expected.map((name, index) => index + 1), 'Nested outcome numbering/count');
  assert.deepEqual(rows.map(row => row.name), expected, 'Nested outcome identities');
  if (tap) {
    assert.equal((log.match(/^TAP version 13$/gm) || []).length, 1, 'Single TAP stream');
    assert.deepEqual(log.match(/^\d+\.\.\d+.*$/gm), ['1..' + expected.length], 'Nested TAP plan');
  }
  for (const [key, value] of Object.entries({ tests: expected.length, suites: 0, pass: expected.length, fail: 0, cancelled: 0, skipped: 0, todo: 0 })) {
    const summaries = [...log.matchAll(new RegExp('^' + (tap ? '#' : 'ℹ') + ' ' + key + ' (\\d+)$', 'gm'))];
    assert.equal(summaries.length, 1, 'Single nested ' + key + ' summary');
    assert.equal(Number(summaries[0][1]), value, 'Nested ' + key);
  }
}

function entries(directory) {
  assert.ok(fs.lstatSync(directory).isDirectory(), 'Required directory: ' + directory);
  return fs.readdirSync(directory).sort();
}
function read(file) {
  assert.ok(fs.lstatSync(file).isFile(), 'Required original file: ' + file);
  return fs.readFileSync(file, 'utf8');
}
const json = file => JSON.parse(read(file));

function verifyShards(root, revision) {
  assert.match(revision, /^[a-f0-9]{40}$/, 'Expected full commit revision');
  const suites = fs.readdirSync(__dirname).filter(name => name.endsWith('.test.js')).sort();
  assert.ok(suites.length > 0, 'Nonempty expected suite set');
  const aside = setAside.load(suites);
  const targets = [['chromium', false], ['firefox', false], ['webkit', false], ['chromium', true]];
  const artifacts = targets.flatMap(([engine, minified]) => [1, 2].map(index => ({
    engine, minified, index, name: `output-${engine}-${minified ? 'minified' : 'source'}-${index}`
  })));
  assert.deepEqual(entries(root), artifacts.map(item => item.name).sort(), 'Exact eight artifact directories');
  let outcomes = 0;
  for (const { engine, minified, index, name } of artifacts) {
    const directory = path.join(root, name);
    assert.deepEqual(entries(directory), [engine, 'results.json'].sort(), name + ' artifact contents');
    const plan = selectSuites(suites, [], `${index}/2`);
    const ran = plan.suites.filter(suite => !setAside.isSetAside(aside, suite, engine));
    const aggregate = json(path.join(directory, 'results.json'));
    for (const [key, value] of Object.entries({ jobs: 1, suiteTimeoutSeconds: 300, revision, minified, shard: { index, total: 2 }, totalSuites: suites.length, suites: plan.suites })) {
      assert.deepEqual(aggregate[key], value, name + ' ' + key);
    }
    assert.ok(Array.isArray(aggregate.results), name + ' aggregate rows');
    assert.deepEqual(aggregate.results.map(row => row.suite).sort(), [...ran].sort(), name + ' exact aggregate suite identities');
    assert.deepEqual(entries(path.join(directory, engine)), ran.map(suite => suite.replace(/\.test\.js$/, '')).sort(), name + ' exact child directories');
    for (const row of aggregate.results) {
      assert.equal(row.engine, engine, name + ' aggregate engine');
      assert.equal(row.code, 0, name + ' aggregate effective return');
      assert.ok(Number.isFinite(row.secs) && row.secs >= 0, name + ' elapsed seconds');
      const childDirectory = path.join(directory, engine, row.suite.replace(/\.test\.js$/, ''));
      const child = json(path.join(childDirectory, 'result.json'));
      for (const [key, value] of Object.entries({ engine, suite: row.suite, code: 0, exitCode: 0, printedFailure: false, timedOut: false })) {
        assert.deepEqual(child[key], value, name + '/' + row.suite + ' ' + key);
      }
      const log = read(path.join(childDirectory, 'output.log'));
      const effective = suiteResult(child.exitCode, log, child.timedOut);
      assert.deepEqual(effective, { code: 0, printedFailure: false }, name + '/' + row.suite + ' original log classification');
      assert.ok(!/^\s*(?:not ok\b|Bail out!)/m.test(cleanLog(log)), name + '/' + row.suite + ' raw TAP failure');
      const expected = nestedNames(row.suite, engine);
      if (expected) verifyNested(log, expected);
      outcomes++;
    }
  }
  return { artifacts: artifacts.length, suites: suites.length, outcomes };
}

if (require.main === module) {
  try {
    assert.equal(process.argv.length, 4, 'Usage: node tests/verify-shards.js ARTIFACT_ROOT EXPECTED_REVISION');
    const result = verifyShards(process.argv[2], process.argv[3]);
    console.log(`PASS ${result.outcomes} original suite outcomes across ${result.artifacts} shards (${result.suites} suites per browser/form)`);
  } catch (error) {
    console.error('FAIL shard completeness: ' + error.message);
    process.exitCode = 1;
  }
}
module.exports = { verifyShards, verifyNested };
