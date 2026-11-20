'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { verifyShards, verifyNested } = require('../tests/verify-shards');

// Verbatim retained Node TAP, from release-01072-receipt-ci-20261115/attempt1/
// artifacts/output-webkit/ci-webkit/webkit/skins/output.log. This fixture was
// produced by the real wrapper, independently of the new checker.
const retainedSkins = String.raw`TAP version 13
# Subtest: webkit one-line fields preserve default height and contain enlarged text
ok 1 - webkit one-line fields preserve default height and contain enlarged text
  ---
  duration_ms: 541.697096
  type: 'test'
  ...
# Subtest: webkit verifies effective cascade, selection and stable control geometry
ok 2 - webkit verifies effective cascade, selection and stable control geometry
  ---
  duration_ms: 908.481802
  type: 'test'
  ...
# Subtest: webkit Gel preview preserves controls and supports both themes
ok 3 - webkit Gel preview preserves controls and supports both themes
  ---
  duration_ms: 984.323284
  type: 'test'
  ...
# Subtest: webkit Glaze preview preserves controls and supports both themes
ok 4 - webkit Glaze preview preserves controls and supports both themes
  ---
  duration_ms: 938.573316
  type: 'test'
  ...
# Subtest: webkit host-owned appearance never accesses storage
ok 5 - webkit host-owned appearance never accesses storage
  ---
  duration_ms: 701.214109
  type: 'test'
  ...
# Subtest: webkit material skins preserve live content and control geometry in both forms
ok 6 - webkit material skins preserve live content and control geometry in both forms
  ---
  duration_ms: 11775.384607
  type: 'test'
  ...
# Subtest: webkit material skins leave forced colours and print component-owned
ok 7 - webkit material skins leave forced colours and print component-owned
  ---
  duration_ms: 1867.437632
  type: 'test'
  ...
# Subtest: webkit Glass protects text over arbitrary backgrounds and falls back to opaque chrome
ok 8 - webkit Glass protects text over arbitrary backgrounds and falls back to opaque chrome
  ---
  duration_ms: 5358.739682
  type: 'test'
  ...
# Subtest: catalogue admission matches the registry and admitted bytes stay pinned
ok 9 - catalogue admission matches the registry and admitted bytes stay pinned
  ---
  duration_ms: 2.615896
  type: 'test'
  ...
# Subtest: webkit skin observers settle after a redraw and ignore unchanged selection
ok 10 - webkit skin observers settle after a redraw and ignore unchanged selection
  ---
  duration_ms: 456.877618
  type: 'test'
  ...
# Subtest: webkit selects only available skins and preserves content and navigation
ok 11 - webkit selects only available skins and preserves content and navigation
  ---
  duration_ms: 443.728496
  type: 'test'
  ...
1..11
# tests 11
# suites 0
# pass 11
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 26374.033556
`;
const revision = '1234567890abcdef1234567890abcdef12345678';
const skinNames = [
  'webkit one-line fields preserve default height and contain enlarged text',
  'webkit verifies effective cascade, selection and stable control geometry',
  'webkit Gel preview preserves controls and supports both themes',
  'webkit Glaze preview preserves controls and supports both themes',
  'webkit host-owned appearance never accesses storage',
  'webkit material skins preserve live content and control geometry in both forms',
  'webkit material skins leave forced colours and print component-owned',
  'webkit Glass protects text over arbitrary backgrounds and falls back to opaque chrome',
  'catalogue admission matches the registry and admitted bytes stay pinned',
  'webkit skin observers settle after a redraw and ignore unchanged selection',
  'webkit selects only available skins and preserves content and navigation'
];
const paletteNames = [
  'companion palettes remain valid complete opaque palette definitions',
  'webkit companion palettes, focus and Glass title chrome'
];
function paletteTap(engine) {
  return 'TAP version 13\n' + paletteNames.map((name, i) => `ok ${i + 1} - ${name.replace('webkit', engine)}\n`).join('') +
    '1..2\n# tests 2\n# suites 0\n# pass 2\n# fail 0\n# cancelled 0\n# skipped 0\n# todo 0\n';
}

