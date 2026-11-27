'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const path = require('node:path');
const { taskbarSizingBaseline, loadBaseline, revision, ordinaryBandBaseline, ordinaryBandEdits } = require('./palette-baseline');
const root = path.resolve(__dirname, '..');
const historical = execFileSync('git', ['show', '92b25d1ab0179ec7aca7cb54b7c5f8e49a209dfc:dist/pudl-windows.css'], { cwd: root, encoding: 'utf8' });
const oldParts = [
  '\n.win-bar {\n',
  'height: var(--win-bar-entry-height, calc(1.5em + 8px)); min-height: var(--win-bar-entry-height, calc(1.5em + 8px));',
  '.win-bar > .status-area {\n  order: 0;',
  '  .win-bar { --win-bar-entry-height: max(40px, calc(1.5em + 8px)); }\n'
];

test('approved sizing overlay preserves every unrelated historical byte and fixed revision', () => {
  assert.equal(revision, '92b25d1ab0179ec7aca7cb54b7c5f8e49a209dfc');
  const updated = taskbarSizingBaseline(historical);
  const newParts = [
    '\n.win-bar {\n  --win-bar-entry-height: max(30px, calc(1.125rem + 12px));\n',
    'height: var(--win-bar-entry-height); min-height: var(--win-bar-entry-height);',
    '.win-bar > .status-area {\n  order: 0;\n' +
      '  box-sizing: border-box; height: var(--win-bar-entry-height); min-height: var(--win-bar-entry-height);\n' +
      '  padding: 0; border: 0;\n' +
      '  outline: var(--menubar-status-border, 1px solid var(--tb-border, var(--raise-border))); outline-offset: -1px;',
    '\n.win-bar > .status-area > .status-item { height: var(--win-bar-entry-height); min-height: var(--win-bar-entry-height); }\n'
  ];
  let untouchedOld = historical, untouchedNew = updated;
  for (const part of oldParts) untouchedOld = untouchedOld.replace(part, '');
  // Remove complete tray blocks before the height declaration they contain.
  for (const part of [...newParts].sort((a, b) => b.length - a.length)) {
    assert.equal(untouchedNew.split(part).length, 2, 'approved replacement occurs once');
    untouchedNew = untouchedNew.replace(part, '');
  }
  assert.equal(untouchedNew, untouchedOld, 'all unrelated paint and geometry stay byte-identical');
  assert.ok(loadBaseline(root).get('dist/pudl-windows.css').toString().includes('--win-bar-entry-height: max(30px, calc(1.125rem + 12px));'));
});

test('missing, changed or duplicate historical declarations reject instead of widening the overlay', () => {
  for (const part of oldParts) {
    assert.throws(() => taskbarSizingBaseline(historical.replace(part, '')), /Approved taskbar baseline declaration changed/);
    assert.throws(() => taskbarSizingBaseline(historical.replace(part, part + part)), /Approved taskbar baseline declaration changed/);
    assert.throws(() => taskbarSizingBaseline(historical.replace(part, part.replace('win-bar', 'foreign-bar'))), /Approved taskbar baseline declaration changed/);
  }
  assert.throws(() => taskbarSizingBaseline(taskbarSizingBaseline(historical)), /Approved taskbar baseline declaration changed/);
});

const historicalCSS = execFileSync('git', ['show', revision + ':dist/pudl.css'], { cwd: root, encoding: 'utf8' });
test('ordinary band overlay is reversible and preserves unrelated historical bytes', () => {
  const input = { css: historicalCSS, windows: taskbarSizingBaseline(historical) };
  const output = ordinaryBandBaseline(input.css, input.windows);
  assert.equal(ordinaryBandEdits.length, 4);
  assert.equal(output.css.split('--chrome-band-min-height: max(43px, calc(1.125rem + 25px));').length, 2);
  assert.ok(output.css.includes('--tb-pad-y: 6px;\n  min-height: var(--chrome-band-min-height); box-sizing: border-box;'));
  assert.ok(output.css.includes('  .topbar { padding: var(--tb-pad-y) 12px; }'));
  const restored = { ...output };
  for (const edit of [...ordinaryBandEdits].reverse()) {
    assert.equal(restored[edit.file].split(edit.after).length, 2, 'only the ordinary-band replacement occurs once');
    restored[edit.file] = restored[edit.file].replace(edit.after, edit.before);
  }
  for (const file of ['css', 'windows']) assert.deepEqual(Buffer.from(restored[file]), Buffer.from(input[file]), file + ' retains every unrelated historical byte');
  assert.equal(revision, '92b25d1ab0179ec7aca7cb54b7c5f8e49a209dfc');
  const loaded = loadBaseline(root);
  assert.ok(loaded.get('dist/pudl.css').includes(Buffer.from('--chrome-band-min-height: max(43px, calc(1.125rem + 25px));')));
  assert.ok(loaded.get('dist/pudl-windows.css').includes(Buffer.from('min-height: var(--chrome-band-min-height); box-sizing: border-box;')));
});

test('ordinary band overlay rejects missing, changed, duplicate or already-overlaid inputs', () => {
  const input = { css: historicalCSS, windows: taskbarSizingBaseline(historical) };
  for (const edit of ordinaryBandEdits) {
    for (const replacement of ['', edit.before + edit.before, edit.before.replace(/\S/, '!')]) {
      const changed = { ...input, [edit.file]: input[edit.file].replace(edit.before, replacement) };
      assert.throws(() => ordinaryBandBaseline(changed.css, changed.windows), /Ordinary-band baseline declaration changed/);
    }
  }
  for (const file of ['css', 'windows']) {
    const changed = { ...input, [file]: input[file] + '\n--chrome-band-min-height: 43px;' };
    assert.throws(() => ordinaryBandBaseline(changed.css, changed.windows), /Ordinary-band baseline token already exists/);
  }
  const updated = ordinaryBandBaseline(input.css, input.windows);
  assert.throws(() => ordinaryBandBaseline(updated.css, updated.windows), /Ordinary-band baseline token already exists/);
});