test('real retained TAP and spec reporter shapes retain every original nested identity', () => {
  verifyNested(retainedSkins, skinNames);
  verifyNested(retainedSkins.replace(/\n/g, '\r\n'), skinNames);
  const spec = skinNames.map(name => `✔ ${name} (1.23ms)`).join('\n') +
    '\nℹ tests 11\nℹ suites 0\nℹ pass 11\nℹ fail 0\nℹ cancelled 0\nℹ skipped 0\nℹ todo 0\n';
  verifyNested(spec, skinNames);
  verifyNested(paletteTap('webkit'), paletteNames);
  for (const bad of [
    retainedSkins.replace('ok 1 -', 'not ok 1 -'),
    retainedSkins.replace('ok 1 -', 'ok 2 -'),
    retainedSkins.replace('1..11', '1..10'),
    retainedSkins.replace('# pass 11', '# pass 10'),
    retainedSkins.replace('# skipped 0', '# skipped 1'),
    retainedSkins.replace('# cancelled 0', '# cancelled 1'),
    retainedSkins.replace('# todo 0', '# todo 1'),
    retainedSkins.replace('# fail 0', '# fail 1'),
    retainedSkins.replace('and contain enlarged text\n  ---', 'and contain enlarged text # SKIP\n  ---'),
    retainedSkins.replaceAll('webkit Gel preview', 'foreign Gel preview'),
    retainedSkins.replace(/^ok 11 - .*\n/m, ''),
    retainedSkins.replace('# pass 11', '# pass 11\n# pass 11'),
    retainedSkins.split('1..11')[0],
    spec.replace('✔ webkit Gel', '✖ webkit Gel'),
    ''
  ]) assert.throws(() => verifyNested(bad, skinNames));
});

function writeJson(file, value) { fs.writeFileSync(file, JSON.stringify(value)); }
function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'pudl-shard-controls-'));
  const suites = fs.readdirSync(path.join(__dirname, '../tests')).filter(name => name.endsWith('.test.js')).sort();
  // Independent partition construction, rather than asking the checker/helper
  // to generate its own expected answer.
  for (const [engine, form] of [['chromium', 'source'], ['firefox', 'source'], ['webkit', 'source'], ['chromium', 'minified']]) {
    for (const index of [1, 2]) {
      const selected = suites.filter((name, ordinal) => ordinal % 2 === index - 1);
      const directory = path.join(root, `output-${engine}-${form}-${index}`);
      fs.mkdirSync(path.join(directory, engine), { recursive: true });
      writeJson(path.join(directory, 'results.json'), {
        jobs: 1, suiteTimeoutSeconds: 300, minified: form === 'minified', revision,
        shard: { index, total: 2 }, totalSuites: suites.length, suites: selected,
        results: selected.map(suite => ({ engine, suite, code: 0, secs: 0.1 }))
      });
      for (const suite of selected) {
        const child = path.join(directory, engine, suite.replace(/\.test\.js$/, ''));
        fs.mkdirSync(child);
        writeJson(path.join(child, 'result.json'), { engine, suite, code: 0, exitCode: 0, printedFailure: false, timedOut: false });
        fs.writeFileSync(path.join(child, 'output.log'), suite === 'skins.test.js' ? retainedSkins.replace(/webkit/g, engine) : suite === 'palette-themes.test.js' ? paletteTap(engine) : '');
      }
    }
  }
  return { root, suites };
}

test('eight shards reconcile originals and reject missing, foreign, failed or mismatched evidence', () => {
  const { root, suites } = fixture();
  try {
    assert.deepEqual(verifyShards(root, revision), { artifacts: 8, suites: suites.length, outcomes: suites.length * 4 });
    const artifact = path.join(root, 'output-chromium-source-1');
    const aggregateFile = path.join(artifact, 'results.json');
    const aggregate = JSON.parse(fs.readFileSync(aggregateFile));
    const suite = aggregate.suites[0];
    const child = path.join(artifact, 'chromium', suite.replace(/\.test\.js$/, ''));
    const childFile = path.join(child, 'result.json');
    const mutateJson = (file, mutate) => {
      const original = fs.readFileSync(file);
      const value = JSON.parse(original);
      mutate(value); writeJson(file, value);
      try { assert.throws(() => verifyShards(root, revision)); }
      finally { fs.writeFileSync(file, original); }
    };
    for (const [key, value] of Object.entries({ jobs: 2, suiteTimeoutSeconds: 120, revision: 'f'.repeat(40), minified: true, shard: { index: 2, total: 2 }, totalSuites: suites.length - 1 })) {
      mutateJson(aggregateFile, valueObject => { valueObject[key] = value; });
    }
    for (const mutate of [
      value => value.results.pop(),
      value => value.results.push(value.results[0]),
      value => { value.results[0].suite = 'foreign.test.js'; },
      value => { value.results[0].engine = 'firefox'; },
      value => { value.results[0].code = 1; },
      value => { value.results[0].secs = -1; },
      value => value.suites.reverse(),
      value => value.suites.pop()
    ]) mutateJson(aggregateFile, mutate);
    for (const [key, value] of Object.entries({ engine: 'webkit', suite: 'foreign.test.js', code: 1, exitCode: 1, printedFailure: true, timedOut: true })) {
      mutateJson(childFile, childValue => { childValue[key] = value; });
    }
    const log = path.join(child, 'output.log');
    for (const raw of ['FAIL printed failure\n', '1 FAILED\n', 'not ok 1 - hidden child\n']) {
      fs.writeFileSync(log, raw);
      assert.throws(() => verifyShards(root, revision));
    }
    fs.writeFileSync(log, '');
    fs.unlinkSync(log);
    assert.throws(() => verifyShards(root, revision));
    fs.writeFileSync(log, '');
    const extra = path.join(root, 'output-firefox-minified-1');
    fs.mkdirSync(extra);
    assert.throws(() => verifyShards(root, revision));
    fs.rmdirSync(extra);
    const extraChild = path.join(artifact, 'chromium', 'foreign');
    fs.mkdirSync(extraChild);
    assert.throws(() => verifyShards(root, revision));
    fs.rmdirSync(extraChild);
    const parked = path.join(root, 'parked');
    fs.renameSync(artifact, parked);
    assert.throws(() => verifyShards(root, revision));
    fs.renameSync(parked, artifact);
    // A wrapper's success receipt cannot replace its missing original children.
    for (const wrapper of ['skins', 'palette-themes']) {
      const shard = suites.indexOf(wrapper + '.test.js') % 2 + 1;
      const wrapperLog = path.join(root, `output-chromium-source-${shard}`, 'chromium', wrapper, 'output.log');
      const original = fs.readFileSync(wrapperLog);
      fs.writeFileSync(wrapperLog, '');
      assert.throws(() => verifyShards(root, revision));
      fs.writeFileSync(wrapperLog, original);
    }
    assert.equal(verifyShards(root, revision).outcomes, suites.length * 4);
    const cli = spawnSync(process.execPath, [path.join(__dirname, '../tests/verify-shards.js'), root, revision], { encoding: 'utf8' });
    assert.equal(cli.status, 0, cli.stderr);
    assert.match(cli.stdout, /PASS .* original suite outcomes/);
    const wrongRevision = spawnSync(process.execPath, [path.join(__dirname, '../tests/verify-shards.js'), root, 'f'.repeat(40)], { encoding: 'utf8' });
    assert.equal(wrongRevision.status, 1);
    assert.match(wrongRevision.stderr, /FAIL shard completeness/);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
